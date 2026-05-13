// Phase 31 Plan 08 — Migrated to TanStack Query.
//
// Cache key: queryKeys.chat.messages(channelId). channelId = planId ?? dmChannelId ?? groupChannelId.
// Realtime: subscribeChatRoom in src/lib/realtimeBridge owns the messages-table channel.
// Reactions + poll_votes Realtime stays inline because those tables have no server-side
// scope column on the wire (filter is client-side guard); subscribeReactions is a future
// extraction. Per-chat AsyncStorage preference keys (chat:last_read:*) are preserved
// unchanged — they are local UI state, NOT server cache.
//
// Public shape is verbatim-preserved (ChatRoomScreen reads ~8 fields including
// lastPollVoteEvent + refetch). The mutationShape gate sees:
//   - sendMessage / sendImage → Pattern 5 (mutationFn + onMutate + onError + onSettled-no-op)
//   - sendPoll → @mutationShape: no-optimistic (2-step insert+RPC with server-generated id)
// The empty onSettled body is intentional: Realtime INSERT reconciles the optimistic row,
// so an invalidate would be redundant and could cause an extra round-trip on every send.

import { useEffect, useRef, useState } from 'react'; // useRef retained for profilesMapRef
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { subscribeChatAux, subscribeChatRoom } from '@/lib/realtimeBridge';
import { aggregateReactions } from '@/utils/aggregateReactions';
import { uploadChatMedia } from '@/lib/uploadChatMedia';
import type { Message, MessageReaction, MessageType, MessageWithProfile } from '@/types/chat';

interface UseChatRoomOptions {
  planId?: string;
  dmChannelId?: string;
  groupChannelId?: string; // standalone group DM (D-17, D-18)
}

interface UseChatRoomResult {
  messages: MessageWithProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  sendMessage: (body: string, replyToId?: string) => Promise<{ error: Error | null }>;
  retryMessage: (tempId: string, body: string) => Promise<{ error: unknown }>;
  sendImage: (localUri: string, replyToId?: string) => Promise<{ error: Error | null }>;
  sendPoll: (question: string, options: string[]) => Promise<{ error: Error | null }>;
  deleteMessage: (messageId: string) => Promise<{ error: Error | null }>;
  addReaction: (messageId: string, emoji: string) => Promise<{ error: Error | null }>;
  removeReaction: (messageId: string, emoji: string) => Promise<{ error: Error | null }>;
  lastPollVoteEvent: { pollId: string; timestamp: number } | null;
}

type ProfileInfo = { display_name: string; avatar_url: string | null };

