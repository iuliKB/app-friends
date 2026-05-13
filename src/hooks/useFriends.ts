// Phase 31 Plan 05 — Migrated to TanStack Query.
//
// Shares queryKeys.friends.list(userId) with useHomeScreen (Wave 3) — the friends
// list is a single cache entry; adding a friend on the Friends screen instantly
// reflects on home (one of the cross-screen-reactivity wins motivating Phase 31).
//
// Composition (same shape as useHomeScreen.ts):
//   1) useQuery(get_friends RPC) → FriendRow[] keyed by queryKeys.friends.list(userId)
//   2) useQuery(effective_status view filtered by user_id IN (friendIds)) keyed by
//      queryKeys.home.friends(userId) — gated by friendIds.length > 0
//   3) useQuery(pending requests) keyed by queryKeys.friends.pendingRequests(userId)
//
// Mutations (sendRequest / acceptRequest / rejectRequest / removeFriend) all use the
// `@mutationShape: no-optimistic` exemption marker because the pre-migration hook
// was non-optimistic (write then refetch) and the rows have server-generated ids /
// status enums that aren't worth optimistically splicing for the rare friend-mgmt path.
//
// Invalidation map per mutation:
//   - sendRequest → friends.pendingRequests + home.pendingRequestCount (a request goes OUT;
//     other side's pending list invalidates server-side via RLS-gated INSERT — handled by
//     Realtime / refetch later). Also invalidates friends.list (defensive — rejected→pending
//     reset path could surface a new row).
//   - acceptRequest → friends.list + friends.pendingRequests + home.pendingRequestCount
//   - rejectRequest → friends.pendingRequests + home.pendingRequestCount
//   - removeFriend → friends.list + home.all()
//
// Public shape preserved verbatim.

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { StatusValue, Profile } from '@/types/app';
import { markPushPromptEligible } from '@/hooks/usePushNotifications';
import { STATUS_SORT_ORDER } from '@/hooks/useHomeScreen';
import { queryKeys } from '@/lib/queryKeys';

export interface FriendWithStatus {
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: StatusValue;
  context_tag: string | null;
  status_expires_at: string | null;
  last_active_at: string | null;
}

export interface PendingRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

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

export interface UseFriendsResult {
  friends: FriendWithStatus[];
  pendingRequests: PendingRequest[];
  loadingFriends: boolean;
  loadingPending: boolean;
  error: string | null;
  fetchFriends: () => Promise<{ data: FriendWithStatus[] | null; error: Error | null }>;
  refetch: () => Promise<{ data: FriendWithStatus[] | null; error: Error | null }>;
  fetchPendingRequests: () => Promise<{ data: PendingRequest[] | null; error: Error | null }>;
  sendRequest: (targetUserId: string) => Promise<{ data: unknown; error: Error | null }>;
  acceptRequest: (friendshipId: string) => Promise<{ data: unknown; error: Error | null }>;
  rejectRequest: (friendshipId: string) => Promise<{ data: unknown; error: Error | null }>;
  removeFriend: (friendId: string) => Promise<{ data: unknown; error: Error | null }>;
  searchUsers: (query: string) => Promise<{ data: Profile[] | null; error: Error | null }>;
}

