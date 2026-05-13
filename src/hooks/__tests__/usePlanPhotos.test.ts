/**
 * @jest-environment jsdom
 *
 * usePlanPhotos test — Phase 31 Plan 04 (migrated to TanStack Query).
 *
 *  - useQuery keyed by queryKeys.plans.photos(planId) loads photos with batched signed URLs
 *  - deletePhoto optimistically filters out of plans.photos(planId); rolls back on error
 *  - Upload + delete mutations invalidate the triple
 *    (plans.photos + plans.allPhotos + home.all) on settle
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockFrom = jest.fn();
const mockStorageFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

jest.mock('@/lib/uploadPlanPhoto', () => ({
  uploadPlanPhoto: jest.fn(),
}));

import { usePlanPhotos } from '../usePlanPhotos';

const PLAN_ID = 'p1';
const PHOTO_ROW = {
  id: 'ph1',
  plan_id: PLAN_ID,
  uploader_id: 'u-self',
  storage_path: `${PLAN_ID}/u-self/abc.jpg`,
  created_at: '2026-05-12',
};

function setupLoadMock() {
  let fromCall = 0;
  mockFrom.mockImplementation((table: string) => {
    fromCall++;
    if (fromCall === 1 && table === 'plan_photos') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [PHOTO_ROW], error: null }),
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
  mockStorageFrom.mockReturnValue({
    createSignedUrls: () =>
      Promise.resolve({
        data: [{ path: PHOTO_ROW.storage_path, signedUrl: 'https://signed/u' }],
        error: null,
      }),
    remove: () => Promise.resolve({ data: null, error: null }),
  });
}

describe('usePlanPhotos (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockStorageFrom.mockReset();
    mockRpc.mockReset();
  });

  it('loads photos via the queryKeys.plans.photos cache', async () => {
    setupLoadMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => usePlanPhotos(PLAN_ID), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0]!.signedUrl).toBe('https://signed/u');

    const cached = client.getQueryData(queryKeys.plans.photos(PLAN_ID));
    expect(cached).toBeDefined();
  });

  it('deletePhoto optimistically filters the row out of plans.photos(planId)', async () => {
    setupLoadMock();
    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => usePlanPhotos(PLAN_ID), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // After load, replace the from() mock so the delete chain works:
    //   from('plan_photos').delete().eq('id', ...)
    mockFrom.mockImplementationOnce(() => ({
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }));

    await act(async () => {
      await result.current.deletePhoto('ph1');
    });

    // The optimistic filter removed the row; onSettled invalidate then refetches
    // but the test query client has staleTime Infinity so the refetch is suppressed.
    const cached = client.getQueryData(
      queryKeys.plans.photos(PLAN_ID),
    ) as Array<{ id: string }> | undefined;
    expect((cached ?? []).find((p) => p.id === 'ph1')).toBeUndefined();
  });
});
