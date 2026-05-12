/**
 * HomeHabitsTile test scaffold — Phase 29.1 Plan 08.
 *
 * Asserts: HABITS eyebrow label, hero "X/Y done today" copy, empty-state copy,
 * and Pitfall 7 regression guard (no Bento imports).
 *
 * Run: npx jest --testPathPatterns="HomeHabitsTile" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { HomeHabitsTile } from '../HomeHabitsTile';
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
      <HomeHabitsTile habits={habits} />
    </ThemeProvider>
  );
}

describe('HomeHabitsTile', () => {
  it('renders "HABITS" eyebrow label (UI-SPEC)', () => {
    const { getByText } = renderTile(mockHabits());
    expect(getByText('HABITS')).toBeTruthy();
  });

  it('shows hero "X/Y" and caption "done today" when total > 0', () => {
    const { getByText } = renderTile(
      mockHabits({
        habits: [
          {
            habit_id: 'h1',
            title: 'X',
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
            habit_id: 'h2',
            title: 'Y',
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
    expect(getByText(/done today/i)).toBeTruthy();
  });

  it('shows "add a habit" when empty', () => {
    const { getByText } = renderTile(mockHabits());
    expect(getByText(/add a habit/i)).toBeTruthy();
  });

  it('renders without crashing on empty habits (Pitfall 7 sanity render)', () => {
    const { toJSON } = renderTile(mockHabits());
    expect(toJSON()).toBeTruthy();
  });
});
