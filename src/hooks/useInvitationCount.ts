// Phase 31 Plan 03 — Migrated to TanStack Query.
// Public shape preserved: { count, refetch }.
// staleTime (global 60s default) replaces the pre-migration focus-refetch trigger.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export function useInvitationCount(): { count: number; refetch: () => Promise<unknown> } {
  const userId = useAuthStore((s) => s.session?.user?.id) ?? null;

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
