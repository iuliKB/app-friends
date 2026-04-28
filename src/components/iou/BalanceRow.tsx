// Phase 9 v1.4 — BalanceRow component (IOU-03).
// Signed amount display: "+$42 → you" (green) or "-$18 ← you" (red).
// D-03, D-04: avatar + friend name + signed amount label. Tappable.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { formatCentsDisplay } from '@/utils/currencyFormat';

interface BalanceRowProps {
  friendId: string;
  displayName: string;
  avatarUrl: string | null;
  netAmountCents: number;
  unsettledCount: number;
  onPress: () => void;
}

export function BalanceRow({
  displayName,
  avatarUrl,
  netAmountCents,
  unsettledCount,
  onPress,
}: BalanceRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
    },
    rowPressed: {
      opacity: 0.75,
    },
    nameColumn: {
      flex: 1,
      marginLeft: SPACING.sm,
    },
    name: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    unsettledLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
    amount: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      marginLeft: SPACING.sm,
    },
  }), [colors]);

  const isPositive = netAmountCents >= 0;
  const absAmount = formatCentsDisplay(Math.abs(netAmountCents));
  const amountColor = isPositive ? colors.status.free : colors.interactive.destructive;
  const signedLabel = isPositive ? `+${absAmount} → you` : `-${absAmount} ← you`;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, ${signedLabel}, ${unsettledCount} unsettled`}
    >
      <AvatarCircle size={36} imageUri={avatarUrl} displayName={displayName} />
      <View style={styles.nameColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.unsettledLabel}>
          {unsettledCount} unsettled
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{signedLabel}</Text>
    </Pressable>
  );
}
