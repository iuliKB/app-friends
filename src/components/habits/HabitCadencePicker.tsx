// Phase 29.1 Plan 05 — HabitCadencePicker (D-05).
// Segmented control: Daily / Weekly / Custom.
// When Custom is selected, exposes a stepper for `weeklyTarget` (1-7, default 3).
//
// Pattern: clones SplitModeControl.tsx shape (3 segments instead of 2,
// plus stepper visible conditional on Custom).

import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import type { HabitCadence } from '@/types/habits';

export interface HabitCadenceValue {
  cadence: HabitCadence;
  weeklyTarget: number | null;
}

interface HabitCadencePickerProps {
  value: HabitCadenceValue;
  onChange: (next: HabitCadenceValue) => void;
}

interface Segment {
  label: string;
  value: 'daily' | 'weekly' | 'custom';
}

const SEGMENTS: Segment[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Custom', value: 'custom' },
];

function isCustom(v: HabitCadenceValue): boolean {
  return v.cadence === 'n_per_week';
}

function segmentForValue(v: HabitCadenceValue): Segment['value'] {
  if (v.cadence === 'daily') return 'daily';
  if (v.cadence === 'weekly') return 'weekly';
  return 'custom';
}

export function HabitCadencePicker({ value, onChange }: HabitCadencePickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { gap: SPACING.md },
        container: {
          flexDirection: 'row',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.md,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          padding: 4,
        },
        segment: {
          flex: 1,
          paddingVertical: SPACING.sm,
          alignItems: 'center',
          borderRadius: RADII.md,
        },
        activeSegment: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: '#ffffff14',
        },
        label: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
        },
        activeLabel: { color: colors.text.primary },
        stepperRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.md,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        stepperLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        stepperControls: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.lg,
        },
        stepperButton: {
          width: 32,

          height: 32,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.overlay,
        },
        stepperButtonDisabled: { opacity: 0.4 },
        stepperValue: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,

          minWidth: 24,
          textAlign: 'center',
        },
      }),
    [colors]
  );

  function handleSegment(seg: Segment['value']) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (seg === 'daily') {
      onChange({ cadence: 'daily', weeklyTarget: null });
    } else if (seg === 'weekly') {
      onChange({ cadence: 'weekly', weeklyTarget: null });
    } else {
      // Custom — default weeklyTarget = 3
      onChange({ cadence: 'n_per_week', weeklyTarget: value.weeklyTarget ?? 3 });
    }
  }

  function handleStep(delta: number) {
    const current = value.weeklyTarget ?? 3;
    const next = Math.max(1, Math.min(7, current + delta));
    if (next === current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange({ cadence: 'n_per_week', weeklyTarget: next });
  }

  const activeSeg = segmentForValue(value);
  const showStepper = isCustom(value);
  const stepperVal = value.weeklyTarget ?? 3;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {SEGMENTS.map((seg) => {
          const isActive = activeSeg === seg.value;
          return (
            <TouchableOpacity
              key={seg.value}
              style={[styles.segment, isActive && styles.activeSegment]}
              onPress={() => handleSegment(seg.value)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${seg.label} cadence`}
            >
              <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showStepper && (
        <View style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>Times per week</Text>
          <View style={styles.stepperControls}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperVal <= 1 && styles.stepperButtonDisabled]}
              onPress={() => handleStep(-1)}
              disabled={stepperVal <= 1}
              accessibilityRole="button"
              accessibilityLabel="Decrease times per week"
            >
              <Ionicons name="remove" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{stepperVal}</Text>
            <TouchableOpacity
              style={[styles.stepperButton, stepperVal >= 7 && styles.stepperButtonDisabled]}
              onPress={() => handleStep(1)}
              disabled={stepperVal >= 7}
              accessibilityRole="button"
              accessibilityLabel="Increase times per week"
            >
              <Ionicons name="add" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
