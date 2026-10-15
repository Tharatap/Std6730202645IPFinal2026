import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { apiRequest } from '../api';
import { confirmAsync } from '../alert';
import AppModal from '../components/AppModal';
import Button from '../components/Button';
import Input from '../components/Input';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { colors, formatMoney, MAX_WIDTH, radius, shadow, spacing, type } from '../theme';

const SALARY_RE = /^\d+(\.\d{1,2})?$/;
const EMPTY_FORM = { name: '', position: '', salary: '' };
const WIDE = 768;

function SearchIcon() {
  return (
    <View style={styles.searchIcon}>
      <View style={styles.searchCircle} />
      <View style={styles.searchHandle} />
    </View>
  );
}

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const position = form.position.trim();
  const salary = form.salary.trim();
  if (!name) errors.name = 'Name is required';
  else if (name.length > 100) errors.name = 'Name must be at most 100 characters';
  if (!position) errors.position = 'Position is required';
  else if (position.length > 100) errors.position = 'Position must be at most 100 characters';
  if (!salary) errors.salary = 'Salary is required';
  else if (!SALARY_RE.test(salary) || !(Number(salary) > 0)) errors.salary = 'Salary must be a positive number';
  else if (Number(salary) > 99999999.99) errors.salary = 'Salary is too large';
  return errors;
}

