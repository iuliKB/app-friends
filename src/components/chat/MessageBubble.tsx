import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, ANIMATION } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { ReactionsSheet } from '@/components/chat/ReactionsSheet';
import { PollCard } from '@/components/chat/PollCard';
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
  // Phase 15 additions:
  onReact?: (messageId: string, emoji: string) => void;
  currentUserId?: string;
  // Phase 16 additions:
  onImagePress?: (imageUrl: string) => void;
  // Phase 17 additions:
  lastPollVoteEvent?: { pollId: string; timestamp: number } | null;
  // Phase 26 additions:
  onRetry?: (tempId: string, body: string) => void;  // CHAT-03: retry failed optimistic message
}

const PRESET_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'] as const;
const STRIP_HEIGHT = 52; // tap target height + padding

const EMOJI_NAMES: Record<string, string> = {
  '❤️': 'heart',
  '😂': 'laughing face',
  '😮': 'surprised',
  '😢': 'crying',
  '👍': 'thumbs up',
  '🔥': 'fire',
};

function getEmojiName(emoji: string): string {
  return EMOJI_NAMES[emoji] ?? emoji;
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

// Static structural styles for QuotedBlock (colors applied inline).
const quotedBlockStyles = StyleSheet.create({
  quotedBlock: {
    flexDirection: 'row',
    borderRadius: RADII.xs,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  accentBar: {
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
    fontFamily: FONT_FAMILY.body.semibold,
  },
  quotedPreview: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.body.regular,
  },
});

function QuotedBlock({
  replyToId,
  allMessages,
  isOwn,
  onPress,
  colors,
}: {
  replyToId: string;
  allMessages: MessageWithProfile[];
  isOwn: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const original = allMessages.find((m) => m.id === replyToId);
  // Own bubbles are orange — use white + dark overlay so the block is visible.
  // Others' bubbles are dark — use orange accent + light overlay.
  const accentColor = isOwn ? 'rgba(255,255,255,0.9)' : colors.interactive.accent;
  const quotedBg = isOwn ? 'rgba(0,0,0,0.2)' : colors.surface.overlay;
  const previewColor = isOwn ? 'rgba(255,255,255,0.7)' : colors.text.secondary;

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
      <View style={[quotedBlockStyles.quotedBlock, { backgroundColor: quotedBg }]}>
        <View style={[quotedBlockStyles.accentBar, { backgroundColor: accentColor }]} />
        <View style={quotedBlockStyles.quotedContent}>
          <Text style={[quotedBlockStyles.quotedSender, { color: accentColor }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={[quotedBlockStyles.quotedPreview, { color: previewColor }]} numberOfLines={1}>
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
  onReact = () => {},
  currentUserId = '',
  onImagePress,
  lastPollVoteEvent,
  onRetry,
}: MessageBubbleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    ownContainer: {
      alignSelf: 'flex-end',
      maxWidth: '75%',
      marginBottom: SPACING.xs,
      alignItems: 'flex-end',
    },
    ownBubble: {
      backgroundColor: colors.interactive.accent,
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
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.surface.base,
    },
    ownTimestamp: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      fontSize: 12,
      fontFamily: FONT_FAMILY.body.regular,
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
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginBottom: 2,
    },
    othersBubble: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.pill,
      borderBottomLeftRadius: RADII.xs,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
    },
    othersBody: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    othersTimestamp: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      fontSize: 12,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginTop: 2,
    },
    deletedBody: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      fontStyle: 'italic',
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
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      paddingHorizontal: SPACING.sm,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    pillAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      minHeight: 44,
      paddingVertical: SPACING.sm,
    },
    pillActionLabel: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
    pillDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
      alignSelf: 'center',
    },
    // Phase 15 — emoji strip styles
    emojiStrip: {
      position: 'absolute',
      alignSelf: 'center',
      flexDirection: 'row',
      backgroundColor: colors.surface.overlay,
      borderRadius: RADII.lg,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    emojiButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      minHeight: 44,
      borderRadius: RADII.full,
    },
    emojiButtonActive: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(249, 115, 22, 0.20)',
    },
    // Phase 15 — reaction badge row styles
    reactionBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.xs,
      marginTop: SPACING.xs,
      alignSelf: 'flex-end',
    },
    reactionBadgeRowOthers: {
      alignSelf: 'flex-start',
    },
    reactionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    reactionBadgeOwn: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(249, 115, 22, 0.20)',
      borderColor: colors.interactive.accent,
    },
    reactionBadgeCount: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    // Phase 17 — poll container style
    pollContainer: {
      width: '100%',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.xs,
    },
    // Phase 26 — pending/failed states (CHAT-03)
    pendingBubble: {
      opacity: 0.7,
    },
    failedBubble: {
      borderWidth: 2,
      borderColor: colors.interactive.destructive,
    },
    clockRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: SPACING.xs,
      marginTop: SPACING.xs,
    },
    retryLabel: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.destructive,
      marginTop: SPACING.xs,
    },
    // Phase 16 — image bubble styles
    imageBubbleWrapper: {
      width: 240,
      maxHeight: 320,
      aspectRatio: 4 / 3,
      borderRadius: RADII.md,
      overflow: 'hidden',
    },
    inlineImage: {
      width: '100%',
      height: '100%',
    },
    spinnerOverlay: {
      ...StyleSheet.absoluteFillObject,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [colors]);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pillY, setPillY] = useState(0);
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);

  const emojiStripTop = Math.max(
    SPACING.xl + STRIP_HEIGHT + SPACING.sm,
    pillY - STRIP_HEIGHT - SPACING.sm
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const bubbleScaleAnim = useRef(new Animated.Value(1)).current;

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
    // Non-own poll messages have no available actions — skip showing an empty pill
    if (isPoll && !isOwn) return;
    // Scale fires only here — all guards passed, menu WILL open (CHAT-04)
    Animated.spring(bubbleScaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
    setPillY(Math.max(60, event.nativeEvent.pageY - 80));
    setMenuVisible(true);
  }

  function closeMenu() {
    setMenuVisible(false);
    Animated.spring(bubbleScaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
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
  const isImage = message.message_type === 'image';
  const isPoll = message.message_type === 'poll';
  const bodyText = isDeleted ? 'Message deleted.' : (message.body ?? '');

  const contextMenu = (
    <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
      </TouchableWithoutFeedback>
      {/* NEW: emoji strip above pill — D-01 */}
      <View style={[styles.emojiStrip, { top: emojiStripTop }]}>
        {PRESET_EMOJIS.map((emoji) => {
          const isActive =
            message.reactions?.some((r) => r.emoji === emoji && r.reacted_by_me) ?? false;
          return (
            <TouchableOpacity
              key={emoji}
              onPress={() => {
                closeMenu();
                void Haptics.selectionAsync();
                onReact(message.id, emoji);
              }}
              style={[styles.emojiButton, isActive && styles.emojiButtonActive]}
              activeOpacity={0.7}
              accessibilityLabel={`React with ${getEmojiName(emoji)}`}
            >
              {}
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Existing pill — UNCHANGED */}
      <View style={[styles.contextPill, { top: pillY }]}>
        {!isPoll && (
          <TouchableOpacity
            onPress={handleReply}
            style={styles.pillAction}
            accessibilityLabel="Reply to message"
          >
            <Ionicons name="return-up-back" size={20} color={colors.text.primary} />
            <Text style={styles.pillActionLabel}>Reply</Text>
          </TouchableOpacity>
        )}
        {!isImage && !isPoll && (
          <>
            <View style={styles.pillDivider} />
            <TouchableOpacity
              onPress={handleCopy}
              style={styles.pillAction}
              accessibilityLabel="Copy message text"
            >
              <Ionicons name="copy-outline" size={20} color={colors.text.primary} />
              <Text style={styles.pillActionLabel}>Copy</Text>
            </TouchableOpacity>
          </>
        )}
        {isOwn && (
          <>
            <View style={styles.pillDivider} />
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.pillAction}
              accessibilityLabel="Delete message"
            >
              <Ionicons name="trash-outline" size={20} color={colors.interactive.destructive} />
              <Text style={[styles.pillActionLabel, { color: colors.interactive.destructive }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );

  if (isPoll) {
    return (
      <Animated.View style={{ backgroundColor: highlightBg }}>
        <TouchableOpacity
          style={styles.pollContainer}
          onLongPress={handleLongPress}
          activeOpacity={0.9}
        >
          <PollCard
            message={message}
            currentUserId={currentUserId ?? ''}
            lastPollVoteEvent={lastPollVoteEvent ?? null}
          />
        </TouchableOpacity>
        {contextMenu}
      </Animated.View>
    );
  }

  if (isOwn) {
    return (
      <Animated.View style={{ backgroundColor: highlightBg }}>
        <Animated.View style={{ transform: [{ scale: bubbleScaleAnim }] }}>
        <TouchableOpacity
          style={styles.ownContainer}
          onPress={handleTap}
          onLongPress={handleLongPress}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.ownBubble,
              isImage && { paddingHorizontal: 0, paddingVertical: 0 },
              !!message.reply_to_message_id && styles.replyMinWidth,
              message.pending && styles.pendingBubble,   // D-17: ~70% opacity
              message.failed && styles.failedBubble,     // D-18: red border
            ]}
          >
            {message.reply_to_message_id && (
              <QuotedBlock
                replyToId={message.reply_to_message_id}
                allMessages={allMessages}
                isOwn={isOwn}
                onPress={() => onScrollToMessage(message.reply_to_message_id!)}
                colors={colors}
              />
            )}
            {isImage ? (
              <TouchableOpacity
                onPress={() => message.image_url && onImagePress?.(message.image_url)}
                activeOpacity={0.9}
                accessibilityLabel={
                  message.pending ? 'Sending photo...' : `Photo from ${message.sender_display_name}`
                }
                style={{ padding: 0 }}
              >
                <View style={[styles.imageBubbleWrapper, message.pending && { opacity: 0.7 }]}>
                  <Image
                    source={{ uri: message.image_url ?? undefined }}
                    style={styles.inlineImage}
                    contentFit="cover"
                    recyclingKey={message.id}
                  />
                  {message.pending && (
                    <View style={styles.spinnerOverlay}>
                      <ActivityIndicator size="large" color={colors.interactive.accent} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={isDeleted ? styles.deletedBody : styles.ownBody}>{bodyText}</Text>
            )}
          </View>
          {/* CHAT-03: clock icon for pending text messages */}
          {message.pending && !isImage && (
            <View style={styles.clockRow}>
              {/* eslint-disable-next-line campfire/no-hardcoded-styles */}
              <Ionicons name="time-outline" size={12} color="rgba(245,245,245,0.5)" />
              <Text style={styles.ownTimestamp}>Sending…</Text>
            </View>
          )}
          {/* CHAT-03: retry tap for failed text messages */}
          {message.failed && (
            <TouchableOpacity
              onPress={() => onRetry?.(message.tempId!, message.body ?? '')}
              accessibilityLabel="Message failed to send. Tap to retry."
            >
              <Text style={styles.retryLabel}>Tap to retry</Text>
            </TouchableOpacity>
          )}
          {/* ReactionBadgeRow — D-04, D-05. Sibling to bubble, NOT inside it (Pitfall 5) */}
          {(message.reactions?.length ?? 0) > 0 && (
            <View style={styles.reactionBadgeRow}>
              {message.reactions!.map((r) => (
                <TouchableOpacity
                  key={r.emoji}
                  onPress={() => setReactionsSheetVisible(true)}
                  style={[styles.reactionBadge, r.reacted_by_me && styles.reactionBadgeOwn]}
                  activeOpacity={0.7}
                  accessibilityLabel={
                    r.reacted_by_me
                      ? `${getEmojiName(r.emoji)} reaction, ${r.count} ${r.count !== 1 ? 'people' : 'person'}. You reacted. Tap to remove.`
                      : `${getEmojiName(r.emoji)} reaction, ${r.count} ${r.count !== 1 ? 'people' : 'person'}`
                  }
                >
                  {}
                  <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
                  <Text style={styles.reactionBadgeCount}>{r.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {showTimestamp && (
            <Animated.Text style={[styles.ownTimestamp, { opacity: fadeAnim }]}>
              {timestamp}
            </Animated.Text>
          )}
        </TouchableOpacity>
        </Animated.View>
        {contextMenu}
        {reactionsSheetVisible && (message.reactions?.length ?? 0) > 0 && (
          <ReactionsSheet
            messageId={message.id}
            reactions={message.reactions!}
            currentUserId={currentUserId}
            onReact={onReact}
            onClose={() => setReactionsSheetVisible(false)}
          />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ backgroundColor: highlightBg }}>
      <Animated.View style={{ transform: [{ scale: bubbleScaleAnim }] }}>
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
          {showSenderInfo && <Text style={styles.senderName}>{message.sender_display_name}</Text>}
          <View
            style={[
              styles.othersBubble,
              isImage && { paddingHorizontal: 0, paddingVertical: 0 },
              !!message.reply_to_message_id && styles.replyMinWidth,
            ]}
          >
            {message.reply_to_message_id && (
              <QuotedBlock
                replyToId={message.reply_to_message_id}
                allMessages={allMessages}
                isOwn={isOwn}
                onPress={() => onScrollToMessage(message.reply_to_message_id!)}
                colors={colors}
              />
            )}
            {isImage ? (
              <TouchableOpacity
                onPress={() => message.image_url && onImagePress?.(message.image_url)}
                activeOpacity={0.9}
                accessibilityLabel={
                  message.pending ? 'Sending photo...' : `Photo from ${message.sender_display_name}`
                }
                style={{ padding: 0 }}
              >
                <View style={[styles.imageBubbleWrapper, message.pending && { opacity: 0.7 }]}>
                  <Image
                    source={{ uri: message.image_url ?? undefined }}
                    style={styles.inlineImage}
                    contentFit="cover"
                    recyclingKey={message.id}
                  />
                  {message.pending && (
                    <View style={styles.spinnerOverlay}>
                      <ActivityIndicator size="large" color={colors.interactive.accent} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={isDeleted ? styles.deletedBody : styles.othersBody}>{bodyText}</Text>
            )}
          </View>
          {/* ReactionBadgeRow — others' messages, left-aligned */}
          {(message.reactions?.length ?? 0) > 0 && (
            <View style={[styles.reactionBadgeRow, styles.reactionBadgeRowOthers]}>
              {message.reactions!.map((r) => (
                <TouchableOpacity
                  key={r.emoji}
                  onPress={() => setReactionsSheetVisible(true)}
                  style={[styles.reactionBadge, r.reacted_by_me && styles.reactionBadgeOwn]}
                  activeOpacity={0.7}
                  accessibilityLabel={
                    r.reacted_by_me
                      ? `${getEmojiName(r.emoji)} reaction, ${r.count} ${r.count !== 1 ? 'people' : 'person'}. You reacted. Tap to remove.`
                      : `${getEmojiName(r.emoji)} reaction, ${r.count} ${r.count !== 1 ? 'people' : 'person'}`
                  }
                >
                  {}
                  <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
                  <Text style={styles.reactionBadgeCount}>{r.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {showTimestamp && (
            <Animated.Text style={[styles.othersTimestamp, { opacity: fadeAnim }]}>
              {timestamp}
            </Animated.Text>
          )}
        </View>
      </TouchableOpacity>
      </Animated.View>
      {contextMenu}
      {reactionsSheetVisible && (message.reactions?.length ?? 0) > 0 && (
        <ReactionsSheet
          messageId={message.id}
          reactions={message.reactions!}
          currentUserId={currentUserId}
          onReact={onReact}
          onClose={() => setReactionsSheetVisible(false)}
        />
      )}
    </Animated.View>
  );
}

