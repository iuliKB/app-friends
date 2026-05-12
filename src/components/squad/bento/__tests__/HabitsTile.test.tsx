/**
 * HabitsTile test scaffold — Phase 29.1 Plan 04 Wave 0.
 *
 * Asserts: title copy, "X/Y done today" hero metric, empty state, loading
 * skeleton. Tests are intentionally Wave 0 — they will FAIL (RED) until
 * Task 2 creates HabitsTile.tsx with the expected behavior.
 *
 * Run: npx jest --testPathPatterns="HabitsTile" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { HabitsTile } from '../HabitsTile';
import type { UseHabitsResult } from '@/hooks/useHabits';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

function mockHabits(overrides: Partial<UseHabitsResult> = {}): UseHabitsResult {
  return {
    habits: [],
    loading: false,
    error: null,
    refetch: jest.fn(async () => {}),
    toggleToday: jest.fn(async () => ({ error: null })),
    ...overrides,
  };
}

function renderTile(habits: UseHabitsResult) {
  return render(
    <ThemeProvider>
      <HabitsTile habits={habits} />
    </ThemeProvider>
  );
}

describe('HabitsTile', () => {
  it('renders title "Habits" (D-01)', () => {
    const { getByText } = renderTile(mockHabits());
    expect(getByText('Habits')).toBeTruthy();
  });

  it('shows "X/Y done today" hero metric (D-08, D-17)', () => {
    const { getByText } = renderTile(
      mockHabits({
        habits: [
          {
            habit_id: 'a',
            title: 'A',
            cadence: 'daily',
            weekly_target: null,
            is_solo: true,
            members_total: 1,
            completed_today: 1,
            did_me_check_in_today: true,
            last_checkin_date_local: null,
            current_week_completions: 0,
          },
          {
            habit_id: 'b',
            title: 'B',
            cadence: 'daily',
            weekly_target: null,
            is_solo: true,
            members_total: 1,
            completed_today: 0,
            did_me_check_in_today: false,
            last_checkin_date_local: null,
            current_week_completions: 0,
          },
        ],
      })
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('/2')).toBeTruthy();
  });

  it('shows "0/0" muted when no habits (UI-SPEC empty state)', () => {
    const { getByText } = renderTile(mockHabits());
    expect(getByText('0')).toBeTruthy();
    expect(getByText('/0')).toBeTruthy();
  });

  it('renders skeleton bars when loading', () => {
    const { UNSAFE_getAllByType } = renderTile(mockHabits({ loading: true }));
    // 3 skeleton bars + container View(s) — assert at least 3 Views rendered
    expect(UNSAFE_getAllByType('View' as never).length).toBeGreaterThanOrEqual(3);
  });
});