export default function EmployeesScreen({ token, onError, onAnalyze, analyzing, onDataChanged }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, leave: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const appliedSearch = useRef('');
  const requestId = useRef(0);
  const firstLoad = useRef(true);

  // Loads the (filtered) list plus unfiltered stats; ignores stale responses
  const load = useCallback(
    async (term) => {
      const id = ++requestId.current;
      try {
        const listReq = apiRequest(`/employees${term ? `?search=${encodeURIComponent(term)}` : ''}`, { token });
        const allReq = term ? apiRequest('/employees', { token }) : listReq;
        const [listRes, allRes] = await Promise.all([listReq, allReq]);
        if (id !== requestId.current) return;
        const list = Array.isArray(listRes?.data) ? listRes.data : [];
        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        const active = all.filter((e) => e.status === 'Active').length;
        appliedSearch.current = term;
        setEmployees(list);
        setStats({ total: all.length, active, leave: all.length - active });
      } catch (e) {
        if (id === requestId.current) onError(e, 'Load Failed');
      }
    },
    [token, onError]
  );

  const refetch = useCallback(() => load(appliedSearch.current), [load]);

  // Debounced search (300ms); initial load runs immediately
  useEffect(() => {
    const term = search.trim();
    const delay = firstLoad.current ? 0 : 300;
    if (!firstLoad.current) setSearching(true);
    const timer = setTimeout(async () => {
      await load(term);
      firstLoad.current = false;
      setLoading(false);
      setSearching(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [search, load]);

  const handleToggle = async (id) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await apiRequest(`/employees/${encodeURIComponent(id)}/status`, { method: 'PUT', token });
      await refetch();
    } catch (e) {
      onError(e, 'Update Failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (busyId) return;
    const ok = await confirmAsync('Delete employee', 'Are you sure?');
    if (!ok) return;
    setBusyId(id);
    try {
      await apiRequest(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE', token });
      onDataChanged();
      await refetch();
    } catch (e) {
      onError(e, 'Delete Failed');
    } finally {
      setBusyId(null);
    }
  };

  const openModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSave = async () => {
    if (saving) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await apiRequest('/employees', {
        method: 'POST',
        token,
        body: { name: form.name.trim(), position: form.position.trim(), salary: Number(form.salary.trim()) },
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      onDataChanged();
      await refetch();
    } catch (e) {
      onError(e, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const term = search.trim();

  const actions = (item) => {
    const busy = busyId === item.id;
    return (
      <View style={styles.actions}>
        <Button
          title="Toggle Status"
          variant="secondary"
          size="sm"
          onPress={() => handleToggle(item.id)}
          loading={busy}
          disabled={!!busyId && !busy}
        />
        <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(item.id)} disabled={!!busyId} />
      </View>
    );
  };

  const renderRow = ({ item, index }) => {
    if (wide) {
      const last = index === employees.length - 1;
      return (
        <View style={[styles.row, index % 2 === 1 && styles.rowAlt, last && styles.rowLast]}>
          <Text style={[styles.cell, styles.colName, styles.strong]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cell, styles.colPos]} numberOfLines={1}>{item.position}</Text>
          <View style={styles.colStatus}><StatusBadge status={item.status} /></View>
          <Text style={[styles.cell, styles.colSalary, styles.strong]}>{formatMoney(item.salary)}</Text>
          <View style={styles.colActions}>{actions(item)}</View>
        </View>
      );
    }
    return (
      <View style={styles.mCard}>
        <View style={styles.mTop}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, styles.strong]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.muted} numberOfLines={1}>{item.position}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.mBottom}>
          <View>
            <Text style={type.caption}>Salary</Text>
            <Text style={styles.mSalary}>{formatMoney(item.salary)}</Text>
          </View>
          {actions(item)}
        </View>
      </View>
    );
  };

  const header = (
    <View>
      <View style={styles.stats}>
        <StatCard label="Total" value={stats.total} color={colors.primary} />
        <StatCard label="Active" value={stats.active} color={colors.success} />
        <StatCard label="On Leave" value={stats.leave} color={colors.warning} />
      </View>

      <View style={[styles.toolbar, !wide && styles.toolbarNarrow]}>
        <Input
          containerStyle={[styles.search, !wide && styles.searchNarrow]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or position"
          autoCapitalize="none"
          autoCorrect={false}
          left={<SearchIcon />}
          right={
            searching ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                <Text style={styles.clear}>×</Text>
              </Pressable>
            ) : null
          }
        />
        <View style={styles.toolbarButtons}>
          <Button
            title="Analyze Salary Structure"
            variant="secondary"
            onPress={onAnalyze}
            loading={analyzing}
            style={!wide && styles.flexBtn}
          />
          <Button title="+ Add Employee" onPress={openModal} style={!wide && styles.flexBtn} />
        </View>
      </View>

      {wide && employees.length > 0 ? (
        <View style={styles.tableHead}>
          <Text style={[type.caption, styles.colName]}>Name</Text>
          <Text style={[type.caption, styles.colPos]}>Position</Text>
          <Text style={[type.caption, styles.colStatus]}>Status</Text>
          <Text style={[type.caption, styles.colSalary]}>Salary</Text>
          <Text style={[type.caption, styles.colActions, styles.right]}>Actions</Text>
        </View>
      ) : null}
    </View>
  );

  const empty = loading ? (
    <ActivityIndicator style={{ marginTop: spacing.xxl }} size="large" color={colors.primary} />
  ) : (
    <View style={styles.empty}>
      <Text style={type.section}>No employees found</Text>
      <Text style={[styles.muted, { marginTop: spacing.xs }]}>
        {term ? `No results for "${term}". Try a different keyword.` : 'Add your first employee to get started.'}
      </Text>
    </View>
  );

  return (
    <>
      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        extraData={[busyId, wide]}
      />

      <AppModal
        visible={modalOpen}
        title="Add Employee"
        onClose={closeModal}
        footer={
          <>
            <Button title="Cancel" variant="ghost" onPress={closeModal} disabled={saving} />
            <Button title="Save" onPress={handleSave} loading={saving} />
          </>
        }
      >
        <Input
          label="Name"
          value={form.name}
          onChangeText={setField('name')}
          placeholder="e.g. Somchai Jaidee"
          error={errors.name}
          editable={!saving}
        />
        <Input
          label="Position"
          value={form.position}
          onChangeText={setField('position')}
          placeholder="e.g. Software Engineer"
          error={errors.position}
          editable={!saving}
        />
        <Input
          label="Salary (THB)"
          value={form.salary}
          onChangeText={setField('salary')}
          placeholder="e.g. 45000"
          keyboardType="numeric"
          inputMode="decimal"
          error={errors.salary}
          editable={!saving}
          onSubmitEditing={handleSave}
        />
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },

  toolbar: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  toolbarNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  search: { flex: 1, marginBottom: 0 },
  searchNarrow: { flex: 0, marginBottom: spacing.md },
  toolbarButtons: { flexDirection: 'row', gap: spacing.sm },
  flexBtn: { flex: 1 },
  clear: { fontSize: 20, lineHeight: 20, color: colors.textMuted, paddingHorizontal: spacing.xs },

  searchIcon: { width: 16, height: 16, marginRight: spacing.sm },
  searchCircle: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.textMuted },
  searchHandle: {
    position: 'absolute',
    width: 2,
    height: 6,
    backgroundColor: colors.textMuted,
    left: 11,
    top: 9,
    transform: [{ rotate: '-45deg' }],
  },

  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowAlt: { backgroundColor: colors.surfaceAlt },
  rowLast: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  cell: { fontSize: 14, color: colors.text, paddingRight: spacing.md },
  strong: { fontWeight: '600' },
  colName: { flex: 2.2 },
  colPos: { flex: 2 },
  colStatus: { flex: 1.3 },
  colSalary: { flex: 1.4, textAlign: 'right', paddingRight: spacing.xl },
  colActions: { flex: 2.4 },
  right: { textAlign: 'right' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },

  mCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  mTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mSalary: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  muted: { fontSize: 13, color: colors.textMuted },

  empty: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
