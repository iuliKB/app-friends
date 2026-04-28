// Phase 7 — BirthdayCard (BDAY-03).
// Dashboard card below StreakCard in squad.tsx goals tab.
// Shows count of birthdays in next 30 days (client-side filter) + nearest friend row.
// Empty state (D-12): card stays visible with "No upcoming birthdays" copy.
// Loading: BirthdayCardSkeleton. Tap: navigates to /squad/birthdays (D-08).

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { formatDaysUntil } from '@/utils/birthdayFormatters';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';

interface BirthdayCardProps {
  birthdays: UpcomingBirthdaysData;
}

export function BirthdayCard({ birthdays }: BirthdayCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      paddingVertical: SPACING.xxl,
      paddingHorizontal: SPACING.xl,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.xl,
    },
    cardPressed: {
      opacity: 0.85,
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
    countLine: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.sm,
    },
    emptyText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.sm,
    },
    divider: {
      height: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginVertical: SPACING.lg,
    },
    nearestRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    nearestName: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      marginLeft: SPACING.sm,
    },
    nearestDays: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    skeletonCard: {
      opacity: 0.5,
    },
    skeletonTitle: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 120,
      height: SPACING.lg,
      borderRadius: RADII.md,
      backgroundColor: colors.border,
    },
    skeletonCount: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 180,
      height: SPACING.md,
      borderRadius: RADII.md,
      backgroundColor: colors.border,
      marginTop: SPACING.md,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    skeletonAvatar: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 32,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 32,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    skeletonName: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 100,
      height: SPACING.md,
      borderRadius: RADII.md,
      backgroundColor: colors.border,
      marginLeft: SPACING.sm,
      flex: 1,
    },
    skeletonDays: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 60,
      height: SPACING.md,
      borderRadius: RADII.md,
      backgroundColor: colors.border,
    },
  }), [colors]);

  const router = useRouter();
  const { entries, loading } = birthdays;

  if (loading) {
    return (
      <View
        style={[styles.card, styles.skeletonCard]}
        accessibilityLabel="Loading birthdays"
      >
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonCount} />
        <View style={styles.divider} />
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonName} />
          <View style={styles.skeletonDays} />
        </View>
      </View>
    );
  }

  // D-06: count is friends with birthday in the NEXT 30 DAYS (client-side filter on full RPC result)
  const countIn30Days = entries.filter((e) => e.days_until <= 30).length;
  const nearest = entries[0] ?? null; // RPC sorted by days_until ASC
  const isEmpty = entries.length === 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push('/squad/birthdays' as never)}
      accessibilityRole="button"
      accessibilityLabel={
        isEmpty
          ? 'Birthdays. No upcoming birthdays'
          : `${countIn30Days} upcoming birthdays. Nearest: ${nearest?.display_name ?? ''} ${formatDaysUntil(nearest?.days_until ?? 0)}`
      }
    >
      <Text style={styles.title}>Birthdays 🎂</Text>

      {isEmpty ? (
        <Text style={styles.emptyText}>No upcoming birthdays</Text>
      ) : (
        <>
          <Text style={styles.countLine}>
            {countIn30Days} {countIn30Days === 1 ? 'birthday' : 'birthdays'} in the next 30 days
          </Text>
          <View style={styles.divider} />
          {nearest && (
            <View style={styles.nearestRow}>
              <AvatarCircle
                size={32}
                imageUri={nearest.avatar_url}
                displayName={nearest.display_name}
              />
              <Text style={styles.nearestName} numberOfLines={1}>
                {nearest.display_name}
              </Text>
              <Text style={styles.nearestDays}>{formatDaysUntil(nearest.days_until)}</Text>
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
