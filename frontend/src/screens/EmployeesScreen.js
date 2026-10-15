import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { apiRequest } from '../api';
import { confirmAsync, showToast } from '../alert';
import AppModal from '../components/AppModal';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import Input from '../components/Input';
import StatusBadge from '../components/StatusBadge';
import { colors, fonts, formatDate, MAX_WIDTH, spacing, type, WIDE } from '../theme';

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const EMPTY_FORM = { name: '', position: '', salary: '' };
const NARROW = 420;

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

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const position = form.position.trim();
  const salary = form.salary.trim();
  if (!name) errors.name = 'Enter a full name.';
  else if (name.length > 100) errors.name = 'Name must be at most 100 characters.';
  if (!position) errors.position = 'Enter a position.';
  else if (position.length > 100) errors.position = 'Position must be at most 100 characters.';
  if (!salary || !AMOUNT_RE.test(salary) || !(Number(salary) > 0)) errors.salary = 'Enter a salary greater than ฿0.';
  else if (Number(salary) > 99999999.99) errors.salary = 'Salary is too large.';
  return errors;
}

function SearchIcon() {
  return (
    <View style={styles.searchIcon}>
      <View style={styles.searchCircle} />
      <View style={styles.searchHandle} />
    </View>
  );
}

// Salary with muted ฿ prefix
function Money({ value, style }) {
  return (
    <Text style={[type.cell, style]}>
      <Text style={styles.baht}>฿</Text>
      {Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}
    </Text>
  );
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
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // employee being edited, null = adding
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState({ min: '', max: '' });
  const [rangeErrors, setRangeErrors] = useState({});

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
        setStats({ total: all.length, active, leave: all.length - active });
        setPositions([...new Set(all.map((e) => e.position))].sort((a, b) => a.localeCompare(b)));
      } catch (e) {
        if (id === requestId.current) onError(e, 'Could not load employees');
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
    if (!min && !max) errs.min = 'Enter a minimum, a maximum, or both.';
    if (min && !AMOUNT_RE.test(min)) errs.min = 'Minimum must be a number of 0 or more.';
    if (max && !AMOUNT_RE.test(max)) errs.max = 'Maximum must be a number of 0 or more.';
    if (!errs.min && !errs.max && min && max && Number(min) > Number(max)) {
      errs.max = 'Maximum must be greater than or equal to minimum.';
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
    if (busyId) return;
    const ok = await confirmAsync(
      'Delete employee',
      `Are you sure? "${item.name}" (${item.position}) will be permanently deleted.`,
      { confirmText: 'Delete', cancelText: 'Cancel', destructive: true }
    );
    if (!ok) return;
    setBusyId(item.id);
    try {
      await apiRequest(`/employees/${encodeURIComponent(item.id)}`, { method: 'DELETE', token });
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
  const hasFilters = !!(filters.position || filters.status || filters.salary.key !== 'any');
  const pad = wide ? spacing.s10 : spacing.s5;

  const actions = (item) => {
    const busy = busyId === item.id;
    return (
      <View style={[styles.actions, !wide && styles.actionsLeft]}>
        <Button title="Edit" variant="link" onPress={() => openEdit(item)} disabled={!!busyId} />
        <View style={styles.vr} />
        <Button
          title="Toggle status"
          loadingTitle="Updating…"
          variant="link"
          onPress={() => handleToggle(item.id)}
          loading={busy}
          disabled={!!busyId && !busy}
        />
        <View style={styles.vr} />
        <Button title="Delete" variant="linkDanger" onPress={() => handleDelete(item)} disabled={!!busyId} />
      </View>
    );
  };

  const renderRow = ({ item, index }) => {
    if (wide) {
      return (
        <View style={styles.row}>
          <Text style={[type.small, styles.colNo]}>{String(index + 1).padStart(2, '0')}</Text>
          <Pressable style={styles.colName} onPress={() => openEdit(item)}>
            <Text style={type.cell} numberOfLines={1}>{item.name}</Text>
          </Pressable>
          <Text style={[type.body, styles.colPos]} numberOfLines={1}>{item.position}</Text>
          <View style={styles.colStatus}><StatusBadge status={item.status} /></View>
          <Money value={item.salary} style={styles.colSalary} />
          <View style={styles.colActions}>{actions(item)}</View>
        </View>
      );
    }
    return (
      <View style={styles.mRow}>
        <View style={styles.mTop}>
          <Pressable style={{ flex: 1 }} onPress={() => openEdit(item)}>
            <Text style={type.cell} numberOfLines={1}>{item.name}</Text>
            <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>{item.position}</Text>
          </Pressable>
          <View style={styles.mRight}>
            <Money value={item.salary} />
            <StatusBadge status={item.status} style={{ marginTop: spacing.s1 }} />
          </View>
        </View>
        <View style={{ marginTop: spacing.s3 }}>{actions(item)}</View>
      </View>
    );
  };

  const statCells = [
    { label: wide ? 'Total staff' : 'Total', value: stats.total, sub: 'Headcount on record' },
    {
      label: 'Active',
      value: stats.active,
      sub: stats.total ? `${Math.round((stats.active / stats.total) * 100)}% of staff` : '—',
    },
    { label: 'On leave', value: stats.leave, sub: 'Currently away', color: colors.brass },
  ];

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>People directory</Text>
          <Text style={[wide ? type.title : type.titleMobile, { marginTop: spacing.s2 }]}>Employees</Text>
        </View>
        {wide ? <Text style={type.small}>As of {formatDate(new Date())}</Text> : null}
      </View>

      <View style={styles.stats}>
        {statCells.map((s, i) => (
          <View
            key={s.label}
            style={[
              styles.stat,
              { paddingLeft: i === 0 ? 0 : wide ? spacing.s8 : spacing.s3 },
              i > 0 && styles.statDivider,
            ]}
          >
            <Text style={type.label}>{s.label}</Text>
            <Text style={[wide ? type.numXL : type.numL, styles.statValue, s.color && { color: s.color }]}>
              {s.value}
            </Text>
            {wide ? <Text style={type.small}>{s.sub}</Text> : null}
          </View>
        ))}
      </View>

      <View style={[styles.toolbar, !wide && styles.toolbarNarrow]}>
        <Input
          containerStyle={wide ? styles.searchWide : styles.searchNarrow}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or position"
          autoCapitalize="none"
          autoCorrect={false}
          left={<SearchIcon />}
          right={
            searching ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                <Text style={styles.clearX}>×</Text>
              </Pressable>
            ) : null
          }
        />
        {wide ? (
          <View style={styles.toolbarButtons}>
            <Button title="Analyze Salary Structure" variant="secondary" onPress={onAnalyze} loading={analyzing} />
            <Button title="+ Add Employee" onPress={openAdd} />
          </View>
        ) : (
          <View style={[styles.toolbarButtons, veryNarrow && styles.stack]}>
            <Button title="+ Add Employee" onPress={openAdd} style={!veryNarrow && styles.flex} />
            <Button
              title="Analyze Salary Structure"
              variant="secondary"
              onPress={onAnalyze}
              loading={analyzing}
              style={!veryNarrow && styles.flex}
            />
          </View>
        )}
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
          <Button title="Clear filters" variant="link" onPress={clearFilters} style={{ marginLeft: spacing.s2 }} />
        ) : null}
      </View>

      <View style={styles.tableHead}>
        {wide ? (
          <>
            <Text style={[type.label, styles.colNo]}>No.</Text>
            <Text style={[type.label, styles.colName]}>Name</Text>
            <Text style={[type.label, styles.colPos]}>Position</Text>
            <Text style={[type.label, styles.colStatus]}>Status</Text>
            <Text style={[type.label, styles.colSalary]}>Salary</Text>
            <Text style={[type.label, styles.colActions, styles.right]}>Actions</Text>
          </>
        ) : (
          <>
            <Text style={[type.label, { flex: 1 }]}>Name / Position</Text>
            <Text style={type.label}>Salary</Text>
          </>
        )}
      </View>
    </View>
  );

  const footer = !loading ? (
    <View style={styles.footer}>
      <Text style={type.small}>
        {wide
          ? `Showing ${employees.length} of ${stats.total} employees`
          : `Showing ${employees.length} of ${stats.total} · monthly gross, THB`}
      </Text>
      {wide ? <Text style={type.small}>Salaries shown as monthly gross, Thai Baht</Text> : null}
    </View>
  ) : null;

  let empty;
  if (loading) {
    empty = <ActivityIndicator style={{ marginVertical: spacing.s10 }} color={colors.ink} />;
  } else if (term || hasFilters) {
    empty = (
      <View style={styles.empty}>
        <Text style={type.label}>No results</Text>
        <Text style={[wide ? type.dialog : type.section, { marginTop: spacing.s2 }]}>
          {term && !hasFilters ? `Nobody matches “${term}”.` : 'Nobody matches these filters.'}
        </Text>
        <Text style={[type.body, { marginTop: spacing.s3, maxWidth: 520 }]}>
          Check the spelling, or search by position instead — for example “Engineer” or “Accountant”.
        </Text>
        <Button
          title={hasFilters ? 'Clear filters' : 'Clear search'}
          variant="link"
          onPress={clearFilters}
          style={{ marginTop: spacing.s6, alignSelf: 'flex-start' }}
        />
      </View>
    );
  } else {
    empty = (
      <View style={styles.empty}>
        <Text style={type.label}>Empty directory</Text>
        <Text style={[wide ? type.dialog : type.section, { marginTop: spacing.s2 }]}>No employees yet.</Text>
        <Text style={[type.body, { marginTop: spacing.s3 }]}>Add your first employee to get started.</Text>
        <Button title="+ Add Employee" onPress={openAdd} style={{ marginTop: spacing.s6, alignSelf: 'flex-start' }} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
        keyboardShouldPersistTaps="handled"
        extraData={[busyId, wide]}
      />

      <AppModal
        visible={modalOpen}
        eyebrow={editing ? 'Edit record' : 'New record'}
        title={editing ? 'Edit employee' : 'Add employee'}
        onClose={closeModal}
        footer={
          <>
            <Button title="Cancel" variant="secondary" onPress={closeModal} disabled={saving} />
            <Button title={editing ? 'Save changes' : 'Save employee'} onPress={handleSave} loading={saving} />
          </>
        }
      >
        <Input
          label="Full name"
          variant="dialog"
          value={form.name}
          onChangeText={setField('name')}
          placeholder="Full name"
          error={errors.name}
          editable={!saving}
        />
        <Input
          label="Position"
          variant="dialog"
          value={form.position}
          onChangeText={setField('position')}
          placeholder="Job title"
          error={errors.position}
          editable={!saving}
        />
        <Input
          label="Monthly salary"
          variant="dialog"
          prefix="฿"
          value={form.salary}
          onChangeText={setField('salary')}
          placeholder="0"
          keyboardType="numeric"
          inputMode="decimal"
          style={styles.alignRight}
          error={errors.salary}
          editable={!saving}
          onSubmitEditing={handleSave}
        />
      </AppModal>

      <AppModal
        visible={rangeOpen}
        eyebrow="Filter"
        title="Salary range"
        onClose={() => setRangeOpen(false)}
        footer={
          <>
            <Button title="Cancel" variant="secondary" onPress={() => setRangeOpen(false)} />
            <Button title="Apply" onPress={applyRange} />
          </>
        }
      >
        <Input
          label="Minimum salary"
          variant="dialog"
          prefix="฿"
          value={range.min}
          onChangeText={(v) => setRange((r) => ({ ...r, min: v }))}
          placeholder="No minimum"
          keyboardType="numeric"
          inputMode="decimal"
          error={rangeErrors.min}
        />
        <Input
          label="Maximum salary"
          variant="dialog"
          prefix="฿"
          value={range.max}
          onChangeText={(v) => setRange((r) => ({ ...r, max: v }))}
          placeholder="No maximum"
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
  content: { paddingTop: spacing.s10, paddingBottom: spacing.s10, width: '100%', maxWidth: MAX_WIDTH + 96, alignSelf: 'center' },
  baht: { color: colors.muted, fontFamily: fonts.sans },
  alignRight: { textAlign: 'right' },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: spacing.s6,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },

  stats: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.hairline, marginBottom: spacing.s8 },
  stat: { flex: 1, paddingVertical: spacing.s7 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.hairline },
  statValue: { marginTop: spacing.s2, marginBottom: spacing.s2 },

  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s4 },
  toolbarNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  searchWide: { flex: 1, maxWidth: 480, marginBottom: 0 },
  searchNarrow: { marginBottom: spacing.s3 },
  toolbarButtons: { flexDirection: 'row', gap: spacing.s3 },
  stack: { flexDirection: 'column' },
  flex: { flex: 1, paddingHorizontal: spacing.s3 },
  clearX: { fontSize: 20, lineHeight: 20, color: colors.muted, paddingHorizontal: spacing.s1 },

  searchIcon: { width: 16, height: 16, marginRight: spacing.s3 },
  searchCircle: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: colors.inkSoft },
  searchHandle: {
    position: 'absolute',
    width: 1.5,
    height: 6,
    backgroundColor: colors.inkSoft,
    left: 11,
    top: 9,
    transform: [{ rotate: '-45deg' }],
  },

  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.s2,
    marginTop: spacing.s4,
    marginBottom: spacing.s6,
  },

  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    paddingVertical: spacing.s4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s5,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  colNo: { width: 52 },
  colName: { flex: 2.4, paddingRight: spacing.s4 },
  colPos: { flex: 2.2, paddingRight: spacing.s4 },
  colStatus: { flex: 1.4 },
  colSalary: { flex: 1.3, textAlign: 'right' },
  colActions: { flex: 2.4 },
  right: { textAlign: 'right' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  actionsLeft: { justifyContent: 'flex-start' },
  vr: { width: 1, height: 14, backgroundColor: colors.hairline, marginHorizontal: spacing.s3 },

  mRow: { paddingVertical: spacing.s5, borderBottomWidth: 1, borderBottomColor: colors.hairlineSoft },
  mTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s3 },
  mRight: { alignItems: 'flex-end' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.s2,
    paddingTop: spacing.s5,
  },
  empty: { paddingVertical: spacing.s10, borderBottomWidth: 1, borderBottomColor: colors.hairline },
});
