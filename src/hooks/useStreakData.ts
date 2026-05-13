// Phase 4 v1.3 — useStreakData hook (STREAK-01 / D-06, D-17).
// Wraps the public.get_squad_streak(viewer_id, tz) RPC applied by Plan 02.
// Device tz is resolved at call time per D-06 (NOT read from the DB profile column).
// Errors are silent per D-17: fall back to zero state, warn to console.
//
// Phase 31 Plan 07 — Migrated to TanStack Query.
//
// Public shape (StreakData) preserved verbatim so the 3 consumers
// (HomeScreen YourZoneSection, squad.tsx, BentoGrid via prop) don't change:
//   { currentWeeks, bestWeeks, loading, error, refetch }.
//
// Cache key: queryKeys.habits.streak(userId). Lives in the habits namespace
// (NOT a separate "streak" namespace) so invalidateQueries({queryKey:
// queryKeys.habits.all()}) refreshes BOTH the per-habit overview AND the
// squad-level streak in one prefix sweep. Note: the Wave 2 useHabits.toggleToday
// invalidation set intentionally targets only queryKeys.habits.overview(today)
// — toggling a habit check-in does NOT necessarily change the streak (server
// computes streak in an end-of-day batch). If a manual smoke later shows the
// streak tile is stale after a habit toggle, the fix is to broaden Wave 2's
// invalidation to queryKeys.habits.all().

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface StreakData {
  currentWeeks: number;
  bestWeeks: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

interface StreakRow {
  current_weeks: number | null;
  best_weeks: number | null;
}

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Hermes iOS fallback: if we got 'UTC' but offset is non-zero, it's lying.
    // We still pass 'UTC' here — the SQL function will honor it, matching the
    // fail-open contract from Phase 3 D-16.
    if (!tz) return 'UTC';
    return tz;
  } catch {
    return 'UTC';
  }
}

export function useStreakData(): StreakData {
  const userId = useAuthStore((s) => s.session?.user?.id) ?? null;

  const query = useQuery({
    queryKey: queryKeys.habits.streak(userId ?? ''),
    queryFn: async (): Promise<StreakRow> => {
      const { data, error } = await supabase.rpc('get_squad_streak', {
        viewer_id: userId,
        tz: getDeviceTimezone(),
      });
      if (error) {
        // D-17: silent error — surface via query.error, but caller falls back
        // to zero state through the return mapping below.
        console.warn('get_squad_streak failed', error);
        throw error;
      }
      if (data && Array.isArray(data) && data.length > 0) {
        const row = data[0] as StreakRow;
        return { current_weeks: row.current_weeks ?? 0, best_weeks: row.best_weeks ?? 0 };
      }
      return { current_weeks: 0, best_weeks: 0 };
    },
    enabled: !!userId,
  });

  return {
    currentWeeks: query.data?.current_weeks ?? 0,
    bestWeeks: query.data?.best_weeks ?? 0,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
