import React, { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useChatList } from '@/hooks/useChatList';
import { ChatListRow } from '@/components/chat/ChatListRow';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import type { ChatListItem } from '@/types/chat';

export function ChatListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chatList, loading, error, refreshing, handleRefresh } = useChatList();

  function handleChatPress(item: ChatListItem) {
    if (item.type === 'plan') {
      router.push(('/chat/room?plan_id=' + item.id) as never);
    } else if (item.type === 'group') {
      const params = new URLSearchParams({
        group_channel_id: item.id,
        friend_name: item.title,
        ...(item.birthdayPersonId ? { birthday_person_id: item.birthdayPersonId } : {}),
      });
      router.push((`/chat/room?${params.toString()}`) as never);
    } else {
      router.push(
        ('/chat/room?dm_channel_id=' +
          item.id +
          '&friend_name=' +
          encodeURIComponent(item.title)) as never
      );
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    list: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    flatList: {
      flex: 1,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginLeft: 68,
    },
    emptyList: {
      flex: 1,
    },
  }), [colors]);

  if (loading && chatList.length === 0) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay
          mode="screen"
          message="Couldn't load your chats."
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  return (
    <View style={[styles.list, { paddingTop: insets.top }]}>
    <FlatList
      data={chatList}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChatListRow item={item} onPress={() => handleChatPress(item)} />}
      ListHeaderComponent={
        <View style={{ paddingTop: SPACING.sm, paddingHorizontal: SPACING.lg }}>
          <ScreenHeader title="Chats" />
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.interactive.accent}
        />
      }
      contentContainerStyle={chatList.length === 0 ? styles.emptyList : undefined}
      style={styles.flatList}
      ListEmptyComponent={
        <EmptyState
          icon="chatbubbles-outline"
          iconType="ionicons"
          heading="No conversations yet"
          body="Start a DM from a friend's card, or create a plan to get a group chat going."
        />
      }
    />
    </View>
  );
}
