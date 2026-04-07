import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import { supabase } from '@/lib/supabase';
import { showActionSheet } from '@/lib/action-sheet';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface HomeFriendCardProps {
  friend: FriendWithStatus;
  showStatusPill?: boolean;
}

export function HomeFriendCard({ friend, showStatusPill = false }: HomeFriendCardProps) {
  const router = useRouter();

  // Single tap → DM (D-04, D-08). Mirrors src/app/friends/[id].tsx:55-67.
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
        onPress: () =>
          router.push(`/plan-create?preselect_friend_id=${friend.friend_id}` as never),
      },
    ]);
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${friend.display_name}, ${friend.status}. Tap to message, long press for more.`}
    >
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
      {showStatusPill && (
        <View style={styles.pillWrapper}>
          <StatusPill status={friend.status} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    margin: SPACING.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  emojiBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2, // no exact token
    backgroundColor: COLORS.surface.base,
    borderRadius: RADII.md,
    padding: 1,
  },
  emojiText: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 12, // no exact token
  },
  displayName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  pillWrapper: {
    marginTop: SPACING.xs,
  },
});
