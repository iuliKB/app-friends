import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import type { ViewPreference } from '@/hooks/useViewPreference';

interface RadarViewToggleProps {
  value: ViewPreference;
  onValueChange: (v: ViewPreference) => void;
}

const SEGMENTS: { label: string; value: ViewPreference }[] = [
  { label: 'Radar', value: 'radar' },
  { label: 'Cards', value: 'cards' },
];

export function RadarViewToggle({ value, onValueChange }: RadarViewToggleProps) {
  async function handlePress(segValue: ViewPreference) {
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
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => handlePress(seg.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${seg.label} view`}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
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
  activeSegment: {
    backgroundColor: COLORS.surface.overlay,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  activeLabel: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
});
