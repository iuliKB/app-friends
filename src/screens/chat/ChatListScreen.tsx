import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useChatList } from '@/hooks/useChatList';
import { ChatListRow } from '@/components/chat/ChatListRow';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import type { ChatListItem } from '@/types/chat';

export function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chatList, loading, refreshing, handleRefresh } = useChatList();

  function handleChatPress(item: ChatListItem) {
    if (item.type === 'plan') {
      router.push(('/chat/room?plan_id=' + item.id) as never);
    } else {
      router.push(
        ('/chat/room?dm_channel_id=' +
          item.id +
          '&friend_name=' +
          encodeURIComponent(item.title)) as never
      );
    }
  }

  if (loading && chatList.length === 0) {
    return <LoadingIndicator />;
  }

  return (
    <FlatList
      data={chatList}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChatListRow item={item} onPress={() => handleChatPress(item)} />}
      ListHeaderComponent={
        <Text style={[styles.heading, { paddingTop: insets.top + SPACING.sm }]}>{'Chats'}</Text>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.interactive.accent}
        />
      }
      contentContainerStyle={chatList.length === 0 ? styles.emptyList : undefined}
      style={styles.list}
      ListEmptyComponent={
        <EmptyState
          icon="💬"
          heading="No conversations yet"
          body="Start a DM from a friend's card, or create a plan to get a group chat going."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  heading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginLeft: 68,
  },
  emptyList: {
    flex: 1,
  },
});
