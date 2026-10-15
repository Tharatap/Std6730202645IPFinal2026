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
import { confirmAsync, showToast } from '../alert';
import AppModal from '../components/AppModal';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import Input from '../components/Input';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { colors, formatMoney, MAX_WIDTH, radius, shadow, spacing, type } from '../theme';

const SALARY_RE = /^\d+(\.\d{1,2})?$/;
const EMPTY_FORM = { name: '', position: '', salary: '' };
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'On Leave', value: 'On Leave' },
];

// Non-overlapping, inclusive ranges
const SALARY_PRESETS = {
  any: { label: 'Any salary', min: null, max: null },
  lt20: { label: 'Under ฿20,000', min: null, max: 19999.99 },
  '20to50': { label: '฿20,000 – ฿49,999', min: 20000, max: 49999.99 },
  '50to100': { label: '฿50,000 – ฿99,999', min: 50000, max: 99999.99 },
  gte100: { label: '฿100,000 and above', min: 100000, max: null },
};
const SALARY_OPTIONS = [
  ...Object.entries(SALARY_PRESETS).map(([value, p]) => ({ label: p.label, value })),
  { label: 'Custom range…', value: 'custom' },
];
const NO_FILTERS = { position: '', status: '', salary: { key: 'any', min: null, max: null } };

const fmt = (n) => `฿${Number(n).toLocaleString('en-US')}`;
const salaryLabel = (s) => {
  if (s.key !== 'custom') return SALARY_PRESETS[s.key].label;
  if (s.min !== null && s.max !== null) return `${fmt(s.min)} – ${fmt(s.max)}`;
  if (s.min !== null) return `${fmt(s.min)} and above`;
  return `Up to ${fmt(s.max)}`;
};

