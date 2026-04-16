// Phase 7 — useUpcomingBirthdays hook (BDAY-02, BDAY-03).
// Wraps the public.get_upcoming_birthdays() RPC (created in migration 0016).
// RPC returns friends sorted by days_until ASC; only accepted friends with birthday set.
// Errors are silent: fall back to empty state, warn to console.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface BirthdayEntry {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  birthday_month: number;
  birthday_day: number;
  birthday_year: number | null; // Phase 11 v1.4 — null for legacy profiles without year (D-03)
  days_until: number;
}

export interface UpcomingBirthdaysData {
  entries: BirthdayEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUpcomingBirthdays(): UpcomingBirthdaysData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [entries, setEntries] = useState<BirthdayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setEntries([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_upcoming_birthdays');
    if (rpcErr) {
      console.warn('get_upcoming_birthdays failed', rpcErr);
      setError(rpcErr.message);
      setEntries([]);
    } else {
      setEntries((data ?? []) as BirthdayEntry[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { entries, loading, error, refetch };
}
