import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { MessageWithProfile } from '@/types/chat';

interface MessageBubbleProps {
  message: MessageWithProfile;
  isOwn: boolean;
  showSenderInfo: boolean;
}

function getRelativeTime(isoString: string): string {
  const diffSeconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSeconds < 60) return 'now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  const date = new Date(isoString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MessageBubble({ message, isOwn, showSenderInfo }: MessageBubbleProps) {
  const timestamp = getRelativeTime(message.created_at);

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
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  ownBubble: {
    backgroundColor: '#f97316',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pendingOpacity: {
    opacity: 0.7,
  },
  ownBody: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1a1a1a',
  },
  ownTimestamp: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(26,26,26,0.6)',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  othersContainer: {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  avatarSpacer: {
    width: 32,
  },
  othersContent: {
    flexDirection: 'column',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  othersBubble: {
    backgroundColor: '#2a2a2a',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  othersBody: {
    fontSize: 16,
    fontWeight: '400',
    color: '#f5f5f5',
  },
  othersTimestamp: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9ca3af',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});
