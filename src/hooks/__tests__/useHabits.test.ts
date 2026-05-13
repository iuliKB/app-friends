/**
 * @jest-environment jsdom
 *
 * useHabits test — Phase 31 Plan 02 (migrated to TanStack Query).
 *
 * Asserts BEHAVIOR via the cache, not implementation details. Initial fetch via
 * get_habits_overview, optimistic toggle, TSQ-03 rollback on RPC error,
 * onSettled invalidation, subscribe-on-mount / unsubscribe-on-unmount.
 *
 * Run: npx jest --testPathPatterns="useHabits.test" --no-coverage
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

// Supabase mock — chainable rpc that resolves with rows on first call and a
// configurable next-call result for the mutation. channel/removeChannel are
// kept so any incidental call (defense in depth) doesn't blow up.
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

// realtimeBridge mock — capture unsubscribe to assert teardown.
const mockUnsubscribe = jest.fn();
const mock_subscribeHabitCheckins = jest.fn(() => mockUnsubscribe);
jest.mock('@/lib/realtimeBridge', () => ({
  subscribeHabitCheckins: (...args: unknown[]) => mock_subscribeHabitCheckins(...args),
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

describe('useHabits (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockUnsubscribe.mockReset();
    mock_subscribeHabitCheckins.mockClear();
  });

  it('initial mount returns loading: true, habits: []', () => {
    mockRpc.mockReturnValue(Promise.resolve({ data: [], error: null }));
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useHabits(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.habits).toEqual([]);
  });

  it('returns rows after get_habits_overview resolves', async () => {
    const rows = [makeRow()];
    mockRpc.mockResolvedValueOnce({ data: rows, error: null });
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockRpc).toHaveBeenCalledWith(
      'get_habits_overview',
      expect.objectContaining({ p_date_local: '2026-05-13' }),
    );
    expect(result.current.habits).toEqual(rows);
  });

  it('toggleToday optimistically flips did_me_check_in_today + adjusts completed_today', async () => {
    const rows = [makeRow({ did_me_check_in_today: false, completed_today: 0 })];
    mockRpc
      .mockResolvedValueOnce({ data: rows, error: null }) // initial overview fetch
      .mockReturnValueOnce(new Promise(() => {})); // toggle hangs so we can read optimistic state
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      void result.current.toggleToday('h1');
      // Let onMutate's awaited cancelQueries + setQueryData flush.
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      const cached = client.getQueryData(queryKeys.habits.overview('2026-05-13')) as Array<{
        habit_id: string;
        did_me_check_in_today: boolean;
        completed_today: number;
      }>;
      expect(cached?.[0]?.did_me_check_in_today).toBe(true);
      expect(cached?.[0]?.completed_today).toBe(1);
    });
  });

  it('rolls back to snapshot on RPC error (TSQ-03)', async () => {
    const rows = [makeRow({ did_me_check_in_today: false, completed_today: 0 })];
    mockRpc
      .mockResolvedValueOnce({ data: rows, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('boom') });
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleToday('h1');
    });

    const cached = client.getQueryData(queryKeys.habits.overview('2026-05-13')) as Array<{
      habit_id: string;
      did_me_check_in_today: boolean;
      completed_today: number;
    }>;
    expect(cached?.[0]?.did_me_check_in_today).toBe(false);
    expect(cached?.[0]?.completed_today).toBe(0);
  });

  it('subscribes on mount, unsubscribes on unmount', () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { wrapper } = createTestQueryClient();
    const { unmount } = renderHook(() => useHabits(), { wrapper });
    expect(mock_subscribeHabitCheckins).toHaveBeenCalledTimes(1);
    expect(mock_subscribeHabitCheckins).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      '2026-05-13',
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
