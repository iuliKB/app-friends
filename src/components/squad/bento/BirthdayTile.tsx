import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { formatDaysUntil } from '@/utils/birthdayFormatters';
import { BentoCard } from './BentoCard';
import { TILE_ACCENTS, ACCENT_FILL } from './tileAccents';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';

interface BirthdayTileProps {
  birthdays: UpcomingBirthdaysData;
}

export function BirthdayTile({ birthdays }: BirthdayTileProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
        iconBubble: {
          width: 28,
          height: 28,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TILE_ACCENTS.birthday + ACCENT_FILL,
        },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        count: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          letterSpacing: -0.5,
        },
        countSub: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        nearestRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },
        nearestName: {
          flex: 1,
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        nearestDays: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        skeletonBar: {
          height: 14,
          borderRadius: RADII.md,
          backgroundColor: colors.border,
        },
      }),
    [colors]
  );

  if (birthdays.loading) {
    return (
      <BentoCard containerStyle={{ flex: 1 }} accessibilityLabel="Loading birthdays">
        <View style={[styles.skeletonBar, { width: '50%' }]} />
        <View style={[styles.skeletonBar, { width: '70%', height: 22 }]} />
        <View style={[styles.skeletonBar, { width: '60%' }]} />
      </BentoCard>
    );
  }

  const countIn30 = birthdays.entries.filter((e) => e.days_until <= 30).length;
  const nearest = birthdays.entries[0] ?? null;
  const isEmpty = birthdays.entries.length === 0;

  return (
    <BentoCard
      onPress={() => router.push('/squad/birthdays' as never)}
      containerStyle={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={
        isEmpty
          ? 'Birthdays. No upcoming birthdays.'
          : `Birthdays. ${countIn30} in the next 30 days. Nearest: ${nearest?.display_name} ${formatDaysUntil(nearest?.days_until ?? 0)}.`
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <Ionicons name="gift-outline" size={16} color={TILE_ACCENTS.birthday} />
        </View>
        <Text style={styles.title}>Birthdays</Text>
      </View>

      {isEmpty ? (
        <>
          <Text style={styles.count}>0</Text>
          <Text style={styles.countSub}>None upcoming</Text>
        </>
      ) : (
        <>
          <Text style={styles.count}>{countIn30}</Text>
          {nearest && (
            <View style={styles.nearestRow}>
              <AvatarCircle
                size={20}
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
    </BentoCard>
  );
}
