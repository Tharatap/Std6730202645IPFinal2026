import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../api';
import { confirmAsync, showAlert } from '../alert';
import { colors, shadow } from '../theme';

const SALARY_RE = /^\d+(\.\d{1,2})?$/;
const TIER_COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B'];

const formatMoney = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const v = variantStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        v.btn,
        pressed && { opacity: 0.8 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text.color} />
      ) : (
        <Text style={[styles.btnText, v.text]}>{title}</Text>
      )}
    </Pressable>
  );
}

export default function DashboardScreen({ token, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [adding, setAdding] = useState(false);

  const [busyId, setBusyId] = useState(null);

  const [clusters, setClusters] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Any 401 → logout; other errors → alert
  const handleError = useCallback(
    (e, title = 'Error') => {
      if (e.status === 401) {
        showAlert('Session Expired', 'Please log in again.');
        onLogout();
        return;
      }
      showAlert(title, e.message);
    },
    [onLogout]
  );

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiRequest('/employees', { token });
      setEmployees(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      handleError(e, 'Load Failed');
    }
  }, [token, handleError]);

  useEffect(() => {
    (async () => {
      await fetchEmployees();
      setListLoading(false);
    })();
  }, [fetchEmployees]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (adding) return;
    const n = name.trim();
    const p = position.trim();
    const s = salary.trim();
    if (!n || !p || !s) {
      showAlert('Validation Error', 'Please fill in name, position and salary.');
      return;
    }
    if (!SALARY_RE.test(s) || !(Number(s) > 0)) {
      showAlert('Validation Error', 'Salary must be a positive number.');
      return;
    }
    setAdding(true);
    try {
      await apiRequest('/employees', {
        method: 'POST',
        token,
        body: { name: n, position: p, salary: Number(s) },
      });
      setName('');
      setPosition('');
      setSalary('');
      await fetchEmployees();
    } catch (e) {
      handleError(e, 'Add Failed');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await apiRequest(`/employees/${encodeURIComponent(id)}/status`, { method: 'PUT', token });
      await fetchEmployees();
    } catch (e) {
      handleError(e, 'Update Failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (busyId) return;
    const ok = await confirmAsync('Confirm', 'Are you sure?');
    if (!ok) return;
    setBusyId(id);
    try {
      await apiRequest(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE', token });
      await fetchEmployees();
    } catch (e) {
      handleError(e, 'Delete Failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const res = await apiRequest('/employees/salary-clusters', { token });
      setClusters(Array.isArray(res?.clusters) ? res.clusters : []);
    } catch (e) {
      handleError(e, 'Analysis Failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const activeCount = employees.filter((e) => e.status === 'Active').length;

  const renderItem = ({ item }) => {
    const active = item.status === 'Active';
    const busy = busyId === item.id;
    return (
      <View style={[styles.card, styles.empCard]}>
        <View style={styles.empTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.empPos} numberOfLines={1}>{item.position}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: active ? colors.successSoft : colors.warningSoft }]}>
            <View style={[styles.dot, { backgroundColor: active ? colors.success : colors.warning }]} />
            <Text style={[styles.badgeText, { color: active ? colors.success : colors.warning }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.empBottom}>
          <View>
            <Text style={styles.salaryLabel}>Salary</Text>
            <Text style={styles.salary}>฿ {formatMoney(item.salary)}</Text>
          </View>
          <View style={styles.actions}>
            <Button
              title="Toggle Status"
              variant="secondary"
              onPress={() => handleToggle(item.id)}
              loading={busy}
              disabled={!!busyId && !busy}
            />
            <Button
              title="Delete"
              variant="danger"
              onPress={() => handleDelete(item.id)}
              disabled={!!busyId}
              style={{ marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    );
  };

  const header = (
    <View>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.card, styles.stat]}>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.card, styles.stat]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.card, styles.stat]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{employees.length - activeCount}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </View>
      </View>

      {/* Add form */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add Employee</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          editable={!adding}
        />
        <TextInput
          style={styles.input}
          placeholder="Position"
          placeholderTextColor="#9CA3AF"
          value={position}
          onChangeText={setPosition}
          editable={!adding}
        />
        <TextInput
          style={styles.input}
          placeholder="Salary (e.g. 35000)"
          placeholderTextColor="#9CA3AF"
          value={salary}
          onChangeText={setSalary}
          keyboardType="numeric"
          inputMode="decimal"
          editable={!adding}
        />
        <Button title="Add Employee" onPress={handleAdd} loading={adding} />
      </View>

      {/* Salary analytics */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Salary Analytics</Text>
        <Text style={styles.sectionHint}>Group salaries into 3 tiers using K-Means clustering</Text>
        <Button
          title="Analyze Salary Structure"
          variant="dark"
          onPress={handleAnalyze}
          disabled={analyzing}
        />
        {analyzing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.muted}>Analyzing salary data...</Text>
          </View>
        ) : clusters ? (
          clusters.length === 0 ? (
            <Text style={[styles.muted, styles.center]}>No data</Text>
          ) : (
            <View style={styles.tierRow}>
              {clusters.map((c, i) => (
                <View
                  key={c.group}
                  style={[styles.tierCard, { borderTopColor: TIER_COLORS[i % TIER_COLORS.length] }]}
                >
                  <Text style={[styles.tierName, { color: TIER_COLORS[i % TIER_COLORS.length] }]}>
                    {c.group}
                  </Text>
                  <Text style={styles.tierLabel}>Avg Salary</Text>
                  <Text style={styles.tierValue}>฿ {formatMoney(c.centroid)}</Text>
                  <Text style={styles.tierLabel}>Employees</Text>
                  <Text style={styles.tierCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          )
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, styles.listTitle]}>Employees</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topInner}>
          <View>
            <Text style={styles.topTitle}>HR Dashboard</Text>
            <Text style={styles.topSub}>Manage employees & salary insights</Text>
          </View>
          <Button title="Logout" variant="ghost" onPress={onLogout} />
        </View>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          listLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} size="large" color={colors.primary} />
          ) : (
            <View style={[styles.card, styles.center]}>
              <Text style={styles.muted}>No employees yet</Text>
            </View>
          )
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const variantStyles = {
  primary: { btn: { backgroundColor: colors.primary }, text: { color: '#fff' } },
  dark: { btn: { backgroundColor: colors.text }, text: { color: '#fff' } },
  secondary: { btn: { backgroundColor: colors.primarySoft }, text: { color: colors.primary } },
  danger: { btn: { backgroundColor: colors.dangerSoft }, text: { color: colors.danger } },
  ghost: { btn: { backgroundColor: 'rgba(255,255,255,0.18)' }, text: { color: '#fff' } },
};

const topPad = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : Platform.OS === 'ios' ? 54 : 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { backgroundColor: colors.primary, paddingTop: topPad, paddingBottom: 18, paddingHorizontal: 16 },
  topInner: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  topSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 900, alignSelf: 'center' },

  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, ...shadow },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
  sectionHint: { fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 12 },
  listTitle: { marginTop: 6, marginLeft: 2 },
  muted: { color: colors.muted, fontSize: 14, marginTop: 8 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
  },

  btn: { borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  btnText: { fontSize: 14, fontWeight: '700' },

  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  tierCard: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderTopWidth: 4,
    padding: 14,
  },
  tierName: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  tierLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  tierValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  tierCount: { fontSize: 18, fontWeight: '800', color: colors.text },

  empCard: { paddingVertical: 14 },
  empTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 17 },
  empName: { fontSize: 16, fontWeight: '700', color: colors.text },
  empPos: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  salaryLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  salary: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  actions: { flexDirection: 'row' },
});
