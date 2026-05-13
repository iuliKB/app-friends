// Phase 31 — TanStack Query client factory.
// Module-scope singleton FACTORY (not a singleton instance): each call returns a new
// QueryClient with project defaults. _layout.tsx instantiates it lazily via
// useState(() => createQueryClient()) so Hot Module Reload double-mounts don't share
// an accidentally-shared cache.
//
// Defaults rationale (research §Pattern 1):
// - staleTime 60_000 (1 min) — tab-bounces inside the window are cache hits, not refetches.
//   Realtime events keep cache fresh for tables with subscriptions; staleTime covers everything else.
// - gcTime 5*60_000 (5 min) — default; bumped to 24h in Wave 8 when PersistQueryClientProvider lands.
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
        gcTime: 5 * 60_000,
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
