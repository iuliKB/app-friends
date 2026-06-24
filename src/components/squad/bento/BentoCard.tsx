import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, RADII, SPACING } from '@/theme';

interface BentoCardProps extends AccessibilityProps {
  onPress?: () => void;
  variant?: 'tile' | 'spotlight';
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

// Flat surfaces — matches StreakCard and the rest of the app. Depth comes from
// surface.card (#1D2027) on surface.base (#0E0F11), not gradients/shadows/borders.
// Press feedback is a simple opacity dab (like StreakCard.cardPressed), not a spring.
export function BentoCard({
  onPress,
  variant = 'tile',
  containerStyle,
  children,
  ...a11y
}: BentoCardProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          borderRadius: RADII.lg,
          overflow: 'hidden',
          backgroundColor: colors.surface.card,
        },
        inner: {
          flex: 1,
          padding: variant === 'spotlight' ? SPACING.xl : SPACING.lg,
          minHeight: variant === 'tile' ? 132 : undefined,
          justifyContent: variant === 'tile' ? 'space-between' : undefined,
        },
      }),
    [colors, variant]
  );

  const inner = <View style={styles.inner}>{children}</View>;

  if (!onPress) {
    return (
      <View style={[styles.outer, containerStyle]} {...a11y}>
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      style={({ pressed }) => [styles.outer, containerStyle, pressed && { opacity: 0.85 }]}
      {...a11y}
    >
      {inner}
    </Pressable>
  );
}
