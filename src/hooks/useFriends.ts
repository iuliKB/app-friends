import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { StatusValue, Profile } from '@/types/app';
import { markPushPromptEligible } from '@/hooks/usePushNotifications';
import { STATUS_SORT_ORDER } from '@/hooks/useHomeScreen';

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

export function useFriends() {
  const session = useAuthStore((s) => s.session);
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchFriends(): Promise<{ data: FriendWithStatus[] | null; error: Error | null }> {
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };
    setLoadingFriends(true);
    setError(null);
    try {
      const { data: friendRows, error: rpcError } = await supabase.rpc('get_friends');
      if (rpcError) {
        setError(rpcError.message);
        setLoadingFriends(false);
        return { data: null, error: rpcError };
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
      let statusMap: Record<
        string,
        {
          status: StatusValue;
          context_tag: string | null;
          status_expires_at: string | null;
          last_active_at: string | null;
        }
      > = {};

      if (friendIds.length > 0) {
        const { data: statuses } = await supabase
          .from('effective_status')
          .select('user_id, effective_status, context_tag, status_expires_at, last_active_at')
          .in('user_id', friendIds);

        if (statuses) {
          for (const s of statuses) {
            statusMap[s.user_id] = {
              status: ((s.effective_status as StatusValue) ?? 'maybe') as StatusValue,
              context_tag: (s.context_tag as string | null) ?? null,
              status_expires_at: (s.status_expires_at as string | null) ?? null,
              last_active_at: (s.last_active_at as string | null) ?? null,
            };
          }
        }
      }

      const result: FriendWithStatus[] = rows.map((r) => ({
        friend_id: r.friend_id,
        username: r.username ?? '',
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        status: statusMap[r.friend_id]?.status ?? 'maybe',
        context_tag: statusMap[r.friend_id]?.context_tag ?? null,
        status_expires_at: statusMap[r.friend_id]?.status_expires_at ?? null,
        last_active_at: statusMap[r.friend_id]?.last_active_at ?? null,
      }));

      result.sort((a, b) => {
        const orderDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
        if (orderDiff !== 0) return orderDiff;
        return a.display_name.localeCompare(b.display_name);
      });

      setFriends(result);
      setLoadingFriends(false);
      return { data: result, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoadingFriends(false);
      return { data: null, error: err as Error };
    }
  }

  async function fetchPendingRequests(): Promise<{
    data: PendingRequest[] | null;
    error: Error | null;
  }> {
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };
    setLoadingPending(true);
    try {
      // Fetch pending requests where current user is the addressee.
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', session.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        setLoadingPending(false);
        return { data: null, error };
      }

      if (!rows || rows.length === 0) {
        setPendingRequests([]);
        setLoadingPending(false);
        return { data: [], error: null };
      }

      // Look up requester profiles
      const requesterIds = rows.map((r) => r.requester_id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', requesterIds);

      const profileMap = new Map((profileData ?? []).map((p) => [p.id, p]));

      const requests: PendingRequest[] = rows.map((row) => {
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

      setLoadingPending(false);
      setPendingRequests(requests);
      return { data: requests, error: null };
    } catch (err) {
      setLoadingPending(false);
      return { data: null, error: err as Error };
    }
  }

  async function sendRequest(
    targetUserId: string
  ): Promise<{ data: unknown; error: Error | null }> {
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };
    const myId = session.user.id;

    // Check if a friendship row already exists (could be rejected or pending)
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status, requester_id')
      .or(
        `and(requester_id.eq.${myId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${myId})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { data: null, error: new Error('Already friends!') };
      }
      if (existing.status === 'pending') {
        return { data: null, error: new Error('Friend request already sent.') };
      }
      // Status is 'rejected' — delete old row and re-send
      await supabase.from('friendships').delete().eq('id', existing.id);
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({ requester_id: myId, addressee_id: targetUserId });

    if (error) {
      return { data: null, error };
    }
    // PUSH-08 (D-01): mark eligibility on first meaningful action.
    markPushPromptEligible().catch(() => {});
    return { data, error: null };
  }

  async function acceptRequest(
    friendshipId: string
  ): Promise<{ data: unknown; error: Error | null }> {
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .eq('addressee_id', session.user.id);

    if (error) return { data: null, error };
    // PUSH-08 (D-01): mark eligibility on first meaningful action.
    markPushPromptEligible().catch(() => {});
    return { data, error: null };
  }

  async function rejectRequest(
    friendshipId: string
  ): Promise<{ data: unknown; error: Error | null }> {
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', friendshipId)
      .eq('addressee_id', session.user.id);

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async function removeFriend(friendId: string): Promise<{ data: unknown; error: Error | null }> {
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };
    const myId = session.user.id;
    const { data, error } = await supabase
      .from('friendships')
      .delete()
      .or(
        `and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`
      );

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async function searchUsers(
    query: string
  ): Promise<{ data: Profile[] | null; error: Error | null }> {
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };
    const trimmed = query.toLowerCase().trim();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at, updated_at')
      .ilike('username', `%${trimmed}%`)
      .limit(10);

    if (error) return { data: null, error };

    const filtered = (data ?? []).filter((p) => p.id !== session.user.id) as Profile[];
    return { data: filtered, error: null };
  }

  return {
    friends,
    pendingRequests,
    loadingFriends,
    loadingPending,
    error,                   // AUTH-03: top-level error state for fetchFriends failures
    fetchFriends,
    refetch: fetchFriends,   // AUTH-03: standard shape alias
    fetchPendingRequests,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    searchUsers,
  };
}
