// Phase 9 v1.4 — IOU balance index screen (IOU-03).
// Route: /squad/expenses (Expo Router maps expenses/index.tsx → /squad/expenses).
// D-01: net balance per friend from get_iou_summary() RPC.
// D-05: data from useIOUSummary hook (rows with unsettled_count > 0 only shown — D-06).
// D-04: each row tappable → /squad/expenses/friend/[id] with params.

import { FlatList, RefreshControl, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, SPACING } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { BalanceRow } from '@/components/iou/BalanceRow';
import { useIOUSummary } from '@/hooks/useIOUSummary';
import type { IOUSummaryRow } from '@/hooks/useIOUSummary';
import { useMemo } from 'react';

export default function IOUBalanceIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { rows, loading, error, refetch } = useIOUSummary();

  // D-06: only show friends with unsettled balances (RPC already filters, but guard here too)
  const unsettledRows = rows.filter((r) => r.unsettled_count > 0);

  const handleRowPress = (row: IOUSummaryRow) => {
    router.push({
      pathname: '/squad/expenses/friend/[id]' as never,
      params: {
        id: row.friend_id,
        friendName: row.display_name,
        netAmountCents: row.net_amount_cents.toString(),
      },
    } as never);
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    headerContainer: {
      paddingHorizontal: SPACING.lg,
    },
    listContent: {
      paddingHorizontal: 0,
      paddingTop: SPACING.lg,
    },
    emptyContainer: {
      flex: 1,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
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
    skeletonAvatar: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 36,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 36,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderRadius: 18,
      backgroundColor: colors.border,
    },
    skeletonName: {
      flex: 1,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 16,
      backgroundColor: colors.border,
      marginLeft: SPACING.sm,
      borderRadius: SPACING.xs,
    },
    skeletonAmount: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 60,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 16,
      backgroundColor: colors.border,
      marginLeft: SPACING.sm,
      borderRadius: SPACING.xs,
    },
    fab: {
      position: 'absolute',
      bottom: SPACING.xl,
      right: SPACING.xl,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 56,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 56,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderRadius: 28,
      backgroundColor: colors.interactive.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <ScreenHeader title="Balances" />
        </View>
        {/* 4 skeleton rows */}
        {[1, 2, 3, 4].map((n) => (
          <View key={n} style={styles.skeletonRow}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonName} />
            <View style={styles.skeletonAmount} />
          </View>
        ))}
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <ScreenHeader title="Balances" />
        </View>
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={colors.interactive.accent}
              accessibilityLabel="Refresh balances"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="warning-outline"
              iconType="ionicons"
              heading="Couldn't load balances"
              body="Couldn't load balances. Pull down to refresh."
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <ScreenHeader title="Balances" />
      </View>
      <FlatList
        data={unsettledRows}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => (
          <BalanceRow
            friendId={item.friend_id}
            displayName={item.display_name}
            avatarUrl={item.avatar_url}
            netAmountCents={item.net_amount_cents}
            unsettledCount={item.unsettled_count}
            onPress={() => handleRowPress(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={unsettledRows.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.interactive.accent}
            accessibilityLabel="Refresh balances"
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            iconType="ionicons"
            heading="All settled up!"
            body="No unsettled balances with friends."
          />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/squad/expenses/create')}
        accessibilityLabel="Add expense"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={colors.surface.base} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
