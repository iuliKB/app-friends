import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { MessageWithProfile } from '@/types/chat';

interface MessageBubbleProps {
  message: MessageWithProfile;
  isOwn: boolean;
  showSenderInfo: boolean;
  // Phase 14 additions:
  allMessages: MessageWithProfile[];
  highlighted?: boolean;
  onReply: (message: MessageWithProfile) => void;
  onDelete: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeSeparator(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return `Today ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function shouldShowTimeSeparator(
  currentMsg: MessageWithProfile,
  previousMsg: MessageWithProfile | undefined
): boolean {
  if (!previousMsg) return true;
  const currentTime = new Date(currentMsg.created_at).getTime();
  const previousTime = new Date(previousMsg.created_at).getTime();
  return Math.abs(currentTime - previousTime) >= 15 * 60 * 1000;
}

function QuotedBlock({
  replyToId,
  allMessages,
  isOwn,
  onPress,
}: {
  replyToId: string;
  allMessages: MessageWithProfile[];
  isOwn: boolean;
  onPress: () => void;
}) {
  const original = allMessages.find((m) => m.id === replyToId);
  // Own bubbles are orange — use white + dark overlay so the block is visible.
  // Others' bubbles are dark — use orange accent + light overlay.
  const accentColor = isOwn ? 'rgba(255,255,255,0.9)' : COLORS.interactive.accent;
  const quotedBg = isOwn ? 'rgba(0,0,0,0.2)' : COLORS.surface.overlay;
  const previewColor = isOwn ? 'rgba(255,255,255,0.7)' : COLORS.text.secondary;

  const senderName = original?.sender_display_name ?? 'Unknown';
  const previewText = original
    ? original.message_type === 'deleted'
      ? 'Message deleted.'
      : (original.body ?? (original.image_url ? '📷 Photo' : 'Message deleted.'))
    : 'Original message deleted';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Quoted message from ${senderName}: ${previewText}. Tap to scroll to original.`}
    >
      <View style={[styles.quotedBlock, { backgroundColor: quotedBg }]}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <View style={styles.quotedContent}>
          <Text style={[styles.quotedSender, { color: accentColor }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={[styles.quotedPreview, { color: previewColor }]} numberOfLines={1}>
            {previewText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function MessageBubble({
  message,
  isOwn,
  showSenderInfo,
  allMessages,
  highlighted,
  onReply,
  onDelete,
  onScrollToMessage,
}: MessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pillY, setPillY] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;

  // eslint-disable-next-line campfire/no-hardcoded-styles
  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(249, 115, 22, 0.2)'],
  });

  useEffect(() => {
    if (!highlighted) return;
    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start();
  }, [highlighted, highlightAnim]);

  function handleTap() {
    if (showTimestamp) return;
    setShowTimestamp(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowTimestamp(false));
    }, 2500);
  }

  function handleLongPress(event: { nativeEvent: { pageY: number } }) {
    if (message.pending) return;
    if (message.message_type === 'deleted') return;
    setPillY(Math.max(60, event.nativeEvent.pageY - 80));
    setMenuVisible(true);
  }

  function closeMenu() {
    setMenuVisible(false);
  }

  function handleReply() {
    closeMenu();
    onReply(message);
  }

  async function handleCopy() {
    closeMenu();
    if (message.body) {
      await Clipboard.setStringAsync(message.body);
    }
  }

  function handleDelete() {
    closeMenu();
    onDelete(message.id);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const timestamp = formatMessageTime(message.created_at);
  const isDeleted = message.message_type === 'deleted';
  const bodyText = isDeleted ? 'Message deleted.' : (message.body ?? '');

  const contextMenu = (
    <Modal
      visible={menuVisible}
      transparent
      animationType="none"
      onRequestClose={closeMenu}
    >
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
      </TouchableWithoutFeedback>
      <View style={[styles.contextPill, { top: pillY }]}>
        <TouchableOpacity
          onPress={handleReply}
          style={styles.pillAction}
          accessibilityLabel="Reply to message"
        >
          <Ionicons name="return-up-back" size={20} color={COLORS.text.primary} />
          <Text style={styles.pillActionLabel}>Reply</Text>
        </TouchableOpacity>
        <View style={styles.pillDivider} />
        <TouchableOpacity
          onPress={handleCopy}
          style={styles.pillAction}
          accessibilityLabel="Copy message text"
        >
          <Ionicons name="copy-outline" size={20} color={COLORS.text.primary} />
          <Text style={styles.pillActionLabel}>Copy</Text>
        </TouchableOpacity>
        {isOwn && (
          <>
            <View style={styles.pillDivider} />
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.pillAction}
              accessibilityLabel="Delete message"
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.interactive.destructive} />
              <Text style={[styles.pillActionLabel, { color: COLORS.interactive.destructive }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );

  if (isOwn) {
    return (
      <Animated.View style={{ backgroundColor: highlightBg }}>
        <TouchableOpacity
          style={styles.ownContainer}
          onPress={handleTap}
          onLongPress={handleLongPress}
          activeOpacity={0.8}
        >
          <View style={[styles.ownBubble, message.pending && styles.pendingOpacity, !!message.reply_to_message_id && styles.replyMinWidth]}>
            {message.reply_to_message_id && (
              <QuotedBlock
                replyToId={message.reply_to_message_id}
                allMessages={allMessages}
                isOwn={isOwn}
                onPress={() => onScrollToMessage(message.reply_to_message_id!)}
              />
            )}
            <Text style={isDeleted ? styles.deletedBody : styles.ownBody}>{bodyText}</Text>
          </View>
          {showTimestamp && (
            <Animated.Text style={[styles.ownTimestamp, { opacity: fadeAnim }]}>
              {timestamp}
            </Animated.Text>
          )}
        </TouchableOpacity>
        {contextMenu}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ backgroundColor: highlightBg }}>
      <TouchableOpacity
        style={styles.othersContainer}
        onPress={handleTap}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
      >
        {showSenderInfo ? (
          <AvatarCircle
            size={32}
            imageUri={message.sender_avatar_url}
            displayName={message.sender_display_name}
          />
        ) : (
          <View style={styles.avatarSpacer} />
        )}
        <View style={styles.othersContent}>
          {showSenderInfo && (
            <Text style={styles.senderName}>{message.sender_display_name}</Text>
          )}
          <View style={[styles.othersBubble, !!message.reply_to_message_id && styles.replyMinWidth]}>
            {message.reply_to_message_id && (
              <QuotedBlock
                replyToId={message.reply_to_message_id}
                allMessages={allMessages}
                isOwn={isOwn}
                onPress={() => onScrollToMessage(message.reply_to_message_id!)}
              />
            )}
            <Text style={isDeleted ? styles.deletedBody : styles.othersBody}>{bodyText}</Text>
          </View>
          {showTimestamp && (
            <Animated.Text style={[styles.othersTimestamp, { opacity: fadeAnim }]}>
              {timestamp}
            </Animated.Text>
          )}
        </View>
      </TouchableOpacity>
      {contextMenu}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ownContainer: {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    marginBottom: SPACING.xs,
    alignItems: 'flex-end',
  },
  ownBubble: {
    backgroundColor: COLORS.interactive.accent,
    borderRadius: RADII.pill,
    borderBottomRightRadius: RADII.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  pendingOpacity: {
    opacity: 0.7,
  },
  replyMinWidth: {
    minWidth: 180,
  },
  ownBody: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.surface.base,
  },
  ownTimestamp: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 12,
    fontWeight: FONT_WEIGHT.regular,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    color: 'rgba(245,245,245,0.5)',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginTop: 2,
  },
  othersContainer: {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  avatarSpacer: {
    width: 32,
  },
  othersContent: {
    flexDirection: 'column',
  },
  senderName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginBottom: 2,
  },
  othersBubble: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.pill,
    borderBottomLeftRadius: RADII.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  othersBody: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  othersTimestamp: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 12,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginTop: 2,
  },
  deletedBody: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontStyle: 'italic',
  },
  // QuotedBlock styles
  quotedBlock: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.overlay,
    borderRadius: RADII.xs,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  accentBar: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 4,
    borderRadius: RADII.xs,
  },
  quotedContent: {
    flex: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  quotedSender: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  quotedPreview: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  // Context menu styles
  backdrop: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contextPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.sm,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    shadowColor: '#000',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    shadowOffset: { width: 0, height: 2 },
    // eslint-disable-next-line campfire/no-hardcoded-styles
    shadowOpacity: 0.3,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    shadowRadius: 8,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    elevation: 8,
  },
  pillAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 44,
    paddingVertical: SPACING.sm,
  },
  pillActionLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  pillDivider: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 1,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 24,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
  },
});
