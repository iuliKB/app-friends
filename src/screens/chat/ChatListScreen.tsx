import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useChatList } from '@/hooks/useChatList';
import { ChatListRow } from '@/components/chat/ChatListRow';
import type { ChatListItem } from '@/types/chat';

export function ChatListScreen() {
  const router = useRouter();
  const { chatList, loading, refreshing, handleRefresh } = useChatList();

  function handleChatPress(item: ChatListItem) {
    if (item.type === 'plan') {
      router.push(('/chat/room?plan_id=' + item.id) as never);
    } else {
      router.push(
        ('/chat/room?dm_channel_id=' + item.id + '&friend_name=' + encodeURIComponent(item.title)) as never
      );
    }
  }

  if (loading && chatList.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={chatList}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatListRow item={item} onPress={() => handleChatPress(item)} />
      )}
      ItemSeparatorComponent={() => (
        <View style={styles.separator} />
      )}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      contentContainerStyle={chatList.length === 0 ? styles.emptyList : undefined}
      style={styles.list}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyHeading}>No chats yet</Text>
          <Text style={styles.emptyBody}>
            Create a plan or message a friend to get started
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.dominant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyBody: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
