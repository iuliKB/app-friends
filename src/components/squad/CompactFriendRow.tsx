import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { computeHeartbeatState, formatDistanceToNow } from '@/lib/heartbeat';
import { formatWindowLabel } from '@/lib/windows';
import type { FriendWithStatus } from '@/hooks/useFriends';
import type { StatusValue } from '@/types/app';

export const FRIEND_ROW_AVATAR_SIZE = 44;

const MOOD_LABEL: Record<StatusValue, string> = {
  free: 'Free',
  busy: 'Busy',
  maybe: 'Maybe',
};

interface CompactFriendRowProps {
  friend: FriendWithStatus;
  onPress: () => void;
}

export function CompactFriendRow({ friend, onPress }: CompactFriendRowProps) {
  const { colors } = useTheme();

  const heartbeatState = computeHeartbeatState(
    friend.status_expires_at,
    friend.last_active_at
  );
  const isAlive = heartbeatState === 'alive';
  const isDead = heartbeatState === 'dead';

  const statusColor = isAlive ? colors.status[friend.status] : colors.text.secondary;

  let statusLabel: string;
  if (isDead) {
    statusLabel = 'inactive';
  } else if (heartbeatState === 'fading') {
    statusLabel = `${MOOD_LABEL[friend.status]} · ${formatDistanceToNow(friend.last_active_at)}`;
  } else {
    const windowLabel = friend.status_expires_at
      ? formatWindowLabel(friend.status_expires_at)
      : '';
    const segments: string[] = [MOOD_LABEL[friend.status]];
    if (friend.context_tag) segments.push(String(friend.context_tag));
    if (windowLabel) segments.push(windowLabel);
    statusLabel = segments.join(' · ');
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minHeight: 64,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          gap: SPACING.md,
        },
        rowPressed: {
          backgroundColor: colors.surface.overlay,
        },
        avatarWrapper: {
          position: 'relative',
        },
        statusDot: {
          position: 'absolute',
          bottom: 0,
          right: 0,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          width: 12,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          height: 12,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.surface.base,
        },
        textColumn: {
          flex: 1,
          justifyContent: 'center',
          gap: 2, // eslint-disable-line campfire/no-hardcoded-styles
        },
        name: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        nameDead: {
          color: colors.text.secondary,
        },
        statusLabel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
        },
      }),
    [colors]
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${friend.display_name}, ${statusLabel}`}
      onPress={onPress}
    >
      <View style={styles.avatarWrapper}>
        <AvatarCircle
          size={FRIEND_ROW_AVATAR_SIZE}
          imageUri={friend.avatar_url}
          displayName={friend.display_name}
        />
        {!isDead && (
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        )}
      </View>
      <View style={styles.textColumn}>
        <Text style={[styles.name, isDead && styles.nameDead]} numberOfLines={1}>
          {friend.display_name}
        </Text>
        <Text
          style={[styles.statusLabel, { color: statusColor }]}
          numberOfLines={1}
        >
          {statusLabel}
        </Text>
      </View>
    </Pressable>
  );
}
