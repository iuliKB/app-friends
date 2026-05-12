// Phase 29.1 Plan 03 — useHabits hook.
// Wraps the `get_habits_overview(p_date_local)` and `toggle_habit_today_checkin`
// RPCs from migration 0024 (Plan 01). Returns a reactive list of habits the
// caller is an accepted member of, plus an optimistic toggle mutator.
//
// Patterns:
//   - Clone shape of `useIOUSummary` (refetch + loading + error tri-state).
//   - Optimistic snapshot+revert from `useChatRoom.addReaction:670-742`
//     (capture snapshot INSIDE the updater to avoid stale-closure reads —
//     Pitfall 3 of RESEARCH.md).
//   - Single per-user Realtime channel `user-${userId}-checkins` filtered
//     by `user_id=eq.${userId}` (Pitfall 4 — never per-habit channels).
//
// Errors are silent: fall back to empty state, warn to console.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { todayLocal } from '@/lib/dateLocal';
import type { HabitOverviewRow } from '@/types/habits';

export interface UseHabitsResult {
  habits: HabitOverviewRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggleToday: (habitId: string) => Promise<{ error: string | null }>;
}

type ChannelHandle = ReturnType<typeof supabase.channel>;

export function useHabits(): UseHabitsResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [habits, setHabits] = useState<HabitOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ChannelHandle | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setHabits([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_habits_overview', {
      p_date_local: todayLocal(),
    });
    if (rpcErr) {
      console.warn('get_habits_overview failed', rpcErr);
      setError(rpcErr.message);
      setHabits([]);
    } else {
      setHabits(((data ?? []) as unknown) as HabitOverviewRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Single per-user Realtime channel (Pitfall 4 — never per-habit).
  // Filter is `user_id=eq.${userId}` so the channel only fires for the
  // caller's own check-ins. Co-member updates on group habits are picked up
  // by the next `refetch()` triggered by screen focus or pull-to-refresh —
  // a per-group fan-out would blow the free-tier connection budget for any
  // user belonging to multiple groups.
  useEffect(() => {
    if (!userId) return;
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const filter = `user_id=eq.${userId}`;
    channelRef.current = supabase
      .channel(`user-${userId}-checkins`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habit_checkins', filter },
        () => {
          void refetch();
        }
      )
      .subscribe();
    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, refetch]);

  const toggleToday = useCallback(
    async (habitId: string): Promise<{ error: string | null }> => {
      // Snapshot+revert pattern (Pitfall 3, Pattern 6).
      // Capture from latest state INSIDE the updater so we never read a stale
      // closure variable. The first setHabits call is a no-op write that
      // exists only to grab the snapshot from React's latest committed state.
      let preSnapshot: HabitOverviewRow | null = null;
      setHabits((prev) => {
        preSnapshot = prev.find((h) => h.habit_id === habitId) ?? null;
        return prev;
      });
      if (!preSnapshot) return { error: 'habit-not-found' };

      // Optimistic flip — toggle did_me_check_in_today and bump/decrement
      // completed_today so the row's "X/Y done today" badge updates without
      // waiting for the server roundtrip.
      setHabits((prev) =>
        prev.map((h) => {
          if (h.habit_id !== habitId) return h;
          const next = !h.did_me_check_in_today;
          return {
            ...h,
            did_me_check_in_today: next,
            completed_today: next
              ? h.completed_today + 1
              : Math.max(0, h.completed_today - 1),
          };
        })
      );

      const { error: rpcErr } = await supabase.rpc('toggle_habit_today_checkin', {
        p_habit_id: habitId,
        p_date_local: todayLocal(),
      });
      if (rpcErr) {
        // Revert to snapshot — replace the row with the pre-toggle state.
        const snap = preSnapshot;
        setHabits((prev) =>
          prev.map((h) => (h.habit_id === habitId && snap ? snap : h))
        );
        return { error: rpcErr.message };
      }
      return { error: null };
    },
    []
  );

  return { habits, loading, error, refetch, toggleToday };
}
