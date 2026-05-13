// Phase 31 — Auth-state bridge for the query cache.
// On SIGNED_OUT, calls queryClient.removeQueries() (NOT invalidateQueries, which would
// refetch with the now-expired session and get 401s — research Pitfall 4).
//
// This module ONLY owns the cache-clear side effect. Profile-setup state, session
// setter, etc. remain in _layout.tsx (existing onAuthStateChange block is preserved;
// attachAuthBridge runs ALONGSIDE it).
//
// T-31-04: prevents per-user query data leaking to the next session — covers TSQ-10.

import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Unsubscribe = () => void;

export function attachAuthBridge(queryClient: QueryClient): Unsubscribe {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, _session) => {
    if (event === 'SIGNED_OUT') {
      queryClient.removeQueries();
    }
    // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY, INITIAL_SESSION —
    // no cache clear. After removeQueries on the previous sign-out, the cache is empty
    // and per-user keys (queryKeys.*.list(userId), etc.) guarantee defense in depth.
  });

  return () => {
    subscription?.unsubscribe();
  };
}
