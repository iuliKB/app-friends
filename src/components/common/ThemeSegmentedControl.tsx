import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import type { ThemePreference } from '@/theme';

const SEGMENTS: { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export function ThemeSegmentedControl() {
  const { theme, setTheme, colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.xs,
      height: 44,
      marginHorizontal: SPACING.lg,
      gap: SPACING.sm,
    },
    segment: {
      flex: 1,
      borderRadius: RADII.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    activeSegment: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: '#B9FF3B', // D-07: accent — same value in DARK and LIGHT palettes; hardcoded per spec
    },
    label: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.regular,
      color: colors.text.secondary,
    },
    activeLabel: {
      fontFamily: FONT_FAMILY.display.semibold,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      color: '#0E0F11', // D-07: dark text on accent bg — hardcoded per spec
    },
  }), [colors]);

  async function handlePress(t: ThemePreference) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(t);
  }

  return (
    <View style={styles.container}>
      {SEGMENTS.map((seg) => {
        const isActive = theme === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => handlePress(seg.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${seg.label} theme`}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
