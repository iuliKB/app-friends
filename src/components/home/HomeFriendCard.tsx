import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface HomeFriendCardProps {
  friend: FriendWithStatus;
  showStatusPill?: boolean;
}

export function HomeFriendCard({ friend, showStatusPill = false }: HomeFriendCardProps) {
  return (
    <View style={styles.card} accessibilityLabel={`${friend.display_name}, ${friend.status}`}>
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
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    margin: SPACING.xs,
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
