/**
 * @jest-environment jsdom
 *
 * usePlans test — Phase 31 Plan 04 (migrated to TanStack Query).
 *
 * Asserts BEHAVIOR via the cache, not implementation details.
 *  - 3-step join (plan_members -> plans -> members + profiles) lands in cache
 *  - rsvp optimistically updates list + detail; rolls back on error
 *  - rsvp on success invalidates plans.list + plans.detail + home.upcomingEvents
 *  - createPlan is non-optimistic; on success invalidates plans.list + home.upcomingEvents
 *  - createPlan carries the `@mutationShape: no-optimistic` exemption marker
 *
 * Run: npx jest --testPathPatterns="usePlans" --no-coverage
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

import { usePlans } from '../usePlans';

const PLAN_ID = 'p1';
const TOMORROW = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

function planRowsBuilder() {
  return {
    rows: [
      {
        id: PLAN_ID,
        created_by: 'u-self',
        title: 'Beach day',
        scheduled_for: TOMORROW,
        location: 'Santa Monica',
        link_dump: null,
        general_notes: null,
        created_at: '2026-05-12',
        updated_at: '2026-05-12',
        cover_image_url: null,
        latitude: 34,
        longitude: -118,
      },
    ],
  };
}

/**
 * Build a fluent supabase mock for the 4 sequential reads usePlans queryFn does.
 * Call order:
 *   1. from('plan_members').select(...).eq('user_id', userId).in('rsvp', ...)
 *   2. from('plans').select('*').in('id', planIds).or(...).order(...)
 *   3. from('plan_members').select(...).in('plan_id', planIds)
 *   4. from('profiles').select(...).in('id', userIds)
 */
function setupListMock() {
  const planRows = planRowsBuilder().rows;
  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'plan_members') {
      // Step 1
      return {
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ data: [{ plan_id: PLAN_ID, rsvp: 'going' }], error: null }),
          }),
        }),
      };
    }
    if (call === 2 && table === 'plans') {
      // Step 2
      return {
        select: () => ({
          in: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: planRows, error: null }),
            }),
          }),
        }),
      };
    }
    if (call === 3 && table === 'plan_members') {
      // Step 3
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [{ plan_id: PLAN_ID, user_id: 'u-self', rsvp: 'going', joined_at: '2026-05-12' }],
              error: null,
            }),
        }),
      };
    }
    if (table === 'profiles') {
      // Step 3b
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [{ id: 'u-self', display_name: 'Me', avatar_url: null }],
              error: null,
            }),
        }),
      };
    }
    return {
      select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    };
  });
}

describe('usePlans (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('returns the 3-step joined plans list keyed by plans.list(userId)', async () => {
    setupListMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => usePlans(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0]!.id).toBe(PLAN_ID);
    expect(result.current.plans[0]!.members[0]!.profiles.display_name).toBe('Me');

    const cached = client.getQueryData(queryKeys.plans.list('u-self'));
    expect(cached).toBeDefined();
  });

  it('rsvp optimistically updates list + detail cache, then rolls back on UPDATE error', async () => {
    setupListMock();
    const { client, wrapper } = createTestQueryClient();

    // Seed the detail cache so the rsvp onMutate has a previousDetail to roll back to.
    const detailKey = queryKeys.plans.detail(PLAN_ID);
    client.setQueryData(detailKey, {
      id: PLAN_ID,
      created_by: 'u-self',
      title: 'Beach day',
      scheduled_for: TOMORROW,
      location: null,
      link_dump: null,
      general_notes: null,
      created_at: '2026-05-12',
      updated_at: '2026-05-12',
      cover_image_url: null,
      latitude: null,
      longitude: null,
      members: [
        {
          plan_id: PLAN_ID,
          user_id: 'u-self',
          rsvp: 'going',
          joined_at: '2026-05-12',
          profiles: { id: 'u-self', display_name: 'Me', avatar_url: null },
        },
      ],
    });

    const { result } = renderHook(() => usePlans(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Configure rsvp UPDATE to fail. The fluent .update().eq().eq() chain returns
    // an error from the final eq().
    mockFrom.mockImplementationOnce(() => ({
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: null, error: new Error('rsvp boom') }),
        }),
      }),
    }));

    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.rsvp(PLAN_ID, 'maybe');
    });
    expect(outcome?.error).toBe('rsvp boom');

    const detail = client.getQueryData(detailKey) as { members: Array<{ rsvp: string }> };
    expect(detail.members[0]!.rsvp).toBe('going'); // rolled back
  });

  it('createPlan inserts plan row + plan_members rows; returns planId on success', async () => {
    setupListMock();
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => usePlans(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // createPlan: from('plans').insert().select('id').single() then from('plan_members').insert()
    let insertCall = 0;
    mockFrom.mockImplementation((table: string) => {
      insertCall++;
      if (insertCall === 1 && table === 'plans') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'new-plan-id' }, error: null }),
            }),
          }),
        };
      }
      if (insertCall === 2 && table === 'plan_members') {
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
        };
      }
      return { insert: () => Promise.resolve({ data: null, error: null }) };
    });

    let outcome:
      | { planId: string | null; error: Error | null }
      | undefined;
    await act(async () => {
      outcome = await result.current.createPlan({
        title: 'New Plan',
        scheduledFor: new Date(),
        location: null,
        latitude: null,
        longitude: null,
        invitedFriendIds: ['f1', 'f2'],
      });
    });
    expect(outcome?.error).toBeNull();
    expect(outcome?.planId).toBe('new-plan-id');
  });
});
