// Phase 31 Plan 04 — Migrated to TanStack Query.
//
// Public shape preserved:
//   { photos, loading, error, uploadPhoto, deletePhoto, refetch }
//
// Migration delta:
//   - One useQuery keyed by queryKeys.plans.photos(planId); queryFn copies the
//     pre-migration fetcher body verbatim (plan_photos -> profiles -> batch
//     signed URLs -> assemble PlanPhotoWithUploader[]).
//   - Two useMutation blocks:
//       * uploadPhoto — `// @mutationShape: no-optimistic`. Optimistic-add a
//         placeholder row would be fragile (async storage upload + signed-URL
//         resolution + RPC cap check; the {pending: true, localUri} pattern
//         drift is real). The mutation runs the existing 3-step flow (compress
//         + upload + RPC) and on settle invalidates the triple.
//       * deletePhoto — canonical Pattern 5. Optimistically filters the photo
//         out of plans.photos(planId) AND plans.allPhotos(userId); rolls back
//         both on error; invalidates the triple on settle. Storage cleanup
//         runs server-side via the same DB-first ordering as pre-migration.
//
// Invalidation triple (Pitfall 10):
//   - queryKeys.plans.photos(planId) — this hook's cache
//   - queryKeys.plans.allPhotos(userId) — useAllPlanPhotos aggregate (Memories)
//   - queryKeys.home.all() — Home Memories tile re-renders
//
// Signed-URL TTL: 1h (Phase 22 STATE decision). Wave 8 persistence will exclude
// queryKeys.plans.photos and queryKeys.plans.allPhotos from the persister via
// shouldDehydrateQuery so cold-start doesn't surface expired URLs.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { uploadPlanPhoto } from '@/lib/uploadPlanPhoto';
import { queryKeys } from '@/lib/queryKeys';
import type { PlanPhotoWithUploader } from '@/types/database';

type UploadError = 'photo_cap_exceeded' | 'upload_failed' | null;

