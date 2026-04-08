import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { computeHeartbeatState, formatDistanceToNow } from '@/lib/heartbeat';
import { formatWindowLabel } from '@/lib/windows';
import type { StatusValue } from '@/types/app';

interface StatusPillProps {
  status: StatusValue;
  /**
   * Optional heartbeat fields per D-31. When provided, StatusPill renders the
   * heartbeat-aware "{Mood} · {tag} · {window}" format matching HomeFriendCard.
   * When omitted, StatusPill falls back to the legacy bare-mood pill so existing
   * call sites (PlanCreateModal, FriendCard) keep rendering unchanged.
   */
  status_expires_at?: string | null;
  last_active_at?: string | null;
  context_tag?: string | null;
}

const MOOD_LABEL: Record<StatusValue, string> = {
  free: 'Free',
  busy: 'Busy',
  maybe: 'Maybe',
};

export function StatusPill({
  status,
  status_expires_at,
  last_active_at,
  context_tag,
}: StatusPillProps) {
  // Legacy path: caller did not pass heartbeat fields → bare mood pill.
  const hasHeartbeatData = status_expires_at !== undefined && last_active_at !== undefined;
  if (!hasHeartbeatData) {
    return (
      <View style={[styles.pill, { backgroundColor: COLORS.status[status] }]}>
        <Text style={styles.label}>{MOOD_LABEL[status]}</Text>
      </View>
    );
  }

  // D-31 path: render the same heartbeat-aware format HomeFriendCard uses.
  const heartbeatState = computeHeartbeatState(status_expires_at, last_active_at);

  let pillLabel: string;
  if (heartbeatState === 'dead') {
    pillLabel = 'inactive';
  } else if (heartbeatState === 'fading') {
    pillLabel = `${MOOD_LABEL[status]} · ${formatDistanceToNow(last_active_at)}`;
  } else {
    const windowLabel = status_expires_at ? formatWindowLabel(status_expires_at) : '';
    const segments: string[] = [MOOD_LABEL[status]];
    if (context_tag) segments.push(String(context_tag));
    if (windowLabel) segments.push(windowLabel);
    pillLabel = segments.join(' · ');
  }

  const bgColor = heartbeatState === 'dead' ? COLORS.surface.card : COLORS.status[status];
  const pillStyle = [
    styles.pill,
    { backgroundColor: bgColor },
    heartbeatState === 'fading' && styles.fadingPill,
  ];

  return (
    <View style={pillStyle}>
      <Text style={styles.label}>{pillLabel}</Text>
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
  fadingPill: {
    opacity: 0.6,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
});
