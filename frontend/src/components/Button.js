import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

// primary = ink solid · secondary = outlined · danger = red solid · link / linkDanger = underlined text
const VARIANTS = {
  primary: { bg: colors.ink, pressed: colors.inkSoft, fg: colors.white, border: colors.ink },
  secondary: { bg: 'transparent', pressed: colors.hairlineSoft, fg: colors.ink, border: colors.ink },
  danger: { bg: colors.danger, pressed: colors.dangerPressed, fg: colors.white, border: colors.danger },
};

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, loadingTitle, style }) {
  const inactive = disabled || loading;

  if (variant === 'link' || variant === 'linkDanger') {
    const danger = variant === 'linkDanger';
    return (
      <Pressable onPress={onPress} disabled={inactive} hitSlop={6} accessibilityRole="button" style={style}>
        {({ pressed }) => (
          <Text
            style={[
              styles.link,
              { color: danger ? colors.danger : colors.ink, textDecorationColor: danger ? colors.danger : colors.fieldBorder },
              (pressed || inactive) && styles.faded,
            ]}
          >
            {loading && loadingTitle ? loadingTitle : title}
          </Text>
        )}
      </Pressable>
    );
  }

  const v = VARIANTS[variant] || VARIANTS.primary;
  const greyed = loading && !!loadingTitle; // design: "Analyzing…" greyed button
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        greyed && styles.greyed,
        inactive && !greyed && styles.faded,
        style,
      ]}
    >
      {loading && !loadingTitle ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <Text style={[type.button, { color: greyed ? colors.white : v.fg }]}>{greyed ? loadingTitle : title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    paddingHorizontal: spacing.s6,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greyed: { backgroundColor: colors.muted, borderColor: colors.muted, opacity: 0.75 },
  faded: { opacity: 0.5 },
  link: { ...type.smallMedium, textDecorationLine: 'underline' },
});
