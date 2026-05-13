/**
 * @jest-environment jsdom
 *
 * useInvitations test — Phase 31 Plan 06 (migrated to TanStack Query).
 *
 *  - useQuery keyed by queryKeys.status.invitations(userId) fetches plan invitations
 *  - accept / decline mutations follow canonical Pattern 5
 *  - Both mutations invalidate the home.invitationCount widget on settle (Pitfall 10)
 *
 * Run: npx jest --testPathPatterns="useInvitations" --no-coverage
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

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

import { useInvitations } from '../useInvitations';

function setupInvitationsMock() {
  // Pre-migration step-1: plan_members where user_id=eq self, rsvp='invited'
  // Pre-migration step-2: plans IN planIds
  // Pre-migration step-3: plan_members IN planIds (for other members)
  // Pre-migration step-4: profiles IN [...userIds]
  mockFrom.mockImplementation((table: string) => {
    if (table === 'plan_members') {
      return {
        select: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ plan_id: 'plan-1' }],
                error: null,
              }),
          }),
          in: () =>
            Promise.resolve({
              data: [{ plan_id: 'plan-1', user_id: 'u-creator' }],
              error: null,
            }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }
    if (table === 'plans') {
      return {
        select: () => ({
          in: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'plan-1',
                    title: 'Dinner',
                    scheduled_for: null,
                    location: null,
                    created_by: 'u-creator',
                  },
                ],
                error: null,
              }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [{ id: 'u-creator', display_name: 'Alice', avatar_url: null }],
              error: null,
            }),
        }),
      };
    }
    return {};
  });
}

describe('useInvitations (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('loads invitations via useQuery keyed by status.invitations(userId)', async () => {
    setupInvitationsMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useInvitations(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const cached = client.getQueryData(queryKeys.status.invitations('u-self'));
    expect(cached).toBeDefined();
    expect(result.current.invitations).toHaveLength(1);
    expect(result.current.invitations[0]!.title).toBe('Dinner');
    expect(result.current.count).toBe(1);
  });

  it('accept invalidates status.invitations + home.invitationCount on settle', async () => {
    setupInvitationsMock();
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useInvitations(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    invalidateSpy.mockClear();

    await act(async () => {
      await result.current.accept('plan-1');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.status.invitations('u-self')),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.home.invitationCount('u-self')),
    );
  });

  it('decline invalidates status.invitations + home.invitationCount on settle', async () => {
    setupInvitationsMock();
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useInvitations(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    invalidateSpy.mockClear();

    await act(async () => {
      await result.current.decline('plan-1');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.status.invitations('u-self')),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.home.invitationCount('u-self')),
    );
  });
});
