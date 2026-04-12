// Phase 8 v1.4 — Expense detail screen (IOU-04)
// Route: /squad/expenses/[id]
// Uses useExpenseDetail hook for data + settle action.

import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { useExpenseDetail } from '@/hooks/useExpenseDetail';
import { ExpenseHeroCard, ExpenseHeroCardSkeleton } from '@/components/iou/ExpenseHeroCard';
import { ParticipantRow } from '@/components/iou/ParticipantRow';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, loading, error, refetch, settle, isCreator } = useExpenseDetail(id ?? '');

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <ExpenseHeroCardSkeleton />
        {/* Three ParticipantRow skeletons */}
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.skeletonRow}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonName} />
            <View style={styles.skeletonBadge} />
          </View>
        ))}
      </ScrollView>
    );
  }

  if (error || !detail) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.interactive.accent} />}
      >
        <Text style={styles.errorText}>{error ?? "Couldn't load expense. Pull down to refresh."}</Text>
      </ScrollView>
    );
  }

  const participantCount = detail.participants.length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.interactive.accent} />}
    >
      <ExpenseHeroCard
        title={detail.title}
        totalCents={detail.totalCents}
        payerName={detail.payerName}
        createdAt={detail.createdAt}
        splitMode={detail.splitMode}
        allSettled={detail.allSettled}
      />

      <Text style={styles.participantsLabel}>
        Split between {participantCount} {participantCount === 1 ? 'person' : 'people'}
      </Text>

      {detail.participants.map((p) => (
        <ParticipantRow
          key={p.userId}
          displayName={p.displayName}
          avatarUrl={p.avatarUrl}
          shareCents={p.shareCents}
          isSettled={p.isSettled}
          isPayerRow={p.userId === detail.createdBy}
          isCreator={isCreator}
          onSettle={() => settle(p.userId)}
          settleLoading={p.settleLoading}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface.base },
  participantsLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.interactive.destructive,
    padding: SPACING.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    opacity: 0.5,
  },
  skeletonAvatar: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 36,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 36,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    borderRadius: 18,
    backgroundColor: COLORS.border,
  },
  skeletonName: {
    flex: 1,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 16,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.sm,
    borderRadius: SPACING.xs,
  },
  skeletonBadge: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 70,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 24,
    backgroundColor: COLORS.border,
    borderRadius: SPACING.sm,
  },
});
