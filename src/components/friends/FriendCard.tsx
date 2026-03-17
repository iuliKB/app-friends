import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import type { FriendWithStatus } from '@/hooks/useFriends';

export type { FriendWithStatus };

interface FriendCardProps {
  friend: FriendWithStatus;
  onPress: () => void;
}

export function FriendCard({ friend, onPress }: FriendCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <AvatarCircle size={40} imageUri={friend.avatar_url} displayName={friend.display_name} />
      <View style={styles.info}>
        <Text style={styles.displayName}>{friend.display_name}</Text>
        <Text style={styles.username}>@{friend.username}</Text>
      </View>
      <StatusPill status={friend.status} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  username: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
