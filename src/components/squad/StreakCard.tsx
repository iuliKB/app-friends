// Phase 4 v1.3 — StreakCard (STREAK-01 / D-11..D-19).
// Minimal hero card: big number, "week streak" label, 🔥, divider, "Best: N weeks" subline.
// Tapping navigates to the root /plan-create modal (D-14, verified route).
// Zero-state: muted 0, subline "Start your first week — make a plan with friends." (D-13).
// Loading: skeleton (D-16). Error: silent fallback to zero state via useStreakData (D-17).
//
// ALL strings here are subject to the Plan 06 copy review gate (D-20).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { useStreakData } from '@/hooks/useStreakData';

export function StreakCard() {
  const router = useRouter();
  const { currentWeeks, bestWeeks, loading } = useStreakData();

  if (loading) {
    return <StreakCardSkeleton />;
  }

  const isZero = currentWeeks === 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push('/plan-create' as never)}
      accessibilityRole="button"
      accessibilityLabel={
        isZero
          ? 'Start your first week streak'
          : `${currentWeeks} week streak. Best ${bestWeeks} weeks`
      }
    >
      <Text style={[styles.bigNumber, isZero && styles.bigNumberMuted]}>{currentWeeks}</Text>
      <Text style={styles.label}>week streak</Text>
      {!isZero && (
        <Text style={styles.emoji} accessibilityLabel="on fire">
          🔥
        </Text>
      )}
      <View style={styles.divider} />
      <Text style={styles.subline}>
        {isZero ? 'Start your first week — make a plan with friends.' : `Best: ${bestWeeks} weeks`}
      </Text>
    </Pressable>
  );
}

function StreakCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeletonCard]} accessibilityLabel="Loading streak">
      <View style={styles.skeletonBig} />
      <View style={styles.skeletonLabel} />
      <View style={styles.divider} />
      <View style={styles.skeletonSubline} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.85,
  },
  bigNumber: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  bigNumberMuted: {
    color: COLORS.text.secondary,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  emoji: {
    fontSize: FONT_SIZE.xxl,
    marginTop: SPACING.md,
  },
  divider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  subline: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  skeletonCard: {
    opacity: 0.5,
  },
  skeletonBig: {
    width: SPACING.xxl * 2,
    height: SPACING.xxl,
    borderRadius: RADII.md,
    backgroundColor: COLORS.border,
  },
  skeletonLabel: {
    width: SPACING.xxl * 3,
    height: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.border,
    marginTop: SPACING.md,
  },
  skeletonSubline: {
    width: SPACING.xxl * 4,
    height: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.border,
  },
});
