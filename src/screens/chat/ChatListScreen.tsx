import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
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
        <View style={{ paddingTop: insets.top, paddingHorizontal: SPACING.lg }}>
          <ScreenHeader title="Chats" />
        </View>
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
