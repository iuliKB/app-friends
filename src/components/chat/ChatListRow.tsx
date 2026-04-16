import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { ChatListItem } from '@/types/chat';

function formatRelativeTime(isoString: string): string {
  const diffSeconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSeconds < 60) return 'now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  const date = new Date(isoString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface ChatListRowProps {
  item: ChatListItem;
  onPress: () => void;
}

export function ChatListRow({ item, onPress }: ChatListRowProps) {
  const relativeTime = formatRelativeTime(item.lastMessageAt);

  return (
    <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
      {/* Left icon */}
      <View style={styles.iconContainer}>
        {item.type === 'plan' ? (
          <Text style={styles.emoji}>🏕️</Text>
        ) : (
          <AvatarCircle size={40} imageUri={item.avatarUrl} displayName={item.title} />
        )}
      </View>

      {/* Middle content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastMessage}
          <Text style={styles.previewTime}>{' · ' + relativeTime}</Text>
        </Text>
      </View>

      {/* Right side — unread dot only */}
      <View style={styles.rightSide}>
        {item.hasUnread && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface.base,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 28,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  preview: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginTop: 2,
  },
  previewTime: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  rightSide: {
    justifyContent: 'center',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginLeft: 4,
  },
  unreadDot: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 12,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 12,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    borderRadius: 6,
    backgroundColor: COLORS.interactive.accent,
  },
});
