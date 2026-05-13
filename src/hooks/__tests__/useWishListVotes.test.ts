/**
 * @jest-environment jsdom
 *
 * useWishListVotes test — Phase 31 Plan 05 (migrated to TanStack Query).
 *
 *  - useQuery keyed by queryKeys.polls.wishListVotes(groupChannelId)
 *  - toggleVote optimistically flips myVotes membership + bumps voteCounts;
 *    rolls back both on error.
 *
 * Run: npx jest --testPathPatterns="useWishListVotes" --no-coverage
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

import { useWishListVotes } from '../useWishListVotes';

function setupVotesMock(initialRows: { item_id: string; voter_id: string }[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'wish_list_votes') {
      return {
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ data: initialRows, error: null }),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        delete: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
  });
}

describe('useWishListVotes (migrated to TanStack Query)', () => {
  beforeEach(() => mockFrom.mockReset());

  it('seeds voteState from wish_list_votes rows keyed by polls.wishListVotes(groupChannelId)', async () => {
    setupVotesMock([
      { item_id: 'i1', voter_id: 'u-self' },
      { item_id: 'i1', voter_id: 'u-other' },
      { item_id: 'i2', voter_id: 'u-other' },
    ]);
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useWishListVotes('gc1', ['i1', 'i2']), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.voteState.voteCounts['i1']).toBe(2);
    expect(result.current.voteState.voteCounts['i2']).toBe(1);
    expect(result.current.voteState.myVotes.has('i1')).toBe(true);
    expect(result.current.voteState.myVotes.has('i2')).toBe(false);

    const cached = client.getQueryData(queryKeys.polls.wishListVotes('gc1'));
    expect(cached).toBeDefined();
  });
});
