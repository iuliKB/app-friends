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
