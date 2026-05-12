import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import type { ViewPreference } from '@/hooks/useViewPreference';

interface RadarViewToggleProps {
  value: ViewPreference;
  onValueChange: (v: ViewPreference) => void;
}

const SEGMENTS: { label: string; value: ViewPreference; icon: string }[] = [
  { label: 'Radar', value: 'radar', icon: 'radio-outline' },
  { label: 'Cards', value: 'cards', icon: 'albums-outline' },
];

export function RadarViewToggle({ value, onValueChange }: RadarViewToggleProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.xs,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 44,
      marginHorizontal: SPACING.lg,
    },
    segment: {
      flex: 1,
      borderRadius: RADII.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
    },
    activeSegment: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: isDark ? 'rgba(185, 255, 59, 0.12)' : 'rgba(77, 124, 0, 0.10)',
    },
    label: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    activeLabel: {
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.interactive.accent,
    },
  }), [colors, isDark]);

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
            <Ionicons
            name={seg.icon as React.ComponentProps<typeof Ionicons>['name']}
            size={14}
            color={isActive ? colors.interactive.accent : colors.text.secondary}
          />
          <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
