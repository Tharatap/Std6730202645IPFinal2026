import { useCallback, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../api';
import { showAlert } from '../alert';
import Button from '../components/Button';
import { colors, MAX_WIDTH, spacing } from '../theme';
import EmployeesScreen from './EmployeesScreen';
import AnalyticsScreen from './AnalyticsScreen';

const TABS = [
  { key: 'employees', label: 'Employees' },
  { key: 'analytics', label: 'Analytics' },
];

const TOP_PAD =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.sm : Platform.OS === 'ios' ? 54 : spacing.lg;
const BOTTOM_PAD = Platform.OS === 'ios' ? 24 : spacing.sm;

export default function MainScreen({ token, onLogout }) {
  const [tab, setTab] = useState('employees');
  const [analysis, setAnalysis] = useState(null); // { clusters, kpi, at }
  const [analyzing, setAnalyzing] = useState(false);

  // Any 401 → logout; other errors → alert
  const handleError = useCallback(
    (e, title = 'Error') => {
      if (e.status === 401) {
        showAlert('Session Expired', 'Please sign in again.');
        onLogout();
        return;
      }
      showAlert(title, e.message);
    },
    [onLogout]
  );

  const analyze = useCallback(async () => {
    setTab('analytics');
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const [clusterRes, empRes] = await Promise.all([
        apiRequest('/employees/salary-clusters', { token }),
        apiRequest('/employees', { token }),
      ]);
      const clusters = Array.isArray(clusterRes?.clusters) ? clusterRes.clusters : [];
      const salaries = (Array.isArray(empRes?.data) ? empRes.data : [])
        .map((e) => Number(e.salary))
        .filter(Number.isFinite);
      const kpi = salaries.length
        ? {
            avg: salaries.reduce((a, b) => a + b, 0) / salaries.length,
            max: Math.max(...salaries),
            min: Math.min(...salaries),
          }
        : null;
      setAnalysis({ clusters, kpi, at: new Date() });
    } catch (e) {
      handleError(e, 'Analysis Failed');
    } finally {
      setAnalyzing(false);
    }
  }, [token, analyzing, handleError]);

  const clearAnalysis = useCallback(() => setAnalysis(null), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>HR Manager</Text>
            <Text style={styles.subtitle}>Employee & Salary Analytics</Text>
          </View>
          <Button
            title="Logout"
            variant="ghost"
            size="sm"
            onPress={onLogout}
            style={styles.logout}
            textStyle={styles.logoutText}
          />
        </View>
      </View>

      <View style={styles.body}>
        {/* Both tabs stay mounted so search/list state survives tab switches */}
        <View style={[styles.page, tab !== 'employees' && styles.hidden]}>
          <EmployeesScreen
            token={token}
            onError={handleError}
            onAnalyze={analyze}
            analyzing={analyzing}
            onDataChanged={clearAnalysis}
          />
        </View>
        <View style={[styles.page, tab !== 'analytics' && styles.hidden]}>
          <AnalyticsScreen analysis={analysis} analyzing={analyzing} onAnalyze={analyze} />
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={styles.tab}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.indicator, active && styles.indicatorActive]} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.primary,
    paddingTop: TOP_PAD,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  headerInner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textInverse },
  subtitle: { fontSize: 13, color: colors.textInverseMuted, marginTop: 2 },
  logout: { borderColor: colors.textInverseMuted },
  logoutText: { color: colors.textInverse },
  body: { flex: 1 },
  page: { flex: 1 },
  hidden: { display: 'none' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: BOTTOM_PAD,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
  indicator: { position: 'absolute', top: 0, height: 3, width: 48, borderRadius: 2, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
});
