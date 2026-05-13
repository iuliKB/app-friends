/**
 * @jest-environment jsdom
 *
 * useFriends test — Phase 31 Plan 05 (migrated to TanStack Query).
 *
 *  - useQuery(get_friends) shares queryKeys.friends.list(userId) with useHomeScreen
 *  - useQuery(effective_status IN friendIds) writes to queryKeys.home.friends(userId)
 *  - useQuery(pending requests) keyed by queryKeys.friends.pendingRequests(userId)
 *  - sendRequest / acceptRequest / rejectRequest / removeFriend all invalidate the
 *    expected key set on settle.
 *
 * Run: npx jest --testPathPatterns="useFriends" --no-coverage
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

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

jest.mock('@/hooks/usePushNotifications', () => ({
  markPushPromptEligible: jest.fn(() => Promise.resolve()),
}));

import { useFriends } from '../useFriends';

const FRIEND_ROW = {
  friend_id: 'f1',
  username: 'alice',
  display_name: 'Alice',
  avatar_url: null,
  friendship_status: 'accepted',
  created_at: '2026-05-12',
};

function setupFriendsListMock() {
  mockRpc.mockImplementation((rpcName: string) => {
    if (rpcName === 'get_friends')
      return Promise.resolve({ data: [FRIEND_ROW], error: null });
    return Promise.resolve({ data: null, error: null });
  });
  // effective_status query + pending requests query
  mockFrom.mockImplementation((table: string) => {
    if (table === 'effective_status') {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [
                {
                  user_id: 'f1',
                  effective_status: 'free',
                  context_tag: null,
                  status_expires_at: null,
                  last_active_at: '2026-05-13',
                },
              ],
              error: null,
            }),
        }),
      };
    }
    if (table === 'friendships') {
      // pending requests query
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    };
  });
}

describe('useFriends (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  it('shares queryKeys.friends.list(userId) cache with useHomeScreen', async () => {
    setupFriendsListMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useFriends(), { wrapper });
    await waitFor(() => expect(result.current.loadingFriends).toBe(false));

    const cached = client.getQueryData(queryKeys.friends.list('u-self'));
    expect(cached).toBeDefined();
    expect(result.current.friends).toHaveLength(1);
    expect(result.current.friends[0]!.status).toBe('free');
  });

  it('acceptRequest calls invalidateQueries for friends.list + pendingRequests + home.pendingRequestCount', async () => {
    setupFriendsListMock();
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useFriends(), { wrapper });
    await waitFor(() => expect(result.current.loadingFriends).toBe(false));
    invalidateSpy.mockClear();

    // Override mockFrom for the acceptRequest update().eq().eq() chain.
    mockFrom.mockImplementationOnce(() => ({
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: { id: 'fr1' }, error: null }),
        }),
      }),
    }));

    let outcome: { data: unknown; error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.acceptRequest('fr1');
    });
    expect(outcome?.error).toBeNull();

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.friends.list('u-self')));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.friends.pendingRequests('u-self')));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.home.pendingRequestCount('u-self')));
  });

  it('removeFriend calls invalidateQueries for friends.list + home.all on settle', async () => {
    setupFriendsListMock();
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useFriends(), { wrapper });
    await waitFor(() => expect(result.current.loadingFriends).toBe(false));
    invalidateSpy.mockClear();

    mockFrom.mockImplementationOnce(() => ({
      delete: () => ({
        or: () => Promise.resolve({ data: null, error: null }),
      }),
    }));

    await act(async () => {
      await result.current.removeFriend('f1');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.friends.list('u-self')));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.home.all()));
  });
});
