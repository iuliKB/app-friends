/**
 * @jest-environment jsdom
 *
 * TSQ-01 evidence: editing a habit in screen A is visible in screen B without
 * manual refetch — both screens consume the same queryKeys.habits.overview(today)
 * entry, so setQueryData from one mount surfaces in the other on the same React
 * commit cycle.
 *
 * Run: npx jest --testPathPatterns="useHabits.crossScreen" --no-coverage
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u1' } } }),
}));

jest.mock('@/lib/dateLocal', () => ({ todayLocal: () => '2026-05-13' }));

jest.mock('@/lib/realtimeBridge', () => ({
  subscribeHabitCheckins: jest.fn().mockReturnValue(() => {}),
  _resetRealtimeBridgeForTests: jest.fn(),
}));

import { useHabits } from '../useHabits';

function makeRow(overrides: Partial<{
  habit_id: string;
  title: string;
  cadence: 'daily' | 'weekly' | 'n_per_week';
  weekly_target: number | null;
  is_solo: boolean;
  members_total: number;
  accepted_total: number;
  completed_today: number;
  did_me_check_in_today: boolean;
  last_checkin_date_local: string | null;
  current_week_completions: number;
}> = {}) {
  return {
    habit_id: 'h1',
    title: 'Run',
    cadence: 'daily' as const,
    weekly_target: null,
    is_solo: true,
    members_total: 1,
    accepted_total: 1,
    completed_today: 0,
    did_me_check_in_today: false,
    last_checkin_date_local: null,
    current_week_completions: 0,
    ...overrides,
  };
}

describe('TSQ-01 - cross-screen reactivity for habits', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('a toggle in mount-A is visible in mount-B (shared QueryClient)', async () => {
    const rows = [makeRow()];
    mockRpc
      .mockResolvedValueOnce({ data: rows, error: null }) // mount-A initial fetch
      .mockReturnValueOnce(new Promise(() => {})); // toggle hangs - read optimistic state in both mounts

    const { client } = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    // mount-A — first consumer (e.g., Home Bento HabitsTile).
    const mountA = renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(mountA.result.current.loading).toBe(false));

    // mount-B — second consumer (e.g., Squad bento HabitsTile), SAME QueryClient
    // (same cache entry, no second fetch).
    const mountB = renderHook(() => useHabits(), { wrapper });

    // mount-B reads cached data without triggering a second rpc call.
    expect(mountB.result.current.habits).toEqual(rows);
    expect(mockRpc).toHaveBeenCalledTimes(1);

    // Toggle from mount-A.
    await act(async () => {
      void mountA.result.current.toggleToday('h1');
      await Promise.resolve();
      await Promise.resolve();
    });

    // BOTH mounts see the optimistic flip — the load-bearing TSQ-01 assertion.
    await waitFor(() => {
      expect(mountA.result.current.habits[0]?.did_me_check_in_today).toBe(true);
      expect(mountB.result.current.habits[0]?.did_me_check_in_today).toBe(true);
    });
    expect(mountA.result.current.habits[0]?.completed_today).toBe(1);
    expect(mountB.result.current.habits[0]?.completed_today).toBe(1);
  });
});
