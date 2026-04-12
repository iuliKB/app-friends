// Phase 8 v1.4 — RemainingIndicator (IOU-02).
// Shows remaining allocation status for custom split mode.
// Returns null when remaining === 0 (per UI-SPEC copywriting table).
// Destructive red when over-allocated (remaining < 0).

import { StyleSheet, Text } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';

interface RemainingIndicatorProps {
  totalCents: number;
  allocatedCents: number;
}

export function RemainingIndicator({ totalCents, allocatedCents }: RemainingIndicatorProps) {
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

const styles = StyleSheet.create({
  text: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.sm,
  },
  secondary: {
    color: COLORS.text.secondary,
  },
  destructive: {
    color: COLORS.interactive.destructive,
  },
});
