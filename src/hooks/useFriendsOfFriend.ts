// Phase 31 Plan 05 — Migrated to TanStack Query.
// Wraps the public.get_friends_of(p_target_user) SECURITY DEFINER RPC.
// Public shape preserved verbatim: { friends, loading, error, refetch }.
// Pitfall 3: filters out the caller from results (belt-and-suspenders; RPC also excludes).

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface FriendOfFriend {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface UseFriendsOfFriendResult {
  friends: FriendOfFriend[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useFriendsOfFriend(targetUserId: string): UseFriendsOfFriendResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.friends.ofFriend(targetUserId),
    queryFn: async (): Promise<FriendOfFriend[]> => {
      const { data, error } = await supabase.rpc('get_friends_of', {
        p_target_user: targetUserId,
      });
      if (error) throw error;
      // Belt-and-suspenders: filter caller out (RPC also excludes — Pitfall 3).
      return ((data ?? []) as FriendOfFriend[]).filter((f) => f.friend_id !== userId);
    },
    enabled: !!userId && !!targetUserId,
  });

  return {
    friends: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
