import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS } from '@/theme';
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
  const { colors } = useTheme();
  const router = useRouter();
  const hasImage = Boolean(plan.cover_image_url);

  // D-03: charCodeAt(0) on UUID (always hex char 0-9/a-f) — stable across renders
  // eslint-disable-next-line campfire/no-hardcoded-styles
  const pastelBg = PASTEL_COLORS[plan.id.charCodeAt(0) % PASTEL_COLORS.length];

  // UI-SPEC: text is white on image cards, dark (#1a1a1a) on light pastel cards
  // eslint-disable-next-line campfire/no-hardcoded-styles
  const textColor = hasImage ? colors.text.primary : '#1a1a1a';

  const dateLabel = formatEventCardDate(plan.scheduled_for); // D-18, D-19

  // D-17: tap navigates to plan detail (same pattern as PlanCard in Explore tab)
  function handlePress() {
    router.push(`/plans/${plan.id}` as never);
  }

  return (
    <TouchableOpacity
      style={[styles.card, SHADOWS.card]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}, ${dateLabel}`}
    >
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

      {/* Content layer — rendered above background */}
      <View style={styles.content}>
        {/* Title — D-04 */}
        <Text
          style={[styles.title, { color: textColor }]}
          numberOfLines={2}
        >
          {plan.title}
        </Text>

        {/* Date — D-04, D-18 */}
        {dateLabel ? (
          <Text style={[styles.date, { color: textColor }]} numberOfLines={1}>
            {dateLabel}
          </Text>
        ) : null}

        {/* Bottom row: avatars + time icon — D-04 */}
        <View style={styles.bottomRow}>
          <AvatarStack members={plan.members} size={24} maxVisible={3} />
          <View style={styles.timeIndicator}>
            <Ionicons name="time-outline" size={12} color={textColor} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // D-01: 200x140px landscape card dimensions
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 200,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 140,
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
  date: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.body.regular,
    lineHeight: FONT_SIZE.sm * 1.3,
    opacity: 0.9,
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
