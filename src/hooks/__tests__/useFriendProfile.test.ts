/**
 * @jest-environment jsdom
 *
 * useFriendProfile test — Phase 33 Plan 02 (TanStack Query single-entity read).
 *  - Test A: warm home cache → no effective_status fetch
 *  - Test B: cold home cache → effective_status direct fallback
 *  - Test C: friend-not-found → friendsSince:null (profile still returned per RLS USING(true))
 *  - Test D: not authenticated → data:null, query disabled
 *
 * Run: npx jest --testPathPatterns="useFriendProfile" --no-coverage
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

import { useFriendProfile } from '../useFriendProfile';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

let mockSession: { user: { id: string } } | null = { user: { id: 'u-self' } };
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: typeof mockSession }) => unknown) =>
    selector({ session: mockSession }),
}));

const FRIEND = 'friend-1';
const PROFILE_ROW = {
  display_name: 'Alice',
  username: 'alice',
  avatar_url: null,
  birthday_month: 8,
  birthday_day: 14,
  birthday_year: 1995,
  timezone: 'Europe/London',
  bio: 'short bio',
};

function wrap(client: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

beforeEach(() => {
  mockSession = { user: { id: 'u-self' } };
  mockFrom.mockReset();
});

test('Test A — warm home cache: skips effective_status fetch', async () => {
  const { client } = createTestQueryClient();
  client.setQueryData(queryKeys.home.friends('u-self'), [
    {
      user_id: FRIEND,
      effective_status: 'free',
      context_tag: 'lunch',
      status_expires_at: null,
      last_active_at: null,
    },
  ]);

  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: PROFILE_ROW, error: null }),
          }),
        }),
      };
    }
    if (call === 2 && table === 'friendships') {
      return {
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { created_at: '2024-05-12T00:00:00Z' },
                  error: null,
                }),
            }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected ${table} call (#${call}) — Test A should not hit effective_status`);
  });

  const { result } = renderHook(() => useFriendProfile(FRIEND), {
    wrapper: wrap(client),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.data).toEqual(
    expect.objectContaining({
      profile: PROFILE_ROW,
      friendsSince: '2024-05-12T00:00:00Z',
      status: 'free',
      contextTag: 'lunch',
    })
  );
  expect(call).toBe(2); // exactly 2 .from() calls — effective_status skipped
});

test('Test B — cold home cache: falls back to effective_status direct read', async () => {
  const { client } = createTestQueryClient();
  // No home.friends cache seeded — cold path (queryKeys.home.friends slot is empty)
  expect(client.getQueryData(queryKeys.home.friends('u-self'))).toBeUndefined();

  const STATUS_ROW = {
    user_id: FRIEND,
    effective_status: 'busy' as const,
    context_tag: 'meeting',
    status_expires_at: '2024-05-12T18:00:00Z',
    last_active_at: '2024-05-12T10:00:00Z',
  };

  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: PROFILE_ROW, error: null }),
          }),
        }),
      };
    }
    if (call === 2 && table === 'friendships') {
      return {
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { created_at: '2024-01-01T00:00:00Z' },
                  error: null,
                }),
            }),
          }),
        }),
      };
    }
    if (call === 3 && table === 'effective_status') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: STATUS_ROW, error: null }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table=${table} call #${call} in Test B`);
  });

  const { result } = renderHook(() => useFriendProfile(FRIEND), {
    wrapper: wrap(client),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  // effective_status WAS called (call #3)
  expect(call).toBe(3);
  expect(result.current.data?.status).toBe('busy');
  expect(result.current.data?.contextTag).toBe('meeting');
  expect(result.current.data?.friendsSince).toBe('2024-01-01T00:00:00Z');
});

test('Test C — friend-not-found: friendsSince null but profile still returned (RLS USING true)', async () => {
  const { client } = createTestQueryClient();

  let call = 0;
  mockFrom.mockImplementation((table: string) => {
    call++;
    if (call === 1 && table === 'profiles') {
      // RLS USING(true) always returns the profile row for any auth'd user
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: PROFILE_ROW, error: null }),
          }),
        }),
      };
    }
    if (call === 2 && table === 'friendships') {
      // No friendship row — user was removed or never added
      return {
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
    }
    if (call === 3 && table === 'effective_status') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table=${table} call #${call} in Test C`);
  });

  const { result } = renderHook(() => useFriendProfile(FRIEND), {
    wrapper: wrap(client),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  // Critical: friendsSince is null (no friendship row) but profile is still present
  expect(result.current.data?.friendsSince).toBeNull();
  expect(result.current.data?.profile).not.toBeNull();
  expect(result.current.data?.profile).toEqual(PROFILE_ROW);
});

test('Test D — not authenticated: data is null, query is disabled', async () => {
  mockSession = null;

  const { client } = createTestQueryClient();

  const { result } = renderHook(() => useFriendProfile(FRIEND), {
    wrapper: wrap(client),
  });

  // With enabled:false the query never runs — isLoading stays false immediately
  expect(result.current.isLoading).toBe(false);
  expect(result.current.data).toBeNull();
  // No from() calls made
  expect(mockFrom).not.toHaveBeenCalled();
});
