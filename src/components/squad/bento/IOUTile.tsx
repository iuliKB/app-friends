import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import { BentoCard } from './BentoCard';
import { TILE_ACCENTS, ACCENT_FILL } from './tileAccents';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';

interface IOUTileProps {
  summary: IOUSummaryData;
}

export function IOUTile({ summary }: IOUTileProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const hasActivity = summary.unsettledCount > 0;
  const isPositive = summary.netCents >= 0;
  const tileAccent = !hasActivity
    ? TILE_ACCENTS.iouPositive
    : isPositive
      ? TILE_ACCENTS.iouPositive
      : TILE_ACCENTS.iouNegative;
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
          backgroundColor: tileAccent + ACCENT_FILL,
        },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        amount: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: -0.5,
        },
        sub: {
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
    [colors, tileAccent]
  );

  if (summary.loading) {
    return (
      <BentoCard containerStyle={{ flex: 1 }} accessibilityLabel="Loading IOUs">
        <View style={[styles.skeletonBar, { width: '50%' }]} />
        <View style={[styles.skeletonBar, { width: '70%', height: 22 }]} />
        <View style={[styles.skeletonBar, { width: '40%' }]} />
      </BentoCard>
    );
  }

  const balanceColor = isPositive ? TILE_ACCENTS.iouPositive : TILE_ACCENTS.iouNegative;
  const absAmount = formatCentsDisplay(Math.abs(summary.netCents));

  return (
    <BentoCard
      onPress={() => router.push('/squad/expenses' as never)}
      containerStyle={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={
        hasActivity
          ? `IOUs. ${isPositive ? "You're owed" : 'You owe'} ${absAmount}. ${summary.unsettledCount} unsettled.`
          : 'IOUs. All settled up.'
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <Ionicons name="cash-outline" size={16} color={tileAccent} />
        </View>
        <Text style={styles.title}>IOUs</Text>
      </View>

      {hasActivity ? (
        <Text style={[styles.amount, { color: balanceColor }]}>
          {isPositive ? '+' : '−'}
          {absAmount}
        </Text>
      ) : (
        <Text style={[styles.amount, { color: colors.text.primary }]}>All clear</Text>
      )}

      <Text style={styles.sub}>
        {hasActivity ? `${summary.unsettledCount} unsettled` : 'No open balances'}
      </Text>
    </BentoCard>
  );
}
