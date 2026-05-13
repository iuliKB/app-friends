/**
 * @jest-environment jsdom
 *
 * useChatDmPreferences test — Phase 33 Plan 06 (Mute-state read for the DM channel).
 *  - Test 1: channelId === null → query disabled; data null; isLoading false; mockFrom never called
 *  - Test 2: channelId provided + row exists (is_muted: true) → data.isMuted === true
 *  - Test 3: channelId provided + no row (null) → data.isMuted === false (default)
 *
 * Run: npx jest --testPathPatterns="useChatDmPreferences" --no-coverage
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

let mockSession: { user: { id: string } } | null = { user: { id: 'u-self' } };
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: typeof mockSession }) => unknown) =>
    selector({ session: mockSession }),
}));

import { useChatDmPreferences } from '../useChatDmPreferences';

function wrap(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  mockSession = { user: { id: 'u-self' } };
  mockFrom.mockReset();
});

test('Test 1 — channelId null: query disabled; data null; isLoading false; from() never called', () => {
  const { client } = createTestQueryClient();

  const { result } = renderHook(() => useChatDmPreferences(null), {
    wrapper: wrap(client),
  });

  // With enabled:false the query never fires — immediate false isLoading
  expect(result.current.isLoading).toBe(false);
  expect(result.current.data).toBeNull();
  // No from() calls since query is disabled
  expect(mockFrom).not.toHaveBeenCalled();
});

test('Test 2 — channelId provided + row exists (is_muted: true) → data.isMuted === true', async () => {
  const { client } = createTestQueryClient();

  mockFrom.mockImplementation((table: string) => {
    if (table === 'chat_preferences') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { is_muted: true }, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  const { result } = renderHook(() => useChatDmPreferences('ch-1'), {
    wrapper: wrap(client),
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.data).toEqual({ isMuted: true });
  expect(mockFrom).toHaveBeenCalledWith('chat_preferences');
});

test('Test 3 — channelId provided + no preference row → data.isMuted === false (default)', async () => {
  const { client } = createTestQueryClient();

  mockFrom.mockImplementation((table: string) => {
    if (table === 'chat_preferences') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  const { result } = renderHook(() => useChatDmPreferences('ch-1'), {
    wrapper: wrap(client),
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  // No row exists → defaults to isMuted: false
  expect(result.current.data).toEqual({ isMuted: false });
});
