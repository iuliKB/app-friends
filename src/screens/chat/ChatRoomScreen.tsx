import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { PollCreationSheet } from '@/components/chat/PollCreationSheet';
import { ChatTodoPickerSheet } from '@/components/chat/ChatTodoPickerSheet';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useChatTodos } from '@/hooks/useChatTodos';
import { useChatMembers } from '@/hooks/useChatMembers';
import type { ChatScope } from '@/hooks/useChatTodos';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { supabase } from '@/lib/supabase';
import type { ChatTodoItem, ChatTodoList } from '@/types/todos';
import {
  MessageBubble,
  formatTimeSeparator,
  shouldShowTimeSeparator,
} from '@/components/chat/MessageBubble';
import { SendBar, type AttachmentAction, type ReplyContext } from '@/components/chat/SendBar';
import { PinnedPlanBanner } from '@/components/chat/PinnedPlanBanner';
import { BirthdayWishListPanel } from '@/components/chat/BirthdayWishListPanel';
import { GroupParticipantsSheet } from '@/components/chat/GroupParticipantsSheet';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
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
  const { colors } = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const [participantsVisible, setParticipantsVisible] = useState(false);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';

  const {
    messages,
    loading,
    error,
    refetch,
    sendMessage,
    retryMessage,
    sendImage,
    sendPoll,
    deleteMessage,
    addReaction,
    lastPollVoteEvent,
  } = useChatRoom({ planId, dmChannelId, groupChannelId });

  // Phase 14: FlatList ref for scrollToIndex
  const flatListRef = useRef<FlatList<MessageWithProfile>>(null);

  // Phase 14: reply state
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);

  // Phase 14: highlighted message for scroll-to-original flash
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Phase 16: full-screen image viewer
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Phase 17: poll creation sheet
  const [showPollCreationSheet, setShowPollCreationSheet] = useState(false);

  // Phase 29.1 Plan 07 — chat to-do integration (multi-scope as of 0026):
  //   • Picker sheet works in group chats, plan chats, and DMs.
  //   • chatScope is the active chat scope, derived from the three id props.
  //   • useChatMembers loads members for the assignee picker.
  //   • chatTodoData is a per-message_id cache of resolved
  //     {list, items, assigneeName} for `message_type === 'todo'` rows.
  const chatScope: ChatScope | null = useMemo(() => {
    if (groupChannelId) return { kind: 'group', groupChannelId };
    if (planId) return { kind: 'plan', planId };
    if (dmChannelId) return { kind: 'dm', dmChannelId };
    return null;
  }, [groupChannelId, planId, dmChannelId]);
  const [showChatTodoPickerSheet, setShowChatTodoPickerSheet] = useState(false);
  const { sendChatTodo, completeChatTodo } = useChatTodos();
  const { members: chatMembers } = useChatMembers(chatScope);
  const [chatTodoData, setChatTodoData] = useState<
    Record<string, { list: ChatTodoList | null; items: ChatTodoItem[]; assigneeName: string }>
  >({});
  // Track in-flight lazy loads so we don't fire duplicate fetches across
  // renders for the same message_id.
  const todoFetchInFlightRef = useRef<Set<string>>(new Set());

  // Phase 30 Plan 04 — Navigation surface writer.
  // Pushes 'chat' to useNavigationStore on focus so CustomTabBar hides the bar,
  // restores 'tabs' on blur so the bar returns when the user leaves the chat
  // by ANY means (back gesture, programmatic pop, app backgrounding then
  // refocusing a different screen).
  const setSurface = useNavigationStore((s) => s.setSurface);

  useFocusEffect(
    useCallback(() => {
      setSurface('chat');
      return () => setSurface('tabs');
    }, [setSurface])
  );

  // Phase 14: toast for out-of-window original
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('Scroll up to see the original message');

  useEffect(() => {
    if (!groupChannelId || !friendName) return;
    const title = birthdayPersonId ? friendName.replace(/'s birthday$/i, '').trim() : friendName;
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity onPress={() => setParticipantsVisible(true)} activeOpacity={0.7}>
          <Text
            style={{
              fontSize: FONT_SIZE.md,
              fontWeight: FONT_WEIGHT.semibold,
              color: colors.text.primary,
            }}
          >
            {title}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [groupChannelId, friendName, birthdayPersonId, navigation, colors]);

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
    } else if (action === 'poll') {
      setShowPollCreationSheet(true);
    } else if (action === 'todo') {
      // Two-step picker (works in group, plan, and DM chats as of 0026).
      setShowChatTodoPickerSheet(true);
    }
  }

  // Phase 29.1 Plan 07 — lazy-fetch chat_todo_list + items for any `'todo'`
  // message rendered in the thread. Maintains a per-message cache so we don't
  // re-query on every render. The cache is invalidated for a specific message
  // when its item-set changes (handleCompleteChatTodoItem below).
  useEffect(() => {
    const todoMessages = messages.filter((m) => m.message_type === 'todo');
    todoMessages.forEach((m) => {
      if (chatTodoData[m.id]) return;
      if (todoFetchInFlightRef.current.has(m.id)) return;
      todoFetchInFlightRef.current.add(m.id);
      // database.ts predates migration 0024 — cast through any until regen.
      // Same anticipated pattern as the rest of phase 29.1's queries.
      void (async () => {
        const { data: listRow } = await (
          supabase as never as {
            from: (table: string) => {
              select: (q: string) => {
                eq: (
                  col: string,
                  value: string
                ) => {
                  maybeSingle: () => Promise<{ data: ChatTodoList | null; error: unknown }>;
                };
              };
            };
          }
        )
          .from('chat_todo_lists')
          .select('*')
          .eq('message_id', m.id)
          .maybeSingle();
        if (!listRow) {
          // RLS may legitimately filter for non-assignee/non-creator viewers.
          // Cache as empty so we don't re-poll on every render.
          setChatTodoData((prev) => ({
            ...prev,
            [m.id]: { list: null, items: [], assigneeName: '' },
          }));
          todoFetchInFlightRef.current.delete(m.id);
          return;
        }
        // Items + assignee profile in parallel.
        type ChatTodoItemRow = ChatTodoItem;
        const [itemsResult, profileResult] = await Promise.all([
          (
            supabase as never as {
              from: (t: string) => {
                select: (q: string) => {
                  eq: (
                    c: string,
                    v: string
                  ) => {
                    order: (
                      col: string,
                      opts: { ascending: boolean }
                    ) => Promise<{ data: ChatTodoItemRow[] | null; error: unknown }>;
                  };
                };
              };
            }
          )
            .from('chat_todo_items')
            .select('*')
            .eq('list_id', listRow.id)
            .order('position', { ascending: true }),
          supabase
            .from('profiles')
            .select('display_name')
            .eq('id', listRow.assignee_id)
            .maybeSingle(),
        ]);
        const items = (itemsResult.data ?? []) as ChatTodoItem[];
        const assigneeName =
          (profileResult.data as { display_name?: string | null } | null)?.display_name ?? '';
        setChatTodoData((prev) => ({
          ...prev,
          [m.id]: { list: listRow, items, assigneeName },
        }));
        todoFetchInFlightRef.current.delete(m.id);
      })();
    });
  }, [messages, chatTodoData]);

  // Wrapper for the chat-to-do bubble checkbox tap. Invokes the RPC then
  // invalidates the cache entry for any message whose list contains the item
  // so the bubble re-fetches and reflects the new completed_at.
  async function handleCompleteChatTodoItem(itemId: string) {
    // Phase 32 — pass chatScope so completeMutation can derive channelId and
    // invalidate chat.messages(channelId) for the system-message bubble update.
    const result = await completeChatTodo(itemId, {
      chatScope: chatScope ?? undefined,
    });
    // Find which message holds this item and invalidate its cache slot.
    for (const [msgId, payload] of Object.entries(chatTodoData)) {
      if (payload.items.some((it) => it.id === itemId)) {
        setChatTodoData((prev) => {
          const next = { ...prev };
          delete next[msgId];
          return next;
        });
        break;
      }
    }
    return result;
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
              ]
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
              ]
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
    const compressed = await manipulateAsync(localUri, [{ resize: { width: 1280 } }], {
      compress: 0.75,
      format: SaveFormat.JPEG,
    });

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        emptyContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emptyText: {
          fontSize: FONT_SIZE.lg,
          color: colors.text.secondary,
        },
        listContent: {
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.sm,
          paddingHorizontal: SPACING.md,
        },
        timeSeparatorWrap: {
          alignSelf: 'center',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.full,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.xs,
          marginVertical: SPACING.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        timeSeparator: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: 11,
          fontWeight: FONT_WEIGHT.regular,
          color: colors.text.secondary,
        },
        toast: {
          position: 'absolute',
          bottom: SPACING.xxl,
          alignSelf: 'center',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.pill,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          borderWidth: 1,
          borderColor: colors.border,
        },
        toastText: {
          fontSize: FONT_SIZE.sm,
          fontWeight: FONT_WEIGHT.regular,
          color: colors.text.primary,
        },
      }),
    [colors]
  );

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay mode="screen" message="Couldn't load messages." onRetry={refetch} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight + insets.bottom}
    >
      {planId ? <PinnedPlanBanner planId={planId} /> : null}
      {birthdayPersonId && groupChannelId ? (
        <BirthdayWishListPanel
          birthdayPersonId={birthdayPersonId}
          groupChannelId={groupChannelId}
          birthdayPersonName={friendName?.replace(/'s birthday$/, '')}
          onStartGiftPoll={(question, options) => {
            sendPoll(question, options).then(({ error }) => {
              if (error)
                Alert.alert('Error', 'Could not create the gift poll. Please try again.', [
                  { text: 'OK' },
                ]);
            });
          }}
        />
      ) : null}
      {loading && messages.length === 0 ? (
        <View
          style={{
            flex: 1,
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.lg,
            gap: SPACING.md,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <MessageSkeletonRow key={i} align={i % 3 === 0 ? 'right' : 'left'} />
          ))}
        </View>
      ) : messages.length === 0 ? (
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
                  <View style={styles.timeSeparatorWrap}>
                    <Text style={styles.timeSeparator}>{formatTimeSeparator(item.created_at)}</Text>
                  </View>
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
                  lastPollVoteEvent={lastPollVoteEvent}
                  onRetry={(tempId, body) => void retryMessage(tempId, body)}
                  chatTodoList={chatTodoData[item.id]?.list ?? null}
                  chatTodoItems={chatTodoData[item.id]?.items ?? []}
                  chatTodoAssigneeName={chatTodoData[item.id]?.assigneeName ?? ''}
                  onCompleteChatTodoItem={handleCompleteChatTodoItem}
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
      <PollCreationSheet
        visible={showPollCreationSheet}
        onDismiss={() => setShowPollCreationSheet(false)}
        onSend={(question, options) => {
          sendPoll(question, options).then(({ error }) => {
            if (error)
              Alert.alert('Error', 'Poll could not be sent. Please try again.', [{ text: 'OK' }]);
          });
        }}
      />
      {chatScope ? (
        <ChatTodoPickerSheet
          visible={showChatTodoPickerSheet}
          onDismiss={() => setShowChatTodoPickerSheet(false)}
          scope={chatScope}
          members={chatMembers}
          currentUserId={currentUserId}
          onSend={async (args) => {
            const result = await sendChatTodo(args);
            if (!result.error) {
              // sendChatTodo writes the parent 'todo' message via the RPC; the
              // existing useChatRoom realtime subscription surfaces it, then the
              // lazy-fetch effect above resolves the list + items for the bubble.
              // Phase 32 — flipped void→await so the picker sheet does not dismiss
              // before the bubble's children resolve (~500ms user-accepted latency
              // per CONTEXT.md §2 todo row).
              await refetch();
            }
            return result;
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function MessageSkeletonRow({ align }: { align: 'left' | 'right' }) {
  const isRight = align === 'right';
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isRight ? 'flex-end' : 'flex-start',
        gap: SPACING.sm,
      }}
    >
      {!isRight && <SkeletonPulse width={32} height={32} />}
      <View style={{ gap: SPACING.xs, alignItems: isRight ? 'flex-end' : 'flex-start' }}>
        <SkeletonPulse width={isRight ? 160 : 200} height={36} />
      </View>
    </View>
  );
}
