import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { BentoCard } from './BentoCard';
import { TILE_ACCENTS, ACCENT_FILL } from './tileAccents';
import type { UseHabitsResult } from '@/hooks/useHabits';

interface HabitsTileProps {
  habits: UseHabitsResult;
}

export function HabitsTile({ habits }: HabitsTileProps) {
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
          backgroundColor: TILE_ACCENTS.habits + ACCENT_FILL,
        },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        heroRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        bigNumber: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: -0.5,
        },
        bigNumberMuted: {
          color: colors.text.secondary,
        },
        denominator: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
          letterSpacing: -0.5,
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

  if (habits.loading) {
    return (
      <BentoCard containerStyle={{ flex: 1 }} accessibilityLabel="Loading habits">
        <View style={[styles.skeletonBar, { width: '50%' }]} />
        <View style={[styles.skeletonBar, { width: '40%', height: 22 }]} />
        <View style={[styles.skeletonBar, { width: '60%' }]} />
      </BentoCard>
    );
  }

  const doneCount = habits.habits.filter((h) => h.did_me_check_in_today).length;
  const totalCount = habits.habits.length;
  const isEmpty = totalCount === 0;
  const subline = isEmpty ? 'tap to start' : 'done today';

  return (
    <BentoCard
      onPress={() => router.push('/squad/habits' as never)}
      containerStyle={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={`Habits. ${doneCount} of ${totalCount} done today. Tap to open.`}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <Ionicons name="checkmark-done-outline" size={16} color={TILE_ACCENTS.habits} />
        </View>
        <Text style={styles.title}>Habits</Text>
      </View>

      <View style={styles.heroRow}>
        <Text
          style={[
            styles.bigNumber,
            doneCount > 0
              ? { color: TILE_ACCENTS.habits }
              : styles.bigNumberMuted,
          ]}
        >
          {doneCount}
        </Text>
        <Text style={styles.denominator}>/{totalCount}</Text>
      </View>

      <Text style={styles.unit}>{subline}</Text>
    </BentoCard>
  );
}