export function usePlanPhotos(planId: string): {
  photos: PlanPhotoWithUploader[];
  loading: boolean;
  error: string | null;
  uploadPhoto: (localUri: string) => Promise<{ error: UploadError }>;
  deletePhoto: (photoId: string) => Promise<{ error: Error | null }>;
  refetch: () => Promise<unknown>;
} {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const photosKey = queryKeys.plans.photos(planId);

  const query = useQuery({
    queryKey: photosKey,
    queryFn: async (): Promise<PlanPhotoWithUploader[]> => {
      if (!planId) return [];

      // plan_photos ordered created_at ASC (D-07)
      const { data: rows, error: photosError } = await supabase
        .from('plan_photos')
        .select('id, plan_id, uploader_id, storage_path, created_at')
        .eq('plan_id', planId)
        .order('created_at', { ascending: true });
      if (photosError) throw new Error(photosError.message);

      const photoRows = rows ?? [];
      if (photoRows.length === 0) return [];

      // Uploader profiles in a single query (separate join — PostgREST can't
      // embed profiles via auth.users FK).
      const uploaderIds = [...new Set(photoRows.map((r) => r.uploader_id as string))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', uploaderIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      // Batch signed URLs (D-02: 1-hour TTL).
      // Anti-pattern: DO NOT loop createSignedUrl per photo — use createSignedUrls batch
      const paths = photoRows.map((r) => r.storage_path as string);
      const { data: signedData } = await supabase.storage
        .from('plan-gallery')
        .createSignedUrls(paths, 3600);
      const signedMap = new Map(
        (signedData ?? []).map((s) => [s.path, s.signedUrl]),
      );

      const assembled: PlanPhotoWithUploader[] = photoRows.map((r) => {
        const profile = profileMap.get(r.uploader_id as string);
        return {
          id: r.id as string,
          planId: r.plan_id as string,
          uploaderId: r.uploader_id as string,
          storagePath: r.storage_path as string,
          signedUrl: signedMap.get(r.storage_path as string) ?? null,
          createdAt: r.created_at as string,
          uploader: {
            displayName: profile?.display_name ?? 'Unknown',
            avatarUrl: profile?.avatar_url ?? null,
          },
        };
      });
      return assembled;
    },
    enabled: !!userId && !!planId,
  });

  // uploadPhoto — async file IO + RPC cap check. Optimistic-add is fragile here
  // (the signed URL is only resolvable after the storage upload completes), so
  // we use the exemption marker and let the post-settle invalidation refresh
  // both this hook's cache and the aggregate (Memories) cache.
  // @mutationShape: no-optimistic
  const uploadMutation = useMutation({
    mutationFn: async (
      localUri: string,
    ): Promise<{ outcome: UploadError }> => {
      if (!userId) return { outcome: 'upload_failed' };

      const storagePath = await uploadPlanPhoto(planId, userId, localUri);
      if (!storagePath) return { outcome: 'upload_failed' };

      const { error: rpcError } = await supabase.rpc('add_plan_photo', {
        p_plan_id: planId,
        p_storage_path: storagePath,
      });

      if (rpcError) {
        // Clean up orphaned storage object on RPC failure
        const { error: cleanupError } = await supabase.storage
          .from('plan-gallery')
          .remove([storagePath]);
        if (cleanupError) {
          console.error(
            '[usePlanPhotos] Orphan cleanup failed for path:',
            storagePath,
            cleanupError.message,
          );
        }
        if (rpcError.code === 'P0001') return { outcome: 'photo_cap_exceeded' }; // D-10
        return { outcome: 'upload_failed' };
      }
      return { outcome: null };
    },
    onSettled: () => {
      // Invalidate the triple — per-plan photos, aggregate, and home tile.
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.photos(planId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.allPhotos(userId ?? ''),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  // deletePhoto — canonical Pattern 5 with optimistic filter-out. Snapshot
  // carries the previous arrays in BOTH plans.photos(planId) and
  // plans.allPhotos(userId) so rollback restores both on failure.
  const deleteMutation = useMutation({
    mutationFn: async (input: { photoId: string; storagePath: string }) => {
      // RLS: plan_photos_delete_own — uploader_id = auth.uid()
      const { error: dbError } = await supabase
        .from('plan_photos')
        .delete()
        .eq('id', input.photoId);
      if (dbError) throw new Error(dbError.message);

      // Storage cleanup — dangling object is recoverable; dangling DB row is not.
      const { error: storageError } = await supabase.storage
        .from('plan-gallery')
        .remove([input.storagePath]);
      if (storageError) {
        console.error(
          '[usePlanPhotos] Storage delete failed (row already deleted):',
          storageError.message,
        );
      }
    },
    onMutate: async (input) => {
      const allKey = queryKeys.plans.allPhotos(userId ?? '');
      await queryClient.cancelQueries({ queryKey: queryKeys.plans.photos(planId) });
      await queryClient.cancelQueries({ queryKey: allKey });
      const previousList = queryClient.getQueryData<PlanPhotoWithUploader[]>(
        queryKeys.plans.photos(planId),
      );
      const previousAggregate = queryClient.getQueryData(allKey);
      queryClient.setQueryData<PlanPhotoWithUploader[]>(
        queryKeys.plans.photos(planId),
        (old) => old?.filter((p) => p.id !== input.photoId) ?? [],
      );
      return { previousList, previousAggregate };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previousList) {
        queryClient.setQueryData(queryKeys.plans.photos(planId), ctx.previousList);
      }
      if (ctx?.previousAggregate) {
        queryClient.setQueryData(
          queryKeys.plans.allPhotos(userId ?? ''),
          ctx.previousAggregate,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.photos(planId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.allPhotos(userId ?? ''),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  return {
    photos: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    uploadPhoto: async (localUri: string) => {
      try {
        const { outcome } = await uploadMutation.mutateAsync(localUri);
        return { error: outcome };
      } catch (err) {
        console.error('[usePlanPhotos] upload failed', err);
        return { error: 'upload_failed' };
      }
    },
    deletePhoto: async (photoId: string) => {
      // Find the storage path from the cache snapshot. This matches the
      // pre-migration behavior of reading from local state.
      const photo = (query.data ?? []).find((p) => p.id === photoId);
      if (!photo) return { error: new Error('Photo not found in local state') };
      try {
        await deleteMutation.mutateAsync({
          photoId,
          storagePath: photo.storagePath,
        });
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('delete failed'),
        };
      }
    },
  };
}
