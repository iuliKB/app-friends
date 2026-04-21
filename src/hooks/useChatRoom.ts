import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
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
  sendMessage: (body: string, replyToId?: string) => Promise<{ error: Error | null }>;
  sendImage: (localUri: string, replyToId?: string) => Promise<{ error: Error | null }>;
  sendPoll: (question: string, options: string[]) => Promise<{ error: Error | null }>;
  deleteMessage: (messageId: string) => Promise<{ error: Error | null }>;
  addReaction: (messageId: string, emoji: string) => Promise<{ error: Error | null }>;
  removeReaction: (messageId: string, emoji: string) => Promise<{ error: Error | null }>;
  lastPollVoteEvent: { pollId: string; timestamp: number } | null;
}

type ProfileInfo = { display_name: string; avatar_url: string | null };

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

  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPollVoteEvent, setLastPollVoteEvent] = useState<{
    pollId: string;
    timestamp: number;
  } | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
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

  async function fetchMessages() {
    if (!planId && !dmChannelId && !groupChannelId) return;

    setLoading(true);
    setError(null);

    try {
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
        // For DMs, fetch the other user's profile
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

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      // Keep newest-first order — inverted FlatList renders index 0 at the bottom

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
            currentUserId
          ),
        })
      );

      setMessages(enriched);
      setLoading(false);

      // Mark as read
      await AsyncStorage.setItem(
        'chat:last_read:' + (planId ?? dmChannelId ?? groupChannelId),
        new Date().toISOString()
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
    }
  }

  function subscribeRealtime() {
    // Tear down existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!planId && !dmChannelId && !groupChannelId) return;

    const filter = planId
      ? `plan_id=eq.${planId}`
      : dmChannelId
        ? `dm_channel_id=eq.${dmChannelId}`
        : `group_channel_id=eq.${groupChannelId}`;

    const channelName = `chat-${planId ?? dmChannelId ?? groupChannelId}`;

    function handleReactionInsert(payload: { new: Record<string, unknown> }) {
      const raw = payload.new;
      const incomingUserId = raw.user_id as string;
      const incomingEmoji = raw.emoji as string;
      const incomingMessageId = raw.message_id as string;

      // Pitfall 1 dedup guard: own INSERT already applied via optimistic update
      if (incomingUserId === currentUserId) return;

      setMessages((prev) => {
        const msgIdx = prev.findIndex((m) => m.id === incomingMessageId);
        if (msgIdx === -1) return prev; // not in this room — client-side scope guard

        const msg = prev[msgIdx]!;
        const reactions = msg.reactions ?? [];
        const existingIdx = reactions.findIndex((r) => r.emoji === incomingEmoji);
        let updatedReactions: typeof reactions;
        if (existingIdx >= 0) {
          updatedReactions = reactions.map((r, i) =>
            i === existingIdx ? { ...r, count: r.count + 1 } : r
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
      });
    }

    function handleReactionDelete(payload: { old: Record<string, unknown> }) {
      const raw = payload.old;
      const deletedUserId = raw.user_id as string;
      const deletedEmoji = raw.emoji as string;
      const deletedMessageId = raw.message_id as string;

      // Pitfall 2 dedup guard: own DELETE already applied via optimistic update
      if (deletedUserId === currentUserId) return;

      setMessages((prev) => {
        const msgIdx = prev.findIndex((m) => m.id === deletedMessageId);
        if (msgIdx === -1) return prev;

        const msg = prev[msgIdx]!;
        const updatedReactions = (msg.reactions ?? [])
          .map((r) => (r.emoji === deletedEmoji ? { ...r, count: r.count - 1 } : r))
          .filter((r) => r.count > 0);
        const updated = [...prev];
        updated[msgIdx] = { ...msg, reactions: updatedReactions };
        return updated;
      });
    }

    function handlePollVoteInsert(payload: { new: Record<string, unknown> }) {
      const raw = payload.new;
      const incomingUserId = raw.user_id as string;
      const incomingPollId = raw.poll_id as string;

      // Dedup: own INSERT already applied via optimistic update in usePoll
      if (incomingUserId === currentUserId) return;

      // Scope guard: verify poll_id belongs to a message in current room
      setMessages((prev) => {
        const msgIdx = prev.findIndex((m) => m.poll_id === incomingPollId);
        if (msgIdx === -1) return prev; // not in this room
        return prev; // no messages state change — just signal PollCard via lastPollVoteEvent
      });

      // Signal PollCard to refresh counts (bridge to usePoll without duplicate subscription)
      setLastPollVoteEvent({ pollId: incomingPollId, timestamp: Date.now() });
    }

    function handlePollVoteDelete(payload: { old: Record<string, unknown> }) {
      const raw = payload.old;
      const deletedUserId = raw.user_id as string;
      const incomingPollId = raw.poll_id as string;

      if (deletedUserId === currentUserId) return;

      setMessages((prev) => {
        const msgIdx = prev.findIndex((m) => m.poll_id === incomingPollId);
        if (msgIdx === -1) return prev;
        return prev;
      });

      setLastPollVoteEvent({ pollId: incomingPollId, timestamp: Date.now() });
    }

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const incoming: Message = {
            id: raw.id as string,
            plan_id: raw.plan_id as string | null,
            dm_channel_id: raw.dm_channel_id as string | null,
            group_channel_id: raw.group_channel_id as string | null,
            sender_id: raw.sender_id as string,
            body: raw.body as string | null,
            created_at: raw.created_at as string,
            image_url: (raw.image_url as string | null) ?? null,
            reply_to_message_id: (raw.reply_to_message_id as string | null) ?? null,
            message_type: ((raw.message_type as string) ?? 'text') as MessageType,
            poll_id: (raw.poll_id as string | null) ?? null,
          };

          setMessages((prev) => {
            // Primary dedup: match by id — works for both text (client UUID via sendMessage)
            // and image messages. Avoids false negatives when the same text is sent twice
            // within 5 seconds (WR-04). Body-based matching is kept as a secondary fallback
            // for any legacy messages that may not carry a client-generated id.
            const byIdIdx = prev.findIndex((m) => m.pending === true && m.id === incoming.id);
            if (byIdIdx !== -1) {
              const enriched = enrichMessage(incoming);
              const updated = [...prev];
              updated[byIdIdx] = enriched;
              return updated;
            }

            // Secondary dedup (fallback): same sender_id + same body within 5 seconds
            const now = new Date(incoming.created_at).getTime();
            const optimisticIdx = prev.findIndex(
              (m) =>
                m.pending === true &&
                m.sender_id === incoming.sender_id &&
                m.body !== null &&
                m.body === incoming.body &&
                Math.abs(new Date(m.created_at).getTime() - now) < 5000
            );

            if (optimisticIdx !== -1) {
              // Replace the optimistic entry with the canonical one
              const enriched = enrichMessage(incoming);
              const updated = [...prev];
              updated[optimisticIdx] = enriched;
              return updated;
            }

            // Check if already in state (duplicate INSERT guard)
            if (prev.some((m) => m.id === incoming.id)) {
              return prev;
            }

            // Prepend new message at index 0 (bottom of inverted FlatList)
            const enriched = enrichMessage(incoming);
            // Keep last_read current for own messages so they don't show as unread
            if (incoming.sender_id === currentUserId) {
              AsyncStorage.setItem(
                'chat:last_read:' + (planId ?? dmChannelId ?? groupChannelId),
                new Date().toISOString()
              );
            }
            return [enriched, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === raw.id
                ? {
                    ...m,
                    body: raw.body as string | null,
                    message_type: raw.message_type as string as MessageType,
                  }
                : m
            )
          );
        }
      )
      // reaction listeners — no server-side filter (no room column on message_reactions; use client-side guard)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        handleReactionInsert
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        handleReactionDelete
      )
      // poll_votes listeners — no server-side filter (no room column on poll_votes; use client-side guard)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poll_votes' },
        handlePollVoteInsert
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'poll_votes' },
        handlePollVoteDelete
      )
      .subscribe();
  }

  useEffect(() => {
    fetchMessages();
    subscribeRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [planId, dmChannelId, groupChannelId, session?.user?.id]);

  async function sendMessage(body: string, replyToId?: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    // Client-side UUID — passed as id in the insert so Realtime dedup can match by id
    // instead of body text. This eliminates false-negative dedup when the same text is
    // sent twice within 5 seconds (WR-04, same strategy as sendImage).
    const messageId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    const tempId = messageId;

    const optimistic: MessageWithProfile = {
      id: tempId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      group_channel_id: groupChannelId ?? null,
      sender_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
      image_url: null,
      reply_to_message_id: replyToId ?? null,
      message_type: 'text',
      poll_id: null,
      pending: true,
      tempId,
      sender_display_name: currentUserDisplayName,
      sender_avatar_url: currentUserAvatarUrl,
    };

    setMessages((prev) => [optimistic, ...prev]);

    const { error: insertError } = await supabase.from('messages').insert({
      id: messageId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      group_channel_id: groupChannelId ?? null,
      sender_id: currentUserId,
      body,
      reply_to_message_id: replyToId ?? null,
    });

    if (insertError) {
      // Remove the optimistic entry on failure
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      return { error: insertError };
    }

    return { error: null };
  }

  async function sendImage(localUri: string, replyToId?: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    // Client-side UUID — used for both storage path AND message id so Realtime dedup matches.
    // Cannot use Date.now() tempId like sendMessage because body=null breaks the body-based dedup guard.
    const messageId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    const tempId = messageId;

    const optimistic: MessageWithProfile = {
      id: tempId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      group_channel_id: groupChannelId ?? null,
      sender_id: currentUserId,
      body: null, // D-10: image messages never have body
      created_at: new Date().toISOString(),
      image_url: localUri, // D-11: local URI for instant display
      reply_to_message_id: replyToId ?? null,
      message_type: 'image',
      poll_id: null,
      reactions: [],
      pending: true,
      tempId,
      sender_display_name: currentUserDisplayName,
      sender_avatar_url: currentUserAvatarUrl,
    };

    setMessages((prev) => [optimistic, ...prev]);

    // Upload first, then insert with CDN URL (unlike text sends that insert immediately)
    const cdnUrl = await uploadChatMedia(currentUserId, messageId, localUri);

    if (!cdnUrl) {
      // D-13: remove optimistic on failure; caller shows toast
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      return { error: new Error('Upload failed') };
    }

    // Insert with client-generated UUID so Realtime dedup fires on the same id (body=null breaks
    // the existing body+sender guard — supplying id is the clean alternative per RESEARCH.md Pitfall 1)
    const { error: insertError } = await supabase.from('messages').insert({
      id: messageId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      group_channel_id: groupChannelId ?? null,
      sender_id: currentUserId,

      body: null as any, // same cast pattern as deleteMessage — Supabase types mark body non-nullable but DB is nullable since 0018
      image_url: cdnUrl,
      reply_to_message_id: replyToId ?? null,
      message_type: 'image',
    });

    if (insertError) {
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      return { error: insertError };
    }

    return { error: null };
  }

  async function sendPoll(question: string, options: string[]): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    const messageId = crypto.randomUUID();
    const tempId = messageId;

    const optimistic: MessageWithProfile = {
      id: tempId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      group_channel_id: groupChannelId ?? null,
      sender_id: currentUserId,
      body: null,
      created_at: new Date().toISOString(),
      image_url: null,
      reply_to_message_id: null,
      message_type: 'poll',
      poll_id: null, // unknown until RPC completes
      reactions: [],
      pending: true,
      tempId,
      sender_display_name: currentUserDisplayName,
      sender_avatar_url: currentUserAvatarUrl,
    };

    setMessages((prev) => [optimistic, ...prev]);

    // Step 1: insert message row FIRST (create_poll() RPC verifies sender ownership via this row)
    const { error: msgError } = await supabase.from('messages').insert({
      id: messageId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      group_channel_id: groupChannelId ?? null,
      sender_id: currentUserId,

      body: null as any, // Supabase types mark non-nullable; DB nullable since migration 0018
      message_type: 'poll',
    });

    if (msgError) {
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      return { error: msgError };
    }

    // Step 2: atomically create poll + options rows; sets messages.poll_id
    const { error: rpcError } = await supabase.rpc('create_poll', {
      p_message_id: messageId,
      p_question: question,
      p_options: options,
    });

    if (rpcError) {
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      return { error: rpcError };
    }

    return { error: null };
  }

  async function deleteMessage(messageId: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    // Stash original body and message_type inside the updater to avoid stale closure reads.
    // Collapsing snapshot-capture and optimistic update into a single setMessages call guarantees
    // the snapshot is taken from the same state being mutated (same pattern as addReaction).
    let originalBody: string | null = null;
    let originalMessageType: MessageType = 'text';

    // Optimistic update: set body=NULL + message_type='deleted'
    setMessages((prev) => {
      const original = prev.find((m) => m.id === messageId);
      originalBody = original?.body ?? null;
      originalMessageType = original?.message_type ?? 'text';
      return prev.map((m) =>
        m.id === messageId ? { ...m, body: null, message_type: 'deleted' as MessageType } : m
      );
    });

    const { error: updateError } = await supabase
      .from('messages')

      .update({ body: null as any, message_type: 'deleted' })
      .eq('id', messageId)
      .eq('sender_id', currentUserId);

    if (updateError) {
      // Rollback optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, body: originalBody, message_type: originalMessageType } : m
        )
      );
      return { error: updateError };
    }

    return { error: null };
  }

  async function addReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    // Capture snapshot from latest state inside the updater to avoid stale closure reads
    let preSnapshot: MessageReaction[] = [];
    let isSameEmoji = false;

    setMessages((prev) => {
      const msg = prev.find((m) => m.id === messageId);
      preSnapshot = msg?.reactions ?? [];
      isSameEmoji = preSnapshot.some((r) => r.emoji === emoji && r.reacted_by_me);
      return prev; // no-op: only reading state here
    });

    // Toggle-off: tapping the same emoji the user already reacted with → remove it
    if (isSameEmoji) {
      return removeReaction(messageId, emoji);
    }

    // Optimistic update: apply net result (remove old reaction, add/increment new)
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions ?? [];
        // Remove previous reaction by this user (one-emoji-per-user — D-03)
        const withoutOld = existing
          .map((r) => (r.reacted_by_me ? { ...r, count: r.count - 1, reacted_by_me: false } : r))
          .filter((r) => r.count > 0);
        // Add or increment new emoji
        const idx = withoutOld.findIndex((r) => r.emoji === emoji);
        if (idx >= 0) {
          const updated = [...withoutOld];
          updated[idx] = { ...updated[idx]!, count: updated[idx]!.count + 1, reacted_by_me: true };
          return { ...m, reactions: updated };
        }
        return { ...m, reactions: [...withoutOld, { emoji, count: 1, reacted_by_me: true }] };
      })
    );

    // DB write: delete any existing reaction for this user on this message, then insert new
    const oldReaction = preSnapshot.find((r) => r.reacted_by_me);
    if (oldReaction) {
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId);

      if (deleteError) {
        // Delete failed — original reaction is still in DB; rollback optimistic update
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m))
        );
        return { error: deleteError };
      }
    }
    const { error: insertError } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: currentUserId, emoji });

    if (insertError) {
      // Delete succeeded but insert failed — re-insert old reaction to restore DB consistency
      if (oldReaction) {
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji: oldReaction.emoji,
        });
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m))
      );
      return { error: insertError };
    }
    return { error: null };
  }

  async function removeReaction(
    messageId: string,
    emoji: string
  ): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    // Capture snapshot from latest state inside the updater to avoid stale closure reads
    let preSnapshot: MessageReaction[] = [];
    setMessages((prev) => {
      const msg = prev.find((m) => m.id === messageId);
      preSnapshot = msg?.reactions ?? [];
      return prev; // no-op: only reading state here
    });

    // Optimistic update: decrement count, remove pill if count reaches 0
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const updated = (m.reactions ?? [])
          .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, reacted_by_me: false } : r))
          .filter((r) => r.count > 0);
        return { ...m, reactions: updated };
      })
    );

    const { error: deleteError } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', currentUserId)
      .eq('emoji', emoji);

    if (deleteError) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m))
      );
      return { error: deleteError };
    }
    return { error: null };
  }

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendImage,
    sendPoll,
    deleteMessage,
    addReaction,
    removeReaction,
    lastPollVoteEvent,
  };
}
