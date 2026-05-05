// SkeletonPulse — shimmer placeholder for loading states (Phase 24, POLISH-01)
// Usage: <SkeletonPulse width={200} height={20} /> or <SkeletonPulse width="100%" height={20} />
// Pattern: RadarBubble.tsx PulseRing — Animated.loop + useNativeDriver: true on translateX transform

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, RADII, ANIMATION } from '@/theme';

// D-02 (locked): width is number | '100%'; height is number. No children, no style prop, no borderRadius prop.
interface SkeletonPulseProps {
  width: number | '100%';
  height: number;
}

export function SkeletonPulse({ width, height }: SkeletonPulseProps) {
  const { colors } = useTheme();

  // For width='100%', we must measure the actual pixel width before starting the animation.
  // translateX range is [-containerWidth, containerWidth] so the shimmer fully enters and exits.
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(
    typeof width === 'number' ? width : null
  );
  const containerWidth = typeof width === 'number' ? width : measuredWidth;

  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gate: do not start until we know the pixel width (handles width='100%' case).
    if (containerWidth === null) return;

    translateX.setValue(-containerWidth);

    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: containerWidth,
        duration: ANIMATION.duration.verySlow,   // 1200ms — looping ambient animation (D-05)
        easing: ANIMATION.easing.decelerate(),   // Easing.out(Easing.ease) — smooth left-to-right glide
        useNativeDriver: true,                   // translateX on transform is native-eligible
        isInteraction: false,                    // never block FlatList rendering or gesture detection
      })
    );

    loop.start();
    return () => loop.stop(); // cleanup on unmount — prevents memory leak
  }, [containerWidth, translateX]);

  // D-03 (locked): always RADII.sm, no borderRadius prop.
  // overflow: 'hidden' clips the gradient band at the rectangle boundary — without this
  // the shimmer bleeds outside the skeleton rectangle.
  const styles = useMemo(() => StyleSheet.create({
    container: {
      width,
      height,
      borderRadius: RADII.sm,
      backgroundColor: colors.surface.card,
      overflow: 'hidden',
    },
  }), [colors, width, height]);

  function handleLayout(e: LayoutChangeEvent) {
    if (typeof width !== 'number') {
      setMeasuredWidth(e.nativeEvent.layout.width);
    }
  }

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessibilityLabel="Loading"
    >
      {/*
        Gate: do not render the gradient until containerWidth is known.
        Prevents a visible glitch frame with translateX at its initial value before onLayout fires.
      */}
      {containerWidth !== null && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX }] },
          ]}
        >
          {/*
            Three-stop gradient: transparent → colors.surface.overlay → transparent
            Horizontal direction (x: 0→1, y constant) produces the left-to-right sweep.
            colors.surface.overlay: Dark rgba(255,255,255,0.08) / Light rgba(0,0,0,0.06)
          */}
          <LinearGradient
            colors={['transparent', colors.surface.overlay, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}
