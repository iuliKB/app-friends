// Expenses section for the chat info screens (DM + group). Lists the shared
// expenses for this chat and lets the expense creator mark one fully settled
// in place. Tapping a row opens the full expense detail. "+ New expense" opens
// the create flow (pre-scoped to the group chat when one is supplied).
//
// Source-agnostic: the DM screen feeds it useExpensesWithFriend, the group
// screen useChatChannelExpenses — both yield ExpenseWithFriend rows.

import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import { useExpenseSettleAll } from '@/hooks/useExpenseSettleAll';
import type { ExpenseWithFriend } from '@/hooks/useExpensesWithFriend';

interface ChatInfoExpensesSectionProps {
  expenses: ExpenseWithFriend[];
  loading: boolean;
  currentUserId: string;
  onOpen: (expenseId: string) => void;
  onCreate: () => void;
}

function formatExpenseDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

export function ChatInfoExpensesSection({
  expenses,
  loading,
  currentUserId,
  onOpen,
  onCreate,
}: ChatInfoExpensesSectionProps) {
  const { colors } = useTheme();
  const { settleExpense, pendingId } = useExpenseSettleAll();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionWrapper: { marginTop: SPACING.xl },
        sectionTitle: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          overflow: 'hidden',
          marginHorizontal: SPACING.lg,
        },
        separator: { height: 1, backgroundColor: colors.border, marginLeft: SPACING.lg },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          gap: SPACING.md,
          minHeight: 60,
        },
        rowPressed: { opacity: 0.7 },
        rowSettled: { opacity: 0.5 },
        leftColumn: { flex: 1 },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        meta: {
          marginTop: SPACING.xs,
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        amount: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        },
        settledPill: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
        settleBtn: {
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.xs,
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent,
          minWidth: 64,
          alignItems: 'center',
        },
        settleBtnLabel: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.surface.base,
        },
        rightColumn: { alignItems: 'flex-end', gap: SPACING.xs },
        empty: {
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.lg,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        addRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: 52,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        addLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.interactive.accent,
        },
        loading: { paddingVertical: SPACING.lg, alignItems: 'center' },
      }),
    [colors]
  );

  return (
    <View style={styles.sectionWrapper}>
      <Text style={styles.sectionTitle}>Expenses</Text>
      <View style={styles.card}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.text.secondary} />
          </View>
        ) : expenses.length === 0 ? (
          <Text style={styles.empty}>No shared expenses in this chat yet.</Text>
        ) : (
          expenses.map((expense, index) => {
            const canSettle = !expense.isFullySettled && expense.createdBy === currentUserId;
            const isSettling = pendingId === expense.id;
            return (
              <React.Fragment key={expense.id}>
                {index > 0 && <View style={styles.separator} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    expense.isFullySettled && styles.rowSettled,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => onOpen(expense.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${expense.title}, ${formatCentsDisplay(expense.totalCents)}`}
                >
                  <View style={styles.leftColumn}>
                    <Text style={styles.title} numberOfLines={1}>
                      {expense.title}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {`Paid by ${expense.payerName} · ${formatExpenseDate(expense.createdAt)}`}
                    </Text>
                  </View>
                  <View style={styles.rightColumn}>
                    <Text style={styles.amount}>{formatCentsDisplay(expense.totalCents)}</Text>
                    {expense.isFullySettled ? (
                      <Text style={styles.settledPill}>Settled</Text>
                    ) : canSettle ? (
                      <TouchableOpacity
                        style={styles.settleBtn}
                        activeOpacity={0.7}
                        disabled={isSettling}
                        onPress={() => settleExpense(expense.id)}
                        accessibilityLabel={`Mark ${expense.title} settled`}
                      >
                        {isSettling ? (
                          <ActivityIndicator size="small" color={colors.surface.base} />
                        ) : (
                          <Text style={styles.settleBtnLabel}>Settle</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </Pressable>
              </React.Fragment>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addRow}
          activeOpacity={0.6}
          onPress={onCreate}
          accessibilityLabel="Add a new expense to this chat"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.interactive.accent} />
          <Text style={styles.addLabel}>New expense</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
