// Phase 31 — TanStack Query client factory.
// Module-scope singleton FACTORY (not a singleton instance): each call returns a new
// QueryClient with project defaults. _layout.tsx instantiates it lazily via
// useState(() => createQueryClient()) so Hot Module Reload double-mounts don't share
// an accidentally-shared cache.
//
// Defaults rationale (research §Pattern 1):
// - staleTime 60_000 (1 min) — tab-bounces inside the window are cache hits, not refetches.
//   Realtime events keep cache fresh for tables with subscriptions; staleTime covers everything else.
// - gcTime 24h — bumped from the pre-Wave-8 default (5 min) so persisted queries are
//   not garbage-collected before they can be restored from AsyncStorage. The persister
//   `maxAge` in src/app/_layout.tsx is also 24h; the two must be aligned.
// - refetchOnWindowFocus false — RN does not fire window 'focus'; focusManager.setFocused covers app foreground.
// - refetchOnReconnect true — onlineManager + NetInfo (wired in _layout.tsx) drives this.
// - retry on read: skip 401/403/404 (auth/permission issues are NOT transient), otherwise retry up to 2x.
// - retry on mutation: 0 — optimistic mutations roll back on error; retry would compound the bug.

import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Bumped from 5min to 24 * 60 * 60 * 1000 in Wave 8 to enable persistence per
        // research §Persistence Recommendation. The PersistQueryClientProvider's
        // maxAge in src/app/_layout.tsx is set to the same window so persisted
        // queries are restored before gc reaps them.
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error: unknown) => {
          const e = error as { code?: unknown; status?: unknown } | null | undefined;
          const code = e?.code;
          const status = e?.status;
          if (code === '401' || code === '403' || code === '404') return false;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
