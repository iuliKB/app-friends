import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { useChatList } from '@/hooks/useChatList';
import { useChatStore } from '@/stores/useChatStore';
import { ChatListRow } from '@/components/chat/ChatListRow';
import { ChatSearchBar } from '@/components/chat/ChatSearchBar';
import { ChatTabBar, type ChatTab } from '@/components/chat/ChatTabBar';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import type { ChatListItem } from '@/types/chat';

type ChatSection = { key: string; title: string; data: ChatListItem[] };

export function ChatListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const { chatList, loading, error, refreshing, handleRefresh } = useChatList();
  const { setChatList } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatTab>('all');

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

  function handleDelete(item: ChatListItem) {
    const userId = session?.user?.id;
    if (!userId) return;

    const message = item.type === 'group'
      ? `Leave "${item.title}"? You'll stop receiving messages from this group.`
      : `Remove "${item.title}" from your chat list?`;

    Alert.alert('Delete conversation', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: item.type === 'group' ? 'Leave' : 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Write to AsyncStorage first — local source of truth so refresh
          // can't race against the async Supabase upsert and restore the item.
          await AsyncStorage.setItem(`chat:hidden:${item.id}`, '1');
          // Optimistic remove
          setChatList(chatList.filter((c) => c.id !== item.id));

          if (item.type === 'group') {
            await supabase
              .from('group_channel_members')
              .delete()
              .eq('group_channel_id', item.id)
              .eq('user_id', userId);
          } else {
            await supabase.from('chat_preferences').upsert(
              { user_id: userId, chat_type: item.type, chat_id: item.id, is_hidden: true, updated_at: new Date().toISOString() },
              { onConflict: 'user_id,chat_type,chat_id' },
            );
          }
        },
      },
    ]);
  }

  async function handleMute(item: ChatListItem) {
    const userId = session?.user?.id;
    if (!userId) return;

    await AsyncStorage.setItem(`chat:muted:${item.id}`, '1');
    setChatList(chatList.map((c) =>
      c.id === item.id ? { ...c, isMuted: true, hasUnread: false, unreadCount: 0 } : c,
    ));

    await supabase.from('chat_preferences').upsert(
      { user_id: userId, chat_type: item.type, chat_id: item.id, is_muted: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,chat_type,chat_id' },
    );
  }

  function handleMarkRead(item: ChatListItem) {
    AsyncStorage.setItem(`chat:last_read:${item.id}`, new Date().toISOString());
    setChatList(
      chatList.map((c) =>
        c.id === item.id ? { ...c, hasUnread: false, unreadCount: 0 } : c,
      ),
    );
  }

  const filteredList = useMemo(() => {
    let items = chatList;

    if (activeTab === 'unread') {
      items = items.filter((i) => i.hasUnread);
    } else if (activeTab === 'groups') {
      items = items.filter((i) => i.type === 'plan' || i.type === 'group');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.lastMessage.toLowerCase().includes(q),
      );
    }

    return items;
  }, [chatList, activeTab, searchQuery]);

  const sections = useMemo((): ChatSection[] => {
    if (activeTab === 'groups') {
      return [
        {
          key: 'plans',
          title: 'Plans',
          data: filteredList.filter((i) => i.type === 'plan'),
        },
        {
          key: 'birthdays',
          title: 'Birthdays',
          data: filteredList.filter((i) => i.type === 'group' && !!i.birthdayPersonId),
        },
        {
          key: 'squads',
          title: 'Squads',
          data: filteredList.filter((i) => i.type === 'group' && !i.birthdayPersonId),
        },
      ].filter((s) => s.data.length > 0);
    }
    return filteredList.length > 0 ? [{ key: 'all', title: '', data: filteredList }] : [];
  }, [filteredList, activeTab]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    list: {
      flex: 1,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginLeft: 76,
    },
    emptyList: {
      flex: 1,
    },
    headerWrapper: {
      paddingTop: SPACING.sm,
      paddingHorizontal: SPACING.lg,
    },
    sectionHeader: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xs,
      backgroundColor: colors.surface.base,
    },
    sectionTitle: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      textTransform: 'uppercase',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      letterSpacing: 0.8,
    },
  }), [colors]);

  const listHeader = (
    <>
      <View style={styles.headerWrapper}>
        <ScreenHeader title="Chats" />
      </View>
      <ChatSearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <ChatTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );

  const emptyHeading = searchQuery ? 'No chats found' : 'No conversations yet';
  const emptyBody = searchQuery
    ? 'Try a different search term.'
    : "Start a DM from a friend's card, or create a plan to get a group chat going.";

  if (loading && chatList.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerWrapper}>
          <ScreenHeader title="Chats" />
        </View>
        <ChatSearchBar value="" onChangeText={() => {}} />
        <ChatTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {Array.from({ length: 5 }).map((_, i) => (
          <ChatSkeletonRow key={i} />
        ))}
      </View>
    );
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatListRow
            item={item}
            onPress={() => handleChatPress(item)}
            onMarkRead={() => handleMarkRead(item)}
            onMute={() => handleMute(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        renderSectionHeader={({ section }) =>
          activeTab === 'groups' && section.title ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          ) : null
        }
        stickySectionHeadersEnabled={activeTab === 'groups'}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.interactive.accent}
          />
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyList : undefined}
        style={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            iconType="ionicons"
            heading={emptyHeading}
            body={emptyBody}
          />
        }
      />
    </View>
  );
}

function ChatSkeletonRow() {
  return (
    <View
      style={{
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        gap: SPACING.md,
      }}
    >
      <SkeletonPulse width={48} height={48} />
      <View style={{ flex: 1, gap: SPACING.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonPulse width={160} height={14} />
          <SkeletonPulse width={32} height={12} />
        </View>
        <SkeletonPulse width="100%" height={12} />
      </View>
    </View>
  );
}
