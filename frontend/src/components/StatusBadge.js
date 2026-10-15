import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function StatusBadge({ status }) {
  const active = status === 'Active';
  const fg = active ? colors.success : colors.warning;
  return (
    <View style={[styles.badge, { backgroundColor: active ? colors.successBg : colors.warningBg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.text, { color: fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing.xs + 2 },
  text: { fontSize: 12, fontWeight: '600' },
});
