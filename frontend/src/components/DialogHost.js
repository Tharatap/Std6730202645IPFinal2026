import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { registerDialogHost } from '../alert';
import Button from './Button';
import { colors, radius, shadow, spacing, type } from '../theme';

const TONES = {
  error: { icon: '!', fg: colors.danger, bg: colors.dangerBg },
  warning: { icon: '!', fg: colors.warning, bg: colors.warningBg },
  success: { icon: '✓', fg: colors.success, bg: colors.successBg },
  info: { icon: 'i', fg: colors.primary, bg: colors.secondaryBg },
};

const TOAST_MS = 2500;

export default function DialogHost() {
  const [queue, setQueue] = useState([]); // dialogs shown one at a time
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const unregister = registerDialogHost({
      alert: (d) => new Promise((resolve) => setQueue((q) => [...q, { ...d, kind: 'alert', resolve }])),
      confirm: (d) =>
        new Promise((resolve) =>
          setQueue((q) => [...q, { ...d, kind: 'confirm', type: d.destructive ? 'error' : 'warning', resolve }])
        ),
      toast: (t) => {
        clearTimeout(toastTimer.current);
        setToast(t);
        toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
      },
    });
    return () => {
      unregister();
      clearTimeout(toastTimer.current);
    };
  }, []);

  const current = queue[0];
  const close = (result) => {
    current?.resolve(result);
    setQueue((q) => q.slice(1));
  };

  const tone = TONES[current?.type] || TONES.error;
  const toastTone = TONES[toast?.type] || TONES.success;

  return (
    <>
      <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
          {current ? (
            <View style={styles.dialog} accessibilityRole="alert">
              <View style={[styles.icon, { backgroundColor: tone.bg }]}>
                <Text style={[styles.iconText, { color: tone.fg }]}>{tone.icon}</Text>
              </View>
              <Text style={[type.section, styles.title]}>{current.title}</Text>
              {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
              <View style={styles.buttons}>
                {current.kind === 'confirm' ? (
                  <>
                    <Button title={current.cancelText} variant="ghost" onPress={() => close(false)} style={styles.btn} />
                    <Button
                      title={current.confirmText}
                      variant={current.destructive ? 'dangerSolid' : 'primary'}
                      onPress={() => close(true)}
                      style={styles.btn}
                    />
                  </>
                ) : (
                  <Button title="OK" onPress={() => close(true)} style={styles.btn} />
                )}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={[styles.toast, { borderLeftColor: toastTone.fg }]}>
            <View style={[styles.toastIcon, { backgroundColor: toastTone.bg }]}>
              <Text style={[styles.toastIconText, { color: toastTone.fg }]}>{toastTone.icon}</Text>
            </View>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: { fontSize: 22, fontWeight: '800' },
  title: { textAlign: 'center' },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, alignSelf: 'stretch' },
  btn: { flex: 1 },

  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 84, alignItems: 'center', paddingHorizontal: spacing.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow,
  },
  toastIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  toastIconText: { fontSize: 12, fontWeight: '800' },
  toastText: { fontSize: 14, fontWeight: '500', color: colors.text },
});
