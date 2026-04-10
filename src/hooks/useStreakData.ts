// Phase 4 v1.3 — useStreakData hook (STREAK-01 / D-06, D-17).
// Wraps the public.get_squad_streak(viewer_id, tz) RPC applied by Plan 02.
// Device tz is resolved at call time per D-06 (NOT read from the DB profile column).
// Errors are silent per D-17: fall back to zero state, warn to console.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface StreakData {
  currentWeeks: number;
  bestWeeks: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [currentWeeks, setCurrentWeeks] = useState(0);
  const [bestWeeks, setBestWeeks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setCurrentWeeks(0);
      setBestWeeks(0);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_squad_streak', {
      viewer_id: userId,
      tz: getDeviceTimezone(),
    });
    if (rpcErr) {
      // D-17: silent error — fall back to zero state, warn to console.
      console.warn('get_squad_streak failed', rpcErr);
      setError(rpcErr.message);
      setCurrentWeeks(0);
      setBestWeeks(0);
    } else if (data && Array.isArray(data) && data.length > 0) {
      const row = data[0] as { current_weeks: number | null; best_weeks: number | null };
      setCurrentWeeks(row.current_weeks ?? 0);
      setBestWeeks(row.best_weeks ?? 0);
    } else {
      setCurrentWeeks(0);
      setBestWeeks(0);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { currentWeeks, bestWeeks, loading, error, refetch };
}
