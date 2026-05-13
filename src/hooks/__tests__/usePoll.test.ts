/**
 * @jest-environment jsdom
 *
 * usePoll test — Phase 31 Plan 06 (migrated to useQuery + useMutation +
 * realtimeBridge.subscribePollVotes).
 *
 *  - useQuery keyed by queryKeys.polls.poll(pollId) fetches the poll detail
 *    (poll row + options + votes) and surfaces a PollState aggregate.
 *  - subscribePollVotes is called on mount, unsubscribed on unmount.
 *  - vote mutation follows canonical Pattern 5 (optimistic flip + count bump,
 *    rollback on error, invalidate polls.poll on settle).
 *
 * Run: npx jest --testPathPatterns="usePoll" --no-coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

const mockUnsubscribe = jest.fn();
const mock_subscribePollVotes = jest.fn(() => mockUnsubscribe);
jest.mock('@/lib/realtimeBridge', () => ({
  subscribePollVotes: (...args: unknown[]) => mock_subscribePollVotes(...args),
  _resetRealtimeBridgeForTests: jest.fn(),
}));

import { usePoll } from '../usePoll';

const POLL_ROW = { id: 'p1', question: 'Pick one' };
const OPTIONS = [
  { id: 'o1', label: 'A', position: 0 },
  { id: 'o2', label: 'B', position: 1 },
];
const VOTES_INITIAL: { option_id: string; user_id: string }[] = [
  { option_id: 'o1', user_id: 'u-other' },
];

function setupPollMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'polls') {
      return {
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: POLL_ROW, error: null }) }),
        }),
      };
    }
    if (table === 'poll_options') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: OPTIONS, error: null }),
          }),
        }),
      };
    }
    if (table === 'poll_votes') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: VOTES_INITIAL, error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }
    return {};
  });
}

describe('usePoll (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockUnsubscribe.mockReset();
    mock_subscribePollVotes.mockClear();
  });

  it('useQuery loads poll detail and aggregates votes', async () => {
    setupPollMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => usePoll('p1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const cached = client.getQueryData(queryKeys.polls.poll('p1'));
    expect(cached).toBeDefined();
    expect(result.current.pollState).not.toBeNull();
    expect(result.current.pollState?.question).toBe('Pick one');
    expect(result.current.pollState?.options).toHaveLength(2);
    // Total votes: 1 (one external vote on o1)
    expect(result.current.pollState?.totalVotes).toBe(1);
  });

  it('calls subscribePollVotes on mount and unsubscribes on unmount', async () => {
    setupPollMock();
    const { wrapper } = createTestQueryClient();
    const { result, unmount } = renderHook(() => usePoll('p1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mock_subscribePollVotes).toHaveBeenCalledWith(
      expect.anything(), // queryClient
      'p1',
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('vote invalidates polls.poll on settle', async () => {
    setupPollMock();
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => usePoll('p1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    invalidateSpy.mockClear();

    await act(async () => {
      await result.current.vote('o2');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.polls.poll('p1')));
  });
});
