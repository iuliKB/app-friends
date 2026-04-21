import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ImageViewerModal } from '@/components/chat/ImageViewerModal';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation, useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  MessageBubble,
  formatTimeSeparator,
  shouldShowTimeSeparator,
} from '@/components/chat/MessageBubble';
import { SendBar, type AttachmentAction, type ReplyContext } from '@/components/chat/SendBar';
import { PinnedPlanBanner } from '@/components/chat/PinnedPlanBanner';
import { BirthdayWishListPanel } from '@/components/chat/BirthdayWishListPanel';
import { GroupParticipantsSheet } from '@/components/chat/GroupParticipantsSheet';
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
  const router = useRouter();
  const [participantsVisible, setParticipantsVisible] = useState(false);
  const headerHeight = useHeaderHeight();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';

  const { messages, loading: _loading, sendMessage, sendImage, deleteMessage, addReaction } = useChatRoom({ planId, dmChannelId, groupChannelId });

  // Phase 14: FlatList ref for scrollToIndex
  const flatListRef = useRef<FlatList<MessageWithProfile>>(null);

  // Phase 14: reply state
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);

  // Phase 14: highlighted message for scroll-to-original flash
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Phase 16: full-screen image viewer
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Phase 14: toast for out-of-window original
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('Scroll up to see the original message');

  useEffect(() => {
    if (!groupChannelId || !friendName) return;
    const title = friendName;
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity onPress={() => setParticipantsVisible(true)} activeOpacity={0.7}>
          <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text.primary }}>
            {title}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [groupChannelId, friendName, navigation]);

  function showToast(message?: string) {
    if (message) setToastMessage(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setToastVisible(false);
      setToastMessage('Scroll up to see the original message');
    });
  }

  function scrollToMessage(messageId: string) {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      showToast();
      return;
    }
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId(null), 1200);
  }

  function handleAttachmentAction(action: AttachmentAction) {
    if (action === 'split') {
      const url = groupChannelId
        ? `/squad/expenses/create?group_channel_id=${groupChannelId}`
        : '/squad/expenses/create';
      router.push(url as never);
    } else {
      Alert.alert('Coming Soon', 'This feature is on the way!', [{ text: 'OK' }]);
    }
  }

  async function handleSend(body: string) {
    const replyToId = replyContext?.messageId;
    const { error } = await sendMessage(body, replyToId);
    if (error) {
      Alert.alert('Error', 'Message failed to send.', [{ text: 'OK' }]);
    }
  }

  function handlePhotoPress() {
    Alert.alert('Send Photo', undefined, [
      {
        text: 'Photo Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Photo Library Access Needed',
              'Allow Campfire to access your photos in Settings.',
              [
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images' as ImagePicker.MediaType,
            allowsEditing: false,
            quality: 1,
          });
          if (!result.canceled && result.assets[0]) {
            await handlePhotoSelected(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Camera Access Needed',
              'Allow Campfire to use your camera in Settings to take photos.',
              [
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images' as ImagePicker.MediaType,
            quality: 1,
          });
          if (!result.canceled && result.assets[0]) {
            await handlePhotoSelected(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handlePhotoSelected(localUri: string) {
    // T-16-13: compress to max 1280px / 0.75 JPEG before upload — never send raw camera photos
    const compressed = await manipulateAsync(
      localUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.75, format: SaveFormat.JPEG },
    );

    const replyToId = replyContext?.messageId;
    const { error } = await sendImage(compressed.uri, replyToId);

    if (error) {
      showToast('Photo could not be sent');
    }
    setReplyContext(null);
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
          ref={flatListRef}
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
                  allMessages={messages}
                  highlighted={highlightedId === item.id}
                  onReply={(msg) =>
                    setReplyContext({
                      messageId: msg.id,
                      senderName: msg.sender_display_name,
                      previewText: msg.body ?? (msg.image_url ? '📷 Photo' : ''),
                    })
                  }
                  onDelete={(id) => deleteMessage(id)}
                  onScrollToMessage={scrollToMessage}
                  onReact={(messageId, emoji) => addReaction(messageId, emoji)}
                  onImagePress={(url) => setViewerImageUrl(url)}
                  currentUserId={currentUserId}
                />
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={() => {
            // Treat as out-of-window (D-11)
            showToast();
          }}
        />
      )}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
      <SendBar
        onSend={handleSend}
        onAttachmentAction={handleAttachmentAction}
        replyContext={replyContext}
        onClearReply={() => setReplyContext(null)}
        onPhotoPress={handlePhotoPress}
      />
      {groupChannelId ? (
        <GroupParticipantsSheet
          visible={participantsVisible}
          onClose={() => setParticipantsVisible(false)}
          groupChannelId={groupChannelId}
        />
      ) : null}
      <ImageViewerModal
        visible={viewerImageUrl !== null}
        imageUrl={viewerImageUrl}
        onClose={() => setViewerImageUrl(null)}
      />
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
  toast: {
    position: 'absolute',
    bottom: SPACING.xxl,
    alignSelf: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toastText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
});
