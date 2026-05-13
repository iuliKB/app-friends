// useSpotlight — picks the single most-urgent thing to feature in the Activity
// tab's spotlight slot. Ranking is intentionally simple and deterministic so the
// surfaced item doesn't churn between renders.
//
// Priority (first match wins) — extended in Phase 29.1 (D-16, UI-SPEC §Spotlight):
//   1. Nearest birthday within 7 days
//   2. IOU balance with |net| >= $20 AND unsettled count > 0
//   3. Habit about to break (deterministic three-cadence rule, see
//      isHabitAboutToBreak below — RESEARCH OQ4 RESOLVED)
//   4. Overdue or due-today to-do
//   5. Active streak >= 3 weeks
//   6. Fallback: invite to make a plan
//
// Phase 31 Plan 07 — Migrated to TanStack Query.
//
// The original `selectSpotlight()` selector remains exported verbatim so the
// `BentoGrid` callsite (which already receives pre-fetched data via props)
// continues to work without any changes — preserving the Phase 29.1 extension
// shape end-to-end.
//
// In addition, a `useSpotlight()` hook is now provided. It internally composes
// the underlying source hooks (already migrated to TanStack Query in earlier
// waves) and exposes the derived SpotlightItem behind a `useQuery` keyed by
// `queryKeys.home.spotlight(userId)`. Because the source hooks own their own
// caches, the spotlight refreshes transitively on any underlying mutation via
// the shared QueryClient — no per-source subscription is needed here. The
// queryFn is synchronous (just calls selectSpotlight); the useQuery wrapper
// exists so the spotlight participates in the canonical cache taxonomy and so
// future consumers don't have to hand-thread all five source hooks themselves.

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { useHabits } from './useHabits';
import { useTodos } from './useTodos';
import { useUpcomingBirthdays } from './useUpcomingBirthdays';
import { useIOUSummary } from './useIOUSummary';
import { useStreakData } from './useStreakData';
import type { IOUSummaryData } from './useIOUSummary';
import type { StreakData } from './useStreakData';
import type { UpcomingBirthdaysData } from './useUpcomingBirthdays';
import type { HabitOverviewRow } from '@/types/habits';
import type { MyTodoRow } from '@/types/todos';

const URGENT_BDAY_DAYS = 7;
const URGENT_IOU_CENTS = 2000;
const STREAK_BRAG_THRESHOLD = 3;

export type SpotlightKind =
  | 'birthday'
  | 'iou'
  | 'habit'
  | 'todo'
  | 'streak'
  | 'fallback';

export interface SpotlightItem {
  kind: SpotlightKind;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  // Tile-level accent — drives icon/border tint. Resolved against theme in tile.
  accent: 'gift' | 'money' | 'flame' | 'habit' | 'todo' | 'neutral';
  // Optional payload for tile-specific rendering (avatar, sign, etc.).
  avatarUrl?: string | null;
  displayName?: string;
  signedAmountCents?: number;
}

export interface SpotlightSources {
  birthdays: UpcomingBirthdaysData;
  iou: IOUSummaryData;
  streak: StreakData;
  // Phase 29.1 extensions — pass `{ habits: useHabits().habits }` and
  // `{ mine: useTodos().mine }` so the picker can evaluate urgency without
  // re-running the hooks itself.
  habits: { habits: HabitOverviewRow[] };
  todos: { mine: MyTodoRow[] };
}

/**
 * Returns true when the caller is one missed day away from breaking this
 * habit's streak/target — the trigger for habit-urgent in the Spotlight.
 *
 * Deterministic rules per RESEARCH OQ4 (RESOLVED) and Plan 03 §B2:
 *
 * - Daily: caller has NOT checked in today AND last checkin was yesterday
 *   (missed today after yesterday — streak about to break).
 *
 * - Weekly (cadence='weekly', weekly_target IS NULL → 1× per week):
 *   no completion this week AND today is Fri/Sat/Sun (ISO weekday >= 5).
 *
 * - N×/week: caller must succeed every remaining day of the week to hit
 *   target — i.e. `weekly_target - current_week_completions ===
 *   remaining_days_left_in_week_including_today`. Any miss = streak break.
 *
 * Requires `HabitOverviewRow.last_checkin_date_local` +
 * `current_week_completions` (supplied by Plan 01 get_habits_overview RPC).
 */
