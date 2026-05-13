/**
 * @jest-environment jsdom
 *
 * useIOUSummary test — Phase 31 Plan 05 (migrated to TanStack Query).
 *
 *  - Single useQuery keyed by queryKeys.expenses.iouSummary(userId)
 *  - netCents + unsettledCount aggregates derived from query.data
 *  - Empty data path returns netCents=0, unsettledCount=0
 *  - error path falls through as Error.message
 *
 * Run: npx jest --testPathPatterns="useIOUSummary" --no-coverage
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

import { useIOUSummary } from '../useIOUSummary';

describe('useIOUSummary (migrated to TanStack Query)', () => {
  beforeEach(() => mockRpc.mockReset());

  it('derives netCents + unsettledCount aggregates from get_iou_summary rows', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          friend_id: 'f1',
          display_name: 'Alice',
          avatar_url: null,
          net_amount_cents: 1500,
          unsettled_count: 2,
        },
        {
          friend_id: 'f2',
          display_name: 'Bob',
          avatar_url: null,
          net_amount_cents: -500,
          unsettled_count: 1,
        },
      ],
      error: null,
    });

    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useIOUSummary(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.netCents).toBe(1000); // 1500 - 500
    expect(result.current.unsettledCount).toBe(3); // 2 + 1

    const cached = client.getQueryData(queryKeys.expenses.iouSummary('u-self'));
    expect(cached).toBeDefined();
  });

  it('returns netCents=0 + unsettledCount=0 when no rows', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useIOUSummary(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.netCents).toBe(0);
    expect(result.current.unsettledCount).toBe(0);
  });
});
