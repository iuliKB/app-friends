// Phase 31 — Auth-state bridge for the query cache + the useStatusStore mirror.
// On SIGNED_OUT, calls removeQueries on the query client (NOT invalidateQueries, which would
// refetch with the now-expired session and get 401s — research Pitfall 4) AND clears
// useStatusStore.currentStatus so the notification dispatcher's outside-React read
// path in _layout.tsx returns null on the next access.
//
// Order matters: cache first, store second. The cache clear is the primary mitigation
// for T-31-04; the store clear is the load-bearing twin for the hybrid useStatus
// pattern shipped in Wave 6 Task 1 (the dispatcher reads from the store, not the
// cache).
//
// This module ONLY owns the cache + status-store clear side effects. Profile-setup
// state, session setter, etc. remain in _layout.tsx (existing onAuthStateChange block
// is preserved; attachAuthBridge runs ALONGSIDE it). The notification-side cleanup
// (cancelExpiryNotification + cancelMorningPrompt) is owned by useStatus.ts because
// it's a status-domain side effect, not a generic cache concern.
//
// T-31-04 + T-31-19: prevents per-user query data AND cached status from leaking to
// the next session — covers TSQ-10.

import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStatusStore } from '@/stores/useStatusStore';

type Unsubscribe = () => void;

export function attachAuthBridge(queryClient: QueryClient): Unsubscribe {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, _session) => {
    if (event === 'SIGNED_OUT') {
      queryClient.removeQueries();
      useStatusStore.getState().clear();
    }
    // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY, INITIAL_SESSION —
    // no cache clear. After removeQueries on the previous sign-out, the cache is empty
    // and per-user keys (queryKeys.*.list(userId), etc.) guarantee defense in depth.
  });

  return () => {
    subscription?.unsubscribe();
  };
}
