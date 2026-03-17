import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
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
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dominant,
  },
});
