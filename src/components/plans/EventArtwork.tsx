import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import type { PlanWithMembers } from '@/types/plans';

// Shared visual idiom for plan/event cards — mirrors the home EventCard
// real-estate aesthetic so the Plans tab list reads as one design family.
//
// Image area: cover photo OR deterministic dark gradient + neon monogram.
// Optional overlays:
//   • Top-right pill — relative time ("in 3d", "tomorrow"), dark glass.
//   • Bottom-left badge — date stamp ("Sat 15"), neon-tinted glass.
//
// Both pill flags default off so callers opt in based on how dense their
// surrounding layout is (hero shows both, compact list usually shows one).

type GradientPair = readonly [string, string];
const COVER_GRADIENTS: readonly GradientPair[] = [
  ['#1A1D23', '#2A2F38'], // charcoal
  ['#2A1F18', '#3D2A1F'], // ember
  ['#1A2018', '#2A3A28'], // forest
  ['#1A2128', '#2A3640'], // storm
  ['#1A1D23', '#1F2A1F'], // glow
];
const MONOGRAM_COLOR = '#B9FF3B';

export interface EventDateLabels {
  date: string;    // "Sat 15 May"
  short: string;   // "Sat 15"
  time: string;    // "7:30 PM"
  relative: string; // "tomorrow", "in 3d"
}

export function formatEventLabels(scheduledFor: string | null): EventDateLabels | null {
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

interface EventArtworkProps {
  plan: PlanWithMembers;
  height: number;
  borderRadius?: number;
  showRelativePill?: boolean;
  showDateBadge?: boolean;
  monogramSize?: number;
}

export function EventArtwork({
  plan,
  height,
  borderRadius = 0,
  showRelativePill = true,
  showDateBadge = true,
  monogramSize = 72,
}: EventArtworkProps) {
  const hasImage = Boolean(plan.cover_image_url);
  const gradientPair = COVER_GRADIENTS[plan.id.charCodeAt(0) % COVER_GRADIENTS.length];
  const monogram = (Array.from(plan.title.trim())[0] ?? '?').toUpperCase();
  const labels = formatEventLabels(plan.scheduled_for);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          width: '100%',
          height,
          borderRadius,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        monogram: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: monogramSize,
          fontFamily: FONT_FAMILY.display.bold,
          color: MONOGRAM_COLOR,
          opacity: 0.28,
          letterSpacing: -2,
        },
        relativePill: {
          position: 'absolute',
          top: SPACING.sm,
          right: SPACING.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.sm,
          borderRadius: RADII.full,
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
          left: SPACING.sm,
          bottom: SPACING.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.sm,
          borderRadius: RADII.full,
          borderWidth: 1,
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
      }),
    [height, borderRadius, monogramSize]
  );

  return (
    <View style={styles.wrapper}>
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
          <Text style={styles.monogram} accessibilityElementsHidden importantForAccessibility="no">
            {monogram}
          </Text>
        </>
      )}

      {labels && showRelativePill ? (
        <View style={styles.relativePill}>
          <Ionicons name="time-outline" size={12} color="#FFFFFF" />
          <Text style={styles.relativePillText}>{labels.relative}</Text>
        </View>
      ) : null}

      {labels && showDateBadge ? (
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={12} color="#B9FF3B" />
          <Text style={styles.dateBadgeText}>{labels.short}</Text>
        </View>
      ) : null}
    </View>
  );
}
