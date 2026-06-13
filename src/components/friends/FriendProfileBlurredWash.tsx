// Phase 33 — Blurred avatar backdrop for FriendProfileHeader (D-02 / REQ-FP-05).
//
// Renders the friend's avatar at full bleed behind the header, blurred with the
// expo-image native `blurRadius` prop (NOT expo-blur BlurView — that one is for
// frosted-glass over scroll content; we have a known static image). Overlay
// LinearGradient dims the top/bottom so name + status pill stay legible. Fades
// in on the underlying <Image>'s onLoad event over ANIMATION.duration.normal.
//
// Implements UI-SPEC §Blurred-Avatar Wash Technique (lines 306-363) verbatim.
// IMPORTANT: surface.elevated does NOT exist in our theme — fallback uses
// colors.surface.card per PATTERNS §Corrections row 2.

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { ANIMATION } from '@/theme/animation';

interface FriendProfileBlurredWashProps {
  avatarUrl: string | null;
  // Driven externally by FriendProfileHeader's scrollY; wash fades to 0 by WASH_FADE_END (220).
  washOpacity: SharedValue<number>; // 0..1 from header's useDerivedValue on scrollY
}

export function FriendProfileBlurredWash({
  avatarUrl,
  washOpacity,
}: FriendProfileBlurredWashProps) {
  const { colors, isDark } = useTheme();
  const [washReady, setWashReady] = useState(false);
  const loadOpacity = useSharedValue(0);

  useEffect(() => {
    if (washReady) {
      loadOpacity.value = withTiming(1, { duration: ANIMATION.duration.normal });
    } else {
      loadOpacity.value = 0;
    }
  }, [washReady, loadOpacity]);

  // Gradient stops per UI-SPEC §Blurred-Avatar Wash Technique — Dark/Light pairs.
  // Note the hex/rgba literals are locked by UI-SPEC; they MUST track the underlying
  // surface.base token. Keep both stops in one named const to make future light/dark
  // tweaks atomic.
  const gradientColors = useMemo<readonly [string, string]>(
    () =>
      isDark
        ? (['rgba(14, 15, 17, 0.35)', 'rgba(14, 15, 17, 0.95)'] as const)
        : (['rgba(245, 246, 248, 0.45)', 'rgba(245, 246, 248, 0.95)'] as const),
    [isDark]
  );

  // Compose external wash opacity (scroll-driven) with internal load-in opacity.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: washOpacity.value * loadOpacity.value,
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...StyleSheet.absoluteFillObject,
        },
        fallback: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.surface.card, // surface.elevated → surface.card per PATTERNS §Corrections #2
        },
      }),
    [colors]
  );

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={StyleSheet.absoluteFill}
          blurRadius={40}
          contentFit="cover"
          onLoad={() => setWashReady(true)}
        />
      ) : (
        <View style={styles.fallback} />
      )}
      <LinearGradient colors={gradientColors} locations={[0, 1]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}
