import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS, ANIMATION } from '@/theme';
import { AvatarStack } from '@/components/plans/AvatarStack';
import { formatEventCardDate } from '@/lib/formatEventCardDate';
import type { PlanWithMembers } from '@/types/plans';

// D-03: Pastel background palette — deterministic via plan ID hash
// eslint-disable-next-line campfire/no-hardcoded-styles
const PASTEL_COLORS = ['#F9A8C9', '#FDE68A', '#93C5FD', '#86EFAC', '#C4B5FD'];

interface EventCardProps {
  plan: PlanWithMembers;
}

export function EventCard({ plan }: EventCardProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const hasImage = Boolean(plan.cover_image_url);

  // D-03: charCodeAt(0) on UUID (always hex char 0-9/a-f) — stable across renders
  // eslint-disable-next-line campfire/no-hardcoded-styles
  const pastelBg = PASTEL_COLORS[plan.id.charCodeAt(0) % PASTEL_COLORS.length];

  // UI-SPEC: text is white on image cards, dark (#1a1a1a) on light pastel cards
  // eslint-disable-next-line campfire/no-hardcoded-styles
  const textColor = hasImage ? colors.text.primary : '#1a1a1a';

  const dateLabel = formatEventCardDate(plan.scheduled_for); // D-18, D-19

  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(cardScaleAnim, {
      toValue: 0.96,
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

  // D-17: tap navigates to plan detail (same pattern as PlanCard in Explore tab)
  function handlePress() {
    router.push(`/plans/${plan.id}` as never);
  }

  return (
    <TouchableOpacity
      testID="event-card"
      style={[styles.card, SHADOWS.card]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1.0}
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}, ${dateLabel}`}
    >
      <Animated.View style={{ transform: [{ scale: cardScaleAnim }], flex: 1, justifyContent: 'flex-end' }}>
        {/* Background layer: cover image or pastel color */}
        {hasImage ? (
          <>
            <Image
              source={{ uri: plan.cover_image_url! }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            {/* UI-SPEC: 40% opacity dark overlay for text legibility on images */}
            <View style={[StyleSheet.absoluteFill, styles.overlay]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: pastelBg }]} />
        )}

        {/* D-11: Date pill — absolutely positioned top-left */}
        {dateLabel ? (
          <View
            testID="date-pill"
            style={{
              position: 'absolute',
              top: SPACING.sm,
              left: SPACING.sm,
              backgroundColor: isDark
                ? 'rgba(185,255,59,0.15)'
                : 'rgba(77,124,0,0.12)',
              borderRadius: RADII.sm,
              paddingVertical: SPACING.xs,
              paddingHorizontal: SPACING.sm,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZE.xs,
                fontFamily: FONT_FAMILY.body.regular,
                color: colors.interactive.accent,
                lineHeight: 12,
              }}
            >
              {dateLabel}
            </Text>
          </View>
        ) : null}

        {/* Content layer — rendered above background */}
        <View style={styles.content}>
          {/* Title — D-04 */}
          <Text
            style={[styles.title, { color: textColor }]}
            numberOfLines={2}
          >
            {plan.title}
          </Text>

          {/* Bottom row: avatars + time icon — D-04 */}
          <View style={styles.bottomRow}>
            <AvatarStack members={plan.members} size={28} maxVisible={5} />
            <View style={styles.timeIndicator}>
              <Ionicons name="time-outline" size={12} color={textColor} />
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // D-10: 240x160px landscape card dimensions (was 200x140)
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 240,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 160,
    // D-05: RADII.xl (16) for extra rounded corners
    borderRadius: RADII.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  overlay: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.40)', // UI-SPEC: 40% opacity
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.display.semibold,
    lineHeight: FONT_SIZE.lg * 1.2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  timeIndicator: {
    marginLeft: 'auto',
  },
});
