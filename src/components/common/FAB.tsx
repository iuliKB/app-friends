import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SHADOWS, SPACING } from '@/theme';

export interface FABProps {
  icon: React.ReactNode;
  label?: string;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
}

export function FAB({ icon, label, onPress, accessibilityLabel, size = 56 }: FABProps) {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const positionStyle = {
    bottom: SPACING.xl + insets.bottom,
    right: SPACING.xl,
  };

  const shapeStyle = label
    ? styles.pill
    : [styles.circle, { width: size, height: size }];

  return (
    <Animated.View
      style={[styles.fabWrapper, positionStyle, { transform: [{ scale }] }]}
    >
      <TouchableOpacity
        style={[styles.fab, shapeStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {icon}
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
  },
  fab: {
    backgroundColor: COLORS.interactive.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.fab,
  },
  pill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.full,
  },
  circle: {
    borderRadius: RADII.full,
  },
  label: {
    color: COLORS.surface.base,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.lg,
    marginLeft: SPACING.sm,
  },
});
