/**
 * @jest-environment jsdom
 *
 * useExpenseDetail test — Phase 31 Plan 05 (migrated to TanStack Query).
 *
 *  - Single useQuery keyed by queryKeys.expenses.detail(expenseId)
 *  - Parallel reads (iou_groups + iou_members) + sequenced profiles join
 *  - settle() optimistically flips isSettled; rolls back on UPDATE error
 *
 * Run: npx jest --testPathPatterns="useExpenseDetail" --no-coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

import { useExpenseDetail } from '../useExpenseDetail';

const EXPENSE_ID = 'e1';
const GROUP_ROW = {
  id: EXPENSE_ID,
  title: 'Dinner',
  total_amount_cents: 4200,
  split_mode: 'even' as const,
  created_by: 'u-self',
  created_at: '2026-05-12',
};

function setupDetailMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'iou_groups') {
      return {
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: GROUP_ROW, error: null }) }),
        }),
      };
    }
    if (table === 'iou_members') {
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [
                {
                  user_id: 'u-self',
                  share_amount_cents: 2100,
                  settled_at: '2026-05-13',
                  settled_by: 'u-self',
                },
                {
                  user_id: 'f1',
                  share_amount_cents: 2100,
                  settled_at: null,
                  settled_by: null,
                },
              ],
              error: null,
            }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [
                { id: 'u-self', display_name: 'Me', avatar_url: null },
                { id: 'f1', display_name: 'Alice', avatar_url: null },
              ],
              error: null,
            }),
        }),
      };
    }
    return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
  });
}

describe('useExpenseDetail (migrated to TanStack Query)', () => {
  beforeEach(() => mockFrom.mockReset());

  it('returns composite detail keyed by queryKeys.expenses.detail(expenseId)', async () => {
    setupDetailMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useExpenseDetail(EXPENSE_ID), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.detail?.title).toBe('Dinner');
    expect(result.current.detail?.participants).toHaveLength(2);
    expect(result.current.detail?.allSettled).toBe(false);
    expect(result.current.isCreator).toBe(true);

    const cached = client.getQueryData(queryKeys.expenses.detail(EXPENSE_ID));
    expect(cached).toBeDefined();
  });

  it('settle optimistically flips isSettled and rolls back on update error', async () => {
    setupDetailMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useExpenseDetail(EXPENSE_ID), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Override mockFrom: the next from('iou_members').update().eq().eq() fails.
    mockFrom.mockImplementationOnce(() => ({
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: null, error: new Error('settle denied') }),
        }),
      }),
    }));

    await act(async () => {
      await result.current.settle('f1');
    });

    // After rollback, f1 is still unsettled.
    const cached = client.getQueryData(queryKeys.expenses.detail(EXPENSE_ID)) as
      | { participants: Array<{ userId: string; isSettled: boolean }> }
      | undefined;
    const f1 = cached?.participants.find((p) => p.userId === 'f1');
    expect(f1?.isSettled).toBe(false);
  });
});
