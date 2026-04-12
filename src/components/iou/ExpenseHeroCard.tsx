// Phase 8 v1.4 — ExpenseHeroCard (IOU-01, IOU-02).
// Hero card for the IOU detail screen. Shows title, total, payer, date, split type.
// All-settled banner rendered above card content when allSettled=true.
// ExpenseHeroCardSkeleton shown during loading.

import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';

interface ExpenseHeroCardProps {
  title: string;
  totalCents: number;
  payerName: string;
  createdAt: string; // ISO string
  splitMode: 'even' | 'custom';
  allSettled: boolean;
}

export function ExpenseHeroCard({
  title,
  totalCents,
  payerName,
  createdAt,
  splitMode,
  allSettled,
}: ExpenseHeroCardProps) {
  const dateString = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(createdAt));

  const splitLabel = splitMode === 'even' ? 'Even split' : 'Custom split';

  return (
    <View>
      {allSettled && (
        <View style={styles.settledBanner}>
          <Text style={styles.settledBannerText}>All settled!</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.total}>{formatCentsDisplay(totalCents)}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Paid by {payerName}</Text>
          <Text style={styles.metaSeparator}> · </Text>
          <Text style={styles.metaText}>{dateString}</Text>
          <Text style={styles.metaSeparator}> · </Text>
          <Text style={styles.metaText}>{splitLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export function ExpenseHeroCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      {/* eslint-disable-next-line campfire/no-hardcoded-styles */}
      <View style={[styles.skeletonBox, { width: 200, height: 20 }]} />
      {/* eslint-disable-next-line campfire/no-hardcoded-styles */}
      <View style={[styles.skeletonBox, { width: 120, height: 28, marginTop: SPACING.sm }]} />
      {/* eslint-disable-next-line campfire/no-hardcoded-styles */}
      <View style={[styles.skeletonBox, { width: 240, height: 16, marginTop: SPACING.sm }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  settledBanner: {
    backgroundColor: COLORS.status.free,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 48,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  settledBannerText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#ffffff',
  },
  card: {
    backgroundColor: COLORS.surface.card,
    padding: SPACING.lg,
    borderRadius: RADII.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  total: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
  metaText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  metaSeparator: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text.secondary,
  },
  skeletonCard: {
    opacity: 0.5,
  },
  skeletonBox: {
    backgroundColor: COLORS.border,
    borderRadius: RADII.md,
  },
});