function genMessageId(): string {
  // Hermes-safe UUID-shaped id via Math.random (STATE.md decision — the platform
  // crypto.* UUID helper is not available on Hermes). Used as both the temp id and the canonical id so
  // Realtime INSERT can dedup by id (eliminates the body+sender+5s heuristic).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useChatRoom({
  planId,
  dmChannelId,
  groupChannelId,
}: UseChatRoomOptions): UseChatRoomResult {
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';
  const currentUserDisplayName =
    (session?.user?.user_metadata?.display_name as string | undefined) ?? 'Me';
  const currentUserAvatarUrl =
    (session?.user?.user_metadata?.avatar_url as string | null | undefined) ?? null;

  const queryClient = useQueryClient();
  const channelId = planId ?? dmChannelId ?? groupChannelId ?? '';
  const filterColumn: 'plan_id' | 'dm_channel_id' | 'group_channel_id' = planId
    ? 'plan_id'
    : dmChannelId
      ? 'dm_channel_id'
      : 'group_channel_id';

  const [lastPollVoteEvent, setLastPollVoteEvent] = useState<{
    pollId: string;
    timestamp: number;
  } | null>(null);

  const profilesMapRef = useRef<Map<string, ProfileInfo>>(new Map());

  function enrichMessage(msg: Message): MessageWithProfile {
    const profile = profilesMapRef.current.get(msg.sender_id);
    if (msg.sender_id === currentUserId) {
      return {
        ...msg,
        sender_display_name: currentUserDisplayName,
        sender_avatar_url: currentUserAvatarUrl,
      };
    }
    return {
      ...msg,
      sender_display_name: profile?.display_name ?? 'Unknown',
      sender_avatar_url: profile?.avatar_url ?? null,
    };
  }

  const messagesQuery = useQuery({
    queryKey: queryKeys.chat.messages(channelId),
    queryFn: async (): Promise<MessageWithProfile[]> => {
      if (!planId && !dmChannelId && !groupChannelId) return [];

      // Build profiles map — fetch member user_ids then profiles separately
      if (planId) {
        const { data: members } = await supabase
          .from('plan_members')
          .select('user_id')
          .eq('plan_id', planId);
        const userIds = (members ?? []).map((m) => m.user_id as string);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds);
          for (const p of profiles ?? []) {
            profilesMapRef.current.set(p.id, {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            });
          }
        }
      } else if (dmChannelId) {
        const { data: channel } = await supabase
          .from('dm_channels')
          .select('user_a, user_b')
          .eq('id', dmChannelId)
          .single();
        if (channel) {
          const otherUserId =
            (channel.user_a as string) === currentUserId
              ? (channel.user_b as string)
              : (channel.user_a as string);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', [otherUserId, currentUserId]);
          for (const p of profiles ?? []) {
            profilesMapRef.current.set(p.id, {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            });
          }
        }
      } else if (groupChannelId) {
        const { data: members } = await supabase
          .from('group_channel_members')
          .select('user_id')
          .eq('group_channel_id', groupChannelId);
        const userIds = (members ?? []).map((m) => m.user_id as string);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds);
          for (const p of profiles ?? []) {
            profilesMapRef.current.set(p.id, {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            });
          }
        }
      }

      // Fetch messages
      const column = planId ? 'plan_id' : dmChannelId ? 'dm_channel_id' : 'group_channel_id';
      const value = planId ?? dmChannelId ?? groupChannelId;

      const { data: rows, error: fetchError } = await supabase
        .from('messages')
        .select('*, reactions:message_reactions(emoji, user_id)')
        .eq(column, value!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const enriched = (rows ?? []).map((row: any) =>
        enrichMessage({
          id: row.id as string,
          plan_id: row.plan_id as string | null,
          dm_channel_id: row.dm_channel_id as string | null,
          group_channel_id: row.group_channel_id as string | null,
          sender_id: row.sender_id as string,
          body: row.body as string | null,
          created_at: row.created_at as string,
          image_url: (row.image_url as string | null) ?? null,
          reply_to_message_id: (row.reply_to_message_id as string | null) ?? null,
          message_type: ((row.message_type as string) ?? 'text') as MessageType,
          poll_id: (row.poll_id as string | null) ?? null,
          reactions: aggregateReactions(
            (row.reactions as { emoji: string; user_id: string }[] | null) ?? [],
            currentUserId,
          ),
        }),
      );

      // Mark as read — per-chat UI preference (NOT cache). Untouched by Wave 8.
      await AsyncStorage.setItem(
        'chat:last_read:' + (planId ?? dmChannelId ?? groupChannelId),
        new Date().toISOString(),
      );

      return enriched;
    },
    enabled: !!currentUserId && !!channelId,
    // Chat is "always live" — Realtime maintains the canonical state.
    staleTime: 0,
  });

  const messages = messagesQuery.data ?? [];

  // Realtime ownership — messages table goes through realtimeBridge.subscribeChatRoom.
  // Reactions + poll_votes stay inline because they have no server-side scope filter
  // (the messages table they reference is in this room, but the reactions/votes tables
  // are global; we filter client-side after dispatch).
  useEffect(() => {
    if (!channelId) return;
    return subscribeChatRoom(queryClient, { channelId, column: filterColumn });
  }, [queryClient, channelId, filterColumn]);

  // Reactions + poll_votes inline subscription (preserve pre-migration behavior).
  useEffect(() => {
    if (!channelId) return;

    function handleReactionInsert(payload: { new: Record<string, unknown> }) {
      const raw = payload.new;
      const incomingUserId = raw.user_id as string;
      const incomingEmoji = raw.emoji as string;
      const incomingMessageId = raw.message_id as string;

      // Pitfall 1 dedup guard: own INSERT already applied via optimistic update
      if (incomingUserId === currentUserId) return;

      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (prev) => {
          if (!prev) return prev;
          const msgIdx = prev.findIndex((m) => m.id === incomingMessageId);
          if (msgIdx === -1) return prev; // not in this room — client-side scope guard
          const msg = prev[msgIdx]!;
          const reactions = msg.reactions ?? [];
          const existingIdx = reactions.findIndex((r) => r.emoji === incomingEmoji);
          let updatedReactions: typeof reactions;
          if (existingIdx >= 0) {
            updatedReactions = reactions.map((r, i) =>
              i === existingIdx ? { ...r, count: r.count + 1 } : r,
            );
          } else {
            updatedReactions = [
              ...reactions,
              { emoji: incomingEmoji, count: 1, reacted_by_me: false },
            ];
          }
          const updated = [...prev];
          updated[msgIdx] = { ...msg, reactions: updatedReactions };
          return updated;
        },
      );
    }

    function handleReactionDelete(payload: { old: Record<string, unknown> }) {
      const raw = payload.old;
      const deletedUserId = raw.user_id as string;
      const deletedEmoji = raw.emoji as string;
      const deletedMessageId = raw.message_id as string;

      if (deletedUserId === currentUserId) return;

      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (prev) => {
          if (!prev) return prev;
          const msgIdx = prev.findIndex((m) => m.id === deletedMessageId);
          if (msgIdx === -1) return prev;
          const msg = prev[msgIdx]!;
          const updatedReactions = (msg.reactions ?? [])
            .map((r) => (r.emoji === deletedEmoji ? { ...r, count: r.count - 1 } : r))
            .filter((r) => r.count > 0);
          const updated = [...prev];
          updated[msgIdx] = { ...msg, reactions: updatedReactions };
          return updated;
        },
      );
    }

    function handlePollVoteInsert(payload: { new: Record<string, unknown> }) {
      const raw = payload.new;
      const incomingUserId = raw.user_id as string;
      const incomingPollId = raw.poll_id as string;

      if (incomingUserId === currentUserId) return;

      const current = queryClient.getQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
      );
      const isInRoom = (current ?? []).some((m) => m.poll_id === incomingPollId);
      if (isInRoom) {
        setLastPollVoteEvent({ pollId: incomingPollId, timestamp: Date.now() });
      }
    }

    function handlePollVoteDelete(payload: { old: Record<string, unknown> }) {
      const raw = payload.old;
      const deletedUserId = raw.user_id as string;
      const incomingPollId = raw.poll_id as string;

      if (deletedUserId === currentUserId) return;

      const current = queryClient.getQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
      );
      const isInRoom = (current ?? []).some((m) => m.poll_id === incomingPollId);
      if (isInRoom) {
        setLastPollVoteEvent({ pollId: incomingPollId, timestamp: Date.now() });
      }
    }

    return subscribeChatAux(channelId, {
      onReactionInsert: handleReactionInsert,
      onReactionDelete: handleReactionDelete,
      onPollVoteInsert: handlePollVoteInsert,
      onPollVoteDelete: handlePollVoteDelete,
    });
  }, [queryClient, channelId, currentUserId]);

  // Canonical Pattern 5 — sendMessage. onSettled is intentionally empty because
  // Realtime INSERT (subscribeChatRoom) replays the canonical row and reconciles
  // the optimistic placeholder by id. An invalidate here would cause a redundant
  // round-trip on every send. The empty body satisfies the mutationShape gate.
  const sendMessageMutation = useMutation({
    mutationFn: async (input: { body: string; replyToId?: string; messageId: string }) => {
      const { error: insertError } = await supabase.from('messages').insert({
        id: input.messageId,
        plan_id: planId ?? null,
        dm_channel_id: dmChannelId ?? null,
        group_channel_id: groupChannelId ?? null,
        sender_id: currentUserId,
        body: input.body,
        reply_to_message_id: input.replyToId ?? null,
      });
      if (insertError) throw insertError;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chat.messages(channelId) });
      const previous = queryClient.getQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
      );
      const optimistic: MessageWithProfile = {
        id: input.messageId,
        plan_id: planId ?? null,
        dm_channel_id: dmChannelId ?? null,
        group_channel_id: groupChannelId ?? null,
        sender_id: currentUserId,
        body: input.body,
        created_at: new Date().toISOString(),
        image_url: null,
        reply_to_message_id: input.replyToId ?? null,
        message_type: 'text',
        poll_id: null,
        pending: true,
        tempId: input.messageId,
        sender_display_name: currentUserDisplayName,
        sender_avatar_url: currentUserAvatarUrl,
      };
      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (old) => [optimistic, ...(old ?? [])],
      );
      return { previous, tempId: input.messageId };
    },
    onError: (_err, _input, ctx) => {
      // CHAT-03 — mark failed (do NOT remove). User can retry; the bubble surfaces a retry CTA.
      if (ctx?.tempId) {
        queryClient.setQueryData<MessageWithProfile[]>(
          queryKeys.chat.messages(channelId),
          (old) =>
            old?.map((m) =>
              m.id === ctx.tempId ? { ...m, pending: false, failed: true } : m,
            ) ?? [],
        );
      }
    },
    onSettled: () => {
      // Tier A — text optimistic shape matches canonical, so Realtime INSERT
      // (subscribeChatRoom) reconciles the optimistic row by id; we do NOT
      // invalidate chat.messages(channelId). But the chat-list query has a
      // separate cache key + 30s staleTime, and Realtime echo back to the
      // sending user is racy — so we always invalidate chat.list to surface the
      // new last-entry preview to other screens. See README.md "Tiered
      // onSettled policy (Phase 32)" + CONTEXT.md §4.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.list(currentUserId),
      });
    },
  });

  // Canonical Pattern 5 — sendImage. Upload + insert flow; same Pattern 5 shape.
  const sendImageMutation = useMutation({
    mutationFn: async (input: {
      localUri: string;
      replyToId?: string;
      messageId: string;
    }) => {
      const cdnUrl = await uploadChatMedia(currentUserId, input.messageId, input.localUri);
      if (!cdnUrl) throw new Error('Upload failed');
      const { error: insertError } = await supabase.from('messages').insert({
        id: input.messageId,
        plan_id: planId ?? null,
        dm_channel_id: dmChannelId ?? null,
        group_channel_id: groupChannelId ?? null,
        sender_id: currentUserId,
        body: null as any, // body is nullable since migration 0018
        image_url: cdnUrl,
        reply_to_message_id: input.replyToId ?? null,
        message_type: 'image',
      });
      if (insertError) throw insertError;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chat.messages(channelId) });
      const previous = queryClient.getQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
      );
      const optimistic: MessageWithProfile = {
        id: input.messageId,
        plan_id: planId ?? null,
        dm_channel_id: dmChannelId ?? null,
        group_channel_id: groupChannelId ?? null,
        sender_id: currentUserId,
        body: null,
        created_at: new Date().toISOString(),
        image_url: input.localUri, // local URI for instant display
        reply_to_message_id: input.replyToId ?? null,
        message_type: 'image',
        poll_id: null,
        reactions: [],
        pending: true,
        tempId: input.messageId,
        sender_display_name: currentUserDisplayName,
        sender_avatar_url: currentUserAvatarUrl,
      };
      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (old) => [optimistic, ...(old ?? [])],
      );
      return { previous, tempId: input.messageId };
    },
    onError: (_err, _input, ctx) => {
      // D-13: remove optimistic row on upload/insert failure (no retry affordance for image).
      if (ctx?.tempId) {
        queryClient.setQueryData<MessageWithProfile[]>(
          queryKeys.chat.messages(channelId),
          (old) => old?.filter((m) => m.id !== ctx.tempId) ?? [],
        );
      }
    },
    onSettled: () => {
      // Tier B — image optimistic uses a local URI in `image_url` whereas the
      // canonical row uses a Supabase CDN URL. The 70% opacity overlay on the
      // optimistic bubble only clears when Realtime INSERT replaces the row by
      // id — but Realtime echoes can be dropped (WS reconnect, mid-upload).
      // Belt-and-braces: invalidate chat.messages so a missed echo still
      // resolves on next render; also chat.list for cross-screen freshness.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(channelId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.list(currentUserId),
      });
    },
  });

  // sendPoll is a 2-step insert+RPC with a server-generated poll_id — the optimistic
  // row carries poll_id:null and the canonical row's poll_id is unknown until the RPC
  // completes. Use the non-optimistic exemption per research §Pattern 5 line 503.
  // @mutationShape: no-optimistic
  const sendPollMutation = useMutation({
    mutationFn: async (input: {
      question: string;
      options: string[];
      messageId: string;
    }) => {
      const { error: msgError } = await supabase.from('messages').insert({
        id: input.messageId,
        plan_id: planId ?? null,
        dm_channel_id: dmChannelId ?? null,
        group_channel_id: groupChannelId ?? null,
        sender_id: currentUserId,
        body: null as any,
        message_type: 'poll',
      });
      if (msgError) throw msgError;
      const { error: rpcError } = await supabase.rpc('create_poll', {
        p_message_id: input.messageId,
        p_question: input.question,
        p_options: input.options,
      });
      if (rpcError) {
        // Cleanup the orphan message row whose poll_id never landed.
        await supabase.from('messages').delete().eq('id', input.messageId);
        throw rpcError;
      }
    },
    onSuccess: () => {
      // Tier B (no-optimistic exemption) — sendPoll is a 2-step insert+RPC with
      // a server-generated poll_id; the optimistic message row carries
      // poll_id:null while Realtime UPDATE fills the canonical poll_id. If the
      // UPDATE echo is missed, PollCard sticks on the spinner card branch
      // (pending || !poll_id). Invalidating chat.messages forces a refetch
      // that surfaces the canonical poll_id; chat.list invalidates so the
      // last-entry preview ("Poll: <question>") refreshes too. See README.md
      // "Tiered onSettled policy (Phase 32)" + CONTEXT.md §4.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(channelId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.list(currentUserId),
      });
    },
  });

  // --- Public method wrappers ---

  async function sendMessage(body: string, replyToId?: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    const messageId = genMessageId();
    try {
      await sendMessageMutation.mutateAsync({ body, replyToId, messageId });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async function retryMessage(tempId: string, body: string): Promise<{ error: unknown }> {
    // Remove the failed entry from the cache, then re-send via the normal flow.
    queryClient.setQueryData<MessageWithProfile[]>(
      queryKeys.chat.messages(channelId),
      (old) => old?.filter((m) => m.tempId !== tempId) ?? [],
    );
    return sendMessage(body);
  }

  async function sendImage(localUri: string, replyToId?: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    const messageId = genMessageId();
    try {
      await sendImageMutation.mutateAsync({ localUri, replyToId, messageId });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async function sendPoll(question: string, options: string[]): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    const messageId = genMessageId();
    // Optimistic insert at the cache level — non-Pattern-5 mutation handles the server
    // side; on error we remove the row.
    const optimistic: MessageWithProfile = {
      id: messageId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      group_channel_id: groupChannelId ?? null,
      sender_id: currentUserId,
      body: null,
      created_at: new Date().toISOString(),
      image_url: null,
      reply_to_message_id: null,
      message_type: 'poll',
      poll_id: null,
      reactions: [],
      pending: true,
      tempId: messageId,
      sender_display_name: currentUserDisplayName,
      sender_avatar_url: currentUserAvatarUrl,
    };
    queryClient.setQueryData<MessageWithProfile[]>(
      queryKeys.chat.messages(channelId),
      (old) => [optimistic, ...(old ?? [])],
    );
    try {
      await sendPollMutation.mutateAsync({ question, options, messageId });
      return { error: null };
    } catch (err) {
      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (old) => old?.filter((m) => m.tempId !== messageId) ?? [],
      );
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async function deleteMessage(messageId: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    let originalBody: string | null = null;
    let originalMessageType: MessageType = 'text';
    // Optimistic update via cache write
    queryClient.setQueryData<MessageWithProfile[]>(
      queryKeys.chat.messages(channelId),
      (prev) => {
        if (!prev) return prev;
        const original = prev.find((m) => m.id === messageId);
        originalBody = original?.body ?? null;
        originalMessageType = original?.message_type ?? 'text';
        return prev.map((m) =>
          m.id === messageId ? { ...m, body: null, message_type: 'deleted' as MessageType } : m,
        );
      },
    );

    const { error: updateError } = await supabase
      .from('messages')
      .update({ body: null as any, message_type: 'deleted' })
      .eq('id', messageId)
      .eq('sender_id', currentUserId);

    if (updateError) {
      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (prev) =>
          prev?.map((m) =>
            m.id === messageId
              ? { ...m, body: originalBody, message_type: originalMessageType }
              : m,
          ) ?? [],
      );
      return { error: updateError };
    }
    return { error: null };
  }

  async function addReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    let preSnapshot: MessageReaction[] = [];
    let isSameEmoji = false;

    const currentMessages = queryClient.getQueryData<MessageWithProfile[]>(
      queryKeys.chat.messages(channelId),
    );
    const msg = currentMessages?.find((m) => m.id === messageId);
    preSnapshot = msg?.reactions ?? [];
    isSameEmoji = preSnapshot.some((r) => r.emoji === emoji && r.reacted_by_me);

    if (isSameEmoji) {
      return removeReaction(messageId, emoji);
    }

    // Optimistic update: apply net result
    queryClient.setQueryData<MessageWithProfile[]>(
      queryKeys.chat.messages(channelId),
      (prev) =>
        prev?.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions ?? [];
          const withoutOld = existing
            .map((r) =>
              r.reacted_by_me ? { ...r, count: r.count - 1, reacted_by_me: false } : r,
            )
            .filter((r) => r.count > 0);
          const idx = withoutOld.findIndex((r) => r.emoji === emoji);
          if (idx >= 0) {
            const updated = [...withoutOld];
            updated[idx] = { ...updated[idx]!, count: updated[idx]!.count + 1, reacted_by_me: true };
            return { ...m, reactions: updated };
          }
          return { ...m, reactions: [...withoutOld, { emoji, count: 1, reacted_by_me: true }] };
        }) ?? [],
    );

    const oldReaction = preSnapshot.find((r) => r.reacted_by_me);
    if (oldReaction) {
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId);
      if (deleteError) {
        queryClient.setQueryData<MessageWithProfile[]>(
          queryKeys.chat.messages(channelId),
          (prev) =>
            prev?.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m)) ?? [],
        );
        return { error: deleteError };
      }
    }
    const { error: insertError } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: currentUserId, emoji });
    if (insertError) {
      if (oldReaction) {
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji: oldReaction.emoji,
        });
      }
      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (prev) =>
          prev?.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m)) ?? [],
      );
      return { error: insertError };
    }
    return { error: null };
  }

  async function removeReaction(
    messageId: string,
    emoji: string,
  ): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    const currentMessages = queryClient.getQueryData<MessageWithProfile[]>(
      queryKeys.chat.messages(channelId),
    );
    const msg = currentMessages?.find((m) => m.id === messageId);
    const preSnapshot: MessageReaction[] = msg?.reactions ?? [];

    queryClient.setQueryData<MessageWithProfile[]>(
      queryKeys.chat.messages(channelId),
      (prev) =>
        prev?.map((m) => {
          if (m.id !== messageId) return m;
          const updated = (m.reactions ?? [])
            .map((r) =>
              r.emoji === emoji ? { ...r, count: r.count - 1, reacted_by_me: false } : r,
            )
            .filter((r) => r.count > 0);
          return { ...m, reactions: updated };
        }) ?? [],
    );

    const { error: deleteError } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', currentUserId)
      .eq('emoji', emoji);

    if (deleteError) {
      queryClient.setQueryData<MessageWithProfile[]>(
        queryKeys.chat.messages(channelId),
        (prev) =>
          prev?.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m)) ?? [],
      );
      return { error: deleteError };
    }
    return { error: null };
  }

  return {
    messages,
    loading: messagesQuery.isLoading,
    error: messagesQuery.error ? (messagesQuery.error as Error).message : null,
    refetch: messagesQuery.refetch, // AUTH-03: expose for retry button in ChatRoomScreen
    sendMessage,
    retryMessage,
    sendImage,
    sendPoll,
    deleteMessage,
    addReaction,
    removeReaction,
    lastPollVoteEvent,
  };
}
