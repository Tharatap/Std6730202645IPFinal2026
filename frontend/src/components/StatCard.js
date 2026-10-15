import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, type } from '../theme';

export default function StatCard({ label, value, color = colors.primary, style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <Text style={type.caption} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    ...shadow,
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  value: { fontSize: 24, fontWeight: '700', marginTop: spacing.xs },
});
