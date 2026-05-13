// Phase 31 — Shared test helper. Every migrated hook's test wraps its
// `renderHook` call with this wrapper to provide a QueryClientProvider.
// Without it, hooks calling useQueryClient() throw at test time (Pitfall 9).
//
// retry: false is critical — otherwise failing mutations retry on a setTimeout
// and balloon test runtime.

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, wrapper };
}
