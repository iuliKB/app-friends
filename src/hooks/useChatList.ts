import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import type { ChatListItem } from '@/types/chat';

const CACHE_TTL_MS = 30_000; // 30 seconds

export function useChatList(): {
  chatList: ChatListItem[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
} {
  const session = useAuthStore((s) => s.session);
  const { chatList, lastFetchedAt, setChatList } = useChatStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchChatList(): Promise<void> {
    if (!session?.user) return;

    setError(null);

    // Step A — Get the user's plan IDs
    const { data: memberRows } = await supabase
      .from('plan_members')
      .select('plan_id')
      .eq('user_id', session.user.id);
    const memberPlanIds = (memberRows ?? []).map((r) => r.plan_id as string);

    // Step B — Get the user's DM channel IDs + other user info
    const { data: dmRows } = await supabase
      .from('dm_channels')
      .select('id, user_a, user_b')
      .or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`);
    const dmChannels = (dmRows ?? []).map((r) => ({
      id: r.id as string,
      otherUserId: (r.user_a === session.user.id ? r.user_b : r.user_a) as string,
    }));

    // Step C — Fetch latest message per plan chat
    const planLatestMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
    if (memberPlanIds.length > 0) {
      const { data: planMsgs } = await supabase
        .from('messages')
        .select('plan_id, body, created_at, sender_id')
        .not('plan_id', 'is', null)
        .in('plan_id', memberPlanIds)
        .order('created_at', { ascending: false });

      for (const msg of planMsgs ?? []) {
        const pid = msg.plan_id as string;
        if (!planLatestMap.has(pid)) {
          planLatestMap.set(pid, {
            body: msg.body as string,
            created_at: msg.created_at as string,
            sender_id: msg.sender_id as string,
          });
        }
      }
    }

    // Step D — Fetch latest message per DM channel
    const dmLatestMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
    if (dmChannels.length > 0) {
      const dmIds = dmChannels.map((d) => d.id);
      const { data: dmMsgs } = await supabase
        .from('messages')
        .select('dm_channel_id, body, created_at, sender_id')
        .not('dm_channel_id', 'is', null)
        .in('dm_channel_id', dmIds)
        .order('created_at', { ascending: false });

      for (const msg of dmMsgs ?? []) {
        const cid = msg.dm_channel_id as string;
        if (!dmLatestMap.has(cid)) {
          dmLatestMap.set(cid, {
            body: msg.body as string,
            created_at: msg.created_at as string,
            sender_id: msg.sender_id as string,
          });
        }
      }
    }

    // Step E — Fetch plan titles for plan chats with messages
    const planIdsWithMessages = [...planLatestMap.keys()];
    const planTitleMap = new Map<string, string>();
    if (planIdsWithMessages.length > 0) {
      const { data: plans } = await supabase
        .from('plans')
        .select('id, title')
        .in('id', planIdsWithMessages);

      for (const plan of plans ?? []) {
        planTitleMap.set(plan.id as string, plan.title as string);
      }
    }

    // Step F — Fetch profiles for DM other users with messages
    const otherUserIds = dmChannels.filter((d) => dmLatestMap.has(d.id)).map((d) => d.otherUserId);
    const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', otherUserIds);

      for (const profile of profiles ?? []) {
        profileMap.set(profile.id as string, {
          display_name: profile.display_name as string,
          avatar_url: profile.avatar_url as string | null,
        });
      }
    }

    // Step G — Check unread status via AsyncStorage
    async function checkUnread(chatId: string, lastMessageAt: string): Promise<boolean> {
      const lastRead = await AsyncStorage.getItem(`chat:last_read:${chatId}`);
      if (!lastRead) return true;
      return lastMessageAt > lastRead;
    }

    // Step H — Build ChatListItem[]
    const items: ChatListItem[] = [];

    const currentUserId = session.user.id;

    // Plan chat items
    for (const [planId, latest] of planLatestMap.entries()) {
      const title = planTitleMap.get(planId);
      if (!title) continue;
      const hasUnread =
        latest.sender_id !== currentUserId && (await checkUnread(planId, latest.created_at));
      items.push({
        id: planId,
        type: 'plan',
        title,
        avatarUrl: null,
        lastMessage: latest.body,
        lastMessageAt: latest.created_at,
        hasUnread,
      });
    }

    // DM chat items
    for (const channel of dmChannels) {
      const latest = dmLatestMap.get(channel.id);
      if (!latest) continue;
      const profile = profileMap.get(channel.otherUserId);
      if (!profile) continue;
      const hasUnread =
        latest.sender_id !== currentUserId && (await checkUnread(channel.id, latest.created_at));
      items.push({
        id: channel.id,
        type: 'dm',
        title: profile.display_name,
        avatarUrl: profile.avatar_url,
        lastMessage: latest.body,
        lastMessageAt: latest.created_at,
        hasUnread,
      });
    }

    // Sort by lastMessageAt descending
    items.sort((a, b) => (a.lastMessageAt > b.lastMessageAt ? -1 : 1));

    setChatList(items);
  }

  const fetch = useCallback(async () => {
    if (!session?.user) return;

    // Serve from cache if recent enough
    if (
      chatList.length > 0 &&
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < CACHE_TTL_MS
    ) {
      return;
    }

    setLoading(true);
    try {
      await fetchChatList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetch();
    }, [fetch])
  );

  async function handleRefresh(): Promise<void> {
    if (!session?.user) return;
    setRefreshing(true);
    try {
      await fetchChatList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setRefreshing(false);
    }
  }

  return { chatList, loading, error, refreshing, handleRefresh };
}