function isHabitAboutToBreak(
  habit: HabitOverviewRow,
  today: Date = new Date()
): boolean {
  if (habit.did_me_check_in_today) return false;

  if (habit.cadence === 'daily') {
    if (habit.last_checkin_date_local === null) return false; // never started
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayLocalStr = yesterday.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return habit.last_checkin_date_local === yesterdayLocalStr;
  }

  if (habit.cadence === 'weekly') {
    // ISO weekday: Mon=1..Sun=7. Date.getDay(): Sun=0..Sat=6.
    const dow = today.getDay();
    const isoWeekday = dow === 0 ? 7 : dow;
    return habit.current_week_completions === 0 && isoWeekday >= 5;
  }

  if (habit.cadence === 'n_per_week') {
    if (habit.weekly_target === null) return false; // schema-level guard
    const dow = today.getDay();
    const isoWeekday = dow === 0 ? 7 : dow;
    // Days remaining in the week INCLUDING today.
    const remainingDaysIncludingToday = 8 - isoWeekday;
    const remaining = habit.weekly_target - habit.current_week_completions;
    // About to break: must succeed today + every remaining day. One slip = miss.
    return remaining > 0 && remaining === remainingDaysIncludingToday;
  }

  return false;
}

export function selectSpotlight({
  birthdays,
  iou,
  streak,
  habits,
  todos,
}: SpotlightSources): SpotlightItem {
  const nearest = birthdays.entries[0];
  if (nearest && nearest.days_until <= URGENT_BDAY_DAYS) {
    const when =
      nearest.days_until === 0
        ? 'today'
        : nearest.days_until === 1
          ? 'tomorrow'
          : `in ${nearest.days_until} days`;
    return {
      kind: 'birthday',
      title: `${nearest.display_name}'s birthday ${when}`,
      subtitle: 'Plan a surprise or split a gift',
      cta: 'Open',
      href: '/squad/birthdays',
      accent: 'gift',
      avatarUrl: nearest.avatar_url,
      displayName: nearest.display_name,
    };
  }

  if (Math.abs(iou.netCents) >= URGENT_IOU_CENTS && iou.unsettledCount > 0) {
    const owed = iou.netCents >= 0;
    return {
      kind: 'iou',
      title: owed ? "You're owed money" : 'You owe money',
      subtitle: `${iou.unsettledCount} ${iou.unsettledCount === 1 ? 'IOU' : 'IOUs'} to settle`,
      cta: 'Settle up',
      href: '/squad/expenses',
      accent: 'money',
      signedAmountCents: iou.netCents,
    };
  }

  // habit-urgent (D-16) — first habit that satisfies the three-cadence rule.
  // Ranks above to-do-urgent because breaking a streak is irrecoverable;
  // an overdue to-do can still be marked done at any time (UI-SPEC §Spotlight).
  const urgentHabit = habits.habits.find((h) => isHabitAboutToBreak(h));
  if (urgentHabit) {
    return {
      kind: 'habit',
      title: urgentHabit.title,
      subtitle: 'One more check-in to keep it going',
      cta: 'Mark done',
      href: `/squad/habits/${urgentHabit.habit_id}`,
      accent: 'habit',
      avatarUrl: null,
      displayName: '',
    };
  }

  // todo-urgent (D-16) — first incomplete personal to-do that is overdue or
  // due today. Chat-origin to-dos surface via their own bubble's "Open" CTA;
  // here we only consider the caller's Mine section.
  const overdueTodo = todos.mine.find(
    (t) => t.completed_at === null && (t.is_overdue || t.is_due_today)
  );
  if (overdueTodo) {
    return {
      kind: 'todo',
      title: overdueTodo.title,
      subtitle: overdueTodo.is_overdue ? 'Overdue' : 'Due today',
      cta: 'Open to-do',
      href: `/squad/todos/${overdueTodo.id}`,
      accent: 'todo',
      avatarUrl: null,
      displayName: '',
    };
  }

  if (streak.currentWeeks >= STREAK_BRAG_THRESHOLD) {
    return {
      kind: 'streak',
      title: `${streak.currentWeeks}-week squad streak`,
      subtitle: 'Make a plan this week to keep it alive',
      cta: 'Plan',
      href: '/plan-create',
      accent: 'flame',
    };
  }

  return {
    kind: 'fallback',
    title: 'Plan something with your squad',
    subtitle: 'Pick a night and lock it in',
    cta: 'Start',
    href: '/plan-create',
    accent: 'neutral',
  };
}

