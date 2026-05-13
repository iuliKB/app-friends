// Phase 31 Plan 08 — useChatList migrated to TanStack Query.
//
// Cache key: queryKeys.chat.list(userId).
// staleTime: 30s (overrides the 60s global default — chat list changes more often than
// most surfaces, especially when a friend opens a new DM with you).
//
// Per-chat preference AsyncStorage keys (chat:last_read:*, chat:hidden:*, chat:muted:*,
// chat:rooms:cache) are UNTOUCHED — those are UI preferences, not server cache.
// useChatStore server-data fields are removed in the same commit.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import type { ChatListItem, MessageType } from '@/types/chat';

type MsgEntry = {
  body: string | null;
  created_at: string;
  sender_id: string;
  message_type: MessageType;
  image_url: string | null;
  poll_id: string | null;
};

function previewForLatest(
  latest: MsgEntry,
  pollQuestionMap: Map<string, string>,
): string {
  switch (latest.message_type) {
    case 'image':
      return 'Photo';
    case 'poll': {
      const q = latest.poll_id ? pollQuestionMap.get(latest.poll_id) : null;
      return q ? `Poll: ${q}` : 'Poll';
    }
    case 'todo': {
      const body = (latest.body ?? '').trim();
      return body ? `To-do: ${body}` : 'To-do';
    }
    case 'deleted':
      return 'Message deleted';
    case 'text':
    case 'system':
    default:
      return latest.body ?? '';
  }
}

function senderNameForLatest(
  latest: MsgEntry,
  currentUserId: string,
  firstNameMap: Map<string, string | null>,
): string | null {
  if (latest.sender_id === currentUserId) return 'You';
  return firstNameMap.get(latest.sender_id) ?? null;
}

async function getUnreadInfo(
  chatId: string,
  msgs: MsgEntry[],
  currentUserId: string,
): Promise<{ hasUnread: boolean; unreadCount: number }> {
  const latest = msgs[0];
  if (!latest || latest.sender_id === currentUserId) return { hasUnread: false, unreadCount: 0 };
  const lastRead = await AsyncStorage.getItem(`chat:last_read:${chatId}`);
  const hasUnread = !lastRead || latest.created_at > lastRead;
  if (!hasUnread) return { hasUnread: false, unreadCount: 0 };
  const unreadCount = msgs.filter(
    (m) => m.sender_id !== currentUserId && (!lastRead || m.created_at > lastRead),
  ).length;
  return { hasUnread: true, unreadCount };
}

