import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, ANIMATION } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { computeHeartbeatState, formatDistanceToNow } from '@/lib/heartbeat';
import { formatWindowLabel } from '@/lib/windows';
import { openChat } from '@/lib/openChat';
import { showActionSheet } from '@/lib/action-sheet';
import type { FriendWithStatus } from '@/hooks/useFriends';
import type { StatusValue } from '@/types/app';

interface HomeFriendCardProps {
  friend: FriendWithStatus;
}

const MOOD_LABEL: Record<StatusValue, string> = {
  free: 'Free',
  busy: 'Busy',
  maybe: 'Maybe',
};

export function HomeFriendCard({ friend }: HomeFriendCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      ...colors.cardElevation,
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
      margin: SPACING.xs,
    },
    fadingCard: {
      opacity: 0.6,
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: SPACING.sm,
    },
    emojiBadge: {
      position: 'absolute',
      bottom: 0,
      right: -2, // no exact token
      backgroundColor: colors.surface.base,
      borderRadius: RADII.md,
      padding: 1,
    },
    emojiText: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      fontSize: 12, // no exact token
    },
    displayName: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      textAlign: 'center',
    },
    statusLabel: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: SPACING.xs,
    },
  }), [colors]);

  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  // HEART-04 / TTL-03: compute heartbeat per render so the screen-level 60s
  // interval (HomeScreen) forces re-evaluation without a refetch (OVR-06).
  const heartbeatState = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);

  let statusLabel: string;
  if (heartbeatState === 'dead') {
    statusLabel = 'inactive';
  } else if (heartbeatState === 'fading') {
    statusLabel = `${MOOD_LABEL[friend.status]} · ${formatDistanceToNow(friend.last_active_at)}`;
  } else {
    // ALIVE: TTL-03 format "{Mood} · {tag} · {window}" (tag/window optional)
    const windowLabel = friend.status_expires_at ? formatWindowLabel(friend.status_expires_at) : '';
    const segments: string[] = [MOOD_LABEL[friend.status]];
    if (friend.context_tag) segments.push(String(friend.context_tag));
    if (windowLabel) segments.push(windowLabel);
    statusLabel = segments.join(' · ');
  }

  // Single tap → DM (D-04, D-08). Delegates to the openChat helper (Phase 30-05).
  async function handlePress() {
    await openChat(router, {
      kind: 'dmFriend',
      friendId: friend.friend_id,
      friendName: friend.display_name,
    });
  }

  // Long-press → action sheet (D-05). Two actions only — Send DM is intentionally
  // omitted because single tap already does it (D-07).
  function handleLongPress() {
    const firstName = friend.display_name.split(' ')[0];
    showActionSheet(friend.display_name, [
      {
        label: 'View profile',
        onPress: () => router.push(`/friends/${friend.friend_id}` as never),
      },
      {
        label: `Plan with ${firstName}...`,
        onPress: () => router.push(`/plan-create?preselect_friend_id=${friend.friend_id}` as never),
      },
    ]);
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={400}
      style={[styles.card, heartbeatState === 'fading' && styles.fadingCard]}
      accessibilityRole="button"
      accessibilityLabel={`${friend.display_name}, ${statusLabel}. Tap to message, long press for more.`}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <View style={styles.avatarWrapper}>
          <AvatarCircle size={56} imageUri={friend.avatar_url} displayName={friend.display_name} />
          {friend.context_tag !== null && (
            <View style={styles.emojiBadge}>
              <Text style={styles.emojiText}>{friend.context_tag}</Text>
            </View>
          )}
        </View>
        <Text style={styles.displayName} numberOfLines={1}>
          {friend.display_name}
        </Text>
        <Text style={styles.statusLabel} numberOfLines={1}>
          {statusLabel}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
