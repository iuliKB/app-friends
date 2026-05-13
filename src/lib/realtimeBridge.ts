// Phase 31 — Supabase Realtime → query cache bridge.
// Owns ALL Supabase channel lifecycles in the app. Hooks call subscribeXxx()
// helpers; this module deduplicates by channel name via ref-counting so two
// screens consuming the same data open ONE Supabase channel (TSQ-05).
//
// Hybrid strategy (research §Pattern 6):
//   INSERT / DELETE  → setQueryData (cheap, payload has the full row / minimum key)
//   UPDATE           → invalidateQueries (avoids "missed-field" bug since
//                        Postgres default REPLICA IDENTITY ships only PK in payload.new)
//
// Habits is an aggregation RPC (get_habits_overview), so even INSERT/DELETE invalidate
// here — there's no way to safely splice an aggregate from a payload row. Per-table
// semantics live with each subscribeXxx() helper as it's added (Waves 3-7).

import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

type Unsubscribe = () => void;

interface RegistryEntry {
  refCount: number;
  teardown: () => void;
}

// Channel-name → entry. Module-scope; survives hot-reload as long as the module is not
// re-executed (acceptable risk — full RHR is rare in this codebase).
const registry = new Map<string, RegistryEntry>();

function releaseSubscription(channelName: string) {
  const entry = registry.get(channelName);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.teardown();
    registry.delete(channelName);
  }
}

/** Test-only — clear all subscriptions. Call in jest afterEach. */
export function _resetRealtimeBridgeForTests() {
  registry.forEach((entry) => entry.teardown());
  registry.clear();
}

/** Subscribe to habit_checkins changes for `userId`. Returns an unsubscribe fn.
 * Multiple calls with the same userId share ONE Supabase channel (refCount).
 * `today` is captured in the closure so invalidation targets today's overview key.
 */
export function subscribeHabitCheckins(
  queryClient: QueryClient,
  userId: string,
  today: string,
): Unsubscribe {
  const channelName = `habit-checkins-${userId}`;
  const existing = registry.get(channelName);
  if (existing) {
    existing.refCount++;
    return () => releaseSubscription(channelName);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'habit_checkins', filter: `user_id=eq.${userId}` },
      (_payload) => {
        // get_habits_overview is an aggregation — payload.new can't be spliced safely.
        // INSERT, UPDATE, DELETE all invalidate the same overview key.
        void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(today) });
      },
    )
    .subscribe();

  registry.set(channelName, {
    refCount: 1,
    teardown: () => {
      void supabase.removeChannel(channel);
    },
  });

  return () => releaseSubscription(channelName);
}
