// Phase 29.1 Plan 03 — useHabitDetail hook.
// Fetches detail of a single habit: the habit row, all its members (with
// joined profile info for display), and the last 30 days of check-ins for
// the history view on /squad/habits/[id].
//
// Errors are silent: fall back to nullable detail, warn to console.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Habit, HabitMember, HabitCheckin } from '@/types/habits';

export interface HabitDetailMember extends HabitMember {
  display_name: string;
  avatar_url: string | null;
}

export interface HabitDetailData {
  habit: Habit | null;
  members: HabitDetailMember[];
  checkins: HabitCheckin[]; // most recent 30 days, ordered date_local DESC
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function dateMinus30(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function useHabitDetail(habitId: string): HabitDetailData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [members, setMembers] = useState<HabitDetailMember[]>([]);
  const [checkins, setCheckins] = useState<HabitCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !habitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Parallel fetch: habit row + members (with profile join) + last-30-day check-ins.
    const [
      { data: habitRow, error: habitErr },
      { data: memberRows, error: memberErr },
      { data: checkinRows, error: checkinErr },
    ] = await Promise.all([
      supabase.from('habits').select('*').eq('id', habitId).single(),
      supabase
        .from('habit_members')
        .select(
          '*, profiles!habit_members_user_id_fkey(display_name, avatar_url)'
        )
        .eq('habit_id', habitId),
      supabase
        .from('habit_checkins')
        .select('*')
        .eq('habit_id', habitId)
        .gte('date_local', dateMinus30())
        .order('date_local', { ascending: false }),
    ]);

    if (habitErr || memberErr || checkinErr) {
      const msg =
        habitErr?.message ?? memberErr?.message ?? checkinErr?.message ?? 'unknown';
      console.warn('useHabitDetail fetch failed', msg);
      setError(msg);
    } else {
      setHabit((habitRow as unknown) as Habit | null);
      setMembers(
        ((memberRows ?? []) as unknown[]).map((row) => {
          const r = row as {
            habit_id: string;
            user_id: string;
            accepted_at: string | null;
            joined_at: string;
            profiles?: { display_name: string | null; avatar_url: string | null } | null;
          };
          return {
            habit_id: r.habit_id,
            user_id: r.user_id,
            accepted_at: r.accepted_at,
            joined_at: r.joined_at,
            display_name: r.profiles?.display_name ?? '',
            avatar_url: r.profiles?.avatar_url ?? null,
          };
        })
      );
      setCheckins(((checkinRows ?? []) as unknown) as HabitCheckin[]);
    }
    setLoading(false);
  }, [userId, habitId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { habit, members, checkins, loading, error, refetch };
}
