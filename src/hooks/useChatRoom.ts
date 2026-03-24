import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Message, MessageWithProfile } from '@/types/chat';

interface UseChatRoomOptions {
  planId?: string;
  dmChannelId?: string;
}

interface UseChatRoomResult {
  messages: MessageWithProfile[];
  loading: boolean;
  error: string | null;
  sendMessage: (body: string) => Promise<{ error: Error | null }>;
}

type ProfileInfo = { display_name: string; avatar_url: string | null };

export function useChatRoom({ planId, dmChannelId }: UseChatRoomOptions): UseChatRoomResult {
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';
  const currentUserDisplayName =
    (session?.user?.user_metadata?.display_name as string | undefined) ?? 'Me';
  const currentUserAvatarUrl =
    (session?.user?.user_metadata?.avatar_url as string | null | undefined) ?? null;

  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!planId && !dmChannelId) return;

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
      }

      // Fetch messages
      const column = planId ? 'plan_id' : 'dm_channel_id';
      const value = planId ?? dmChannelId;

      const { data: rows, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq(column, value!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      // Keep newest-first order — inverted FlatList renders index 0 at the bottom
      const enriched = (rows ?? []).map((row) =>
        enrichMessage({
          id: row.id as string,
          plan_id: row.plan_id as string | null,
          dm_channel_id: row.dm_channel_id as string | null,
          sender_id: row.sender_id as string,
          body: row.body as string,
          created_at: row.created_at as string,
        })
      );

      setMessages(enriched);
      setLoading(false);

      // Mark as read
      await AsyncStorage.setItem(
        'chat:last_read:' + (planId ?? dmChannelId),
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

    if (!planId && !dmChannelId) return;

    const filter = planId ? `plan_id=eq.${planId}` : `dm_channel_id=eq.${dmChannelId}`;

    const channelName = `chat-${planId ?? dmChannelId}`;

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
          const incoming = payload.new as Message;

          setMessages((prev) => {
            // Check if this is a dedup of an optimistic message:
            // same sender_id + same body, created within 5 seconds of an optimistic entry
            const now = new Date(incoming.created_at).getTime();
            const optimisticIdx = prev.findIndex(
              (m) =>
                m.pending === true &&
                m.sender_id === incoming.sender_id &&
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
            return [enrichMessage(incoming), ...prev];
          });
        }
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
  }, [planId, dmChannelId, session?.user?.id]);

  async function sendMessage(body: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };

    const tempId = Date.now().toString();

    const optimistic: MessageWithProfile = {
      id: tempId,
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      sender_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
      pending: true,
      tempId,
      sender_display_name: currentUserDisplayName,
      sender_avatar_url: currentUserAvatarUrl,
    };

    setMessages((prev) => [optimistic, ...prev]);

    const { error: insertError } = await supabase.from('messages').insert({
      plan_id: planId ?? null,
      dm_channel_id: dmChannelId ?? null,
      sender_id: currentUserId,
      body,
    });

    if (insertError) {
      // Remove the optimistic entry on failure
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      return { error: insertError };
    }

    return { error: null };
  }

  return { messages, loading, error, sendMessage };
}
