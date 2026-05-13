/**
 * @jest-environment jsdom
 *
 * useExpenseCreate test — Phase 31 Plan 05 (migrated to TanStack Query).
 *
 *  - Friends-picker useQuery (unscoped) calls get_friends and surfaces friends list
 *  - submit useMutation invokes create_expense RPC; invalidates expenses.list +
 *    expenses.iouSummary + home.all + expenses.all on settle
 *
 * Run: npx jest --testPathPatterns="useExpenseCreate" --no-coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

import { useExpenseCreate } from '../useExpenseCreate';

describe('useExpenseCreate (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockPush.mockReset();
  });

  it('loads friends-picker via get_friends RPC (unscoped)', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_friends')
        return Promise.resolve({
          data: [
            { friend_id: 'f1', display_name: 'Alice', avatar_url: null },
            { friend_id: 'f2', display_name: 'Bob', avatar_url: null },
          ],
          error: null,
        });
      return Promise.resolve({ data: null, error: null });
    });

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useExpenseCreate(), { wrapper });
    await waitFor(() => expect(result.current.friendsLoading).toBe(false));

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[0]!.display_name).toBe('Alice');
  });

  it('submit invokes create_expense and invalidates expenses + home caches', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_friends')
        return Promise.resolve({
          data: [{ friend_id: 'f1', display_name: 'Alice', avatar_url: null }],
          error: null,
        });
      if (rpcName === 'create_expense')
        return Promise.resolve({ data: 'new-expense-id', error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useExpenseCreate(), { wrapper });
    await waitFor(() => expect(result.current.friendsLoading).toBe(false));
    invalidateSpy.mockClear();

    // Configure form state minimally and submit.
    act(() => {
      result.current.setTitle('Dinner');
      result.current.setRawDigits('4200');
      result.current.toggleFriend('f1');
    });
    await waitFor(() => expect(result.current.canSubmit).toBe(true));

    await act(async () => {
      await result.current.submit();
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'create_expense',
      expect.objectContaining({
        p_title: 'Dinner',
        p_total_amount_cents: 4200,
        p_split_mode: 'even',
      }),
    );
    expect(mockPush).toHaveBeenCalledWith('/squad/expenses/new-expense-id');

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.expenses.list('u-self')));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.expenses.iouSummary('u-self')));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.home.all()));
  });
});
