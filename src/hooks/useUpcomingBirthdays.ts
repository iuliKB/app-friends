// Phase 31 Plan 03 — Migrated to TanStack Query.
// Wraps the public.get_upcoming_birthdays() RPC.
// Public shape preserved: { entries, loading, error, refetch }.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface BirthdayEntry {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  birthday_month: number;
  birthday_day: number;
  birthday_year: number | null; // null for legacy profiles without year (D-03)
  days_until: number;
}

export interface UpcomingBirthdaysData {
  entries: BirthdayEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useUpcomingBirthdays(): UpcomingBirthdaysData {
  const userId = useAuthStore((s) => s.session?.user?.id) ?? null;

  const query = useQuery({
    queryKey: queryKeys.home.upcomingBirthdays(userId ?? ''),
    queryFn: async (): Promise<BirthdayEntry[]> => {
      const { data, error } = await supabase.rpc('get_upcoming_birthdays');
      if (error) throw error;
      return ((data ?? []) as unknown) as BirthdayEntry[];
    },
    enabled: !!userId,
  });

  return {
    entries: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
