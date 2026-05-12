import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS, ANIMATION } from '@/theme';
import type { PlanWithMembers } from '@/types/plans';

// Real-estate-style hero card: image on top, solid info panel below.
// Mirrors the "Park Avenue / Max House" reference layout — clean, bordered,
// no transparency tricks; the artwork and the info plate live in two distinct
// regions separated by a subtle hairline.
const CARD_WIDTH = 240;
const CARD_HEIGHT = 220;
const IMAGE_HEIGHT = 130;

// Brand-matched dark gradient pool for plans without a cover image. Each card
// gets a deterministic pick keyed off plan.id, so the same plan always reads
// the same. The image area is treated like a poster — always dark, regardless
// of theme — and the monogram on top uses the dark-mode neon accent for
// consistent identity (Spotify/Notion placeholder-art convention).
type GradientPair = readonly [string, string];
const COVER_GRADIENTS: readonly GradientPair[] = [
  ['#1A1D23', '#2A2F38'], // charcoal
  ['#2A1F18', '#3D2A1F'], // ember — campfire warmth
  ['#1A2018', '#2A3A28'], // forest — subtle accent-green tint
  ['#1A2128', '#2A3640'], // storm — cool blue-gray
  ['#1A1D23', '#1F2A1F'], // glow  — faint neon-green lift
];
// Always-on monogram color (dark-mode neon accent) — image area reads dark in
// both themes, so we use the same accent rather than swapping on theme.
const MONOGRAM_COLOR = '#B9FF3B';

interface EventCardProps {
  plan: PlanWithMembers;
}

interface DateLabels {
  date: string; // "Sat 15 May"
  short: string; // "Sat 15"
  time: string; // "7:30 PM"
  relative: string; // "tomorrow", "in 3d"
}

function formatDateLabels(scheduledFor: string | null): DateLabels | null {
  if (!scheduledFor) return null;
  const date = new Date(scheduledFor);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relative: string;
  if (diffMs <= 0) relative = 'now';
  else if (diffHours < 1) relative = `${Math.max(1, Math.round(diffMs / 60000))}m`;
  else if (diffHours < 24) relative = `in ${Math.floor(diffHours)}h`;
  else if (diffDays === 1) relative = 'tomorrow';
  else if (diffDays < 7) relative = `in ${diffDays}d`;
  else relative = `in ${Math.ceil(diffDays / 7)}w`;

  return {
    date: date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }),
    short: date.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    relative,
  };
}

export function EventCard({ plan }: EventCardProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const hasImage = Boolean(plan.cover_image_url);
  const gradientPair = COVER_GRADIENTS[plan.id.charCodeAt(0) % COVER_GRADIENTS.length];
  // Array.from splits by codepoint so emoji/accented titles don't yield a
  // half-character; fallback "?" handles empty/whitespace titles.
  const monogram = (Array.from(plan.title.trim())[0] ?? '?').toUpperCase();
  const labels = formatDateLabels(plan.scheduled_for);

  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(cardScaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(cardScaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  function handlePress() {
    router.push(`/plans/${plan.id}` as never);
  }

  const a11yLabel = [
    plan.title,
    labels ? `${labels.date} at ${labels.time}, ${labels.relative}` : '',
    plan.location ?? '',
  ]
    .filter(Boolean)
    .join(', ');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: RADII.xl,
          backgroundColor: colors.surface.card,
          overflow: 'hidden',
          borderWidth: isDark ? 0 : 1,
          borderColor: colors.border,
        },
        cardInner: {
          flex: 1,
        },
        imageArea: {
          width: '100%',
          height: IMAGE_HEIGHT,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        monogram: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: 72,
          fontFamily: FONT_FAMILY.display.bold,

          color: MONOGRAM_COLOR,
          opacity: 0.28,

          letterSpacing: -2,
        },
        relativePill: {
          position: 'absolute',
          top: SPACING.md,
          right: SPACING.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.sm,
          borderRadius: RADII.full,
          // Badges sit on photographic image content and intentionally don't
          // follow the theme palette — they use design-fixed black/white pills
          // matching the Park Avenue / Max House reference card.
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(15,15,18,0.72)',
        },
        relativePillText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          lineHeight: FONT_SIZE.xs * 1.1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          color: '#FFFFFF',
        },
        dateBadge: {
          position: 'absolute',
          left: SPACING.md,
          bottom: SPACING.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.sm,
          borderRadius: RADII.full,
          borderWidth: 1,
          // Option 3 — accent-tinted glass. Subtle on-brand glow with neon-green
          // text/icon for that "campfire ember" feel.
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(185,255,59,0.18)',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          borderColor: 'rgba(185,255,59,0.45)',
        },
        dateBadgeText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          lineHeight: FONT_SIZE.xs * 1.1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          color: '#B9FF3B',
        },
        infoPanel: {
          flex: 1,
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.md,
          gap: SPACING.xs,
          justifyContent: 'center',
        },
        title: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          lineHeight: FONT_SIZE.lg * 1.2,
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },
        metaText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          lineHeight: FONT_SIZE.sm * 1.3,
          flexShrink: 1,
        },
      }),
    [colors, isDark]
  );

  return (
    <TouchableOpacity
      testID="event-card"
      style={[styles.card, isDark ? SHADOWS.card : SHADOWS.swipeCard]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1.0}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <Animated.View style={[styles.cardInner, { transform: [{ scale: cardScaleAnim }] }]}>
        {/* Image area — top portion. With a cover image, the photo fills.
            Without one, a brand-matched dark gradient + monogram fills in. */}
        <View style={styles.imageArea}>
          {hasImage ? (
            <Image
              source={{ uri: plan.cover_image_url! }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <>
              <LinearGradient
                colors={gradientPair}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text
                style={styles.monogram}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {monogram}
              </Text>
            </>
          )}

          {/* Top-right dark pill — relative time ("in 3d", "tomorrow") */}
          {labels ? (
            <View testID="date-pill" style={styles.relativePill}>
              <Ionicons name="time-outline" size={12} color="#FFFFFF" />
              <Text style={styles.relativePillText}>{labels.relative}</Text>
            </View>
          ) : null}

          {/* Bottom-left white badge — date stamp on the artwork (mirrors the
              "rating 4.0" pill in the Park Avenue reference). */}
          {labels ? (
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={12} color="#B9FF3B" />
              <Text style={styles.dateBadgeText}>{labels.short}</Text>
            </View>
          ) : null}
        </View>

        {/* Solid info panel — title + location/time underneath the image */}
        <View style={styles.infoPanel}>
          <Text style={styles.title} numberOfLines={1}>
            {plan.title}
          </Text>

          {plan.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {plan.location}
              </Text>
            </View>
          ) : null}

          {labels ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {labels.date} {'·'} {labels.time}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
