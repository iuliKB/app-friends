import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import type { ViewPreference } from '@/hooks/useViewPreference';

interface RadarSegmentedPillProps {
  value: ViewPreference;
  onValueChange: (v: ViewPreference) => void;
}

const SEGMENTS: { label: string; value: ViewPreference; icon: string }[] = [
  { label: 'Radar', value: 'radar', icon: 'radio-outline' },
  { label: 'Cards', value: 'cards', icon: 'albums-outline' },
];

const SEGMENT_HEIGHT = 32;
const SEGMENT_HORIZONTAL_PADDING = SPACING.md;

export function RadarSegmentedPill({ value, onValueChange }: RadarSegmentedPillProps) {
  const { colors, isDark } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.full,
          borderWidth: 1,
          borderColor: colors.border,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          padding: 2,
          height: SEGMENT_HEIGHT + 4,
          alignItems: 'center',
        },
        segment: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.xs,
          height: SEGMENT_HEIGHT,
          paddingHorizontal: SEGMENT_HORIZONTAL_PADDING,
          borderRadius: RADII.full,
        },
        activeSegment: {
          backgroundColor: isDark ? 'rgba(185, 255, 59, 0.16)' : 'rgba(77, 124, 0, 0.12)',
        },
        label: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        activeLabel: {
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.interactive.accent,
        },
      }),
    [colors, isDark]
  );

  function handlePress(segValue: ViewPreference) {
    if (segValue === value) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onValueChange(segValue);
  }

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {SEGMENTS.map((seg) => {
        const isActive = value === seg.value;
        return (
          <Pressable
            key={seg.value}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => handlePress(seg.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${seg.label} view`}
            hitSlop={6}
          >
            <Ionicons
              name={seg.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={14}
              color={isActive ? colors.interactive.accent : colors.text.secondary}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
