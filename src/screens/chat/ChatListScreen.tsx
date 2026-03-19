import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useChatList } from '@/hooks/useChatList';
import { ChatListRow } from '@/components/chat/ChatListRow';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import type { ChatListItem } from '@/types/chat';

export function ChatListScreen() {
  const router = useRouter();
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
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onRefresh={handleRefresh}
      refreshing={refreshing}
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
    backgroundColor: COLORS.dominant,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },
  emptyList: {
    flex: 1,
  },
});
