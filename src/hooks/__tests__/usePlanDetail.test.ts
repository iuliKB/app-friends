/**
 * @jest-environment jsdom
 *
 * usePlanDetail test — Phase 31 Plan 04 (migrated to TanStack Query).
 *
 *  - Single useQuery keyed by queryKeys.plans.detail(planId)
 *  - Parallel reads (plan row + members) via Promise.all + sequenced profile join
 *  - Mutators (updateRsvp, updatePlanDetails, deletePlan) surface error/null and
 *    invalidate the detail + list + home.upcomingEvents keys on success
 *
 * Run: npx jest --testPathPatterns="usePlanDetail" --no-coverage
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

import { usePlanDetail } from '../usePlanDetail';

const PLAN_ID = 'p1';
const PLAN_ROW = {
  id: PLAN_ID,
  created_by: 'u-self',
  title: 'Beach day',
  scheduled_for: '2026-06-01T18:00:00Z',
  location: null,
  link_dump: null,
  general_notes: null,
  created_at: '2026-05-12',
  updated_at: '2026-05-12',
  cover_image_url: null,
  latitude: null,
  longitude: null,
};

function setupDetailMock() {
  // Three sequential `from()` calls in queryFn:
  //   1. from('plans').select('*').eq('id').single()
  //   2. from('plan_members').select(...).eq('plan_id')
  //   3. from('profiles').select(...).in('id', ...)
  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'plans') {
      return {
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: PLAN_ROW, error: null }) }),
        }),
      };
    }
    if (call === 2 && table === 'plan_members') {
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [{ plan_id: PLAN_ID, user_id: 'u-self', rsvp: 'going', joined_at: '2026-05-12' }],
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
              data: [{ id: 'u-self', display_name: 'Me', avatar_url: null }],
              error: null,
            }),
        }),
      };
    }
    return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
  });
}

describe('usePlanDetail (migrated to TanStack Query)', () => {
  beforeEach(() => mockFrom.mockReset());

  it('returns composite plan + members via the queryKeys.plans.detail cache', async () => {
    setupDetailMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => usePlanDetail(PLAN_ID), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan?.id).toBe(PLAN_ID);
    expect(result.current.plan?.members).toHaveLength(1);
    expect(result.current.plan?.members[0]!.profiles.display_name).toBe('Me');

    const cached = client.getQueryData(queryKeys.plans.detail(PLAN_ID));
    expect(cached).toBeDefined();
  });

  it('updateRsvp surfaces error on update failure', async () => {
    setupDetailMock();
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => usePlanDetail(PLAN_ID), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFrom.mockImplementationOnce(() => ({
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: 'rsvp denied' } }),
        }),
      }),
    }));

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.updateRsvp('maybe');
    });
    expect(outcome?.error?.message).toBe('rsvp denied');
  });
});
