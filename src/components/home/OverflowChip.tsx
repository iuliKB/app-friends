// Phase 02 v1.3.5 — OverflowChip: 34px avatar chip with status dot for overflow row (D-20).
// Used below the radar grid to show friends beyond the top-6 bubble limit.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { openChat } from '@/lib/openChat';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface OverflowChipProps {
  friend: FriendWithStatus;
}

export function OverflowChip({ friend }: OverflowChipProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    chip: {
      position: 'relative',
      marginRight: SPACING.sm,
    },
    dot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 8,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 8,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderRadius: 4,
    },
  }), [colors]);

  const STATUS_COLORS: Record<string, string> = useMemo(() => ({
    free: colors.status.free,   // #22c55e
    maybe: colors.status.maybe, // #eab308
    busy: colors.status.busy,   // #ef4444
  }), [colors]);

  const router = useRouter();
  const heartbeatState = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);

  // Status dot color: dead → secondary gray; alive/fading → status color
  const dotColor =
    heartbeatState === 'dead'
      ? colors.text.secondary
      : (STATUS_COLORS[friend.status] ?? colors.text.secondary);

  // FADING dot: 0.6 opacity
  const dotOpacity = heartbeatState === 'fading' ? 0.6 : 1.0;

  async function handlePress() {
    await openChat(router, {
      kind: 'dmFriend',
      friendId: friend.friend_id,
      friendName: friend.display_name,
    });
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={`${friend.display_name}. Tap to message.`}
    >
      <AvatarCircle size={34} imageUri={friend.avatar_url} displayName={friend.display_name} />
      <View style={[styles.dot, { backgroundColor: dotColor, opacity: dotOpacity }]} />
    </Pressable>
  );
}
