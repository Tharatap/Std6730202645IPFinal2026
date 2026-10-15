import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

// Filter control that opens a selectable list. options: [{ label, value }]
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
            <Text style={[type.label, styles.sheetTitle]}>{title}</Text>
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
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    maxWidth: 280,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingLeft: spacing.s3,
    paddingRight: spacing.s3,
    paddingVertical: spacing.s2,
  },
  pillText: { ...type.smallMedium, flexShrink: 1 },
  pillTextActive: { color: colors.white },
  caret: { fontSize: 11, color: colors.muted, marginLeft: spacing.s2 },
  clearBtn: { paddingRight: spacing.s3, paddingLeft: spacing.s1 },
  clearText: { fontSize: 16, lineHeight: 18, color: colors.white },

  overlay: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: spacing.s4 },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.dialog,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.s2,
  },
  sheetTitle: { paddingHorizontal: spacing.s5, paddingVertical: spacing.s3 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s3,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  optionSelected: { backgroundColor: colors.paper },
  optionText: { ...type.body, color: colors.ink, flexShrink: 1 },
  optionTextSelected: { fontFamily: type.cell.fontFamily },
  check: { ...type.smallMedium, color: colors.brass, marginLeft: spacing.s2 },
});
