// Phase 31 — Opt-in focus-refetch hook.
//
// Most screens do NOT need this — the QueryClient's staleTime: 60_000 default makes
// tab-bounces inside the window cache hits. Use this hook ONLY on screens that MUST
// see fresh data on every entry (e.g., chat unread counts right after settling an IOU,
// or a list right after a return from a sub-screen that mutated it but whose mutator
// didn't invalidate this query).
//
// Skips the FIRST focus event (the initial mount) so it doesn't double-fetch
// alongside useQuery's mount fetch.

import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

export function useRefreshOnFocus(queryKey?: QueryKey) {
  const queryClient = useQueryClient();
  const firstTime = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTime.current) {
        firstTime.current = false;
        return;
      }
      void queryClient.refetchQueries(
        queryKey
          ? { queryKey, stale: true, type: 'active' }
          : { stale: true, type: 'active' },
      );
    }, [queryClient, queryKey]),
  );
}
