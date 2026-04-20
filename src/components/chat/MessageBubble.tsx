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

export function MessageBubble({ message, isOwn, showSenderInfo }: MessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const timestamp = formatMessageTime(message.created_at);

  if (isOwn) {
    return (
      <TouchableOpacity style={styles.ownContainer} onPress={handleTap} activeOpacity={0.8}>
        <View style={[styles.ownBubble, message.pending && styles.pendingOpacity]}>
          <Text style={styles.ownBody}>{message.body}</Text>
        </View>
        {showTimestamp && (
          <Animated.Text style={[styles.ownTimestamp, { opacity: fadeAnim }]}>
            {timestamp}
          </Animated.Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.othersContainer} onPress={handleTap} activeOpacity={0.8}>
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
        <View style={styles.othersBubble}>
          <Text style={styles.othersBody}>{message.body}</Text>
        </View>
        {showTimestamp && (
          <Animated.Text style={[styles.othersTimestamp, { opacity: fadeAnim }]}>
            {timestamp}
          </Animated.Text>
        )}
      </View>
    </TouchableOpacity>
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
});
