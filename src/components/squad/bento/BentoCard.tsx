import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RADII, SPACING } from '@/theme';
import { TILE_SURFACE, SPOTLIGHT_SHADOW } from './tileSurface';

interface BentoCardProps extends AccessibilityProps {
  onPress?: () => void;
  variant?: 'tile' | 'spotlight';
  containerStyle?: StyleProp<ViewStyle>;
  borderColor?: string;
  children: React.ReactNode;
}

// Spring config — fast, low-damping enough to feel tactile without bouncing.
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 };
const PRESS_SCALE = 0.97;

export function BentoCard({
  onPress,
  variant = 'tile',
  containerStyle,
  borderColor,
  children,
  ...a11y
}: BentoCardProps) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          borderRadius: RADII.lg,
          overflow: 'hidden',
          ...(variant === 'spotlight' ? SPOTLIGHT_SHADOW : null),
        },
        gradient: {
          flex: 1,
          padding: variant === 'spotlight' ? SPACING.xl : SPACING.lg,
          minHeight: variant === 'tile' ? 132 : undefined,
          justifyContent: variant === 'tile' ? 'space-between' : undefined,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: borderColor ?? TILE_SURFACE.hairlineBorder,
        },
        pressable: { flex: 1 },
      }),
    [variant, borderColor]
  );

  const gradientColors =
    variant === 'spotlight' ? TILE_SURFACE.spotlightGradient : TILE_SURFACE.tileGradient;

  const inner = (
    <LinearGradient
      colors={gradientColors as unknown as readonly [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  );

  if (!onPress) {
    return (
      <View style={[styles.outer, containerStyle]} {...a11y}>
        {inner}
      </View>
    );
  }

  const handlePressIn = () => {
    if (!reduceMotion) {
      scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, PRESS_SPRING);
  };

  return (
    <Animated.View style={[styles.outer, containerStyle, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
        {...a11y}
      >
        {inner}
      </Pressable>
    </Animated.View>
  );
}
