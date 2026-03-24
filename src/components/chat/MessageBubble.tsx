import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';
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
      <TouchableOpacity
        style={styles.ownContainer}
        onPress={handleTap}
        activeOpacity={0.8}
      >
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
    <TouchableOpacity
      style={styles.othersContainer}
      onPress={handleTap}
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
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(245,245,245,0.5)',
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
    fontSize: 12,
    fontWeight: '400',
    color: '#9ca3af',
    marginTop: 2,
  },
});
