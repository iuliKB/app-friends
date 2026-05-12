import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/common/PrimaryButton';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING, RADII } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface WelcomeScreenProps {
  onDone: () => void;
}

type SlideId = 'who' | 'plan' | 'all';

interface Slide {
  id: SlideId;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    id: 'who',
    title: 'See who’s free, right now.',
    body: 'Daily status from your closest friends — at a glance.',
  },
  {
    id: 'plan',
    title: 'Spin up plans in seconds.',
    body: 'Pick a time, drop a place, ping the group.',
  },
  {
    id: 'all',
    title: 'Everything in one place.',
    body: 'Birthdays, IOUs, group chat, photos — no more scattered DMs.',
  },
];

export default function WelcomeScreen({ onDone }: WelcomeScreenProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<Animated.FlatList<Slide>>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  function handleMomentumEnd(offsetX: number) {
    const next = Math.round(offsetX / SCREEN_W);
    if (next !== index) {
      setIndex(next);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync().catch(() => {});
      }
    }
  }

  function goTo(i: number) {
    listRef.current?.scrollToOffset({ offset: i * SCREEN_W, animated: true });
    setIndex(i);
  }

  function handlePrimary() {
    if (index < SLIDES.length - 1) {
      goTo(index + 1);
    } else {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      onDone();
    }
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        safe: { flex: 1 },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.md,
        },
        brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
        // eslint-disable-next-line campfire/no-hardcoded-styles
        brandEmoji: { fontSize: 22 },
        brand: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        skipHit: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
        skipText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
        slide: {
          width: SCREEN_W,
          flex: 1,
          paddingHorizontal: SPACING.xl,
          justifyContent: 'center',
        },
        illustrationWrap: {
          height: 320,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: SPACING.xxl,
        },
        title: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.bold,
          color: colors.text.primary,
          textAlign: 'center',
          lineHeight: 38,
        },
        body: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          marginTop: SPACING.md,
          lineHeight: 24,
          paddingHorizontal: SPACING.sm,
        },
        bottom: {
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.lg,
        },
        dotsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: SPACING.sm,
          marginBottom: SPACING.xl,
        },
        dot: {
          height: 8,
          width: 8,
          borderRadius: RADII.full,
          backgroundColor: colors.text.secondary,
          opacity: 0.35,
        },
        ctaWrap: { marginTop: 0 },
      }),
    [colors]
  );

  return (
    <LinearGradient
      colors={colors.authGradient.colors}
      locations={colors.authGradient.locations}
      start={colors.authGradient.start}
      end={colors.authGradient.end}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header: brand + Skip */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Ionicons name="flame" size={24} color={colors.interactive.accent} />
            <Text style={styles.brand}>Campfire</Text>
          </View>
          {index < SLIDES.length - 1 ? (
            <Pressable
              onPress={onDone}
              hitSlop={12}
              style={styles.skipHit}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.skipHit} />
          )}
        </View>

        {/* Pager */}
        <Animated.FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => handleMomentumEnd(e.nativeEvent.contentOffset.x)}
          renderItem={({ item, index: i }) => (
            <View style={styles.slide}>
              <View style={styles.illustrationWrap}>
                <SlideIllustration
                  id={item.id}
                  i={i}
                  scrollX={scrollX}
                  reducedMotion={reducedMotion}
                />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />

        {/* Bottom: dots + CTA */}
        <View style={styles.bottom}>
          <View
            style={styles.dotsRow}
            accessibilityRole="tablist"
            accessibilityLabel={`Page ${index + 1} of ${SLIDES.length}`}
          >
            {SLIDES.map((s, i) => (
              <Dot
                key={s.id}
                i={i}
                scrollX={scrollX}
                active={i === index}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>
          <View style={styles.ctaWrap}>
            <PrimaryButton
              title={index < SLIDES.length - 1 ? 'Continue' : 'Get started'}
              onPress={handlePrimary}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Dot indicator — grows on the active page based on scroll position.
// ---------------------------------------------------------------------------
function Dot({
  i,
  scrollX,
  active,
  reducedMotion,
}: {
  i: number;
  scrollX: SharedValue<number>;
  active: boolean;
  reducedMotion: boolean;
}) {
  const { colors } = useTheme();
  const animated = useAnimatedStyle(() => {
    if (reducedMotion) {
      return {
        width: active ? 24 : 8,
        opacity: active ? 1 : 0.35,
        backgroundColor: active ? colors.interactive.accent : colors.text.secondary,
      };
    }
    const x = scrollX.value / SCREEN_W;
    const distance = Math.abs(x - i);
    const w = interpolate(distance, [0, 1], [24, 8], Extrapolation.CLAMP);
    const o = interpolate(distance, [0, 1], [1, 0.35], Extrapolation.CLAMP);
    return {
      width: w,
      opacity: o,
      backgroundColor: distance < 0.5 ? colors.interactive.accent : colors.text.secondary,
    };
  }, [active, reducedMotion, colors]);
  return <Animated.View style={[dotStyles.base, animated]} />;
}

const dotStyles = StyleSheet.create({
  base: {
    height: 8,
    borderRadius: RADII.full,
  },
});

// ---------------------------------------------------------------------------
// Illustration switcher — parallax driven by scrollX.
// ---------------------------------------------------------------------------
function SlideIllustration({
  id,
  i,
  scrollX,
  reducedMotion,
}: {
  id: SlideId;
  i: number;
  scrollX: SharedValue<number>;
  reducedMotion: boolean;
}) {
  const parallaxStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { transform: [{ translateX: 0 }], opacity: 1 };
    const offset = scrollX.value - i * SCREEN_W;
    const tx = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [60, 0, -60], Extrapolation.CLAMP);
    const op = interpolate(Math.abs(offset), [0, SCREEN_W * 0.6], [1, 0.4], Extrapolation.CLAMP);
    return { transform: [{ translateX: tx }], opacity: op };
  });

  return (
    <Animated.View style={[illusStyles.wrap, parallaxStyle]}>
      {id === 'who' && <RadarIllustration />}
      {id === 'plan' && <PlanIllustration />}
      {id === 'all' && <BentoIllustration />}
    </Animated.View>
  );
}

const illusStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

// ---------------------------------------------------------------------------
// Illustration 1 — Radar (concentric rings + friend dots, lime pulse center)
// ---------------------------------------------------------------------------
function RadarIllustration() {
  const { colors } = useTheme();
  const accent = colors.interactive.accent;
  const dim = colors.text.secondary;

  const ringStyle = (size: number, opacity: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: dim,
    opacity,
  });

  const dotStyle = (top: number, left: number, color: string, size = 14) => ({
    position: 'absolute' as const,
    top,
    left,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  });

  return (
    <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
      <View style={ringStyle(280, 0.1)} />
      <View style={ringStyle(210, 0.18)} />
      <View style={ringStyle(140, 0.28)} />
      <View style={ringStyle(70, 0.45)} />

      {/* Center pulse — accent */}
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: accent }} />

      {/* Friend dots — positioned roughly on rings */}
      <View style={dotStyle(40, 30, accent)} />
      <View style={dotStyle(80, 230, '#F87171')} />
      <View style={dotStyle(165, 20, '#FACC15')} />
      <View style={dotStyle(220, 200, accent)} />
      <View style={dotStyle(130, 250, dim, 10)} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Illustration 2 — Plan card with stacked avatars + RSVP pill
// ---------------------------------------------------------------------------
function PlanIllustration() {
  const { colors } = useTheme();
  const accent = colors.interactive.accent;

  const avatar = (left: number, bg: string) => ({
    position: 'absolute' as const,
    left,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: RADII.full,
    backgroundColor: bg,
    borderWidth: 2,
    borderColor: colors.surface.base,
  });

  return (
    <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
      {/* Card */}
      <View
        style={{
          width: 240,
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          padding: SPACING.lg,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <Ionicons name="pizza" size={20} color={accent} />
          <Text
            style={{
              fontSize: FONT_SIZE.lg,
              fontFamily: FONT_FAMILY.display.semibold,
              color: colors.text.primary,
            }}
          >
            Pizza @ 8?
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.xs,
            marginBottom: SPACING.md,
          }}
        >
          <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
          <Text
            style={{
              fontSize: FONT_SIZE.sm,
              fontFamily: FONT_FAMILY.body.regular,
              color: colors.text.secondary,
            }}
          >
            Tonight · Maria’s
          </Text>
        </View>

        {/* Avatar stack */}
        <View style={{ height: 36, marginBottom: SPACING.md }}>
          <View style={avatar(0, '#7C9DFF')} />
          <View style={avatar(24, '#F472B6')} />
          <View style={avatar(48, '#FBBF24')} />
          <View style={avatar(72, '#34D399')} />
        </View>

        {/* RSVP pill */}
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.xs,
            borderRadius: RADII.pill,
            backgroundColor: accent,
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZE.sm,
              fontFamily: FONT_FAMILY.display.semibold,
              color: colors.surface.base,
            }}
          >
            I’m in ✓
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Illustration 3 — Bento grid: birthdays / IOU / chat / photos
// ---------------------------------------------------------------------------
function BentoIllustration() {
  const { colors } = useTheme();
  const accent = colors.interactive.accent;

  const tile = (icon: keyof typeof Ionicons.glyphMap, label: string, tint: string) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface.card,
        borderRadius: RADII.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
      }}
    >
      <Ionicons name={icon} size={28} color={tint} />
      <Text
        style={{
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <View style={{ width: 280, height: 280, gap: SPACING.md }}>
      <View style={{ flex: 1, flexDirection: 'row', gap: SPACING.md }}>
        {tile('gift-outline', 'Birthdays', accent)}
        {tile('cash-outline', 'IOUs', '#FACC15')}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: SPACING.md }}>
        {tile('chatbubbles-outline', 'Chats', '#7C9DFF')}
        {tile('images-outline', 'Memories', '#F472B6')}
      </View>
    </View>
  );
}
