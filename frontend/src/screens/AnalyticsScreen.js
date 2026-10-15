import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Button from '../components/Button';
import {
  colors,
  fonts,
  formatDateTime,
  formatMoney,
  MAX_WIDTH,
  spacing,
  tierColors,
  tierNames,
  type,
  WIDE,
} from '../theme';

const CHART_H = 200;

const tierColor = (i) => tierColors[i % tierColors.length];
const tierName = (i) => tierNames[i] || `Tier ${i + 1}`;
const shortName = (name) => {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

// Assign each employee to the nearest centroid (same rule K-Means uses for its final assignment)
function groupByTier(clusters, employees) {
  const groups = clusters.map(() => []);
  for (const e of employees) {
    const s = Number(e.salary);
    let best = 0;
    for (let i = 1; i < clusters.length; i++) {
      if (Math.abs(s - clusters[i].centroid) < Math.abs(s - clusters[best].centroid)) best = i;
    }
    if (groups[best]) groups[best].push(e);
  }
  return groups;
}

function niceTicks(max) {
  const step = Math.max(1, Math.ceil(max / 3));
  return [0, step, step * 2, step * 3];
}

function BarChart({ clusters, wide }) {
  const ticks = niceTicks(Math.max(...clusters.map((c) => c.count)));
  const top = ticks[ticks.length - 1];
  return (
    <View>
      <View style={styles.plotRow}>
        <View style={[styles.yAxis, { height: CHART_H }]}>
          {ticks
            .slice()
            .reverse()
            .map((t) => (
              <Text key={t} style={[type.caption, styles.yTick]}>{t}</Text>
            ))}
        </View>
        <View style={[styles.plot, { height: CHART_H }]}>
          {ticks.slice(1).map((t) => (
            <View key={t} style={[styles.gridline, { bottom: (t / top) * CHART_H }]} />
          ))}
          {clusters.map((c, i) => (
            <View key={c.group} style={styles.barCol}>
              <Text style={[type.numM, styles.barValue]}>{c.count}</Text>
              <View
                style={[
                  styles.bar,
                  { width: wide ? 96 : 48, height: Math.max(2, (c.count / top) * CHART_H), backgroundColor: tierColor(i) },
                ]}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.xLabels}>
        <View style={styles.yAxis} />
        {clusters.map((c, i) => (
          <View key={c.group} style={styles.xLabel}>
            <Text style={[type.smallMedium, styles.center]}>
              {c.group}
              {wide ? ` · ${tierName(i)}` : ''}
            </Text>
            <Text style={[type.caption, styles.center]}>Avg {formatMoney(c.centroid)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Loading({ wide }) {
  return (
    <View style={[styles.block, styles.loading]}>
      <ActivityIndicator size="large" color={colors.ink} />
      <Text style={[wide ? type.dialog : type.section, styles.center, { marginTop: spacing.s5 }]}>
        Running K-Means clustering…
      </Text>
      <Text style={[type.body, styles.center, { color: colors.muted, marginTop: spacing.s2 }]}>
        Grouping salaries into 3 tiers.
      </Text>
    </View>
  );
}

export default function AnalyticsScreen({ analysis, analyzing, onAnalyze }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const clusters = analysis?.clusters || [];
  const employees = analysis?.employees || [];
  const pad = wide ? spacing.s10 : spacing.s5;

  let content;
  if (analyzing) {
    content = <Loading wide={wide} />;
  } else if (!analysis) {
    content = (
      <View style={styles.block}>
        <Text style={type.label}>Not yet analyzed</Text>
        <Text style={[wide ? type.dialog : type.section, { marginTop: spacing.s2 }]}>No analysis yet.</Text>
        <Text style={[type.body, { marginTop: spacing.s3, maxWidth: 520 }]}>
          Run “Analyze Salary Structure” to group every employee into salary tiers.
        </Text>
      </View>
    );
  } else if (clusters.length === 0 || employees.length === 0) {
    content = (
      <View style={styles.block}>
        <Text style={type.label}>No data</Text>
        <Text style={[wide ? type.dialog : type.section, { marginTop: spacing.s2 }]}>Nothing to analyze.</Text>
        <Text style={[type.body, { marginTop: spacing.s3 }]}>Add employees first, then run the analysis again.</Text>
      </View>
    );
  } else {
    const salaries = employees.map((e) => Number(e.salary));
    const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
    const highest = employees.reduce((a, b) => (Number(b.salary) > Number(a.salary) ? b : a));
    const lowest = employees.reduce((a, b) => (Number(b.salary) < Number(a.salary) ? b : a));
    const groups = groupByTier(clusters, employees);

    const kpis = [
      { label: 'Company average', value: formatMoney(Math.round(avg)), sub: `Mean across ${employees.length} employees` },
      {
        label: 'Highest',
        value: formatMoney(highest.salary),
        sub: `${highest.name} · ${highest.position}`,
        color: colors.brass,
      },
      { label: 'Lowest', value: formatMoney(lowest.salary), sub: `${lowest.name} · ${lowest.position}` },
    ];

    content = (
      <>
        <View style={[styles.kpis, !wide && styles.column]}>
          {kpis.map((k, i) => (
            <View
              key={k.label}
              style={[
                styles.kpi,
                wide && i > 0 && styles.kpiDivider,
                wide && { paddingLeft: i === 0 ? 0 : spacing.s8 },
                !wide && i > 0 && styles.kpiDividerTop,
              ]}
            >
              <Text style={type.label}>{k.label}</Text>
              <Text style={[wide ? type.numL : type.numM, styles.kpiValue, k.color && { color: k.color }]}>{k.value}</Text>
              <Text style={type.caption} numberOfLines={1}>{k.sub}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <View style={styles.sectionTitle}>
            <Text style={[type.label, styles.fig]}>Fig. 1</Text>
            <Text style={type.section}>Employees per Tier</Text>
          </View>
          {wide ? <Text style={type.small}>Headcount by cluster · n = {employees.length}</Text> : null}
        </View>
        <BarChart clusters={clusters} wide={wide} />

        <View style={[styles.sectionHead, { marginTop: spacing.s10 }]}>
          <View style={styles.sectionTitle}>
            <Text style={[type.label, styles.fig]}>Table 1</Text>
            <Text style={type.section}>Tier Summary</Text>
          </View>
        </View>
        <View style={[styles.tiers, !wide && styles.column]}>
          {clusters.map((c, i) => {
            const members = groups[i] || [];
            const s = members.map((m) => Number(m.salary));
            const min = s.length ? Math.min(...s) : c.centroid;
            const max = s.length ? Math.max(...s) : c.centroid;
            return (
              <View key={c.group} style={[styles.tier, { borderTopColor: tierColor(i) }]}>
                <Text style={type.label}>
                  {c.group} — {tierName(i)}
                </Text>
                <View style={styles.tierCount}>
                  <Text style={type.numL}>{c.count}</Text>
                  <Text style={[type.small, { marginLeft: spacing.s2 }]}>{c.count === 1 ? 'employee' : 'employees'}</Text>
                </View>
                <View style={styles.kv}>
                  <Text style={type.small}>Average base salary</Text>
                  <Text style={type.numM}>{formatMoney(c.centroid)}</Text>
                </View>
                <View style={styles.kv}>
                  <Text style={type.small}>Range</Text>
                  <Text style={type.smallMedium}>
                    {min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`}
                  </Text>
                </View>
                <Text style={[type.caption, { marginTop: spacing.s3 }]}>
                  {members.map((m) => shortName(m.name)).join(', ')}
                </Text>
              </View>
            );
          })}
        </View>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}>
      <View style={[styles.head, !wide && styles.column]}>
        <View style={{ flex: 1, maxWidth: 560 }}>
          <Text style={type.label}>Compensation review</Text>
          <Text style={[wide ? type.title : type.titleMobile, { marginTop: spacing.s2 }]}>Salary Structure</Text>
          <Text style={[type.body, { color: colors.muted, marginTop: spacing.s2 }]}>
            Employees grouped into three salary tiers by K-Means clustering (k = 3) on monthly base salary.
          </Text>
        </View>
        <View style={[styles.headRight, !wide && styles.headRightNarrow]}>
          <Button title="Analyze Salary Structure" loadingTitle="Analyzing…" onPress={onAnalyze} loading={analyzing} />
          <Text style={[type.caption, { marginTop: spacing.s2 }]}>
            {analysis?.at ? (
              <>
                Last analyzed <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>{formatDateTime(analysis.at)}</Text>
              </>
            ) : (
              'Not analyzed yet'
            )}
          </Text>
        </View>
      </View>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.s10, paddingBottom: spacing.s12, width: '100%', maxWidth: MAX_WIDTH + 96, alignSelf: 'center' },
  column: { flexDirection: 'column' },
  center: { textAlign: 'center' },

  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.s6,
    paddingBottom: spacing.s6,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  headRight: { alignItems: 'flex-end' },
  headRightNarrow: { alignItems: 'flex-start', alignSelf: 'stretch' },

  block: { paddingVertical: spacing.s9 },
  loading: { alignItems: 'center', paddingVertical: spacing.s12 },

  kpis: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.hairline, marginBottom: spacing.s10 },
  kpi: { flex: 1, paddingVertical: spacing.s7, paddingRight: spacing.s4 },
  kpiDivider: { borderLeftWidth: 1, borderLeftColor: colors.hairline },
  kpiDividerTop: { borderTopWidth: 1, borderTopColor: colors.hairline },
  kpiValue: { marginTop: spacing.s2, marginBottom: spacing.s2 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.s2,
    marginBottom: spacing.s6,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s3 },
  fig: { color: colors.muted },

  plotRow: { flexDirection: 'row' },
  yAxis: { width: 28, justifyContent: 'space-between' },
  yTick: { marginTop: -8, marginBottom: -8 },
  plot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  gridline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.hairlineSoft },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { marginBottom: spacing.s2 },
  bar: {},
  xLabels: { flexDirection: 'row', marginTop: spacing.s3 },
  xLabel: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.s1 },

  tiers: { flexDirection: 'row', gap: spacing.s8 },
  tier: { flex: 1, borderTopWidth: 3, paddingTop: spacing.s4, paddingBottom: spacing.s4 },
  tierCount: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.s2, marginBottom: spacing.s4 },
  kv: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: spacing.s2,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },

});
