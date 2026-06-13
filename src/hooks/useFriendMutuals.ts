// Phase 33 — Friend mutuals aggregate hook (REQ-FP-08, MUTUAL section data layer).
//
// Single hook returning { mutualPlansCount, mutualFriendsCount, sharedPhotosCount,
// sharedPlanIds }. sharedPlanIds is exposed so the Plan 06 screen + Plan 06's
// /friends/[id]/photos route can filter the existing useAllPlanPhotos hook
// without re-computing the intersection.
//
// Data sources:
//   - Mutual plans: server-side intersection on plan_members (caller's plan_ids
//     INNER JOINed via .in() with friend's plan_ids; RLS already gates membership).
//   - Shared photos: count-without-payload (head:true, count:exact) on
//     plan_photos filtered to sharedPlanIds. Cheap.
//   - Mutual friends: derived from already-cached friends.list(userId) and
//     friends.ofFriend(friendId). If either cache is cold the count renders 0
//     (acceptable per RESEARCH §3 — useFriends and useFriendsOfFriend hooks on
//     the screen tree warm these caches; deep-link entry shows 0 until they hydrate).

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

interface FriendListRow {
  friend_id: string;
  /* + other fields */
}

interface FriendOfFriendRow {
  friend_id: string;
  /* + other fields */
}

export interface FriendMutualsData {
  mutualPlansCount: number;
  mutualFriendsCount: number;
  sharedPhotosCount: number;
  sharedPlanIds: string[];
}

export interface UseFriendMutualsResult {
  data: FriendMutualsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useFriendMutuals(friendId: string): UseFriendMutualsResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.friends.mutuals(friendId),
    queryFn: async (): Promise<FriendMutualsData | null> => {
      if (!userId) return null;

      // Step 1: caller's plan IDs
      const callerRes = await supabase.from('plan_members').select('plan_id').eq('user_id', userId);
      if (callerRes.error) throw callerRes.error;
      const callerPlanIds = (callerRes.data ?? []).map((m: { plan_id: string }) => m.plan_id);

      // Early exit: caller has no plans → no mutual plans or shared photos possible
      if (callerPlanIds.length === 0) {
        const myFriends =
          queryClient.getQueryData<FriendListRow[]>(queryKeys.friends.list(userId)) ?? [];
        const friendsOfFriend =
          queryClient.getQueryData<FriendOfFriendRow[]>(queryKeys.friends.ofFriend(friendId)) ?? [];
        const myFriendIds = new Set(myFriends.map((f) => f.friend_id));
        const mutualFriendsCount = friendsOfFriend.filter((f) =>
          myFriendIds.has(f.friend_id)
        ).length;
        return { mutualPlansCount: 0, mutualFriendsCount, sharedPhotosCount: 0, sharedPlanIds: [] };
      }

      // Step 2: friend's plan IDs intersected with caller's
      const friendRes = await supabase
        .from('plan_members')
        .select('plan_id')
        .eq('user_id', friendId)
        .in('plan_id', callerPlanIds);
      if (friendRes.error) throw friendRes.error;
      const sharedPlanIds = (friendRes.data ?? []).map((m: { plan_id: string }) => m.plan_id);
      const mutualPlansCount = sharedPlanIds.length;

      // Step 3: shared photo count (cheap head request — no payload returned)
      let sharedPhotosCount = 0;
      if (sharedPlanIds.length > 0) {
        const photosRes = await supabase
          .from('plan_photos')
          .select('id', { count: 'exact', head: true })
          .in('plan_id', sharedPlanIds);
        if (photosRes.error) throw photosRes.error;
        sharedPhotosCount = photosRes.count ?? 0;
      }

      // Step 4: mutual friends from cache (warm-only; renders 0 when cold)
      const myFriends =
        queryClient.getQueryData<FriendListRow[]>(queryKeys.friends.list(userId)) ?? [];
      const friendsOfFriend =
        queryClient.getQueryData<FriendOfFriendRow[]>(queryKeys.friends.ofFriend(friendId)) ?? [];
      const myFriendIds = new Set(myFriends.map((f) => f.friend_id));
      const mutualFriendsCount = friendsOfFriend.filter((f) => myFriendIds.has(f.friend_id)).length;

      return { mutualPlansCount, mutualFriendsCount, sharedPhotosCount, sharedPlanIds };
    },
    enabled: !!userId && !!friendId,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
