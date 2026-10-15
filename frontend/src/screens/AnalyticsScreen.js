import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { colors, formatMoney, MAX_WIDTH, radius, spacing, tierColors, type } from '../theme';

const CHART_H = 180;
const GRID_STEPS = 4;

const tierColor = (i) => tierColors[i % tierColors.length];

function BarChart({ clusters }) {
  const max = Math.max(1, ...clusters.map((c) => c.count));
  return (
    <View>
      <View style={styles.plot}>
        {Array.from({ length: GRID_STEPS }, (_, i) => (
          <View key={i} style={[styles.gridline, { bottom: (CHART_H * (i + 1)) / GRID_STEPS }]} />
        ))}
        {clusters.map((c, i) => (
          <View key={c.group} style={styles.barCol}>
            <Text style={styles.barValue}>{c.count}</Text>
            <View
              style={[
                styles.bar,
                { height: Math.max(4, (c.count / max) * CHART_H), backgroundColor: tierColor(i) },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {clusters.map((c) => (
          <View key={c.group} style={styles.labelCol}>
            <Text style={styles.barLabel}>{c.group}</Text>
            <Text style={styles.barSub}>{formatMoney(c.centroid)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen({ analysis, analyzing, onAnalyze }) {
  const clusters = analysis?.clusters || [];
  const kpi = analysis?.kpi;

  let content;
  if (analyzing) {
    content = (
      <View style={styles.state}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.muted, { marginTop: spacing.md }]}>Running K-Means clustering...</Text>
      </View>
    );
  } else if (!analysis) {
    content = (
      <Card style={styles.state}>
        <Text style={type.section}>No analysis yet</Text>
        <Text style={[styles.muted, styles.center, { marginTop: spacing.xs }]}>
          Click "Analyze Salary Structure" to group salaries into tiers.
        </Text>
      </Card>
    );
  } else if (clusters.length === 0) {
    content = (
      <Card style={styles.state}>
        <Text style={type.section}>No data</Text>
        <Text style={[styles.muted, { marginTop: spacing.xs }]}>There are no employees to analyze.</Text>
      </Card>
    );
  } else {
    content = (
      <>
        {kpi ? (
          <View style={styles.row}>
            <StatCard label="Company Avg Salary" value={formatMoney(Math.round(kpi.avg))} color={colors.primary} style={styles.kpi} />
            <StatCard label="Highest" value={formatMoney(kpi.max)} color={colors.accent} style={styles.kpi} />
            <StatCard label="Lowest" value={formatMoney(kpi.min)} color={tierColors[0]} style={styles.kpi} />
          </View>
        ) : null}

        <Card title="Employees per Tier" subtitle="1D K-Means clustering (k = 3) on base salary" style={styles.block}>
          <BarChart clusters={clusters} />
        </Card>

        <View style={styles.tiers}>
          {clusters.map((c, i) => (
            <View key={c.group} style={[styles.tierCard, { borderTopColor: tierColor(i) }]}>
              <View style={styles.tierHead}>
                <View style={[styles.dot, { backgroundColor: tierColor(i) }]} />
                <Text style={type.section}>{c.group}</Text>
              </View>
              <Text style={type.caption}>Employees</Text>
              <Text style={styles.tierValue}>{c.count}</Text>
              <Text style={[type.caption, { marginTop: spacing.sm }]}>Average Base Salary</Text>
              <Text style={styles.tierValue}>{formatMoney(c.centroid)}</Text>
            </View>
          ))}
        </View>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={type.title}>Salary Analytics</Text>
          <Text style={styles.muted}>
            {analysis?.at ? `Last analyzed: ${analysis.at.toLocaleString()}` : 'Not analyzed yet'}
          </Text>
        </View>
        <Button title="Analyze Salary Structure" onPress={onAnalyze} loading={analyzing} />
      </View>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  center: { textAlign: 'center' },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  block: { marginBottom: spacing.lg },
  kpi: { minWidth: 160 },

  plot: {
    height: CHART_H + 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
  gridline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.grid },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  bar: { width: '50%', maxWidth: 72, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labels: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  labelCol: { flex: 1, alignItems: 'center' },
  barLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  barSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tierCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    padding: spacing.lg,
  },
  tierHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  tierValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 },
});
