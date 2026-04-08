import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useHomeStore } from '@/stores/useHomeStore';
import type { FriendWithStatus } from '@/hooks/useFriends';
import type { StatusValue } from '@/types/app';
import { computeHeartbeatState } from '@/lib/heartbeat';

// Single source of truth for status sort order, imported by useFriends as well (OVR-07).
// Order matches MoodPicker row order: free → maybe → busy.
export const STATUS_SORT_ORDER: Record<StatusValue, number> = {
  free: 0,
  maybe: 1,
  busy: 2,
};

export function useHomeScreen() {
  const session = useAuthStore((s) => s.session);
  const { friends, lastActiveAt, setFriends } = useHomeStore();
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
        {
          status: StatusValue;
          context_tag: string | null;
          status_expires_at: string | null;
          last_active_at: string | null;
        }
      > = new Map();

      if (friendIds.length > 0) {
        // OVR-03: read from the effective_status view, not the statuses table.
        // The view returns NULL effective_status for expired/dead rows; we default
        // to 'maybe' so heartbeat computation classifies them DEAD on the card.
        const { data: statuses } = await supabase
          .from('effective_status')
          .select('user_id, effective_status, context_tag, status_expires_at, last_active_at')
          .in('user_id', friendIds);

        if (statuses) {
          for (const s of statuses) {
            statusMap.set(s.user_id, {
              status: ((s.effective_status as StatusValue) ?? 'maybe') as StatusValue,
              context_tag: (s.context_tag as string | null) ?? null,
              status_expires_at: (s.status_expires_at as string | null) ?? null,
              last_active_at: (s.last_active_at as string | null) ?? null,
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
        status_expires_at: statusMap.get(r.friend_id)?.status_expires_at ?? null,
        last_active_at: statusMap.get(r.friend_id)?.last_active_at ?? null,
      }));

      const newLastActiveAt: Record<string, string> = {};
      for (const [userId, statusData] of statusMap.entries()) {
        if (statusData.last_active_at) {
          newLastActiveAt[userId] = statusData.last_active_at;
        }
      }

      setFriends(allFriends, newLastActiveAt);
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

  // HEART-04 partition: ALIVE/FADING free → freeFriends; everything else (including
  // DEAD regardless of stored mood) → otherFriends. Sort free by last_active_at DESC
  // per OVR-07 (freshness, not updated_at).
  const freeFriends = friends
    .filter((f) => {
      const hb = computeHeartbeatState(f.status_expires_at, f.last_active_at);
      return f.status === 'free' && (hb === 'alive' || hb === 'fading');
    })
    .sort((a, b) => {
      const aActive = lastActiveAt[a.friend_id] ?? '';
      const bActive = lastActiveAt[b.friend_id] ?? '';
      return bActive.localeCompare(aActive);
    });

  const otherFriends = friends
    .filter((f) => {
      const hb = computeHeartbeatState(f.status_expires_at, f.last_active_at);
      // Everyone Else: any DEAD friend (regardless of stored mood) plus all
      // ALIVE/FADING non-free friends.
      return hb === 'dead' || f.status !== 'free';
    })
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
