// Phase 33 — Friend profile single-entity read (D-13 / REQ-FP-01 / REQ-FP-10).
//
// Single useQuery returning profile + friends-since + status. Opportunistically
// reads queryKeys.home.friends(myId) for status to share the home-status slice
// that the home-screen bridge already keeps fresh (D-15). Falls back to a direct
// effective_status read when the home cache is empty (deep-link entry path).
//
// IMPORTANT — friend-not-found detection (RESEARCH §Recommendations):
// profiles_select_authenticated RLS is USING(true), so the profiles row ALWAYS
// returns for any authenticated user. The "removed friend" / "stranger profile"
// state is signalled by friendsSince === null (no friendships row), NOT by
// profile === null. Consumers (Plan 06 screen) key the not-found UI on
// data?.friendsSince === null.
//
// Cache-key reuse: this hook owns queryKeys.friends.detail(friendId). That key
// is already declared in src/lib/queryKeys.ts:51 but was previously unused.
// PATTERNS §Corrections row 3 locks this reuse (vs. introducing a new
// friends.profile key) for taxonomy consistency with plans/expenses/habits.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export type StatusValue = 'free' | 'busy' | 'maybe';

export interface FriendProfileData {
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    birthday_month: number | null;
    birthday_day: number | null;
    birthday_year: number | null;
    timezone: string | null;
    bio: string | null;
  } | null;
  friendsSince: string | null; // ISO timestamp from friendships.created_at; null → friend-not-found
  status: StatusValue | null;
  contextTag: string | null;
  statusExpiresAt: string | null;
  lastActiveAt: string | null;
}

// Subset of the cache row stored at queryKeys.home.friends(userId).
interface HomeStatusSlice {
  user_id: string;
  effective_status: StatusValue | null;
  context_tag: string | null;
  status_expires_at: string | null;
  last_active_at: string | null;
}

export interface UseFriendProfileResult {
  data: FriendProfileData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useFriendProfile(friendId: string): UseFriendProfileResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.friends.detail(friendId),
    queryFn: async (): Promise<FriendProfileData | null> => {
      if (!userId) return null;

      // Step 1: profile row. profiles_select_authenticated RLS USING(true) means
      // this ALWAYS returns the row when id exists. (supabase as any) cast because
      // database.ts regen is deferred for bio (Phase 31/32 precedent).
      const profileRes = await (supabase as any)
        .from('profiles')
        .select(
          'display_name, username, avatar_url, birthday_month, birthday_day, birthday_year, timezone, bio'
        )
        .eq('id', friendId)
        .maybeSingle();
      if (profileRes.error) throw profileRes.error;

      // Step 2: friendships row (either direction, accepted only). Drives friendsSince
      // AND the friend-not-found signal.
      const friendshipRes = await supabase
        .from('friendships')
        .select('created_at')
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
        )
        .eq('status', 'accepted')
        .maybeSingle();
      if (friendshipRes.error) throw friendshipRes.error;

      // Step 3: status. Opportunistic shared-slice read from home cache; direct
      // fallback when home cache is empty (deep-link entry).
      const homeStatuses = queryClient.getQueryData<HomeStatusSlice[]>(
        queryKeys.home.friends(userId)
      );
      let statusRow: HomeStatusSlice | null =
        homeStatuses?.find((s) => s.user_id === friendId) ?? null;
      if (!statusRow) {
        const res = await supabase
          .from('effective_status')
          .select('user_id, effective_status, context_tag, status_expires_at, last_active_at')
          .eq('user_id', friendId)
          .maybeSingle();
        if (res.error) throw res.error;
        statusRow = (res.data as HomeStatusSlice | null) ?? null;
      }

      return {
        profile: profileRes.data ?? null,
        friendsSince: friendshipRes.data?.created_at ?? null,
        status: statusRow?.effective_status ?? null,
        contextTag: statusRow?.context_tag ?? null,
        statusExpiresAt: statusRow?.status_expires_at ?? null,
        lastActiveAt: statusRow?.last_active_at ?? null,
      };
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
