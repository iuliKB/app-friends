// Phase 31 Plan 03 — Migrated to TanStack Query.
// Public shape preserved: { count, refetch }.
// Phase 33 — Realtime: subscribeFriendRequests pushes incoming requests from
// other devices (the 60s staleTime alone left the recipient stale until refresh).

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { subscribeFriendRequests } from '@/lib/realtimeBridge';

export function usePendingRequestsCount(): { count: number; refetch: () => Promise<unknown> } {
  const userId = useAuthStore((s) => s.session?.user?.id) ?? null;
  const queryClient = useQueryClient();

  // Realtime subscription (ref-counted in the bridge — shares one channel with
  // useFriends when both are mounted).
  useEffect(() => {
    if (!userId) return;
    return subscribeFriendRequests(queryClient, userId);
  }, [queryClient, userId]);

  const query = useQuery({
    queryKey: queryKeys.home.pendingRequestCount(userId ?? ''),
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', userId)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });

  return {
    count: query.data ?? 0,
    refetch: query.refetch,
  };
}
