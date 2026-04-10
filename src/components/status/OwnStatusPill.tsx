// Phase 1 v1.3.5 — OwnStatusPill header component (Plan 02).
// Interactive header element showing the user's current status (or empty state)
// with a heartbeat dot, pulse animation, and edit affordance.
//
// Props: onPress (opens StatusPickerSheet), sessionCount (gates pulse animation).
// Lives in ScreenHeader rightAction slot — wired by Plan 03.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { useStatusStore } from '@/stores/useStatusStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { computeHeartbeatState } from '@/lib/heartbeat';
import type { HeartbeatState } from '@/types/app';

interface OwnStatusPillProps {
  onPress: () => void;
  sessionCount: number;
}

const DOT_COLOR: Record<HeartbeatState, string> = {
  alive: COLORS.status.free,    // green
  fading: COLORS.status.maybe,  // yellow
  dead: COLORS.text.secondary,  // gray
};

const MOOD_LABEL: Record<string, string> = { free: 'Free', maybe: 'Maybe', busy: 'Busy' };

function formatUntil(expiresAt: string): string {
  const d = new Date(expiresAt);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `until ${h12}${period}`
    : `until ${h12}:${String(m).padStart(2, '0')}${period}`;
}

export function OwnStatusPill({ onPress, sessionCount }: OwnStatusPillProps) {
  // 1. Status reading
  const currentStatus = useStatusStore((s) => s.currentStatus);
  const heartbeatState = computeHeartbeatState(
    currentStatus?.status_expires_at ?? null,
    currentStatus?.last_active_at ?? null,
  );
  const hasActiveStatus = currentStatus !== null && heartbeatState !== 'dead';

  // 2. Display name — derive from Supabase session (no extra DB fetch)
  const session = useAuthStore((s) => s.session);
  const displayName =
    (session?.user?.user_metadata?.['display_name'] as string | undefined) ??
    session?.user?.email?.split('@')[0] ??
    'You';

  // 3. Pulse animation (D-04, D-09, D-10)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // shouldPulse: no active status AND sessionCount <= 3
  const shouldPulse = !hasActiveStatus && sessionCount <= 3;

  useEffect(() => {
    if (!shouldPulse) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 700,
          useNativeDriver: true,
          isInteraction: false,  // D-04: never block FlatList rendering
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shouldPulse, pulseAnim]);

  // 4. Dot color
  const dotColor = hasActiveStatus ? DOT_COLOR[heartbeatState] : COLORS.text.secondary;

  // 5. Pill text
  let pillText: string;
  if (hasActiveStatus && currentStatus) {
    const parts = [MOOD_LABEL[currentStatus.status] ?? currentStatus.status];
    if (currentStatus.context_tag) parts.push(currentStatus.context_tag);
    if (currentStatus.status_expires_at) parts.push(formatUntil(currentStatus.status_expires_at));
    pillText = parts.join(' · ');
  } else {
    pillText = `${displayName} · Tap to set your status`;
  }

  // 6. JSX
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={hasActiveStatus ? 'Edit your status' : 'Set your status'}
      style={styles.pill}
    >
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor, transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Text style={styles.label} numberOfLines={1}>
        {pillText}
      </Text>
      <Text style={styles.editIcon}>{'✎'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    maxWidth: 200,  // prevents overflow into title — no exact token
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADII.full,
  },
  label: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  editIcon: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
  },
});
