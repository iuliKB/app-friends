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

// Plans tab hero — first/next upcoming plan. Full-width version of the
// real-estate-style card used on the Home screen (src/components/home/EventCard.tsx):
// artwork on top with date badge + relative pill, solid info panel below
// with eyebrow + title + meta + avatar stack.

const HERO_IMAGE_HEIGHT = 180;

interface NextEventHeroProps {
  plan: PlanWithMembers;
  onPress: () => void;
}

export function NextEventHero({ plan, onPress }: NextEventHeroProps) {
  const { colors, isDark } = useTheme();
  const cardScaleAnim = useRef(new Animated.Value(1)).current;

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

  const labels = formatEventLabels(plan.scheduled_for);
  const going = plan.members.filter((m) => m.rsvp === 'going' || m.rsvp === 'maybe');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: '100%',
          borderRadius: RADII.xl,
          backgroundColor: colors.surface.card,
          overflow: 'hidden',
          borderWidth: isDark ? 0 : 1,
          borderColor: colors.border,
        },
        cardInner: {
          flex: 1,
        },
        infoPanel: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.lg,
          gap: SPACING.xs,
        },
        eyebrow: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.interactive.accent,
          letterSpacing: 1.0,
          textTransform: 'uppercase',
        },
        title: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          lineHeight: FONT_SIZE.xl * 1.2,
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          marginTop: SPACING.xs,
          flexWrap: 'wrap',
        },
        metaItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },
        metaText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          flexShrink: 1,
        },
        divider: {
          width: 1,
          height: 12,
          backgroundColor: colors.border,
        },
        avatarRow: {
          marginTop: SPACING.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        goingText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
      }),
    [colors, isDark]
  );

  const a11yLabel = [
    'Next event',
    plan.title,
    labels ? `${labels.date} at ${labels.time}, ${labels.relative}` : '',
    plan.location ?? '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={[styles.card, isDark ? SHADOWS.card : SHADOWS.swipeCard]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1.0}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <Animated.View style={[styles.cardInner, { transform: [{ scale: cardScaleAnim }] }]}>
        <EventArtwork plan={plan} height={HERO_IMAGE_HEIGHT} monogramSize={96} />

        <View style={styles.infoPanel}>
          <Text style={styles.eyebrow}>Next event</Text>
          <Text style={styles.title} numberOfLines={2}>
            {plan.title}
          </Text>

          {labels || plan.location ? (
            <View style={styles.metaRow}>
              {labels ? (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {labels.date} {'·'} {labels.time}
                  </Text>
                </View>
              ) : null}
              {labels && plan.location ? <View style={styles.divider} /> : null}
              {plan.location ? (
                <View style={[styles.metaItem, { flexShrink: 1 }]}>
                  <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {plan.location}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {going.length > 0 ? (
            <View style={styles.avatarRow}>
              <AvatarStack members={going} maxVisible={5} size={28} />
              <Text style={styles.goingText}>
                {going.length === 1 ? '1 going' : `${going.length} going`}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
