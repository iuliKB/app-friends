// Memories section — full-width hero photo slider that auto-cycles through
// recent plan photos. Pauses while pressed and respects prefers-reduced-motion.

import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ANIMATION, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useAllPlanPhotos } from '@/hooks/useAllPlanPhotos';

const TILE_HEIGHT = 200;
const PHOTO_INTERVAL_MS = 4000;

export function MemoriesSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const [pressed, setPressed] = useState(false);
  const { recentPhotos, isLoading } = useAllPlanPhotos();
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Reset index whenever the photo list changes so we don't point past the end.
  useEffect(() => {
    setIndex(0);
  }, [recentPhotos.length]);

  useEffect(() => {
    if (recentPhotos.length <= 1 || pressed || reduceMotion) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % recentPhotos.length);
    }, PHOTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [recentPhotos.length, pressed, reduceMotion]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {},
        headerWrapper: {
          paddingHorizontal: SPACING.lg,
        },
        seeAllText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.accent,
        },
        tileWrapper: {
          paddingHorizontal: SPACING.lg,
        },
        tile: {
          height: TILE_HEIGHT,
          borderRadius: RADII.lg,
          overflow: 'hidden',
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderColor: colors.border,
          ...colors.cardElevation,
        },
        empty: {
          flex: 1,
          padding: SPACING.lg,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        emptyTitle: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        emptyBlock: {
          alignItems: 'flex-start',
          gap: SPACING.xs,
        },
        emptyHeading: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        emptySub: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        overlayBottom: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: SPACING.lg,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: SPACING.sm,
        },
        caption: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          color: '#FFFFFF',
        },
        captionSpacer: {
          flex: 1,
        },
        dotsRow: {
          flexDirection: 'row',
          gap: SPACING.xs,
        },
        dot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(255, 255, 255, 0.45)',
        },
        dotActive: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: '#FFFFFF',
        },
      }),
    [colors]
  );

  function handlePress() {
    router.push('/(tabs)/squad?tab=memories' as never);
  }

  const seeAllAction = (
    <TouchableOpacity onPress={handlePress} hitSlop={8}>
      <Text style={styles.seeAllText}>See all</Text>
    </TouchableOpacity>
  );

  const dotCount = recentPhotos.length;
  const current = recentPhotos[index] ?? recentPhotos[0];
  const hasPhotos = recentPhotos.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <SectionHeader title="Memories" rightAction={seeAllAction} />
      </View>

      <View style={styles.tileWrapper}>
        <Pressable
          style={({ pressed: p }) => [
            styles.tile,
            p ? { borderColor: colors.interactive.accent } : null,
          ]}
          onPress={handlePress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel="Memories"
        >
          {hasPhotos ? (
            <>
              <Image
                source={{ uri: current?.signedUrl ?? undefined }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={ANIMATION.duration.normal}
                accessibilityLabel={`Photo from ${current?.planTitle ?? 'a plan'}`}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
                locations={[0.45, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.overlayBottom} pointerEvents="none">
                {current?.planTitle ? (
                  <Text style={styles.caption} numberOfLines={1}>
                    {current.planTitle}
                  </Text>
                ) : (
                  <View style={styles.captionSpacer} />
                )}
                {dotCount > 1 ? (
                  <View style={styles.dotsRow}>
                    {Array.from({ length: dotCount }).map((_, i) => (
                      <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Memories</Text>
              <View style={styles.emptyBlock}>
                <Ionicons name="images-outline" size={22} color={colors.interactive.accent} />
                <Text style={styles.emptyHeading} numberOfLines={1}>
                  {isLoading ? '—' : 'No photos'}
                </Text>
                <Text style={styles.emptySub} numberOfLines={1}>
                  {isLoading ? '' : 'add to a plan'}
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
