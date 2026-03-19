import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useHomeStore } from '@/stores/useHomeStore';
import type { FriendWithStatus } from '@/hooks/useFriends';
import type { StatusValue, EmojiTag } from '@/types/app';

const STATUS_SORT_ORDER: Record<StatusValue, number> = {
  free: 0,
  maybe: 1,
  busy: 2,
};

export function useHomeScreen() {
  const session = useAuthStore((s) => s.session);
  const { friends, statusUpdatedAt, setFriends } = useHomeStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  function subscribeRealtime(friendIds: string[]) {
    // Tear down existing channel before re-subscribing
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (friendIds.length === 0) return;

    const filter = `user_id=in.(${friendIds.join(',')})`;
    channelRef.current = supabase
      .channel('home-statuses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'statuses',
          filter,
        },
        (_payload) => {
          fetchAllFriends();
        }
      )
      .subscribe();
  }

  async function fetchAllFriends(): Promise<FriendWithStatus[]> {
    if (!session?.user) return [];

    setLoading(true);
    setError(null);

    try {
      const { data: friendRows, error: rpcError } = await supabase.rpc('get_friends');

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return [];
      }

      const rows = (friendRows ?? []) as {
        friend_id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        friendship_status: string;
        created_at: string;
      }[];

      const friendIds = rows.map((r) => r.friend_id);
      let statusMap: Map<
        string,
        { status: StatusValue; context_tag: EmojiTag; updated_at: string }
      > = new Map();

      if (friendIds.length > 0) {
        const { data: statuses } = await supabase
          .from('statuses')
          .select('user_id, status, context_tag, updated_at')
          .in('user_id', friendIds);

        if (statuses) {
          for (const s of statuses) {
            statusMap.set(s.user_id, {
              status: (s.status as StatusValue) ?? 'maybe',
              context_tag: (s.context_tag as EmojiTag) ?? null,
              updated_at: s.updated_at ?? '',
            });
          }
        }
      }

      const allFriends: FriendWithStatus[] = rows.map((r) => ({
        friend_id: r.friend_id,
        username: r.username ?? '',
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        status: statusMap.get(r.friend_id)?.status ?? 'maybe',
        context_tag: statusMap.get(r.friend_id)?.context_tag ?? null,
      }));

      const newStatusUpdatedAt: Record<string, string> = {};
      for (const [userId, statusData] of statusMap.entries()) {
        newStatusUpdatedAt[userId] = statusData.updated_at;
      }

      setFriends(allFriends, newStatusUpdatedAt);
      const ids = allFriends.map((f) => f.friend_id);
      subscribeRealtime(ids);
      setLoading(false);
      return allFriends;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
      return [];
    }
  }

  useEffect(() => {
    fetchAllFriends();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session?.user?.id]);

  const freeFriends = friends
    .filter((f) => f.status === 'free')
    .sort((a, b) => {
      const aTime = statusUpdatedAt[a.friend_id] ?? '';
      const bTime = statusUpdatedAt[b.friend_id] ?? '';
      // Sort by updated_at descending (most recent first)
      return bTime.localeCompare(aTime);
    });

  const otherFriends = friends
    .filter((f) => f.status !== 'free')
    .sort((a, b) => {
      const orderDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      return a.display_name.localeCompare(b.display_name);
    });

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAllFriends();
    setRefreshing(false);
  }

  return {
    friends,
    freeFriends,
    otherFriends,
    loading,
    error,
    refreshing,
    handleRefresh,
    fetchAllFriends,
  };
}
