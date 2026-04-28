// Phase 9 v1.4 — ExpenseHistoryRow component (IOU-05).
// Settled rows dimmed at opacity 0.45 via static wrapper View (not Animated).
// D-07, D-08: title + amount + payer/date meta. Tappable → expense detail.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, SPACING } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';

interface ExpenseHistoryRowProps {
  title: string;
  totalCents: number;
  payerName: string;
  createdAt: string;
  isFullySettled: boolean;
  onPress: () => void;
}

function formatExpenseDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoString));
}

export function ExpenseHistoryRow({
  title,
  totalCents,
  payerName,
  createdAt,
  isFullySettled,
  onPress,
}: ExpenseHistoryRowProps) {
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
    leftColumn: {
      flex: 1,
      marginRight: SPACING.sm,
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    meta: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
    amount: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
  }), [colors]);

  return (
    <View style={isFullySettled ? { opacity: 0.45 } : undefined}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${formatCentsDisplay(totalCents)}, paid by ${payerName}${isFullySettled ? ', settled' : ''}`}
      >
        <View style={styles.leftColumn}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.meta}>
            Paid by {payerName} · {formatExpenseDate(createdAt)}
          </Text>
        </View>
        <Text style={styles.amount}>{formatCentsDisplay(totalCents)}</Text>
      </Pressable>
    </View>
  );
}
