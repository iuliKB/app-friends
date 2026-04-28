import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import type { StatusValue } from '@/types/app';

interface SegmentProps {
  value: StatusValue | null;
  onValueChange: (v: StatusValue) => void;
  saving: boolean;
}

export function SegmentedControl({ value, onValueChange, saving }: SegmentProps) {
  const { colors } = useTheme();

  const SEGMENTS: { label: string; value: StatusValue; color: string }[] = useMemo(() => [
    { label: 'Free', value: 'free', color: colors.status.free },
    { label: 'Busy', value: 'busy', color: colors.status.busy },
    { label: 'Maybe', value: 'maybe', color: colors.status.maybe },
  ], [colors]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.xs,
      height: 44,
      marginHorizontal: SPACING.lg,
    },
    segment: {
      flex: 1,
      borderRadius: RADII.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.regular,
      color: colors.text.secondary,
    },
    activeLabel: {
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.surface.base,
    },
  }), [colors]);

  async function handlePress(segValue: StatusValue) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(segValue);
  }

  return (
    <View style={styles.container}>
      {SEGMENTS.map((seg) => {
        const isActive = value === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, isActive && { backgroundColor: seg.color }]}
            onPress={() => handlePress(seg.value)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving && isActive ? (
              <ActivityIndicator size="small" color={colors.surface.base} />
            ) : (
              <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
