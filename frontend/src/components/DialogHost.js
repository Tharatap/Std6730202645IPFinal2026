import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { registerDialogHost } from '../alert';
import Button from './Button';
import { colors, formatMoney, radius, spacing, type } from '../theme';

const TONES = {
  error: { dot: colors.danger, eyebrow: 'Something went wrong' },
  warning: { dot: colors.brass, eyebrow: 'Attention' },
  success: { dot: colors.success, eyebrow: 'Done' },
  info: { dot: colors.ink, eyebrow: 'Notice' },
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
  const eyebrow = current?.eyebrow || (current?.kind === 'confirm' && current?.destructive ? 'Permanent action' : tone.eyebrow);

  return (
    <>
      <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
          {current ? (
            <View style={styles.dialog} accessibilityRole="alert">
              <View style={styles.eyebrowRow}>
                <View style={[styles.dot, { backgroundColor: tone.dot }]} />
                <Text style={[type.label, { color: tone.dot }]}>{eyebrow}</Text>
              </View>
              <Text style={[type.dialog, styles.title]}>{current.title}</Text>
              {current.message ? <Text style={[type.body, styles.message]}>{current.message}</Text> : null}

              {current.detail ? (
                <View style={styles.detail}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.cell} numberOfLines={1}>{current.detail.name}</Text>
                    {current.detail.position ? (
                      <Text style={type.caption} numberOfLines={1}>{current.detail.position}</Text>
                    ) : null}
                  </View>
                  {current.detail.salary !== undefined ? (
                    <Text style={type.cell}>{formatMoney(current.detail.salary)}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.buttons}>
                {current.kind === 'confirm' ? (
                  <>
                    <Button title={current.cancelText} variant="secondary" onPress={() => close(false)} />
                    <Button
                      title={current.confirmText}
                      variant={current.destructive ? 'danger' : 'primary'}
                      onPress={() => close(true)}
                    />
                  </>
                ) : (
                  <Button title="OK" onPress={() => close(true)} />
                )}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toast}>
            <View style={[styles.dot, { backgroundColor: toastTone.dot === colors.ink ? colors.brassLight : toastTone.dot }]} />
            <Text style={[type.smallMedium, { color: colors.white }]}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: spacing.s4 },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.dialog,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.s7,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing.s2 },
  title: { marginTop: spacing.s2 },
  message: { marginTop: spacing.s3 },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s3,
    marginTop: spacing.s5,
    paddingVertical: spacing.s4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s3, marginTop: spacing.s6 },

  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 88, alignItems: 'center', paddingHorizontal: spacing.s4 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 440,
    backgroundColor: colors.ink,
    borderRadius: radius.control,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s5,
  },
});
