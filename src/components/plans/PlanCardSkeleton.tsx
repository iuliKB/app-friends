import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, SPACING, RADII } from '@/theme';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';

export function PlanCardSkeleton() {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: SPACING.lg,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card}>
      {/* Image placeholder block — D-01: ~140px tall, anticipates future cover image */}
      <SkeletonPulse width="100%" height={140} />
      {/* Title bar — D-01: 60% wide, 20px tall */}
      <View style={{ marginTop: SPACING.md }}>
        <View style={{ width: '60%' }}>
          <SkeletonPulse width="100%" height={20} />
        </View>
      </View>
      {/* Meta line 1 — D-01: 40% wide, 14px tall */}
      <View style={{ marginTop: SPACING.sm }}>
        <View style={{ width: '40%' }}>
          <SkeletonPulse width="100%" height={14} />
        </View>
      </View>
      {/* Meta line 2 — D-01: 30% wide, 14px tall */}
      <View style={{ marginTop: SPACING.xs }}>
        <View style={{ width: '30%' }}>
          <SkeletonPulse width="100%" height={14} />
        </View>
      </View>
    </View>
  );
}
