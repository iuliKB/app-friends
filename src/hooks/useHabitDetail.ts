// Phase 31 Plan 02 — Migrated useHabitDetail to useQuery.
// Public shape preserved. One useQuery whose queryFn performs Promise.all reads
// (habit row + members + 30-day checkins + profile join) and returns a composite.
// Reads stay parallel; only the surrounding state plumbing changes.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import type { Habit, HabitMember, HabitCheckin } from '@/types/habits';

export interface HabitDetailMember extends HabitMember {
  display_name: string;
  avatar_url: string | null;
}

interface HabitDetailComposite {
  habit: Habit | null;
  members: HabitDetailMember[];
  checkins: HabitCheckin[];
}

export interface HabitDetailData {
  habit: Habit | null;
  members: HabitDetailMember[];
  checkins: HabitCheckin[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
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

  const query = useQuery({
    queryKey: queryKeys.habits.detail(habitId),
    queryFn: async (): Promise<HabitDetailComposite> => {
      // habit_members.user_id → auth.users(id); PostgREST cannot embed profiles
      // directly, so we fetch members then profiles. (supabase as any) casts at new
      // tables (database.ts not regenerated since 0024).
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

      if (habitErr) throw habitErr;
      if (memberErr) throw memberErr;
      if (checkinErr) throw checkinErr;

      type MemberRow = { habit_id: string; user_id: string; accepted_at: string | null; joined_at: string };
      type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null };
      const memberRowsTyped = ((memberRows ?? []) as unknown) as MemberRow[];
      let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (memberRowsTyped.length > 0) {
        const userIds = memberRowsTyped.map((m) => m.user_id);
        const { data: profileRows, error: profErr } = await supabase
          .from('profiles').select('id, display_name, avatar_url').in('id', userIds);
        if (profErr) throw profErr;
        profilesById = Object.fromEntries(
          (((profileRows ?? []) as unknown) as ProfileRow[]).map((p) => [
            p.id, { display_name: p.display_name, avatar_url: p.avatar_url },
          ]),
        );
      }
      const members: HabitDetailMember[] = memberRowsTyped.map((r) => ({
        habit_id: r.habit_id,
        user_id: r.user_id,
        accepted_at: r.accepted_at,
        joined_at: r.joined_at,
        display_name: profilesById[r.user_id]?.display_name ?? '',
        avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
      }));

      return {
        habit: ((habitRow as unknown) as Habit | null) ?? null,
        members,
        checkins: ((checkinRows ?? []) as unknown) as HabitCheckin[],
      };
    },
    enabled: !!userId && !!habitId,
  });

  return {
    habit: query.data?.habit ?? null,
    members: query.data?.members ?? [],
    checkins: query.data?.checkins ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
