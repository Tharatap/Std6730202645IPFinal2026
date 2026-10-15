import { useCallback, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { apiRequest } from '../api';
import { showAlert, showError } from '../alert';
import Button from '../components/Button';
import { colors, fonts, MAX_WIDTH, spacing, type, WIDE } from '../theme';
import EmployeesScreen from './EmployeesScreen';
import AnalyticsScreen from './AnalyticsScreen';

const TABS = [
  { key: 'employees', label: 'Employees' },
  { key: 'analytics', label: 'Analytics' },
];

const TOP_PAD = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : Platform.OS === 'ios' ? 48 : 0;
const BOTTOM_PAD = Platform.OS === 'ios' ? 24 : spacing.s2;
const MIN_ANALYZE_MS = 900; // keep the progress state visible briefly

export default function MainScreen({ token, onLogout }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  const [tab, setTab] = useState('employees');
  const [analysis, setAnalysis] = useState(null); // { clusters, employees, at }
  const [analyzing, setAnalyzing] = useState(false);

  // Any 401 → logout; other errors → dialog
  const handleError = useCallback(
    (e, title = 'Error') => {
      if (e.status === 401) {
        showAlert('Session expired', 'Please sign in again.', { type: 'warning' });
        onLogout();
        return;
      }
      showError(e, title);
    },
    [onLogout]
  );

  const analyze = useCallback(async () => {
    setTab('analytics');
    if (analyzing) return;
    setAnalyzing(true);
    const started = Date.now();
    try {
      const [clusterRes, empRes] = await Promise.all([
        apiRequest('/employees/salary-clusters', { token }),
        apiRequest('/employees', { token }),
      ]);
      const wait = MIN_ANALYZE_MS - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setAnalysis({
        clusters: Array.isArray(clusterRes?.clusters) ? clusterRes.clusters : [],
        employees: Array.isArray(empRes?.data) ? empRes.data : [],
        at: new Date(),
      });
    } catch (e) {
      handleError(e, 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [token, analyzing, handleError]);

  const clearAnalysis = useCallback(() => setAnalysis(null), []);

  const tabs = (
    <View style={wide ? styles.topTabs : styles.bottomTabs}>
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <Pressable
            key={t.key}
            style={wide ? styles.topTab : styles.bottomTab}
            onPress={() => setTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {!wide ? <View style={[styles.bottomIndicator, active && styles.indicatorOn]} /> : null}
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            {wide ? <View style={[styles.topIndicator, active && styles.indicatorOn]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <View style={styles.brand}>
              <Text style={styles.brandText}>HR Manager</Text>
              {wide ? <Text style={[type.label, styles.brandSub]}>Salary Analytics</Text> : null}
            </View>
            <View style={styles.headerRight}>
              {wide ? (
                <>
                  <Text style={type.small}>
                    Signed in as <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>admin</Text>
                  </Text>
                  <View style={styles.vr} />
                </>
              ) : null}
              <Button title="Log out" variant="link" onPress={onLogout} />
            </View>
          </View>
        </View>
      </View>

      {wide ? (
        <View style={styles.tabBarTop}>
          <View style={styles.inner}>{tabs}</View>
        </View>
      ) : null}

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

      {!wide ? tabs : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  header: {
    paddingTop: TOP_PAD,
    paddingHorizontal: spacing.s5,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.s5 },
  brand: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s4 },
  brandText: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink, letterSpacing: -0.4 },
  brandSub: { color: colors.muted },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  vr: { width: 1, height: 18, backgroundColor: colors.hairline, marginHorizontal: spacing.s5 },

  tabBarTop: { paddingHorizontal: spacing.s5, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  topTabs: { flexDirection: 'row', gap: spacing.s8 },
  topTab: { paddingTop: spacing.s4 },
  topIndicator: { height: 2, marginTop: spacing.s3, backgroundColor: 'transparent' },
  indicatorOn: { backgroundColor: colors.brass },

  bottomTabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.paper,
    paddingBottom: BOTTOM_PAD,
  },
  bottomTab: { flex: 1, alignItems: 'center', paddingTop: spacing.s5, paddingBottom: spacing.s3 },
  bottomIndicator: { position: 'absolute', top: -1, left: 0, right: 0, height: 2, backgroundColor: 'transparent' },

  tabText: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22, color: colors.muted },
  tabTextActive: { fontFamily: fonts.sansSemi, color: colors.ink },

  body: { flex: 1 },
  page: { flex: 1 },
  hidden: { display: 'none' },
});
