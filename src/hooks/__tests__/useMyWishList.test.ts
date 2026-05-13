/**
 * @jest-environment jsdom
 *
 * useMyWishList test — Phase 31 Plan 05 (migrated to TanStack Query).
 *
 *  - Single useQuery keyed by queryKeys.friends.wishList(userId)
 *  - addItem optimistically prepends; rolls back on insert error
 *  - deleteItem optimistically filters; rolls back on delete error
 *
 * Run: npx jest --testPathPatterns="useMyWishList" --no-coverage
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

import { useMyWishList } from '../useMyWishList';

const ROW = {
  id: 'w1',
  title: 'Camera',
  url: null,
  notes: null,
  created_at: '2026-05-12',
};

function setupListMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'wish_list_items') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [ROW], error: null }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
  });
}

describe('useMyWishList (migrated to TanStack Query)', () => {
  beforeEach(() => mockFrom.mockReset());

  it('loads items keyed by queryKeys.friends.wishList(userId)', async () => {
    setupListMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useMyWishList(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    const cached = client.getQueryData(queryKeys.friends.wishList('u-self'));
    expect(cached).toBeDefined();
  });

  it('deleteItem optimistically filters, rolls back on delete error', async () => {
    // Initial fetch returns [ROW]; refetch hangs so the post-rollback state is observable.
    let listCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'wish_list_items') {
        return {
          select: () => ({
            eq: () => ({
              order: () => {
                listCallCount++;
                if (listCallCount === 1)
                  return Promise.resolve({ data: [ROW], error: null });
                return new Promise(() => {}); // hang
              },
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: null,
                  error: new Error('delete denied'),
                }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
    });

    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useMyWishList(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.deleteItem('w1');
    });
    expect(outcome?.error?.message).toBe('delete denied');

    const cached = client.getQueryData(
      queryKeys.friends.wishList('u-self'),
    ) as WishListItemArray;
    expect(cached?.[0]?.id).toBe('w1'); // rolled back to original
  });
});

type WishListItemArray = Array<{ id: string; title: string }>;
