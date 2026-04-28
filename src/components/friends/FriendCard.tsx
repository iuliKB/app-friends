import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import type { FriendWithStatus } from '@/hooks/useFriends';

export type { FriendWithStatus };

interface FriendCardProps {
  friend: FriendWithStatus;
  onPress: () => void;
}

export function FriendCard({ friend, onPress }: FriendCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
    },
    info: {
      flex: 1,
      marginLeft: SPACING.lg,
    },
    displayName: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    username: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
  }), [colors]);

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
