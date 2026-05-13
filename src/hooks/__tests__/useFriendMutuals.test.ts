/**
 * @jest-environment jsdom
 *
 * useFriendMutuals test — Phase 33 Plan 02 (TanStack Query multi-table aggregate).
 *  - Test 1: happy path — shared plans, shared photos, warm friend caches
 *  - Test 2: zero-shared-plans early exit — friend plan_members not fetched
 *  - Test 3: cold friend caches — mutualFriendsCount renders 0
 *
 * Run: npx jest --testPathPatterns="useFriendMutuals" --no-coverage
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

import { useFriendMutuals } from '../useFriendMutuals';

const FRIEND = 'friend-1';

function wrap(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  mockFrom.mockReset();
});

test('Test 1 — happy path: mutual plans, shared photos, warm friend caches', async () => {
  const { client } = createTestQueryClient();

  // Seed friend caches (warm): u-self has 3 friends, friend-1's friends list has 2 of them
  client.setQueryData(queryKeys.friends.list('u-self'), [
    { friend_id: 'shared-friend-A' },
    { friend_id: 'shared-friend-B' },
    { friend_id: 'only-mine-C' },
  ]);
  client.setQueryData(queryKeys.friends.ofFriend(FRIEND), [
    { friend_id: 'shared-friend-A' }, // overlap
    { friend_id: 'only-theirs-D' },
  ]);

  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'plan_members') {
      // Step 1: caller's plan IDs (3 plans)
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [{ plan_id: 'p1' }, { plan_id: 'p2' }, { plan_id: 'p3' }],
              error: null,
            }),
        }),
      };
    }
    if (call === 2 && table === 'plan_members') {
      // Step 2: friend's plan_members intersected → 2 shared
      return {
        select: () => ({
          eq: () => ({
            in: () =>
              Promise.resolve({
                data: [{ plan_id: 'p1' }, { plan_id: 'p2' }],
                error: null,
              }),
          }),
        }),
      };
    }
    if (call === 3 && table === 'plan_photos') {
      // Step 3: count head request → 5 photos
      return {
        select: (_col: string, _opts: unknown) => ({
          in: () =>
            Promise.resolve({
              data: null,
              count: 5,
              error: null,
            }),
        }),
      };
    }
    throw new Error(`Unexpected table=${table} call #${call} in Test 1`);
  });

  const { result } = renderHook(() => useFriendMutuals(FRIEND), {
    wrapper: wrap(client),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.data).toEqual({
    mutualPlansCount: 2,
    mutualFriendsCount: 1, // only shared-friend-A overlaps
    sharedPhotosCount: 5,
    sharedPlanIds: ['p1', 'p2'],
  });
  expect(call).toBe(3); // exactly 3 .from() calls
});

test('Test 2 — zero-shared-plans early exit: skips friend plan_members and plan_photos', async () => {
  const { client } = createTestQueryClient();

  // Seed warm friend caches so mutualFriendsCount is still computed
  client.setQueryData(queryKeys.friends.list('u-self'), [
    { friend_id: 'mutual-X' },
    { friend_id: 'mutual-Y' },
  ]);
  client.setQueryData(queryKeys.friends.ofFriend(FRIEND), [
    { friend_id: 'mutual-X' },
    { friend_id: 'only-theirs-Z' },
  ]);

  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'plan_members') {
      // Step 1: caller has NO plans
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    }
    // Step 2 and 3 must NOT be called
    throw new Error(`Unexpected table=${table} call #${call} — Test 2 early exit violated`);
  });

  const { result } = renderHook(() => useFriendMutuals(FRIEND), {
    wrapper: wrap(client),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(call).toBe(1); // only caller plan_members called
  expect(result.current.data).toEqual({
    mutualPlansCount: 0,
    mutualFriendsCount: 1, // mutual-X overlaps
    sharedPhotosCount: 0,
    sharedPlanIds: [],
  });
});

test('Test 3 — cold friend caches: mutualFriendsCount is 0', async () => {
  const { client } = createTestQueryClient();
  // Neither friends.list nor friends.ofFriend seeded — cold caches

  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'plan_members') {
      // Caller has 2 plans
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [{ plan_id: 'px' }, { plan_id: 'py' }],
              error: null,
            }),
        }),
      };
    }
    if (call === 2 && table === 'plan_members') {
      // Friend shares 1 plan
      return {
        select: () => ({
          eq: () => ({
            in: () =>
              Promise.resolve({
                data: [{ plan_id: 'px' }],
                error: null,
              }),
          }),
        }),
      };
    }
    if (call === 3 && table === 'plan_photos') {
      return {
        select: (_col: string, _opts: unknown) => ({
          in: () =>
            Promise.resolve({
              data: null,
              count: 3,
              error: null,
            }),
        }),
      };
    }
    throw new Error(`Unexpected table=${table} call #${call} in Test 3`);
  });

  const { result } = renderHook(() => useFriendMutuals(FRIEND), {
    wrapper: wrap(client),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  // Cold caches → mutual friends count is 0 (acceptable warm-only behavior)
  expect(result.current.data?.mutualFriendsCount).toBe(0);
  expect(result.current.data?.mutualPlansCount).toBe(1);
  expect(result.current.data?.sharedPhotosCount).toBe(3);
  expect(result.current.data?.sharedPlanIds).toEqual(['px']);
});
