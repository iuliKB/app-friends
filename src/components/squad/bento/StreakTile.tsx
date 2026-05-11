import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { BentoCard } from './BentoCard';
import { TILE_ACCENTS, ACCENT_FILL } from './tileAccents';

interface StreakTileProps {
  streak: {
    currentWeeks: number;
    bestWeeks: number;
    loading: boolean;
  };
}

export function StreakTile({ streak }: StreakTileProps) {
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
          backgroundColor: TILE_ACCENTS.streak + ACCENT_FILL,
        },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        bigNumber: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          letterSpacing: -0.5,
        },
        bigNumberMuted: {
          color: colors.text.secondary,
        },
        unit: {
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

  if (streak.loading) {
    return (
      <BentoCard containerStyle={{ flex: 1 }} accessibilityLabel="Loading streak">
        <View style={[styles.skeletonBar, { width: '50%' }]} />
        <View style={[styles.skeletonBar, { width: '40%', height: 22 }]} />
        <View style={[styles.skeletonBar, { width: '60%' }]} />
      </BentoCard>
    );
  }

  const isZero = streak.currentWeeks === 0;

  return (
    <BentoCard
      onPress={() => router.push('/plan-create' as never)}
      containerStyle={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={
        isZero
          ? 'Streak. Start your first week.'
          : `Streak. ${streak.currentWeeks} weeks. Best ${streak.bestWeeks} weeks.`
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <Ionicons name="flame-outline" size={16} color={TILE_ACCENTS.streak} />
        </View>
        <Text style={styles.title}>Streak</Text>
      </View>

      <View>
        <Text
          style={[
            styles.bigNumber,
            isZero ? styles.bigNumberMuted : { color: TILE_ACCENTS.streak },
          ]}
        >
          {streak.currentWeeks}
        </Text>
        <Text style={styles.unit}>{streak.currentWeeks === 1 ? 'week' : 'weeks'}</Text>
      </View>

      <Text style={styles.unit}>
        {isZero ? 'Make a plan to start' : `Best: ${streak.bestWeeks} wks`}
      </Text>
    </BentoCard>
  );
}
