// Phase 33 — Single quick-action icon-only button with label below (D-04 / D-09).
//
// 48pt circle + label below. Reanimated v4 press-spring (scale 1.0 ↔ 0.96).
// Haptic feedback per UI-SPEC §Haptic Policy:
//   'light'     → Haptics.impactAsync(ImpactFeedbackStyle.Light)
//   'selection' → Haptics.selectionAsync()
//   'none'      → no haptic (e.g. when wrapping a destructive confirm path)
// All haptics + animation short-circuit when useReducedMotion() returns true.
//
// Tone 'accent' paints the glyph in colors.interactive.accent (used for Message
// at idle per UI-SPEC §Color §Accent reserved-for list item 3).

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;
export type ActionIconHaptic = 'light' | 'selection' | 'none';

interface ActionIconButtonProps {
  iconName: IoniconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'accent';
  haptic?: ActionIconHaptic;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

// Named layout constants — UI-SPEC §Quick-Action Buttons + §Spacing Scale §Exceptions.
const BUTTON_DIAMETER = 48;
const ICON_GLYPH_SIZE = 24;
const PRESS_SPRING = { damping: 15, stiffness: 120 };
const PRESS_SCALE = 0.96;
const DISABLED_OPACITY = 0.45;

function fireHaptic(haptic: ActionIconHaptic) {
  if (haptic === 'light') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else if (haptic === 'selection') {
    Haptics.selectionAsync().catch(() => {});
  }
}

export function ActionIconButton({
  iconName,
  label,
  onPress,
  tone = 'default',
  haptic = 'light',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: ActionIconButtonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    if (disabled) return;
    if (!reduceMotion) {
      scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, PRESS_SPRING);
  };

  const handlePress = () => {
    if (disabled) return;
    if (!reduceMotion && haptic !== 'none') fireHaptic(haptic);
    onPress();
  };

  const glyphColor = tone === 'accent' ? colors.interactive.accent : colors.text.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          alignItems: 'center',
          opacity: disabled ? DISABLED_OPACITY : 1,
        },
        circle: {
          width: BUTTON_DIAMETER,
          height: BUTTON_DIAMETER,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: {
          marginTop: SPACING.sm,
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
          textAlign: 'center',
        },
      }),
    [colors, disabled]
  );

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <View style={styles.wrapper}>
        <Animated.View style={[styles.circle, animatedStyle]}>
          <Ionicons name={iconName} size={ICON_GLYPH_SIZE} color={glyphColor} />
        </Animated.View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
