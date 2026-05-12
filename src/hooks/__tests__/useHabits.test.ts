/**
 * useHabits test — Phase 29.1 Plan 03 (Wave 0).
 *
 * Asserts behavior, not implementation: fetch on mount via get_habits_overview,
 * optimistic toggle + revert on RPC error (Pitfall 3 stale-closure guard),
 * single per-user Realtime channel (Pitfall 4 budget guard).
 *
 * Run: npx jest --testPathPatterns="useHabits" --no-coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock supabase BEFORE importing the hook so the hook closes over the mock.
jest.mock('@/lib/supabase', () => {
  const rpc = jest.fn();
  const channel = jest.fn(() => {
    const builder: { on: jest.Mock; subscribe: jest.Mock } = {
      on: jest.fn(),
      subscribe: jest.fn(),
    };
    builder.on.mockReturnValue(builder);
    builder.subscribe.mockReturnValue(builder);
    return builder;
  });
  const removeChannel = jest.fn();
  return { supabase: { rpc, channel, removeChannel } };
});

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

import { supabase } from '@/lib/supabase';
import { useHabits } from '../useHabits';

describe('useHabits', () => {
  beforeEach(() => {
    (supabase.rpc as jest.Mock).mockReset();
    (supabase.channel as jest.Mock).mockClear();
    (supabase.removeChannel as jest.Mock).mockClear();
  });

  it('fetches habits via get_habits_overview on mount with todayLocal date', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          habit_id: 'h1',
          title: 'Gym',
          cadence: 'daily',
          weekly_target: null,
          is_solo: false,
          members_total: 3,
          completed_today: 2,
          did_me_check_in_today: false,
          last_checkin_date_local: null,
          current_week_completions: 0,
        },
      ],
      error: null,
    });
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_habits_overview',
      expect.objectContaining({
        p_date_local: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0]!.title).toBe('Gym');
  });

  it('optimistic toggleToday flips did_me_check_in_today + reverts on error (D-07, Pitfall 3)', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          habit_id: 'h1',
          title: 'Gym',
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
      error: null,
    });
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock the toggle RPC to fail
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'rpc-failed' },
    });

    await act(async () => {
      await result.current.toggleToday('h1');
    });

    // After failure, did_me_check_in_today should be back to false (revert)
    expect(result.current.habits[0]!.did_me_check_in_today).toBe(false);
    expect(result.current.habits[0]!.completed_today).toBe(0);
  });

  it('subscribes to ONE per-user Realtime channel (no per-habit channels) (Pitfall 4)', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          habit_id: 'h1',
          title: 'Gym',
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
      error: null,
    });
    renderHook(() => useHabits());
    await waitFor(() =>
      expect((supabase.channel as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1)
    );
    const calls = (supabase.channel as jest.Mock).mock.calls.map((c) => c[0] as string);
    const perHabitChannels = calls.filter((name) => name.startsWith('habit-'));
    expect(perHabitChannels).toHaveLength(0);
    // The channel name must include the userId so two devices for two users
    // don't collide on shared event streams.
    expect(calls.some((name) => name.includes('u-self'))).toBe(true);
  });
});
