import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

const VARIANTS = {
  primary: { bg: colors.primary, pressed: colors.primaryLight, fg: colors.textInverse, border: colors.primary },
  secondary: { bg: colors.secondaryBg, pressed: colors.border, fg: colors.primary, border: colors.secondaryBg },
  danger: { bg: colors.dangerBg, pressed: colors.dangerPressed, fg: colors.danger, border: colors.dangerBg },
  ghost: { bg: 'transparent', pressed: colors.ghostPressed, fg: colors.primary, border: colors.border },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <Text style={[styles.text, size === 'sm' && styles.textSm, { color: v.fg }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 32, paddingHorizontal: spacing.md },
  inactive: { opacity: 0.55 },
  text: { fontSize: 14, fontWeight: '600' },
  textSm: { fontSize: 13 },
});
