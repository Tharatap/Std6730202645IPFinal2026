import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, type } from '../theme';

// Filter pill that opens a selectable list. options: [{ label, value }]
export default function Dropdown({ title, label, active, options, value, onSelect, onClear }) {
  const [open, setOpen] = useState(false);

  const pick = (opt) => {
    setOpen(false);
    onSelect(opt.value);
  };

  return (
    <>
      <View style={[styles.pill, active && styles.pillActive]}>
        <Pressable onPress={() => setOpen(true)} style={styles.pillMain} accessibilityRole="button">
          <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
            {label}
          </Text>
          {!active ? <Text style={styles.caret}>▾</Text> : null}
        </Pressable>
        {active ? (
          <Pressable onPress={onClear} hitSlop={8} style={styles.clearBtn} accessibilityLabel={`Clear ${title}`}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={[type.caption, styles.sheetTitle]}>{title}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => pick(opt)}
                    style={({ pressed }) => [styles.option, (pressed || selected) && styles.optionSelected]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={1}>
                      {opt.label}
                    </Text>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    maxWidth: 260,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm - 2,
  },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.text, flexShrink: 1 },
  pillTextActive: { color: colors.textInverse, fontWeight: '600' },
  caret: { fontSize: 11, color: colors.textMuted, marginLeft: spacing.xs + 2 },
  clearBtn: { paddingRight: spacing.md, paddingLeft: spacing.xs },
  clearText: { fontSize: 16, lineHeight: 18, color: colors.textInverse },

  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  sheetTitle: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionSelected: { backgroundColor: colors.secondaryBg },
  optionText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  optionTextSelected: { fontWeight: '600', color: colors.primary },
  check: { fontSize: 14, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm },
});
