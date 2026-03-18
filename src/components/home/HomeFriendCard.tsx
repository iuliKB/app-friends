import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface HomeFriendCardProps {
  friend: FriendWithStatus;
  showStatusPill?: boolean;
}

export function HomeFriendCard({ friend, showStatusPill = false }: HomeFriendCardProps) {
  return (
    <View
      style={styles.card}
      accessibilityLabel={`${friend.display_name}, ${friend.status}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    margin: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  emojiBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: COLORS.dominant,
    borderRadius: 8,
    padding: 1,
  },
  emojiText: {
    fontSize: 12,
  },
  displayName: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  pillWrapper: {
    marginTop: 4,
  },
});
