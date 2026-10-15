import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, spacing, type } from '../theme';

export default function Input({ label, error, invalid, left, right, prefix, style, containerStyle, variant = 'paper', ...props }) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[type.label, styles.label]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          { backgroundColor: variant === 'dialog' ? colors.field : colors.surface },
          (error || invalid) && styles.fieldError,
        ]}
      >
        {left}
        {prefix ? (
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, Platform.OS === 'web' && styles.webInput, style]}
          {...props}
        />
        {right}
      </View>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}

export function ErrorLine({ message, style }) {
  return (
    <View style={[styles.errorRow, style]} accessibilityRole="alert">
      <View style={styles.dot} />
      <Text style={styles.error}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.s5 },
  label: { marginBottom: spacing.s2 + 2, color: colors.inkSoft },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.control,
    minHeight: 48,
    paddingHorizontal: spacing.s4,
  },
  fieldError: { borderColor: colors.danger },
  prefix: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingRight: spacing.s3,
    marginRight: spacing.s3,
    borderRightWidth: 1,
    borderRightColor: colors.hairline,
  },
  prefixText: { ...type.body, color: colors.muted },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: spacing.s3 },
  webInput: { outlineStyle: 'none' },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.s2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger, marginRight: spacing.s2 },
  error: { ...type.small, color: colors.danger },
});