async function fetchChatList(currentUserId: string): Promise<ChatListItem[]> {
  // Step A — Get the user's plan IDs
  const { data: memberRows } = await supabase
    .from('plan_members')
    .select('plan_id')
    .eq('user_id', currentUserId);
  const memberPlanIds = (memberRows ?? []).map((r) => r.plan_id as string);

  // Step B — Get the user's DM channel IDs + other user info
  const { data: dmRows } = await supabase
    .from('dm_channels')
    .select('id, user_a, user_b')
    .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);
  const dmChannels = (dmRows ?? []).map((r) => ({
    id: r.id as string,
    otherUserId: (r.user_a === currentUserId ? r.user_b : r.user_a) as string,
  }));

  // Step C — Fetch all messages per plan chat (sorted desc; [0] = latest)
  const planMsgsMap = new Map<string, MsgEntry[]>();
  if (memberPlanIds.length > 0) {
    const { data: planMsgs } = await supabase
      .from('messages')
      .select('plan_id, body, created_at, sender_id, message_type, image_url, poll_id')
      .not('plan_id', 'is', null)
      .in('plan_id', memberPlanIds)
      .order('created_at', { ascending: false });

    for (const msg of planMsgs ?? []) {
      const pid = msg.plan_id as string;
      if (!planMsgsMap.has(pid)) planMsgsMap.set(pid, []);
      planMsgsMap.get(pid)!.push({
        body: (msg.body as string | null) ?? null,
        created_at: msg.created_at as string,
        sender_id: msg.sender_id as string,
        message_type: msg.message_type as MessageType,
        image_url: (msg.image_url as string | null) ?? null,
        poll_id: (msg.poll_id as string | null) ?? null,
      });
    }
  }

  // Step D — Fetch all messages per DM channel (sorted desc; [0] = latest)
  const dmMsgsMap = new Map<string, MsgEntry[]>();
  if (dmChannels.length > 0) {
    const dmIds = dmChannels.map((d) => d.id);
    const { data: dmMsgs } = await supabase
      .from('messages')
      .select('dm_channel_id, body, created_at, sender_id, message_type, image_url, poll_id')
      .not('dm_channel_id', 'is', null)
      .in('dm_channel_id', dmIds)
      .order('created_at', { ascending: false });

    for (const msg of dmMsgs ?? []) {
      const cid = msg.dm_channel_id as string;
      if (!dmMsgsMap.has(cid)) dmMsgsMap.set(cid, []);
      dmMsgsMap.get(cid)!.push({
        body: (msg.body as string | null) ?? null,
        created_at: msg.created_at as string,
        sender_id: msg.sender_id as string,
        message_type: msg.message_type as MessageType,
        image_url: (msg.image_url as string | null) ?? null,
        poll_id: (msg.poll_id as string | null) ?? null,
      });
    }
  }

  // Step E — Fetch plan titles for plan chats with messages
  const planIdsWithMessages = [...planMsgsMap.keys()];
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
  const otherUserIds = dmChannels.filter((d) => dmMsgsMap.has(d.id)).map((d) => d.otherUserId);
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

  // Step E2 — Get the user's group channel IDs + names
  const { data: groupMemberRows } = await supabase
    .from('group_channel_members')
    .select('group_channel_id')
    .eq('user_id', currentUserId);
  const groupChannelIds = (groupMemberRows ?? []).map((r) => r.group_channel_id as string);

  const groupNameMap = new Map<string, string>();
  const groupBirthdayPersonMap = new Map<string, string | null>();
  if (groupChannelIds.length > 0) {
    const { data: groupRows } = await supabase
      .from('group_channels')
      .select('id, name, birthday_person_id')
      .in('id', groupChannelIds);
    for (const g of groupRows ?? []) {
      groupNameMap.set(g.id as string, g.name as string);
      groupBirthdayPersonMap.set(g.id as string, (g.birthday_person_id as string | null) ?? null);
    }
  }

  // Step F2 — Fetch all messages per group channel (sorted desc; [0] = latest)
  const groupMsgsMap = new Map<string, MsgEntry[]>();
  if (groupChannelIds.length > 0) {
    const { data: groupMsgs } = await supabase
      .from('messages')
      .select('group_channel_id, body, created_at, sender_id, message_type, image_url, poll_id')
      .not('group_channel_id', 'is', null)
      .in('group_channel_id', groupChannelIds)
      .order('created_at', { ascending: false });

    for (const msg of groupMsgs ?? []) {
      const cid = msg.group_channel_id as string;
      if (!groupMsgsMap.has(cid)) groupMsgsMap.set(cid, []);
      groupMsgsMap.get(cid)!.push({
        body: (msg.body as string | null) ?? null,
        created_at: msg.created_at as string,
        sender_id: msg.sender_id as string,
        message_type: msg.message_type as MessageType,
        image_url: (msg.image_url as string | null) ?? null,
        poll_id: (msg.poll_id as string | null) ?? null,
      });
    }
  }

  // Step F1 — Resolve first-name token for every latest-message sender across all chats.
  // Schema note: the profiles table has display_name (full name) but no dedicated
  // first_name column (CONTEXT.md §3 referenced first_name but migrations 0001 + 0017
  // only ship display_name). To honour CONTEXT.md's "<FirstName>: " UX without a
  // schema change we batch-fetch display_name and derive the first token client-side.
  // Empty / whitespace-only display_name falls back to null (same as a missing row).
  const allSenderIds = new Set<string>();
  for (const msgs of planMsgsMap.values()) {
    if (msgs[0]) allSenderIds.add(msgs[0].sender_id);
  }
  for (const msgs of dmMsgsMap.values()) {
    if (msgs[0]) allSenderIds.add(msgs[0].sender_id);
  }
  for (const msgs of groupMsgsMap.values()) {
    if (msgs[0]) allSenderIds.add(msgs[0].sender_id);
  }
  allSenderIds.delete(currentUserId); // own messages get "You" in the formatter; no fetch needed

  const firstNameMap = new Map<string, string | null>();
  if (allSenderIds.size > 0) {
    const { data: senderProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', [...allSenderIds]);
    for (const p of senderProfiles ?? []) {
      const id = p.id as string;
      const displayName = (p.display_name as string | null) ?? null;
      const firstToken = displayName ? displayName.trim().split(/\s+/)[0] ?? '' : '';
      firstNameMap.set(id, firstToken.length > 0 ? firstToken : null);
    }
  }

  // Step F2 — Resolve poll question for chats whose latest message is a poll.
  const pollIdsForPreview = new Set<string>();
  function collectLatestPollId(msgs: MsgEntry[] | undefined) {
    const latest = msgs?.[0];
    if (latest && latest.message_type === 'poll' && latest.poll_id) {
      pollIdsForPreview.add(latest.poll_id);
    }
  }
  for (const msgs of planMsgsMap.values()) collectLatestPollId(msgs);
  for (const msgs of dmMsgsMap.values()) collectLatestPollId(msgs);
  for (const msgs of groupMsgsMap.values()) collectLatestPollId(msgs);

  const pollQuestionMap = new Map<string, string>();
  if (pollIdsForPreview.size > 0) {
    // (supabase as any) cast: the generated Database types in src/types/database.ts
    // do not yet include the polls table (regeneration deferred — see Phase 29.1
    // Plan 05 SUMMARY). Same pattern as usePoll.ts uses today.
    const { data: pollRows } = await (supabase as any)
      .from('polls')
      .select('id, question')
      .in('id', [...pollIdsForPreview]);
    for (const p of (pollRows ?? []) as Array<{ id: string; question: string }>) {
      pollQuestionMap.set(p.id, p.question);
    }
  }

  // Step H — Build ChatListItem[]
  const items: ChatListItem[] = [];

  // Plan chat items
  for (const [planId, msgs] of planMsgsMap.entries()) {
    const title = planTitleMap.get(planId);
    if (!title) continue;
    const latest = msgs[0];
    if (!latest) continue;
    const { hasUnread, unreadCount } = await getUnreadInfo(planId, msgs, currentUserId);
    items.push({
      id: planId,
      type: 'plan',
      title,
      avatarUrl: null,
      lastMessage: previewForLatest(latest, pollQuestionMap),
      lastMessageAt: latest.created_at,
      lastMessageKind: latest.message_type,
      lastMessageSenderName: senderNameForLatest(latest, currentUserId, firstNameMap),
      hasUnread,
      unreadCount,
      isMuted: false,
    });
  }

  // DM chat items
  for (const channel of dmChannels) {
    const msgs = dmMsgsMap.get(channel.id);
    if (!msgs || msgs.length === 0) continue;
    const profile = profileMap.get(channel.otherUserId);
    if (!profile) continue;
    const latest = msgs[0];
    if (!latest) continue;
    const { hasUnread, unreadCount } = await getUnreadInfo(channel.id, msgs, currentUserId);
    items.push({
      id: channel.id,
      type: 'dm',
      title: profile.display_name,
      avatarUrl: profile.avatar_url,
      lastMessage: previewForLatest(latest, pollQuestionMap),
      lastMessageAt: latest.created_at,
      lastMessageKind: latest.message_type,
      lastMessageSenderName: senderNameForLatest(latest, currentUserId, firstNameMap),
      hasUnread,
      unreadCount,
      isMuted: false,
    });
  }

  // Group chat items (show even without messages so newly created chats appear)
  for (const channelId of groupChannelIds) {
    const name = groupNameMap.get(channelId);
    if (!name) continue;
    const msgs = groupMsgsMap.get(channelId) ?? [];
    const latest = msgs[0];
    const { hasUnread, unreadCount } = await getUnreadInfo(channelId, msgs, currentUserId);
    items.push({
      id: channelId,
      type: 'group',
      title: name,
      avatarUrl: null,
      lastMessage: latest ? previewForLatest(latest, pollQuestionMap) : 'No messages yet',
      lastMessageAt: latest?.created_at ?? new Date(0).toISOString(),
      lastMessageKind: (latest?.message_type ?? 'text') as MessageType,
      lastMessageSenderName: latest
        ? senderNameForLatest(latest, currentUserId, firstNameMap)
        : null,
      hasUnread,
      unreadCount,
      isMuted: false,
      birthdayPersonId: groupBirthdayPersonMap.get(channelId) ?? null,
    });
  }

  // Sort by lastMessageAt descending
  items.sort((a, b) => (a.lastMessageAt > b.lastMessageAt ? -1 : 1));

  // Step I — Fetch chat_preferences and apply mute/hide
  const { data: prefRows } = await supabase
    .from('chat_preferences')
    .select('chat_type, chat_id, is_muted, is_hidden')
    .eq('user_id', currentUserId);

  const prefMap = new Map<string, { is_muted: boolean; is_hidden: boolean }>();
  for (const p of prefRows ?? []) {
    prefMap.set(`${p.chat_type}:${p.chat_id}`, {
      is_muted: p.is_muted as boolean,
      is_hidden: p.is_hidden as boolean,
    });
  }

  // Also check AsyncStorage for locally-hidden/muted chats (guards against race
  // conditions where the user refreshes before the Supabase upsert completes).
  const [hiddenChecks, mutedChecks] = await Promise.all([
    Promise.all(items.map((item) => AsyncStorage.getItem(`chat:hidden:${item.id}`))),
    Promise.all(items.map((item) => AsyncStorage.getItem(`chat:muted:${item.id}`))),
  ]);

  const finalItems: ChatListItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const pref = prefMap.get(`${item.type}:${item.id}`);
    if (pref?.is_hidden || hiddenChecks[i]) continue;
    const isMuted = !!(pref?.is_muted || mutedChecks[i]);
    if (isMuted) {
      finalItems.push({ ...item, isMuted: true, hasUnread: false, unreadCount: 0 });
    } else {
      finalItems.push(item);
    }
  }

  return finalItems;
}

export interface UseChatListResult {
  chatList: ChatListItem[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  refetch: () => Promise<unknown>;
}

export function useChatList(): UseChatListResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.chat.list(userId ?? ''),
    queryFn: async (): Promise<ChatListItem[]> => {
      if (!userId) return [];
      return fetchChatList(userId);
    },
    enabled: !!userId,
    // Chat list changes more often than most surfaces (e.g. when a friend opens
    // a new DM). 30s replaces the pre-migration hand-rolled TTL constant.
    staleTime: 30_000,
  });

  return {
    chatList: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refreshing: query.isFetching && !query.isLoading,
    handleRefresh: async () => {
      await query.refetch();
    },
    refetch: query.refetch,
  };
}
