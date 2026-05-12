import React, { useRef, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { ChatListItem } from '@/types/chat';

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface ChatListRowProps {
  item: ChatListItem;
  onPress: () => void;
  onMarkRead?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
}

export function ChatListRow({ item, onPress, onMarkRead, onMute, onDelete }: ChatListRowProps) {
  const { colors } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const isBirthday = item.type === 'group' && !!item.birthdayPersonId;

  function handleMarkRead() {
    swipeRef.current?.close();
    onMarkRead?.();
  }

  function handleMute() {
    swipeRef.current?.close();
    onMute?.();
  }

  function handleDelete() {
    swipeRef.current?.close();
    onDelete?.();
  }

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.surface.base,
      minHeight: 72,
    },
    avatarWrapper: {
      marginRight: SPACING.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: RADII.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planIcon: {
      backgroundColor: colors.interactive.accent,
    },
    groupIcon: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: '#9333EA',
    },
    birthdayIcon: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: '#F97316',
    },
    content: {
      flex: 1,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      gap: 3,
    },
    row1: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    name: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      flex: 1,
      marginRight: SPACING.sm,
    },
    nameUnread: {
      fontFamily: FONT_FAMILY.display.bold,
    },
    timestamp: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      flexShrink: 0,
    },
    mutedIcon: {
      flexShrink: 0,
      opacity: 0.5,
    },
    row2: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    preview: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      flex: 1,
      marginRight: SPACING.sm,
    },
    previewUnread: {
      color: colors.text.primary,
      fontFamily: FONT_FAMILY.body.medium,
    },
    unreadBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: RADII.full,
      backgroundColor: colors.interactive.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.xs,
      flexShrink: 0,
    },
    unreadBadgeText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.bold,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      color: '#0E0F11',
    },
    rightActions: {
      flexDirection: 'row',
    },
    actionButton: {
      width: 72,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
    },
    muteButton: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: '#78716C',
    },
    readButton: {
      backgroundColor: colors.interactive.accent,
    },
    deleteButton: {
      backgroundColor: colors.interactive.destructive,
    },
    actionLabel: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      color: '#fff',
    },
    actionLabelDark: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      color: '#0E0F11',
    },
  }), [colors]);

  const timestamp = formatTimestamp(item.lastMessageAt);
  const badgeLabel = item.unreadCount > 99 ? '99+' : String(item.unreadCount);

  function renderRightActions() {
    return (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.muteButton]}
          onPress={handleMute}
          accessibilityLabel="Mute conversation"
        >
          <Ionicons name="notifications-off-outline" size={20} color="#fff" />
          <Text style={styles.actionLabel}>Mute</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.readButton]}
          onPress={handleMarkRead}
          accessibilityLabel="Mark as read"
        >
          <Ionicons name="checkmark-done-outline" size={20} color="#0E0F11" />
          <Text style={[styles.actionLabel, styles.actionLabelDark]}>Read</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          accessibilityLabel="Delete conversation"
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionLabel}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
        <View style={styles.avatarWrapper}>
          {item.type === 'plan' ? (
            <View style={[styles.iconContainer, styles.planIcon]}>
              <Ionicons name="calendar-outline" size={22} color="#0E0F11" />
            </View>
          ) : item.type === 'group' ? (
            <View style={[styles.iconContainer, isBirthday ? styles.birthdayIcon : styles.groupIcon]}>
              <Ionicons name={isBirthday ? 'gift-outline' : 'people-outline'} size={22} color="#fff" />
            </View>
          ) : (
            <AvatarCircle size={48} imageUri={item.avatarUrl} displayName={item.title} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.row1}>
            <Text style={[styles.name, item.hasUnread && styles.nameUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
          <View style={styles.row2}>
            <Text style={[styles.preview, item.hasUnread && styles.previewUnread]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.isMuted ? (
              <Ionicons
                name="notifications-off-outline"
                size={14}
                color={colors.text.secondary}
                style={styles.mutedIcon}
              />
            ) : item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{badgeLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
