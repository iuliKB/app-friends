import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import type { StatusValue } from '@/types/app';

interface StatusPillProps {
  status: StatusValue;
}

const STATUS_LABELS: Record<StatusValue, string> = {
  free: 'Free',
  busy: 'Busy',
  maybe: 'Maybe',
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: COLORS.status[status] }]}>
      <Text style={styles.label}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 24,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
});