export function useFriends(): UseFriendsResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const listKey = queryKeys.friends.list(userId ?? '');
  const pendingKey = queryKeys.friends.pendingRequests(userId ?? '');
  // Home Bento pending-request count widget shares this key (queryKeys.home.pendingRequestCount).
  const homePendingCountKey = queryKeys.home.pendingRequestCount(userId ?? '');

  // Query 1 — friends list (shared key with useHomeScreen).
  const friendsQuery = useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<FriendRow[]> => {
      const { data, error } = await supabase.rpc('get_friends');
      if (error) throw error;
      return ((data ?? []) as unknown) as FriendRow[];
    },
    enabled: !!userId,
  });

  const friendIds = (friendsQuery.data ?? []).map((f) => f.friend_id);
  const friendIdsKey = friendIds.join(',');

  // Query 2 — statuses for those friend ids (same key as useHomeScreen).
  const statusesQuery = useQuery({
    queryKey: queryKeys.home.friends(userId ?? ''),
    queryFn: async (): Promise<StatusRow[]> => {
      if (friendIds.length === 0) return [];
      const { data, error } = await supabase
        .from('effective_status')
        .select('user_id, effective_status, context_tag, status_expires_at, last_active_at')
        .in('user_id', friendIds);
      if (error) throw error;
      return ((data ?? []) as unknown) as StatusRow[];
    },
    enabled: !!userId && friendIds.length > 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: { friendIdsKey } as any,
  });

  // Query 3 — pending requests addressed to caller.
  const pendingQuery = useQuery({
    queryKey: pendingKey,
    queryFn: async (): Promise<PendingRequest[]> => {
      if (!userId) return [];
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const requesterIds = rows.map((r) => r.requester_id);
      const { data: profileData, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', requesterIds);
      if (profErr) throw profErr;
      const profileMap = new Map((profileData ?? []).map((p) => [p.id, p]));

      return rows.map((row) => {
        const profile = profileMap.get(row.requester_id);
        return {
          id: row.id,
          requester_id: row.requester_id,
          created_at: row.created_at,
          profiles: {
            id: profile?.id ?? row.requester_id,
            username: profile?.username ?? '',
            display_name: profile?.display_name ?? 'Unknown',
            avatar_url: profile?.avatar_url ?? null,
          },
        };
      });
    },
    enabled: !!userId,
  });

  // Suppress unused-var warning for friendIdsKey (used as deps-trick when membership
  // changes — invalidates the statuses query implicitly via re-render).
  void friendIdsKey;

  // Merge friends + statuses into FriendWithStatus[], sorted by STATUS_SORT_ORDER.
  const merged: FriendWithStatus[] = (friendsQuery.data ?? [])
    .map((r) => {
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
    })
    .sort((a, b) => {
      const orderDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      return a.display_name.localeCompare(b.display_name);
    });

  // sendRequest — checks for existing row first, then inserts. Side-effect-heavy
  // (status enum + RLS branches); no per-list cache entry to optimistically splice.
  // @mutationShape: no-optimistic
  const sendMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const myId = userId;

      // Check existing friendship row (rejected/pending).
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status, requester_id')
        .or(
          `and(requester_id.eq.${myId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${myId})`,
        )
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') throw new Error('Already friends!');
        if (existing.status === 'pending') throw new Error('Friend request already sent.');
        // 'rejected' — delete + re-send.
        await supabase.from('friendships').delete().eq('id', existing.id);
      }

      const { data, error } = await supabase
        .from('friendships')
        .insert({ requester_id: myId, addressee_id: targetUserId });
      if (error) throw error;

      // PUSH-08 (D-01): mark eligibility on first meaningful action.
      markPushPromptEligible().catch(() => {});
      return data;
    },
    onMutate: async (_targetUserId) => {
      return {};
    },
    onError: (_err, _input, _ctx) => {
      // No rollback target — caller surfaces error via the wrapper return.
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: pendingKey });
      void queryClient.invalidateQueries({ queryKey: homePendingCountKey });
    },
  });

  // acceptRequest — flips the friendships row to accepted on the caller's
  // addressee row (RLS-gated). Server-generated friends list will surface on
  // refetch.
  // @mutationShape: no-optimistic
  const acceptMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
        .eq('addressee_id', userId);
      if (error) throw error;
      // PUSH-08 (D-01): mark eligibility on first meaningful action.
      markPushPromptEligible().catch(() => {});
      return data;
    },
    onMutate: async (_friendshipId) => {
      return {};
    },
    onError: (_err, _input, _ctx) => {
      // No rollback.
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: pendingKey });
      void queryClient.invalidateQueries({ queryKey: homePendingCountKey });
    },
  });

  // rejectRequest — flips the friendships row to rejected on the caller's
  // addressee row.
  // @mutationShape: no-optimistic
  const rejectMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', friendshipId)
        .eq('addressee_id', userId);
      if (error) throw error;
      return data;
    },
    onMutate: async (_friendshipId) => {
      return {};
    },
    onError: (_err, _input, _ctx) => {
      // No rollback.
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pendingKey });
      void queryClient.invalidateQueries({ queryKey: homePendingCountKey });
    },
  });

  // removeFriend — deletes the friendship row (either direction).
  // @mutationShape: no-optimistic
  const removeMutation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const myId = userId;
      const { data, error } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`,
        );
      if (error) throw error;
      return data;
    },
    onMutate: async (_friendId) => {
      return {};
    },
    onError: (_err, _input, _ctx) => {
      // No rollback.
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  const fetchFriends = useCallback(async () => {
    try {
      const res = await friendsQuery.refetch();
      if (res.error) {
        return { data: null, error: res.error as Error };
      }
      // Return merged value (status data may not be ready yet — best-effort).
      return { data: merged, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsQuery.refetch]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await pendingQuery.refetch();
      if (res.error) return { data: null, error: res.error as Error };
      return { data: (res.data ?? []) as PendingRequest[], error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery.refetch]);

  const searchUsers = useCallback(
    async (query: string): Promise<{ data: Profile[] | null; error: Error | null }> => {
      if (!userId) return { data: null, error: new Error('Not authenticated') };
      const trimmed = query.toLowerCase().trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, created_at, updated_at')
        .ilike('username', `%${trimmed}%`)
        .limit(10);
      if (error) return { data: null, error };
      const filtered = (data ?? []).filter((p) => p.id !== userId) as Profile[];
      return { data: filtered, error: null };
    },
    [userId],
  );

  return {
    friends: merged,
    pendingRequests: pendingQuery.data ?? [],
    loadingFriends: friendsQuery.isLoading,
    loadingPending: pendingQuery.isLoading,
    error: friendsQuery.error ? (friendsQuery.error as Error).message : null,
    fetchFriends,
    refetch: fetchFriends, // AUTH-03 standard alias
    fetchPendingRequests,
    sendRequest: async (targetUserId: string) => {
      try {
        const data = await sendMutation.mutateAsync(targetUserId);
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    acceptRequest: async (friendshipId: string) => {
      try {
        const data = await acceptMutation.mutateAsync(friendshipId);
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    rejectRequest: async (friendshipId: string) => {
      try {
        const data = await rejectMutation.mutateAsync(friendshipId);
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    removeFriend: async (friendId: string) => {
      try {
        const data = await removeMutation.mutateAsync(friendId);
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    searchUsers,
  };
}
