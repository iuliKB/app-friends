import React from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  MessageBubble,
  formatTimeSeparator,
  shouldShowTimeSeparator,
} from '@/components/chat/MessageBubble';
import { SendBar } from '@/components/chat/SendBar';
import { PinnedPlanBanner } from '@/components/chat/PinnedPlanBanner';
import { BirthdayWishListPanel } from '@/components/chat/BirthdayWishListPanel';
import type { MessageWithProfile } from '@/types/chat';

interface ChatRoomScreenProps {
  planId?: string;
  dmChannelId?: string;
  groupChannelId?: string;
  friendName?: string;
  birthdayPersonId?: string;
}

export function ChatRoomScreen({
  planId,
  dmChannelId,
  groupChannelId,
  friendName,
  birthdayPersonId,
}: ChatRoomScreenProps) {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';

  const { messages, loading: _loading, sendMessage } = useChatRoom({ planId, dmChannelId, groupChannelId });

  async function handleSend(body: string) {
    const { error } = await sendMessage(body);
    if (error) {
      Alert.alert('Error', 'Message failed to send.', [{ text: 'OK' }]);
    }
  }

  function isFirstInGroup(msgs: MessageWithProfile[], index: number): boolean {
    // With inverted FlatList, index 0 is newest, index msgs.length-1 is oldest
    // "First in group" means first message from this sender in a consecutive run
    // For inverted list: the item "above" visually is index+1
    if (index === msgs.length - 1) return true;
    const current = msgs[index];
    const next = msgs[index + 1];
    if (!current || !next) return true;
    return next.sender_id !== current.sender_id;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.surface.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      {planId ? <PinnedPlanBanner planId={planId} /> : null}
      {birthdayPersonId && groupChannelId ? (
        <BirthdayWishListPanel
          birthdayPersonId={birthdayPersonId}
          groupChannelId={groupChannelId}
          birthdayPersonName={friendName?.replace(/'s birthday$/, '')}
        />
      ) : null}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            // In inverted list, index+1 is the visually "above" (older) message
            const olderMsg = index < messages.length - 1 ? messages[index + 1] : undefined;
            const showSeparator = shouldShowTimeSeparator(item, olderMsg);

            return (
              <View>
                {showSeparator && (
                  <Text style={styles.timeSeparator}>
                    {formatTimeSeparator(item.created_at)}
                  </Text>
                )}
                <MessageBubble
                  message={item}
                  isOwn={item.sender_id === currentUserId}
                  showSenderInfo={isFirstInGroup(messages, index)}
                />
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}
      <SendBar onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.secondary,
  },
  listContent: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  timeSeparator: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 12,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
});
