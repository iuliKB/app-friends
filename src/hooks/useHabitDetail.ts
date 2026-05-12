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

    // Parallel fetch: habit row + members + last-30-day check-ins.
    // habit_members.user_id references auth.users(id), so PostgREST cannot embed
    // public.profiles directly — fetch members first, then profiles by id (same
    // pattern as useGroupMembers). database.ts not regenerated since 0024, so
    // (supabase as any) cast at the new table call sites.
    const [
      { data: habitRow, error: habitErr },
      { data: memberRows, error: memberErr },
      { data: checkinRows, error: checkinErr },
    ] = await Promise.all([
      (supabase as any).from('habits').select('*').eq('id', habitId).single(),
      (supabase as any).from('habit_members').select('*').eq('habit_id', habitId),
      (supabase as any)
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
      setLoading(false);
      return;
    }

    const memberRowsTyped = ((memberRows ?? []) as unknown) as Array<{
      habit_id: string;
      user_id: string;
      accepted_at: string | null;
      joined_at: string;
    }>;

    let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (memberRowsTyped.length > 0) {
      const userIds = memberRowsTyped.map((m) => m.user_id);
      const { data: profileRows, error: profErr } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      if (profErr) {
        console.warn('useHabitDetail: failed to load profiles', profErr);
      } else {
        profilesById = Object.fromEntries(
          (((profileRows ?? []) as unknown) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>).map(
            (p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]
          )
        );
      }
    }

    setHabit((habitRow as unknown) as Habit | null);
    setMembers(
      memberRowsTyped.map((r) => ({
        habit_id: r.habit_id,
        user_id: r.user_id,
        accepted_at: r.accepted_at,
        joined_at: r.joined_at,
        display_name: profilesById[r.user_id]?.display_name ?? '',
        avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
      }))
    );
    setCheckins(((checkinRows ?? []) as unknown) as HabitCheckin[]);
    setLoading(false);
  }, [userId, habitId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { habit, members, checkins, loading, error, refetch };
}
