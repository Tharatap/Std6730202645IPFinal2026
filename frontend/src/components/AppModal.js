import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

export default function AppModal({ visible, eyebrow, title, onClose, children, footer, maxWidth = 520 }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { maxWidth }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {eyebrow ? <Text style={type.label}>{eyebrow}</Text> : null}
              <Text style={[type.dialog, { marginTop: spacing.s1 }]}>{title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: spacing.s4 },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: radius.dialog,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.s8,
    paddingTop: spacing.s7,
    paddingBottom: spacing.s5,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  close: { fontSize: 26, lineHeight: 26, color: colors.inkSoft },
  bodyScroll: { flexGrow: 0 },
  body: { paddingHorizontal: spacing.s8, paddingTop: spacing.s6, paddingBottom: spacing.s2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.s3,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s5,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
});
