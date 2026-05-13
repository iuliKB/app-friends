/**
 * @jest-environment jsdom
 *
 * useUpdateMyBio test — Phase 33 Plan 01 (canonical Pattern 5 bio mutation).
 *
 *  - onMutate writes optimistic bio value into queryKeys.friends.detail(userId).
 *  - onError restores previous snapshot from ctx.previous.
 *  - onSettled invalidates queryKeys.friends.detail(userId) exactly once.
 *  - updateBio(null) produces bio: null in the mutationFn payload.
 *  - saving returns true while in flight, false after settle.
 *  - Literal-string presence gate: file contains mutationFn / onMutate / onError / onSettled.
 *
 * Run: npx jest --testPathPatterns="useUpdateMyBio" --no-coverage
 */
import fs from 'fs';
import path from 'path';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
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

import { useUpdateMyBio } from '../useUpdateMyBio';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INITIAL_CACHE = {
  profile: { bio: 'old bio', display_name: 'Me' },
  friendsSince: '2024-01-01',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockFrom(opts: { error?: string | null } = {}) {
  return mockFrom.mockImplementation((_table: string) => ({
    update: () => ({
      eq: () =>
        Promise.resolve({ error: opts.error ? new Error(opts.error) : null }),
    }),
  }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUpdateMyBio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Test 1: writes optimistic bio into the cache before network resolves (optimistic flip)', async () => {
    const { client, wrapper } = createTestQueryClient();
    const key = queryKeys.friends.detail('u-self');
    client.setQueryData(key, INITIAL_CACHE);

    // Never resolves — lets us assert the optimistic state mid-flight.
    mockFrom.mockImplementation((_table: string) => ({
      update: () => ({
        eq: () => new Promise(() => {}),
      }),
    }));

    const { result } = renderHook(() => useUpdateMyBio(), { wrapper });

    act(() => {
      void result.current.updateBio('new bio');
    });

    await waitFor(() => {
      const cached = client.getQueryData<typeof INITIAL_CACHE>(key);
      expect(cached?.profile?.bio).toBe('new bio');
    });
  });

  it('Test 2: rolls back to previous value when supabase returns an error', async () => {
    const { client, wrapper } = createTestQueryClient();
    const key = queryKeys.friends.detail('u-self');
    client.setQueryData(key, INITIAL_CACHE);

    makeMockFrom({ error: 'db error' });

    const { result } = renderHook(() => useUpdateMyBio(), { wrapper });

    await act(async () => {
      await result.current.updateBio('attempted bio');
    });

    await waitFor(() => {
      const cached = client.getQueryData<typeof INITIAL_CACHE>(key);
      expect(cached?.profile?.bio).toBe('old bio');
    });
  });

  it('Test 3: invalidates queryKeys.friends.detail(userId) on settle (success)', async () => {
    const { client, wrapper } = createTestQueryClient();
    const key = queryKeys.friends.detail('u-self');
    client.setQueryData(key, INITIAL_CACHE);

    makeMockFrom();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateMyBio(), { wrapper });

    await act(async () => {
      await result.current.updateBio('some bio');
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: key }),
      );
    });
  });

  it('Test 3b: invalidates queryKeys.friends.detail(userId) on settle (failure)', async () => {
    const { client, wrapper } = createTestQueryClient();
    const key = queryKeys.friends.detail('u-self');
    client.setQueryData(key, INITIAL_CACHE);

    makeMockFrom({ error: 'fail' });
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateMyBio(), { wrapper });

    await act(async () => {
      await result.current.updateBio('some bio');
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: key }),
      );
    });
  });

  it('Test 4: updateBio(null) is valid — produces bio: null in the mutation payload', async () => {
    const { client, wrapper } = createTestQueryClient();
    const key = queryKeys.friends.detail('u-self');
    client.setQueryData(key, INITIAL_CACHE);

    let capturedPayload: unknown;
    mockFrom.mockImplementation((_table: string) => ({
      update: (payload: unknown) => {
        capturedPayload = payload;
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }));

    const { result } = renderHook(() => useUpdateMyBio(), { wrapper });

    await act(async () => {
      await result.current.updateBio(null);
    });

    expect(capturedPayload).toEqual(
      expect.objectContaining({ bio: null }),
    );
  });

  it('Test 5: saving is true while mutation is in flight, false after settle', async () => {
    const { client, wrapper } = createTestQueryClient();
    const key = queryKeys.friends.detail('u-self');
    client.setQueryData(key, INITIAL_CACHE);

    let resolveUpdate!: () => void;
    mockFrom.mockImplementation((_table: string) => ({
      update: () => ({
        eq: () =>
          new Promise<{ error: null }>((res) => {
            resolveUpdate = () => res({ error: null });
          }),
      }),
    }));

    const { result } = renderHook(() => useUpdateMyBio(), { wrapper });
    expect(result.current.saving).toBe(false);

    act(() => {
      void result.current.updateBio('bio text');
    });

    await waitFor(() => expect(result.current.saving).toBe(true));

    act(() => resolveUpdate());

    await waitFor(() => expect(result.current.saving).toBe(false));
  });

  it('Test 6: on-disk file contains the four literal strings required by mutationShape gate', () => {
    const hookFile = path.resolve(__dirname, '..', 'useUpdateMyBio.ts');
    const src = fs.readFileSync(hookFile, 'utf8');
    expect(src).toContain('mutationFn');
    expect(src).toContain('onMutate');
    expect(src).toContain('onError');
    expect(src).toContain('onSettled');
    // Must NOT have the exemption marker — canonical shape enforced
    expect(src).not.toContain('@mutationShape: no-optimistic');
  });
});
