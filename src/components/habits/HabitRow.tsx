// Phase 29.1 Plan 05 — HabitRow component (D-02, D-05, D-07).
// Renders one habit in /squad/habits/index.tsx FlatList:
//   • title (FONT_SIZE.md, body.medium, text.primary)
//   • Solo/Group chip (D-02 discriminator)
//   • cadence label (Daily / Weekly / N× per week)
//   • 44×44 done-today toggle on the right
//
// Pattern: clones BalanceRow.tsx shape (avatar swapped for done-toggle, two
// label rows on the left, action affordance on the right).

import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING, ANIMATION } from '@/theme';
import { TILE_ACCENTS, ACCENT_FILL } from '@/components/squad/bento/tileAccents';
import type { HabitOverviewRow } from '@/types/habits';

interface HabitRowProps {
  habit: HabitOverviewRow;
  onToggle: (habitId: string) => Promise<unknown>;
  onPress: (habitId: string) => void;
}

function formatCadence(habit: HabitOverviewRow): string {
  if (habit.cadence === 'daily') return 'Daily';
  if (habit.cadence === 'weekly') return 'Weekly';
  // n_per_week
  const target = habit.weekly_target ?? 0;
  return `${target}× per week`;
}

export function HabitRow({ habit, onToggle, onPress }: HabitRowProps) {
  const { colors } = useTheme();
  const checkScale = useRef(new Animated.Value(1)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,

          minHeight: 56, // UI-SPEC §Layout — row min-height touch-friendly
          gap: SPACING.md,
        },
        rowPressed: { opacity: 0.75 },
        contentColumn: { flex: 1, gap: SPACING.xs },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        bottomRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 4, // UI-SPEC phase exception — chip pill (precedent: YourZoneSection.tsx:223)
          borderRadius: RADII.full,
          borderWidth: 1,
          gap: SPACING.xs,
        },
        chipText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          letterSpacing: 0.5,
        },
        cadenceLabel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        toggleWrapper: {
          // 44×44 tap target (iOS HIG min)

          width: 44,

          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkbox: {
          width: 28,

          height: 28,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
        },
      }),
    [colors]
  );

  const isSolo = habit.is_solo;
  const cadenceLabel = formatCadence(habit);

  const chipStyle = isSolo
    ? {
        borderColor: colors.text.secondary,
        backgroundColor: colors.surface.overlay,
      }
    : {
        borderColor: colors.interactive.accent,
        backgroundColor: colors.interactive.accent + ACCENT_FILL,
      };

  const chipTextColor = isSolo ? colors.text.secondary : colors.interactive.accent;
  const chipLabel = isSolo ? 'Solo' : `Group · ${habit.members_total}`;

  const done = habit.did_me_check_in_today;
  const checkboxStyle = done
    ? {
        backgroundColor: TILE_ACCENTS.habits + ACCENT_FILL,
        borderColor: TILE_ACCENTS.habits,
      }
    : {
        backgroundColor: 'transparent',
        borderColor: colors.text.secondary,
      };

  async function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Spring scale 0.8 → 1.0 over fast duration
    checkScale.setValue(0.8);
    Animated.spring(checkScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
    }).start();
    await onToggle(habit.habit_id);
  }

  const a11yToggle = done ? `Unmark ${habit.title}` : `Mark ${habit.title} done for today`;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(habit.habit_id)}
      accessibilityRole="button"
      accessibilityLabel={`${habit.title}. ${chipLabel}. ${cadenceLabel}.`}
    >
      <View style={styles.contentColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {habit.title}
        </Text>
        <View style={styles.bottomRow}>
          <View style={[styles.chip, chipStyle]}>
            <Text style={[styles.chipText, { color: chipTextColor }]}>{chipLabel}</Text>
          </View>
          <Text style={styles.cadenceLabel}>{cadenceLabel}</Text>
        </View>
      </View>

      <Pressable
        style={styles.toggleWrapper}
        onPress={handleToggle}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={a11yToggle}
      >
        <Animated.View
          style={[styles.checkbox, checkboxStyle, { transform: [{ scale: checkScale }] }]}
        >
          {done && <Ionicons name="checkmark" size={18} color={TILE_ACCENTS.habits} />}
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}
