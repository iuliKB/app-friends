// Phase 11 v1.4 — useFriendsOfFriend (D-14)
// Calls get_friends_of(target_user_id) SECURITY DEFINER RPC.
// Direct client-side friendships query fails due to RLS (returns 0 rows).
// Pitfall 3: filters out current user from results.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface FriendOfFriend {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useFriendsOfFriend(targetUserId: string) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [friends, setFriends] = useState<FriendOfFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !targetUserId) {
      setLoading(false);
      setFriends([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_friends_of', {
      p_target_user: targetUserId,
    });
    if (rpcErr) {
      console.warn('get_friends_of failed', rpcErr);
      setError(rpcErr.message);
      setFriends([]);
    } else {
      // Filter out current user (Pitfall 3 — current user excluded in RPC too, belt-and-suspenders)
      const filtered = ((data ?? []) as FriendOfFriend[]).filter(
        (f) => f.friend_id !== userId
      );
      setFriends(filtered);
    }
    setLoading(false);
  }, [userId, targetUserId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { friends, loading, error, refetch };
}
