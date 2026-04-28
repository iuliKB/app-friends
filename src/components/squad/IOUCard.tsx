// Phase 9 v1.4 — IOUCard (IOU-03, IOU-05).
// Goals tab dashboard card showing aggregate net balance.
// D-11: matches StreakCard/BirthdayCard visual pattern.
// D-12: "You're owed $X" (green) or "You owe $X" (red) + unsettled count sub-label.
// D-13: tap → /squad/expenses.
// D-15: data from useIOUSummary hook (parent owns hook, passes IOUSummaryData prop).

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';

interface IOUCardProps {
  summary: IOUSummaryData;
}

export function IOUCard({ summary }: IOUCardProps) {
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
    balanceAmount: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      fontSize: 24, // FONT_SIZE.xxl — display-size balance, matches IOUCard spec
      fontFamily: FONT_FAMILY.display.semibold,
      marginTop: SPACING.sm,
    },
    unsettledLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
    emptyText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.sm,
    },
    skeletonCard: {
      opacity: 0.5,
    },
    skeletonTitle: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 60,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 16,
      borderRadius: RADII.md,
      backgroundColor: colors.border,
    },
    skeletonAmount: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 160,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 40,
      borderRadius: RADII.md,
      backgroundColor: colors.border,
      marginTop: SPACING.sm,
    },
    skeletonSublabel: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 80,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 14,
      borderRadius: RADII.md,
      backgroundColor: colors.border,
      marginTop: SPACING.xs,
    },
  }), [colors]);

  const router = useRouter();
  const { netCents, unsettledCount, loading } = summary;

  if (loading) {
    return (
      <View style={[styles.card, styles.skeletonCard]} accessibilityLabel="Loading IOUs">
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonAmount} />
        <View style={styles.skeletonSublabel} />
      </View>
    );
  }

  const hasActivity = unsettledCount > 0;
  const isPositive = netCents >= 0;
  const absAmount = formatCentsDisplay(Math.abs(netCents));
  const balanceColor = isPositive ? colors.status.free : colors.interactive.destructive;
  const balanceLabel = isPositive ? `You're owed ${absAmount}` : `You owe ${absAmount}`;
  const unsettledLabel =
    unsettledCount === 1 ? '1 unsettled' : `${unsettledCount} unsettled`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push('/squad/expenses' as never)}
      accessibilityRole="button"
      accessibilityLabel={
        hasActivity
          ? `IOUs. ${balanceLabel}. ${unsettledLabel}`
          : 'IOUs. All settled up!'
      }
    >
      <Text style={styles.title}>IOUs</Text>

      {!hasActivity ? (
        <Text style={styles.emptyText}>All settled up!</Text>
      ) : (
        <>
          <Text style={[styles.balanceAmount, { color: balanceColor }]}>
            {balanceLabel}
          </Text>
          <Text style={styles.unsettledLabel}>{unsettledLabel}</Text>
        </>
      )}
    </Pressable>
  );
}
