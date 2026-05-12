import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useTheme,
  SPACING,
  FONT_SIZE,
  FONT_FAMILY,
  RADII,
  SHADOWS,
  ANIMATION,
} from '@/theme';
import { AvatarStack } from '@/components/plans/AvatarStack';
import { EventArtwork, formatEventLabels } from '@/components/plans/EventArtwork';
import type { PlanWithMembers } from '@/types/plans';

// Compact "Upcoming" card — shares the visual family with NextEventHero and
// the home EventCard, but laid out horizontally: square artwork on the left
// (gradient + monogram + date badge), title + meta on the right. Designed to
// stack densely below the hero.

const ART_SIZE = 104;

interface EventListCardProps {
  plan: PlanWithMembers;
  onPress: () => void;
}

export function EventListCard({ plan, onPress }: EventListCardProps) {
  const { colors, isDark } = useTheme();
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const labels = formatEventLabels(plan.scheduled_for);
  const going = plan.members.filter((m) => m.rsvp === 'going' || m.rsvp === 'maybe');

  function handlePressIn() {
    Animated.spring(cardScaleAnim, {
      toValue: 0.98,
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.xl,
          overflow: 'hidden',
          borderWidth: isDark ? 0 : 1,
          borderColor: colors.border,
        },
        artColumn: {
          width: ART_SIZE,
          height: ART_SIZE,
        },
        infoColumn: {
          flex: 1,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          gap: SPACING.xs,
          justifyContent: 'center',
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        title: {
          flex: 1,
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

  const a11yLabel = [
    plan.title,
    labels ? `${labels.date} at ${labels.time}, ${labels.relative}` : '',
    plan.location ?? '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1.0}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <Animated.View
        style={[styles.card, isDark ? SHADOWS.card : SHADOWS.swipeCard, { transform: [{ scale: cardScaleAnim }] }]}
      >
        <View style={styles.artColumn}>
          <EventArtwork
            plan={plan}
            height={ART_SIZE}
            showDateBadge={false}
            showRelativePill={true}
            monogramSize={42}
          />
        </View>

        <View style={styles.infoColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {plan.title}
            </Text>
            {going.length > 0 ? (
              <AvatarStack members={going} maxVisible={3} size={20} />
            ) : null}
          </View>

          {labels ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {labels.relative} {'·'} {labels.time}
              </Text>
            </View>
          ) : null}

          {plan.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {plan.location}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
