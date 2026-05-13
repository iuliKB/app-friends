/**
 * @jest-environment jsdom
 *
 * useStreakData test — Phase 31 Plan 07 (migrated to TanStack Query).
 *
 * Asserts:
 *  - With a successful get_squad_streak response, the hook returns the
 *    canonical { currentWeeks, bestWeeks, loading, error, refetch } shape
 *    populated from the cache.
 *  - With an empty data array, the hook falls back to zero state.
 *  - With an RPC error, the hook surfaces query.error.message and keeps the
 *    zero state visible (D-17 silent-error contract).
 *
 * Run: npx jest --testPathPatterns="useStreakData" --no-coverage
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u1' } } }),
}));

import { useStreakData } from '../useStreakData';

describe('useStreakData (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns currentWeeks + bestWeeks from get_squad_streak row', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ current_weeks: 5, best_weeks: 8 }],
      error: null,
    });

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useStreakData(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentWeeks).toBe(5);
    expect(result.current.bestWeeks).toBe(8);
    expect(result.current.error).toBeNull();
  });

  it('falls back to zero state when RPC returns empty data', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useStreakData(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentWeeks).toBe(0);
    expect(result.current.bestWeeks).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('surfaces RPC error via error string and keeps zero state visible', async () => {
    // Silence the expected D-17 silent-error console.warn so the test output
    // stays clean. The hook re-throws on error so query.error is populated;
    // the return mapping coerces to zero state for the visual layer.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRpc.mockResolvedValueOnce({
      data: null,
      error: new Error('streak-rpc-down'),
    });

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useStreakData(), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.currentWeeks).toBe(0);
    expect(result.current.bestWeeks).toBe(0);
    expect(result.current.error).toMatch(/streak-rpc-down/);

    warnSpy.mockRestore();
  });
});
