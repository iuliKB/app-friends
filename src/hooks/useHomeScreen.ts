// Phase 31 Plan 03 — Migrated to TanStack Query.
//
// The previous shape mirrored useHomeStore.friends. With useQuery, the cache IS
// the single source of truth. Status updates surface via subscribeHomeStatuses
// → invalidate.
//
// Composition: TWO useQuery calls.
//   1) get_friends RPC → returns FriendRow[] keyed by queryKeys.friends.list(userId).
//      The same key will be shared with Wave 5's useFriends migration.
//   2) statuses-from-effective_status view filtered by user_id IN (friendIds) →
//      keyed by queryKeys.home.friends(userId). Enabled only after friendsQuery
//      has data and friendIds is non-empty.
//
// The home-statuses Realtime subscription lives in realtimeBridge.subscribeHomeStatuses.
// useHomeStore.friends / lastFetchedAt mirrors removed in the same commit (research §Anti-Patterns).
// useHomeStore.lastActiveAt is KEPT (UI overlay timing, NOT server data).

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useHomeStore } from '@/stores/useHomeStore';
import { queryKeys } from '@/lib/queryKeys';
import { subscribeHomeStatuses } from '@/lib/realtimeBridge';
import type { FriendWithStatus } from '@/hooks/useFriends';
import type { StatusValue } from '@/types/app';

// Single source of truth for status sort order, imported by useFriends as well (OVR-07).
// Order matches MoodPicker row order: free → maybe → busy.
export const STATUS_SORT_ORDER: Record<StatusValue, number> = {
  free: 0,
  maybe: 1,
  busy: 2,
};

interface FriendRow {
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  friendship_status: string;
  created_at: string;
}

interface StatusRow {
  user_id: string;
  effective_status: string | null;
  context_tag: string | null;
  status_expires_at: string | null;
  last_active_at: string | null;
}

export interface UseHomeScreenResult {
  friends: FriendWithStatus[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  fetchAllFriends: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

export function useHomeScreen(): UseHomeScreenResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const setLastActiveAt = useHomeStore((s) => s.setLastActiveAt);
  const [refreshing, setRefreshing] = useState(false);

  // Query 1 — friends list (shared key with Wave 5's useFriends).
  const friendsQuery = useQuery({
    queryKey: queryKeys.friends.list(userId ?? ''),
    queryFn: async (): Promise<FriendRow[]> => {
      const { data, error } = await supabase.rpc('get_friends');
      if (error) throw error;
      return ((data ?? []) as unknown) as FriendRow[];
    },
    enabled: !!userId,
  });

  const friendIds = (friendsQuery.data ?? []).map((f) => f.friend_id);
  const friendIdsKey = friendIds.join(',');

  // Query 2 — statuses for those friend ids (enabled only once query 1 has data).
  const statusesQuery = useQuery({
    queryKey: queryKeys.home.friends(userId ?? ''),
    queryFn: async (): Promise<StatusRow[]> => {
      if (friendIds.length === 0) return [];
      // OVR-03: read from the effective_status view, not the statuses table.
      // The view returns NULL effective_status for expired/dead rows; we default
      // to 'maybe' so heartbeat computation classifies them DEAD on the card.
      const { data, error } = await supabase
        .from('effective_status')
        .select('user_id, effective_status, context_tag, status_expires_at, last_active_at')
        .in('user_id', friendIds);
      if (error) throw error;
      return ((data ?? []) as unknown) as StatusRow[];
    },
    enabled: !!userId && friendIds.length > 0,
  });

  // Realtime subscription lives in the bridge (ref-counted dedup).
  // friendIdsKey is the deps-array trick to re-subscribe on membership changes
  // without making the array reference unstable.
  useEffect(() => {
    if (!userId || friendIds.length === 0) return;
    return subscribeHomeStatuses(queryClient, userId, friendIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, userId, friendIdsKey]);

  // Sync lastActiveAt overlay state into useHomeStore whenever the statuses
  // query resolves. This keeps the existing UI timing channel intact while the
  // server-data mirror moves into the cache.
  useEffect(() => {
    if (!statusesQuery.data) return;
    const next: Record<string, string> = {};
    for (const s of statusesQuery.data) {
      if (s.last_active_at) next[s.user_id] = s.last_active_at;
    }
    setLastActiveAt(next);
  }, [statusesQuery.data, setLastActiveAt]);

  const merged: FriendWithStatus[] = (friendsQuery.data ?? []).map((r) => {
    const status = (statusesQuery.data ?? []).find((s) => s.user_id === r.friend_id);
    return {
      friend_id: r.friend_id,
      username: r.username ?? '',
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      status: ((status?.effective_status as StatusValue) ?? 'maybe') as StatusValue,
      context_tag: status?.context_tag ?? null,
      status_expires_at: status?.status_expires_at ?? null,
      last_active_at: status?.last_active_at ?? null,
    };
  });

  const refetch = useCallback(async () => {
    return Promise.all([friendsQuery.refetch(), statusesQuery.refetch()]);
  }, [friendsQuery, statusesQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return {
    friends: merged,
    loading: friendsQuery.isLoading || statusesQuery.isLoading,
    error:
      friendsQuery.error
        ? (friendsQuery.error as Error).message
        : statusesQuery.error
          ? (statusesQuery.error as Error).message
          : null,
    refreshing,
    handleRefresh,
    fetchAllFriends: refetch,
    refetch,
  };
}
