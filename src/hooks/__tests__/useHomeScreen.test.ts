/**
 * @jest-environment jsdom
 *
 * useHomeScreen test — Phase 31 Plan 03 (migrated to TanStack Query).
 *
 * Asserts:
 *  - With successful get_friends + effective_status responses, the hook returns
 *    the composed FriendWithStatus[] shape via the cache.
 *  - subscribeHomeStatuses is called with the userId + resolved friendIds.
 *  - lastActiveAt overlay is synced into useHomeStore from the statuses query.
 *
 * Run: npx jest --testPathPatterns="useHomeScreen.test" --no-coverage
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';

const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u1' } } }),
}));

const mockUnsubscribe = jest.fn();
const mock_subscribeHomeStatuses = jest.fn(() => mockUnsubscribe);
jest.mock('@/lib/realtimeBridge', () => ({
  subscribeHomeStatuses: (...args: unknown[]) => mock_subscribeHomeStatuses(...args),
  _resetRealtimeBridgeForTests: jest.fn(),
}));

import { useHomeScreen } from '../useHomeScreen';
import { useHomeStore } from '@/stores/useHomeStore';

const FRIEND_ROWS = [
  {
    friend_id: 'f1',
    username: 'alex',
    display_name: 'Alex',
    avatar_url: null,
    friendship_status: 'accepted',
    created_at: '2026-05-12',
  },
  {
    friend_id: 'f2',
    username: 'beth',
    display_name: 'Beth',
    avatar_url: null,
    friendship_status: 'accepted',
    created_at: '2026-05-12',
  },
];

const STATUS_ROWS = [
  {
    user_id: 'f1',
    effective_status: 'free',
    context_tag: 'coffee',
    status_expires_at: '2099-01-01T00:00:00Z',
    last_active_at: '2026-05-13T08:00:00Z',
  },
];

describe('useHomeScreen (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockUnsubscribe.mockReset();
    mock_subscribeHomeStatuses.mockClear();
    useHomeStore.setState({ lastActiveAt: {} });
  });

  it('composes friends + statuses into FriendWithStatus rows', async () => {
    mockRpc.mockResolvedValueOnce({ data: FRIEND_ROWS, error: null }); // get_friends
    mockFrom.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: STATUS_ROWS, error: null }),
      }),
    }));

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useHomeScreen(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[0]!.friend_id).toBe('f1');
    expect(result.current.friends[0]!.status).toBe('free');
    expect(result.current.friends[1]!.friend_id).toBe('f2');
    // Friend without a status row falls back to 'maybe'.
    expect(result.current.friends[1]!.status).toBe('maybe');
  });

  it('calls subscribeHomeStatuses with userId and resolved friendIds', async () => {
    mockRpc.mockResolvedValueOnce({ data: FRIEND_ROWS, error: null });
    mockFrom.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: STATUS_ROWS, error: null }),
      }),
    }));

    const { wrapper } = createTestQueryClient();
    renderHook(() => useHomeScreen(), { wrapper });

    await waitFor(() =>
      expect(mock_subscribeHomeStatuses).toHaveBeenCalledWith(
        expect.anything(),
        'u1',
        ['f1', 'f2'],
      ),
    );
  });

  it('syncs lastActiveAt into useHomeStore from the statuses query', async () => {
    mockRpc.mockResolvedValueOnce({ data: FRIEND_ROWS, error: null });
    mockFrom.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: STATUS_ROWS, error: null }),
      }),
    }));

    const { wrapper } = createTestQueryClient();
    renderHook(() => useHomeScreen(), { wrapper });

    await waitFor(() => {
      expect(useHomeStore.getState().lastActiveAt).toEqual({
        f1: '2026-05-13T08:00:00Z',
      });
    });
  });
});
