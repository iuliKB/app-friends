import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { MessageWithProfile } from '@/types/chat';

interface MessageBubbleProps {
  message: MessageWithProfile;
  isOwn: boolean;
  showSenderInfo: boolean;
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
  // Show separator if 15+ minutes gap
  return Math.abs(currentTime - previousTime) >= 15 * 60 * 1000;
}

export function MessageBubble({ message, isOwn, showSenderInfo }: MessageBubbleProps) {
  const timestamp = formatMessageTime(message.created_at);

  if (isOwn) {
    return (
      <View style={styles.ownContainer}>
        <View style={[styles.ownBubble, message.pending && styles.pendingOpacity]}>
          <Text style={styles.ownBody}>{message.body}</Text>
        </View>
        <Text style={styles.ownTimestamp}>{timestamp}</Text>
      </View>
    );
  }

  return (
    <View style={styles.othersContainer}>
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
        <Text style={styles.othersTimestamp}>{timestamp}</Text>
      </View>
    </View>
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
    fontSize: 11,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginTop: 2,
    alignSelf: 'flex-end',
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
    fontSize: 11,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginTop: 2,
  },
});
