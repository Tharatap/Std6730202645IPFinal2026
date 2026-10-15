import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

// Design: colored dot + plain text (green Active / brass On Leave)
export default function StatusBadge({ status, style }) {
  const active = status === 'Active';
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.dot, { backgroundColor: active ? colors.success : colors.brass }]} />
      <Text style={[type.small, styles.text]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: spacing.s2 },
  text: { color: colors.inkSoft },
});
