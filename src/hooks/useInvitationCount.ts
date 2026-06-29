// Phase 31 Plan 03 — Migrated to TanStack Query.
// Public shape preserved: { count, refetch }.
// Phase 33 — Realtime: subscribePlanInvitations pushes incoming plan invites from
// the creator's device (the 60s staleTime alone left the invitee stale until refresh).

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { subscribePlanInvitations } from '@/lib/realtimeBridge';

export function useInvitationCount(): { count: number; refetch: () => Promise<unknown> } {
  const userId = useAuthStore((s) => s.session?.user?.id) ?? null;
  const queryClient = useQueryClient();

  // Realtime subscription (ref-counted in the bridge — shares one channel with
  // useInvitations when both are mounted).
  useEffect(() => {
    if (!userId) return;
    return subscribePlanInvitations(queryClient, userId);
  }, [queryClient, userId]);

  const query = useQuery({
    queryKey: queryKeys.home.invitationCount(userId ?? ''),
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('plan_members')
        .select('plan_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('rsvp', 'invited');
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
