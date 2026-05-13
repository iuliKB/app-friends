// Phase 31 Plan 02 — Migrated to TanStack Query.
// Public shape (UseHabitsResult) is identical to pre-migration so callers don't change.
// Optimistic snapshot is now carried by TanStack Query's `ctx` from onMutate (no
// hand-rolled ref mirror needed). (supabase as any) casts at RPC sites stay —
// database.ts regeneration is deferred (Phase 29.1 decision in STATE.md).

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { todayLocal } from '@/lib/dateLocal';
import { queryKeys } from '@/lib/queryKeys';
import { subscribeHabitCheckins } from '@/lib/realtimeBridge';
import type { HabitOverviewRow } from '@/types/habits';

export interface UseHabitsResult {
  habits: HabitOverviewRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  toggleToday: (habitId: string) => Promise<{ error: string | null }>;
}

export function useHabits(): UseHabitsResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const today = todayLocal();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.habits.overview(today),
    queryFn: async (): Promise<HabitOverviewRow[]> => {
      const { data, error } = await (supabase as any).rpc('get_habits_overview', {
        p_date_local: today,
      });
      if (error) throw error;
      return ((data ?? []) as unknown) as HabitOverviewRow[];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    return subscribeHabitCheckins(queryClient, userId, today);
  }, [queryClient, userId, today]);

  const toggleMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await (supabase as any).rpc('toggle_habit_today_checkin', {
        p_habit_id: habitId,
        p_date_local: today,
      });
      if (error) throw error;
    },
    onMutate: async (habitId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.habits.overview(today) });
      const previous = queryClient.getQueryData<HabitOverviewRow[]>(
        queryKeys.habits.overview(today),
      );
      queryClient.setQueryData<HabitOverviewRow[]>(
        queryKeys.habits.overview(today),
        (old) =>
          old?.map((h) => {
            if (h.habit_id !== habitId) return h;
            const next = !h.did_me_check_in_today;
            return {
              ...h,
              did_me_check_in_today: next,
              completed_today: next ? h.completed_today + 1 : Math.max(0, h.completed_today - 1),
            };
          }) ?? [],
      );
      return { previous };
    },
    onError: (_err, _habitId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.habits.overview(today), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(today) });
    },
  });

  return {
    habits: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    toggleToday: async (habitId: string) => {
      try {
        await toggleMutation.mutateAsync(habitId);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'toggle failed' };
      }
    },
  };
}
