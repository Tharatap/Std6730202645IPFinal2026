import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, type } from '../theme';

export default function Card({ title, subtitle, right, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title || right ? (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {title ? <Text style={type.section}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
