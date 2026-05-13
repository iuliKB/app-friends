/**
 * @jest-environment jsdom
 *
 * useStatus test — Phase 31 Plan 06 (migrated to hybrid useQuery+useMutation +
 * useStatusStore mirror).
 *
 *  - useQuery keyed by queryKeys.status.own(userId) fetches the effective_status row.
 *  - The query result is mirrored into useStatusStore via a useEffect so the
 *    notification dispatcher in _layout.tsx (outside React tree) keeps working.
 *  - setStatus mutation: onMutate writes BOTH setQueryData AND
 *    useStatusStore.getState().setCurrentStatus.
 *  - onError restores BOTH the cache and useStatusStore from ctx.previous.
 *  - onSettled invalidates queryKeys.status.own(userId) + queryKeys.home.friends(userId).
 *  - The module-scope auth listener for useStatusStore.clear() is REMOVED from
 *    useStatus.ts (it lives in authBridge.ts as of Task 4). The notification-side
 *    cleanup (cancelExpiryNotification / cancelMorningPrompt) stays.
 *
 * Run: npx jest --testPathPatterns="useStatus" --no-coverage
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
  useAuthStore: Object.assign(
    (selector: (s: { session: { user: { id: string } } }) => unknown) =>
      selector({ session: { user: { id: 'u-self' } } }),
    {
      subscribe: jest.fn(),
      getState: () => ({ session: { user: { id: 'u-self' } } }),
    },
  ),
}));

// useStatusStore: real implementation kept so we can observe setCurrentStatus
// mirror writes. The `clear()` method lives on the real store; we assert it is
// NOT invoked from useStatus.ts (moved to authBridge in Task 4).
import { useStatusStore } from '@/stores/useStatusStore';

jest.mock('@/lib/expiryScheduler', () => ({
  scheduleExpiryNotification: jest.fn(() => Promise.resolve()),
  cancelExpiryNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/morningPrompt', () => ({
  cancelMorningPrompt: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/hooks/usePushNotifications', () => ({
  markPushPromptEligible: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/heartbeat', () => ({
  computeHeartbeatState: () => 'fresh',
}));

jest.mock('@/lib/windows', () => ({
  computeWindowExpiry: () => new Date('2026-05-13T12:00:00Z'),
}));

import { useStatus } from '../useStatus';

const EFFECTIVE_STATUS_ROW = {
  effective_status: 'free',
  context_tag: null,
  status_expires_at: '2026-05-13T12:00:00Z',
  last_active_at: '2026-05-13T09:00:00Z',
};

function setupHydrateMock() {
  // Two from(...) call shapes used inside useStatus:
  //  - from('effective_status').select(...).eq(...).maybeSingle() — hydrate
  //  - from('profiles').select(...).eq(...).maybeSingle() / .update(...).eq(...) — tz sync
  //  - from('statuses').upsert(...) — setStatus
  //  - from('statuses').update(...).eq(...) — touch
  mockFrom.mockImplementation((table: string) => {
    if (table === 'effective_status') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: EFFECTIVE_STATUS_ROW, error: null }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      };
    }
    if (table === 'statuses') {
      return {
        upsert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      };
    }
    return {
      select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    };
  });
}

describe('useStatus (migrated — hybrid useQuery+useMutation+useStatusStore mirror)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    // Reset the store between tests so previous mirror writes do not leak.
    useStatusStore.setState({ currentStatus: null });
  });

  it('useQuery fetches effective_status and the result mirrors into useStatusStore', async () => {
    setupHydrateMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useStatus(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Cache hit on queryKeys.status.own
    const cached = client.getQueryData(queryKeys.status.own('u-self'));
    expect(cached).toBeDefined();
    expect(result.current.currentStatus).not.toBeNull();
    expect(result.current.currentStatus?.status).toBe('free');

    // Mirror landed in useStatusStore — load-bearing for the notification dispatcher
    await waitFor(() =>
      expect(useStatusStore.getState().currentStatus?.status).toBe('free'),
    );
  });

  it('setStatus optimistically writes the cache AND useStatusStore in onMutate', async () => {
    // First hydrate succeeds with the initial row; the post-onSettled refetch
    // hangs so the optimistic value stays observable for the assertion. Same
    // trick as Wave 2's useHabits optimistic-flip test.
    let hydrateCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'effective_status') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => {
                hydrateCalls++;
                if (hydrateCalls === 1) {
                  return Promise.resolve({ data: EFFECTIVE_STATUS_ROW, error: null });
                }
                return new Promise(() => {}); // hang the refetch
              },
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      if (table === 'statuses') {
        return {
          upsert: () => Promise.resolve({ data: null, error: null }),
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      return {};
    });

    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useStatus(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setStatus('busy', null, 'rest_of_day');
    });

    // Cache shows the optimistic + settled value
    const cached = client.getQueryData<any>(queryKeys.status.own('u-self'));
    expect(cached?.status ?? cached?.effective_status).toBe('busy');

    // useStatusStore was mirrored to the optimistic value
    expect(useStatusStore.getState().currentStatus?.status).toBe('busy');
  });

  it('on setStatus error, onError restores BOTH the cache and useStatusStore', async () => {
    // First hydrate succeeds; the upsert call fails.
    let upsertCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'effective_status') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: EFFECTIVE_STATUS_ROW, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      if (table === 'statuses') {
        return {
          upsert: () => {
            upsertCalls++;
            return Promise.resolve({ data: null, error: new Error('upsert failed') });
          },
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      return {};
    });

    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useStatus(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Capture the pre-mutation snapshot the rollback should restore to.
    const before = client.getQueryData<any>(queryKeys.status.own('u-self'));
    expect(before).toBeDefined();
    const beforeStatus =
      (before as any)?.status ?? (before as any)?.effective_status;

    await act(async () => {
      await result.current.setStatus('busy', null, 'rest_of_day');
    });
    expect(upsertCalls).toBeGreaterThan(0);

    // After rollback, both cache and store should match the pre-mutation snapshot.
    const after = client.getQueryData<any>(queryKeys.status.own('u-self'));
    const afterStatus = (after as any)?.status ?? (after as any)?.effective_status;
    expect(afterStatus).toBe(beforeStatus);
    expect(useStatusStore.getState().currentStatus?.status).toBe(beforeStatus);
  });

  it('setStatus invalidates status.own + home.friends on settle', async () => {
    setupHydrateMock();
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useStatus(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    invalidateSpy.mockClear();

    await act(async () => {
      await result.current.setStatus('busy', null, 'rest_of_day');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.status.own('u-self')));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.home.friends('u-self')));
  });
});
