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

/** Subscribe to poll_votes changes for `pollId`. Returns unsubscribe.
 * Channel name is scoped by pollId so subscribing to the same poll from two
 * mount points shares ONE Supabase channel (refCount).
 *
 * Vote aggregation in the poll detail cache is a count over all rows for the
 * poll — INSERT / UPDATE / DELETE all invalidate the same polls.poll key.
 */
export function subscribePollVotes(
  queryClient: QueryClient,
  pollId: string,
): Unsubscribe {
  const channelName = `poll-votes-${pollId}`;
  const existing = registry.get(channelName);
  if (existing) {
    existing.refCount++;
    return () => releaseSubscription(channelName);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${pollId}` },
      (_payload) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.polls.poll(pollId) });
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

/** Subscribe to chat_room messages for a given channelId. Hybrid (research §Pattern 6):
 *    INSERT → setQueryData prepend with id-dedup (handles own-user optimistic replay)
 *    UPDATE → invalidateQueries (REPLICA IDENTITY default ships PK-only payloads)
 *    DELETE → setQueryData filter by id
 *
 * Channel name: `chat-${channelId}` (matches the pre-migration useChatRoom convention so
 * existing dev-client smoke tests are unaffected).
 *
 * Reactions and poll-vote events stay in their own subscriber helpers (subscribeReactions
 * is not yet bridged; subscribePollVotes already exists). This helper owns the
 * messages-table subscription only.
 */
export function subscribeChatRoom(
  queryClient: QueryClient,
  channelId: string,
): Unsubscribe {
  const channelName = `chat-${channelId}`;
  const existing = registry.get(channelName);
  if (existing) {
    existing.refCount++;
    return () => releaseSubscription(channelName);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      (payload: { new: { id?: string } & Record<string, unknown> }) => {
        const incoming = payload?.new;
        if (!incoming?.id) return;
        queryClient.setQueryData<any[]>(queryKeys.chat.messages(channelId), (old) => {
          if (!old) return old;
          // 1) Optimistic replacement: same client-generated id flagged pending
          const optimisticIdx = old.findIndex((m: any) => m.pending && m.id === incoming.id);
          if (optimisticIdx >= 0) {
            const next = [...old];
            next[optimisticIdx] = { ...(incoming as any), pending: false, failed: false };
            return next;
          }
          // 2) Server already mirrors this id — no-op dedup
          if (old.some((m: any) => m.id === incoming.id)) return old;
          // 3) New row — prepend (chat list is newest-first; inverted FlatList renders [0] at bottom)
          return [incoming, ...old];
        });
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(channelId) });
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      (payload: { old?: { id?: string } | null }) => {
        const removed = payload?.old ?? null;
        if (!removed?.id) return;
        queryClient.setQueryData<any[]>(queryKeys.chat.messages(channelId), (old) =>
          old?.filter((m: any) => m.id !== removed.id) ?? [],
        );
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

/** Subscribe to statuses changes for the caller's friend set. Returns unsubscribe.
 * Channel name is scoped by userId (not friendIds) so refCount works across renders
 * where friendIds changes (a friend being added/removed only invalidates the friends
 * list itself, not this subscription's cache key).
 *
 * effective_status (the read view) is computed from `statuses` + `last_active_at`;
 * subscribing to `statuses` covers the freshness updates the Home aggregate needs.
 * Aggregate semantics: any event type INSERT/UPDATE/DELETE invalidates the home
 * friends key (can't safely splice a view-derived aggregate from a single row).
 */
export function subscribeHomeStatuses(
  queryClient: QueryClient,
  userId: string,
  friendIds: string[],
): Unsubscribe {
  if (friendIds.length === 0) return () => {};

  const channelName = `home-statuses-${userId}`;
  const existing = registry.get(channelName);
  if (existing) {
    existing.refCount++;
    return () => releaseSubscription(channelName);
  }

  const filter = `user_id=in.(${friendIds.join(',')})`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'statuses', filter },
      (_payload) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.home.friends(userId) });
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
