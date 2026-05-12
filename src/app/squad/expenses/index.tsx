// Phase 9 v1.4 — IOU balance index screen (IOU-03).
// Route: /squad/expenses (Expo Router maps expenses/index.tsx → /squad/expenses).
// D-01: net balance per friend from get_iou_summary() RPC.
// D-05: data from useIOUSummary hook (rows with unsettled_count > 0 only shown — D-06).
// D-04: each row tappable → /squad/expenses/friend/[id] with params.
//
// Layout: IOUBalanceHero (split donut: you get / you pay) → FlatList of
// BalanceRow → FAB "+ New expense". The native stack header
// (squad/_layout.tsx) supplies the "Balances" title — the in-screen
// ScreenHeader was removed to avoid a duplicate title above the hero.

import { FlatList, RefreshControl, SafeAreaView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTheme, SPACING } from '@/theme';
import { EmptyState } from '@/components/common/EmptyState';
import { FAB } from '@/components/common/FAB';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { BalanceRow } from '@/components/iou/BalanceRow';
import { IOUBalanceHero } from '@/components/iou/IOUBalanceHero';
import { useIOUSummary } from '@/hooks/useIOUSummary';
import type { IOUSummaryRow } from '@/hooks/useIOUSummary';

export default function IOUBalanceIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { rows, loading, error, refetch } = useIOUSummary();

  // D-06: only show friends with unsettled balances (RPC already filters, but guard here too)
  const unsettledRows = rows.filter((r) => r.unsettled_count > 0);

  const { owedToYouCents, youOweCents } = useMemo(() => {
    let owed = 0;
    let owe = 0;
    for (const r of unsettledRows) {
      if (r.net_amount_cents > 0) owed += r.net_amount_cents;
      else if (r.net_amount_cents < 0) owe += -r.net_amount_cents;
    }
    return { owedToYouCents: owed, youOweCents: owe };
  }, [unsettledRows]);

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        listContent: {
          paddingBottom: SPACING.xxl,
        },
        emptyContainer: {
          flexGrow: 1,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginHorizontal: SPACING.lg,
        },
        skeletonRow: {
          marginHorizontal: SPACING.lg,
          marginVertical: SPACING.sm,
        },
      }),
    [colors]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <IOUBalanceHero owedToYouCents={0} youOweCents={0} />
        {[0, 1, 2].map((n) => (
          <View key={n} style={styles.skeletonRow}>
            <SkeletonPulse width="100%" height={56} />
          </View>
        ))}
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={<IOUBalanceHero owedToYouCents={0} youOweCents={0} />}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={colors.interactive.accent}
              accessibilityLabel="Refresh balances"
            />
          }
          contentContainerStyle={styles.emptyContainer}
          ListEmptyComponent={
            <EmptyState
              icon="warning-outline"
              iconType="ionicons"
              heading="Couldn't load balances"
              body="Check your connection and try again."
              ctaLabel="Retry"
              onCta={() => void refetch()}
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        ListHeaderComponent={
          <IOUBalanceHero owedToYouCents={owedToYouCents} youOweCents={youOweCents} />
        }
        contentContainerStyle={
          unsettledRows.length === 0 ? styles.emptyContainer : styles.listContent
        }
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
      <FAB
        icon={<Ionicons name="add" size={22} color={colors.surface.base} />}
        label="New expense"
        onPress={() => router.push('/squad/expenses/create')}
        accessibilityLabel="New expense"
      />
    </SafeAreaView>
  );
}
