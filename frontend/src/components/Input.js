import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Input({ label, error, left, right, style, containerStyle, ...props }) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, error && styles.fieldError]}>
        {left}
        <TextInput
          placeholderTextColor={colors.placeholder}
          style={[styles.input, Platform.OS === 'web' && styles.webInput, style]}
          {...props}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs + 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    minHeight: 42,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: spacing.sm + 2 },
  webInput: { outlineStyle: 'none' },
  error: { fontSize: 12, color: colors.danger, marginTop: spacing.xs },
});
