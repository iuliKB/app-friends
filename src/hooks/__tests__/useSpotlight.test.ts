/**
 * useSpotlight test — Phase 29.1 Plan 03 (Wave 0).
 *
 * Verifies the priority cascade extension (D-16):
 *   birthday > iou-large > habit-urgent > todo-urgent > streak > fallback.
 *
 * Habit-urgent is derived from the OQ4 three-cadence rule applied to
 * `HabitOverviewRow.last_checkin_date_local` + `current_week_completions`.
 * Todo-urgent is derived from `MyTodoRow.is_overdue || is_due_today`.
 *
 * Run: npx jest --testPathPatterns="useSpotlight" --no-coverage
 */

import type { IOUSummaryData } from '../useIOUSummary';
import type { StreakData } from '../useStreakData';
import type { UpcomingBirthdaysData } from '../useUpcomingBirthdays';
import type { HabitOverviewRow } from '@/types/habits';
import type { MyTodoRow } from '@/types/todos';
import { selectSpotlight } from '../useSpotlight';

const emptyIOU: IOUSummaryData = {
  rows: [],
  netCents: 0,
  unsettledCount: 0,
  loading: false,
  error: null,
  refetch: jest.fn(),
};
const emptyStreak: StreakData = {
  currentWeeks: 0,
  bestWeeks: 0,
  loading: false,
  error: null,
  refetch: jest.fn(),
};
const emptyBirthdays: UpcomingBirthdaysData = {
  entries: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
};
const emptyHabits: { habits: HabitOverviewRow[] } = { habits: [] };
const emptyTodos: { mine: MyTodoRow[] } = { mine: [] };

function yesterdayLocalStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function urgentDailyHabit(): HabitOverviewRow {
  return {
    habit_id: 'h1',
    title: 'Run',
    cadence: 'daily',
    weekly_target: null,
    is_solo: true,
    members_total: 1,
    completed_today: 0,
    did_me_check_in_today: false,
    last_checkin_date_local: yesterdayLocalStr(),
    current_week_completions: 0,
  };
}

function overdueTodo(): MyTodoRow {
  return {
    id: 't1',
    title: 'Pay rent',
    due_date: '2026-05-01',
    notes: null,
    priority: 'high',
    completed_at: null,
    created_at: '2026-04-15',
    is_overdue: true,
    is_due_today: false,
  };
}

describe('selectSpotlight (Phase 29.1 D-16)', () => {
  it('returns habit-urgent before todo-urgent (UI-SPEC priority order)', () => {
    const habits = { habits: [urgentDailyHabit()] };
    const todos = { mine: [overdueTodo()] };
    const result = selectSpotlight({
      iou: emptyIOU,
      streak: emptyStreak,
      birthdays: emptyBirthdays,
      habits,
      todos,
    });
    expect(result.kind).toBe('habit');
  });

  it('returns todo-urgent when no habit-urgent + has overdue todo', () => {
    const todos = { mine: [overdueTodo()] };
    const result = selectSpotlight({
      iou: emptyIOU,
      streak: emptyStreak,
      birthdays: emptyBirthdays,
      habits: emptyHabits,
      todos,
    });
    expect(result.kind).toBe('todo');
  });

  it('birthday outranks habit and todo (existing priority preserved)', () => {
    const birthdays: UpcomingBirthdaysData = {
      ...emptyBirthdays,
      entries: [
        {
          friend_id: 'u2',
          display_name: 'Sam',
          avatar_url: null,
          birthday_month: 5,
          birthday_day: 14,
          birthday_year: null,
          days_until: 2,
        },
      ],
    };
    const habits = { habits: [urgentDailyHabit()] };
    const todos = { mine: [overdueTodo()] };
    const result = selectSpotlight({
      iou: emptyIOU,
      streak: emptyStreak,
      birthdays,
      habits,
      todos,
    });
    expect(result.kind).toBe('birthday');
  });

  it('falls back to neutral when nothing is urgent', () => {
    const result = selectSpotlight({
      iou: emptyIOU,
      streak: emptyStreak,
      birthdays: emptyBirthdays,
      habits: emptyHabits,
      todos: emptyTodos,
    });
    expect(result.kind).toBe('fallback');
  });

  it('todo-urgent matches due_today even when not overdue', () => {
    const dueTodayTodo: MyTodoRow = {
      ...overdueTodo(),
      is_overdue: false,
      is_due_today: true,
    };
    const result = selectSpotlight({
      iou: emptyIOU,
      streak: emptyStreak,
      birthdays: emptyBirthdays,
      habits: emptyHabits,
      todos: { mine: [dueTodayTodo] },
    });
    expect(result.kind).toBe('todo');
    expect(result.subtitle).toMatch(/due today/i);
  });
});
