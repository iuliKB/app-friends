// Phase 9 v1.4 — Per-friend expense history screen (IOU-05).
// Route: /squad/expenses/friend/[id]
// D-07: shows all shared expenses (settled + unsettled), newest first. Settled rows dimmed.
// D-08: each row tappable → existing Phase 8 detail screen (/squad/expenses/[id]).
// D-09: screen title "Expenses with {friendName}", net balance strip at top.
// D-10: data from useExpensesWithFriend(friendId) — multi-step iou_groups + iou_members query.
// netAmountCents passed via route params from parent — no second RPC call.

import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { EmptyState } from '@/components/common/EmptyState';
import { ExpenseHistoryRow } from '@/components/iou/ExpenseHistoryRow';
import { useExpensesWithFriend } from '@/hooks/useExpensesWithFriend';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import type { ExpenseWithFriend } from '@/hooks/useExpensesWithFriend';

export default function FriendExpenseHistoryScreen() {
  const router = useRouter();
  const { id, friendName, netAmountCents } = useLocalSearchParams<{
    id: string;
    friendName: string;
    netAmountCents: string;
  }>();

  // Pitfall 5: route params are strings — parse to int before use
  const parsedNetCents = parseInt(netAmountCents ?? '0', 10);
  const isPositive = parsedNetCents >= 0;
  const absAmount = formatCentsDisplay(Math.abs(parsedNetCents));
  const netBalanceColor = isPositive ? COLORS.status.free : COLORS.interactive.destructive;
  const netBalanceLabel = isPositive ? `+${absAmount}` : `-${absAmount}`;

  const friendTitle = friendName ? `Expenses with ${friendName}` : 'Expenses';
  const { expenses, loading, error, refetch } = useExpensesWithFriend(id ?? '');

  const handleRowPress = (expense: ExpenseWithFriend) => {
    router.push(`/squad/expenses/${expense.id}` as never);
  };

  const renderSkeletons = () => (
    <>
      {[1, 2, 3].map((n) => (
        <View key={n} style={styles.skeletonRow}>
          <View style={styles.skeletonLeft}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonMeta} />
          </View>
          <View style={styles.skeletonAmount} />
        </View>
      ))}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Set dynamic screen title via Stack.Screen navigator prop */}
      <Stack.Screen options={{ title: friendTitle }} />

      {/* Net balance summary strip (D-09) — height 48px, always shown */}
      <View style={styles.netBalanceStrip}>
        <Text style={styles.netBalanceLabel}>Net balance</Text>
        <Text style={[styles.netBalanceAmount, { color: netBalanceColor }]}>
          {netBalanceLabel}
        </Text>
      </View>

      {loading ? (
        renderSkeletons()
      ) : error ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={COLORS.interactive.accent}
              accessibilityLabel="Refresh expenses"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="⚠️"
              heading="Couldn't load expenses"
              body="Couldn't load expenses. Pull down to refresh."
            />
          }
        />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExpenseHistoryRow
              title={item.title}
              totalCents={item.totalCents}
              payerName={item.payerName}
              createdAt={item.createdAt}
              isFullySettled={item.isFullySettled}
              onPress={() => handleRowPress(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={expenses.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={COLORS.interactive.accent}
              accessibilityLabel="Refresh expenses"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🧾"
              heading="No shared expenses"
              body="Expenses you create together will appear here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  netBalanceStrip: {
    backgroundColor: COLORS.surface.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 48,
  },
  netBalanceLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  netBalanceAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
  },
  listContent: {
    paddingTop: SPACING.lg,
  },
  emptyContainer: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  // Skeleton styles
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    opacity: 0.5,
  },
  skeletonLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  skeletonTitle: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 160,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 16,
    backgroundColor: COLORS.border,
    borderRadius: SPACING.xs,
  },
  skeletonMeta: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 120,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 14,
    backgroundColor: COLORS.border,
    borderRadius: SPACING.xs,
    marginTop: SPACING.xs,
  },
  skeletonAmount: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 60,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 16,
    backgroundColor: COLORS.border,
    borderRadius: SPACING.xs,
  },
});
