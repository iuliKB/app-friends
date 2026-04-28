import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
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
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.xs,
      // eslint-disable-next-line campfire/no-hardcoded-styles
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
      backgroundColor: colors.surface.overlay,
    },
    label: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    activeLabel: {
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
  }), [colors]);

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
