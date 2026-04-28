// Phase 8 v1.4 — RemainingIndicator (IOU-02).
// Shows remaining allocation status for custom split mode.
// Returns null when remaining === 0 (per UI-SPEC copywriting table).
// Destructive red when over-allocated (remaining < 0).

import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';

interface RemainingIndicatorProps {
  totalCents: number;
  allocatedCents: number;
}

export function RemainingIndicator({ totalCents, allocatedCents }: RemainingIndicatorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    text: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.semibold,
      marginTop: SPACING.sm,
    },
    secondary: {
      color: colors.text.secondary,
    },
    destructive: {
      color: colors.interactive.destructive,
    },
  }), [colors]);

  const remaining = totalCents - allocatedCents;

  if (remaining === 0) {
    return null;
  }

  if (remaining > 0) {
    return (
      <Text style={[styles.text, styles.secondary]}>
        Remaining: {formatCentsDisplay(remaining)}
      </Text>
    );
  }

  // remaining < 0 — over-allocated
  return (
    <Text style={[styles.text, styles.destructive]}>
      Over by {formatCentsDisplay(Math.abs(remaining))}
    </Text>
  );
}
