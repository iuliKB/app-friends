import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import type { ThemePreference } from '@/theme';

const SEGMENTS: { label: string; value: ThemePreference; icon: string }[] = [
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  { label: 'Dark', value: 'dark', icon: 'moon-outline' },
];

const TRACK_PADDING = SPACING.xs; // 4px inset on all sides

export function ThemeSegmentedControl() {
  const { theme, setTheme, colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = SEGMENTS.findIndex((s) => s.value === theme);
  // Each segment fills 1/3 of the inner track width (after padding on both sides)
  const pillWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / 3 : 0;

  useEffect(() => {
    if (pillWidth > 0) {
      Animated.spring(translateX, {
        toValue: activeIndex * pillWidth,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
      }).start();
    }
  }, [activeIndex, pillWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePress(value: ThemePreference) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(value);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // Frosted glass track
        track: {
          flexDirection: 'row',
          backgroundColor: colors.border + '55',
          borderRadius: RADII.md,
          padding: TRACK_PADDING,
          marginHorizontal: SPACING.lg,
          height: 46,
        },
        // Sliding glass pill (absolute, behind labels)
        pill: {
          position: 'absolute',
          top: TRACK_PADDING,
          bottom: TRACK_PADDING,
          left: TRACK_PADDING,
          borderRadius: RADII.sm,
          backgroundColor: colors.surface.base,
          // iOS drop shadow
          shadowColor: colors.text.primary,
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        // Each segment button fills 1/3
        segment: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.xs,
          borderRadius: RADII.sm,
        },
        label: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        activeLabel: {
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.track} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      {/* Animated pill — slides behind the labels */}
      {pillWidth > 0 && (
        <Animated.View style={[styles.pill, { width: pillWidth, transform: [{ translateX }] }]} />
      )}

      {SEGMENTS.map((seg) => {
        const isActive = theme === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={styles.segment}
            onPress={() => handlePress(seg.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${seg.label} theme`}
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={seg.icon as never}
              size={14}
              color={isActive ? colors.text.primary : colors.text.secondary}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