function buildQuery(q) {
  const params = [];
  if (q.search) params.push(`search=${encodeURIComponent(q.search)}`);
  if (q.position) params.push(`position=${encodeURIComponent(q.position)}`);
  if (q.status) params.push(`status=${encodeURIComponent(q.status)}`);
  if (q.salary.min !== null) params.push(`minSalary=${q.salary.min}`);
  if (q.salary.max !== null) params.push(`maxSalary=${q.salary.max}`);
  return params.length ? `?${params.join('&')}` : '';
}
const WIDE = 768;
const NARROW = 420;

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
  const veryNarrow = width < NARROW;

  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, leave: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [positions, setPositions] = useState([]);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState({ min: '', max: '' });
  const [rangeErrors, setRangeErrors] = useState({});
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // employee being edited, null = adding
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const appliedQuery = useRef({ search: '', ...NO_FILTERS });
  const prevSearch = useRef('');
  const requestId = useRef(0);
  const firstLoad = useRef(true);

  // Loads the (filtered) list plus unfiltered stats; ignores stale responses
  const load = useCallback(
    async (query) => {
      const id = ++requestId.current;
      try {
        const qs = buildQuery(query);
        const listReq = apiRequest(`/employees${qs}`, { token });
        const allReq = qs ? apiRequest('/employees', { token }) : listReq;
        const [listRes, allRes] = await Promise.all([listReq, allReq]);
        if (id !== requestId.current) return;
        const list = Array.isArray(listRes?.data) ? listRes.data : [];
        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        const active = all.filter((e) => e.status === 'Active').length;
        appliedQuery.current = query;
        setEmployees(list);
        setPositions([...new Set(all.map((e) => e.position))].sort((a, b) => a.localeCompare(b)));
        setStats({ total: all.length, active, leave: all.length - active });
      } catch (e) {
        if (id === requestId.current) onError(e, 'Load Failed');
      }
    },
    [token, onError]
  );

  const refetch = useCallback(() => load(appliedQuery.current), [load]);

  // Show error; on 404 the row is gone → refresh the list
  const fail = (e, title) => {
    onError(e, title);
    if (e.status === 404) refetch();
  };

  // Search text is debounced (300ms); filter changes and the initial load apply immediately
  useEffect(() => {
    const term = search.trim();
    const typed = term !== prevSearch.current;
    prevSearch.current = term;
    const delay = firstLoad.current || !typed ? 0 : 300;
    if (!firstLoad.current) setSearching(true);
    const timer = setTimeout(async () => {
      await load({ search: term, ...filters });
      firstLoad.current = false;
      setLoading(false);
      setSearching(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [search, filters, load]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const selectSalary = (key) => {
    if (key === 'custom') {
      const s = filters.salary;
      setRange({ min: s.min !== null ? String(s.min) : '', max: s.max !== null ? String(s.max) : '' });
      setRangeErrors({});
      setRangeOpen(true);
      return;
    }
    setFilter('salary', { key, min: SALARY_PRESETS[key].min, max: SALARY_PRESETS[key].max });
  };

  const applyRange = () => {
    const min = range.min.trim();
    const max = range.max.trim();
    const errs = {};
    if (!min && !max) errs.min = 'Enter a minimum, a maximum, or both';
    if (min && !AMOUNT_RE.test(min)) errs.min = 'Minimum must be a number of 0 or more';
    if (max && !AMOUNT_RE.test(max)) errs.max = 'Maximum must be a number of 0 or more';
    if (!errs.min && !errs.max && min && max && Number(min) > Number(max)) {
      errs.max = 'Maximum must be greater than or equal to minimum';
    }
    setRangeErrors(errs);
    if (Object.keys(errs).length) return;
    setFilter('salary', { key: 'custom', min: min ? Number(min) : null, max: max ? Number(max) : null });
    setRangeOpen(false);
  };

  const clearFilters = () => {
    setSearch('');
    setFilters(NO_FILTERS);
  };

  const hasFilters = !!(filters.position || filters.status || filters.salary.key !== 'any');

  const handleToggle = async (id) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await apiRequest(`/employees/${encodeURIComponent(id)}/status`, { method: 'PUT', token });
      await refetch();
      showToast(`Status changed to ${res?.data?.status || 'updated'}`);
    } catch (e) {
      fail(e, 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item) => {
    const { id } = item;
    if (busyId) return;
    const ok = await confirmAsync(
      `Delete "${item.name}"?`,
      'This employee will be permanently removed from the database. This action cannot be undone.',
      { confirmText: 'Delete', cancelText: 'Cancel', destructive: true }
    );
    if (!ok) return;
    setBusyId(id);
    try {
      await apiRequest(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE', token });
      onDataChanged();
      await refetch();
      showToast('Employee deleted');
    } catch (e) {
      fail(e, 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    if (busyId) return;
    setEditing(item);
    setForm({ name: item.name, position: item.position, salary: String(item.salary) });
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
      const body = { name: form.name.trim(), position: form.position.trim(), salary: Number(form.salary.trim()) };
      if (editing) {
        await apiRequest(`/employees/${encodeURIComponent(editing.id)}`, { method: 'PUT', token, body });
      } else {
        await apiRequest('/employees', { method: 'POST', token, body });
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      onDataChanged();
      await refetch();
      showToast(editing ? 'Changes saved' : 'Employee added');
      setEditing(null);
    } catch (e) {
      if (e.status === 404) setModalOpen(false);
      fail(e, 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const term = search.trim();

  const actions = (item) => {
    const busy = busyId === item.id;
    return (
      <View style={styles.actions}>
        <Button title="Edit" variant="ghost" size="sm" onPress={() => openEdit(item)} disabled={!!busyId} />
        <Button
          title="Toggle Status"
          variant="secondary"
          size="sm"
          onPress={() => handleToggle(item.id)}
          loading={busy}
          disabled={!!busyId && !busy}
        />
        <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(item)} disabled={!!busyId} />
      </View>
    );
  };

  const renderRow = ({ item, index }) => {
    if (wide) {
      const last = index === employees.length - 1;
      return (
        <View style={[styles.row, index % 2 === 1 && styles.rowAlt, last && styles.rowLast]}>
          <Pressable style={styles.colName} onPress={() => openEdit(item)}>
            <Text style={[styles.cell, styles.strong, styles.link]} numberOfLines={1}>{item.name}</Text>
          </Pressable>
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
          <Pressable style={{ flex: 1 }} onPress={() => openEdit(item)}>
            <Text style={[type.body, styles.strong]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.muted} numberOfLines={1}>{item.position}</Text>
          </Pressable>
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
          containerStyle={wide ? styles.search : styles.searchNarrow}
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
        <View style={[styles.toolbarButtons, veryNarrow && styles.toolbarButtonsStack]}>
          <Button
            title="Analyze Salary Structure"
            variant="secondary"
            onPress={onAnalyze}
            loading={analyzing}
            style={!wide && !veryNarrow && styles.flexBtn}
          />
          <Button title="+ Add Employee" onPress={openAdd} style={!wide && !veryNarrow && styles.flexBtn} />
        </View>
      </View>

      <View style={styles.filters}>
        <Dropdown
          title="Position"
          label={filters.position ? `Position: ${filters.position}` : 'Position'}
          active={!!filters.position}
          value={filters.position}
          options={[{ label: 'All positions', value: '' }, ...positions.map((p) => ({ label: p, value: p }))]}
          onSelect={(v) => setFilter('position', v)}
          onClear={() => setFilter('position', '')}
        />
        <Dropdown
          title="Status"
          label={filters.status ? `Status: ${filters.status}` : 'Status'}
          active={!!filters.status}
          value={filters.status}
          options={STATUS_OPTIONS}
          onSelect={(v) => setFilter('status', v)}
          onClear={() => setFilter('status', '')}
        />
        <Dropdown
          title="Salary range"
          label={filters.salary.key !== 'any' ? `Salary: ${salaryLabel(filters.salary)}` : 'Salary'}
          active={filters.salary.key !== 'any'}
          value={filters.salary.key}
          options={SALARY_OPTIONS}
          onSelect={selectSalary}
          onClear={() => setFilter('salary', NO_FILTERS.salary)}
        />
        {hasFilters || term ? (
          <Pressable onPress={clearFilters} hitSlop={6}>
            <Text style={styles.clearAll}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>
      {!loading && (hasFilters || term) ? (
        <Text style={styles.count}>
          Showing {employees.length} of {stats.total} employees
        </Text>
      ) : null}

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
      <Text style={type.section}>
        {hasFilters ? 'No employees match these filters' : 'No employees found'}
      </Text>
      <Text style={[styles.muted, { marginTop: spacing.xs, textAlign: 'center' }]}>
        {hasFilters || term
          ? 'Try a different keyword or adjust the filters.'
          : 'Add your first employee to get started.'}
      </Text>
      {hasFilters || term ? (
        <Button
          title="Clear filters"
          variant="secondary"
          size="sm"
          onPress={clearFilters}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
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
        title={editing ? 'Edit Employee' : 'Add Employee'}
        onClose={closeModal}
        footer={
          <>
            <Button title="Cancel" variant="ghost" onPress={closeModal} disabled={saving} />
            <Button title={editing ? 'Save Changes' : 'Save'} onPress={handleSave} loading={saving} />
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

      <AppModal
        visible={rangeOpen}
        title="Custom salary range"
        onClose={() => setRangeOpen(false)}
        footer={
          <>
            <Button title="Cancel" variant="ghost" onPress={() => setRangeOpen(false)} />
            <Button title="Apply" onPress={applyRange} />
          </>
        }
      >
        <Input
          label="Minimum salary (THB)"
          value={range.min}
          onChangeText={(v) => setRange((r) => ({ ...r, min: v }))}
          placeholder="e.g. 20000 (leave empty for no minimum)"
          keyboardType="numeric"
          inputMode="decimal"
          error={rangeErrors.min}
        />
        <Input
          label="Maximum salary (THB)"
          value={range.max}
          onChangeText={(v) => setRange((r) => ({ ...r, max: v }))}
          placeholder="e.g. 50000 (leave empty for no maximum)"
          keyboardType="numeric"
          inputMode="decimal"
          error={rangeErrors.max}
          onSubmitEditing={applyRange}
        />
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },

  toolbar: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  clearAll: { fontSize: 13, fontWeight: '600', color: colors.primary, textDecorationLine: 'underline', marginLeft: spacing.xs },
  count: { fontSize: 13, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md },
  toolbarNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  search: { flex: 1, marginBottom: 0 },
  searchNarrow: { marginBottom: spacing.md },
  toolbarButtons: { flexDirection: 'row', gap: spacing.sm },
  toolbarButtonsStack: { flexDirection: 'column', alignItems: 'stretch' },
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
  colActions: { flex: 3.2 },
  link: { color: colors.primary },
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