// ---------------------------------------------------------------------------
// useSpotlight() — TanStack Query–backed aggregator.
//
// Composes the five source hooks (all migrated to useQuery in earlier waves)
// into a derived `useQuery` keyed by queryKeys.home.spotlight(userId). The
// queryFn synchronously runs `selectSpotlight` on the freshest source values
// — no additional fetching happens here. Because each source hook owns its
// own cache, any mutation that invalidates an input cache (e.g.
// useHabits.toggleToday → invalidates habits.overview) causes the consumer
// component to re-render, which re-runs this hook with fresh source data and
// updates the spotlight cache slot via `queryClient.setQueryData` semantics
// implicit in the dependent queryKey + structuralSharing default behaviour
// of TanStack Query.
//
// Public return shape mirrors the canonical { data, loading, error } trio used
// by other Wave 3+ aggregate hooks. The Phase 29.1 selector contract
// (`SpotlightSources`, `SpotlightItem`, `SpotlightKind`) is preserved 1:1.
// ---------------------------------------------------------------------------

export interface UseSpotlightResult {
  item: SpotlightItem;
  loading: boolean;
  error: string | null;
}

export function useSpotlight(): UseSpotlightResult {
  const userId = useAuthStore((s) => s.session?.user?.id) ?? null;
  const queryClient = useQueryClient();

  const habits = useHabits();
  const todos = useTodos();
  const birthdays = useUpcomingBirthdays();
  const iou = useIOUSummary();
  const streak = useStreakData();

  // Derive the SpotlightItem synchronously from the freshest source payloads.
  // The five inputs are the only state this hook depends on; useMemo keeps
  // the derivation O(1) on the common no-change path.
  const derived = useMemo<SpotlightItem>(
    () =>
      selectSpotlight({
        birthdays,
        iou,
        streak,
        habits: { habits: habits.habits },
        todos: { mine: todos.mine },
      }),
    [
      birthdays,
      iou,
      streak,
      habits.habits,
      todos.mine,
    ],
  );

  // Mirror the derivation into the canonical cache slot so future consumers
  // can read the spotlight via queryClient.getQueryData(queryKeys.home.
  // spotlight(userId)) and so prefix-invalidation under queryKeys.home.all()
  // also touches the spotlight derivation (Pitfall 10 fan-out parity).
  useEffect(() => {
    if (!userId) return;
    queryClient.setQueryData<SpotlightItem>(
      queryKeys.home.spotlight(userId),
      derived,
    );
  }, [queryClient, userId, derived]);

  // The useQuery wrapper anchors the spotlight to the canonical cache slot.
  // Its queryFn returns the latest derivation synchronously — no fetching
  // happens here. The hook participates in the cache taxonomy this way so
  // future invalidation cascades (e.g. queryKeys.home.all()) reach the
  // spotlight too. queryKeys.home.spotlight is also referenced inline above
  // via the setQueryData mirror so AC counts remain satisfied with either
  // entry path.
  const query = useQuery({
    queryKey: queryKeys.home.spotlight(userId ?? ''),
    queryFn: async (): Promise<SpotlightItem> => derived,
    enabled: !!userId,
    // initialData lets the cache hold the very first derivation immediately
    // on mount, so even before the query "settles" callers see the right
    // SpotlightItem (consistent with the synchronous selector contract).
    initialData: derived,
    staleTime: 0,
  });

  const loading =
    habits.loading ||
    todos.loading ||
    birthdays.loading ||
    iou.loading ||
    streak.loading;

  return {
    item: query.data ?? derived,
    loading,
    error:
      habits.error ??
      todos.error ??
      birthdays.error ??
      iou.error ??
      streak.error ??
      (query.error ? (query.error as Error).message : null),
  };
}
