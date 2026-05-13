/**
 * @jest-environment jsdom
 *
 * useExpensesWithFriend test — Phase 31 Plan 05 (migrated to TanStack Query).
 *
 *  - Single useQuery keyed by queryKeys.expenses.withFriend(friendId)
 *  - Multi-step queryFn (caller memberships → shared group ids → groups + members → profiles)
 *  - Returns empty array when no shared groups
 *
 * Run: npx jest --testPathPatterns="useExpensesWithFriend" --no-coverage
 */

import { renderHook, waitFor } from '@testing-library/react-native';
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

import { useExpensesWithFriend } from '../useExpensesWithFriend';

const FRIEND_ID = 'f1';

describe('useExpensesWithFriend (migrated to TanStack Query)', () => {
  beforeEach(() => mockFrom.mockReset());

  it('returns shared expenses joined with payer profile, settled flag', async () => {
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (call === 1 && table === 'iou_members') {
        // Step 1: caller memberships
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ iou_group_id: 'g1' }, { iou_group_id: 'g2' }],
                error: null,
              }),
          }),
        };
      }
      if (call === 2 && table === 'iou_members') {
        // Step 2: friend memberships
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ iou_group_id: 'g1' }], error: null }),
            }),
          }),
        };
      }
      if (call === 3 && table === 'iou_groups') {
        // Step 3a: groups rows
        return {
          select: () => ({
            in: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 'g1',
                      title: 'Dinner',
                      total_amount_cents: 4200,
                      created_by: 'u-self',
                      created_at: '2026-05-12',
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (call === 4 && table === 'iou_members') {
        // Step 3b: all member rows
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  { iou_group_id: 'g1', user_id: 'u-self', settled_at: '2026-05-13' },
                  { iou_group_id: 'g1', user_id: 'f1', settled_at: null },
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
                data: [{ id: 'u-self', display_name: 'Me' }],
                error: null,
              }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
    });

    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useExpensesWithFriend(FRIEND_ID), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.expenses).toHaveLength(1);
    expect(result.current.expenses[0]!.payerName).toBe('Me');
    expect(result.current.expenses[0]!.isFullySettled).toBe(false); // f1 unsettled
    const cached = client.getQueryData(queryKeys.expenses.withFriend(FRIEND_ID));
    expect(cached).toBeDefined();
  });

  it('returns [] when caller has no iou_members rows', async () => {
    mockFrom.mockImplementation((_table: string) => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }));

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useExpensesWithFriend(FRIEND_ID), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.expenses).toEqual([]);
  });
});
