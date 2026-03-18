import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';
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
        </Text>
      </View>

      {/* Right side */}
      <View style={styles.rightSide}>
        <Text style={styles.time}>{relativeTime}</Text>
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
    paddingHorizontal: 16,
    backgroundColor: COLORS.dominant,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  preview: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 6,
  },
});
