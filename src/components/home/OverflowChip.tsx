// Phase 02 v1.3.5 — OverflowChip: 34px avatar chip with status dot for overflow row (D-20).
// Used below the radar grid to show friends beyond the top-6 bubble limit.

import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { supabase } from '@/lib/supabase';
import type { FriendWithStatus } from '@/hooks/useFriends';

const STATUS_COLORS: Record<string, string> = {
  free: COLORS.status.free,   // #22c55e
  maybe: COLORS.status.maybe, // #eab308
  busy: COLORS.status.busy,   // #ef4444
};

interface OverflowChipProps {
  friend: FriendWithStatus;
}

export function OverflowChip({ friend }: OverflowChipProps) {
  const router = useRouter();
  const heartbeatState = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);

  // Status dot color: dead → secondary gray; alive/fading → status color
  const dotColor =
    heartbeatState === 'dead'
      ? COLORS.text.secondary
      : (STATUS_COLORS[friend.status] ?? COLORS.text.secondary);

  // FADING dot: 0.6 opacity
  const dotOpacity = heartbeatState === 'fading' ? 0.6 : 1.0;

  async function handlePress() {
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: friend.friend_id,
    });
    if (error || !data) {
      Alert.alert('Error', "Couldn't open chat. Try again.");
      return;
    }
    router.push(
      `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(friend.display_name)}` as never
    );
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

const styles = StyleSheet.create({
  chip: {
    position: 'relative',
    marginRight: SPACING.sm,
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
