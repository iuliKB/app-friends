// Phase 31 Plan 04 — Migrated to TanStack Query.
//
// Public shape verbatim-preserved:
//   { groups, recentPhotos, isLoading, error, refetch, deletePhoto }
//
// Migration delta:
//   - Replace 4 useState slots with one useQuery keyed by
//     queryKeys.plans.allPhotos(userId); queryFn copies the pre-migration
//     7-step body (plan_members -> plans -> plan_photos -> plans titles ->
//     profiles -> batch signed URLs -> assemble + group + recent slice) verbatim.
//   - deletePhoto follows Pattern 5: optimistic filter-out from BOTH
//     plans.allPhotos(userId) (this hook's aggregate cache) AND
//     plans.photos(planId) (the per-plan cache shared with usePlanPhotos);
//     rolls back both on error; invalidates the triple on settle.
//
// Sharing cache family with usePlanPhotos.photos(planId) is the load-bearing
// detail: a delete from MemoriesTabContent removes the photo from BOTH the
// gallery group AND the per-plan grid (cross-screen reactivity for Memories).
//
// Signed-URL TTL: 1h (Phase 22 STATE decision). Wave 8 persistence will exclude
// this key family from the persister.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import type { PlanPhotoWithUploader } from '@/types/database';

export type PlanPhotoGroup = {
  planId: string;
  planTitle: string;
  planScheduledFor: string | null;
  photos: PlanPhotoWithUploader[];
};

export type PlanPhotoWithTitle = PlanPhotoWithUploader & { planTitle: string };

interface AllPlanPhotosComposite {
  groups: PlanPhotoGroup[];
  recentPhotos: PlanPhotoWithTitle[];
}

export type UseAllPlanPhotosResult = {
  groups: PlanPhotoGroup[];
  recentPhotos: PlanPhotoWithTitle[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  deletePhoto: (photoId: string, planId: string) => Promise<{ error: Error | null }>;
};

export function useAllPlanPhotos(): UseAllPlanPhotosResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const aggregateKey = queryKeys.plans.allPhotos(userId ?? '');

  const query = useQuery({
    queryKey: aggregateKey,
    queryFn: async (): Promise<AllPlanPhotosComposite> => {
      if (!userId) return { groups: [], recentPhotos: [] };

      // Step 1 — user's plan IDs (going/maybe only)
      const { data: memberRows, error: memberError } = await supabase
        .from('plan_members')
        .select('plan_id, rsvp')
        .eq('user_id', userId)
        .in('rsvp', ['going', 'maybe']);
      if (memberError) throw new Error(memberError.message);

      const planIds = (memberRows ?? []).map((r) => r.plan_id as string);
      if (planIds.length === 0) return { groups: [], recentPhotos: [] };

      // Step 2 — all plan_photos across those plans
      const { data: rows, error: photosError } = await supabase
        .from('plan_photos')
        .select('id, plan_id, uploader_id, storage_path, created_at')
        .in('plan_id', planIds)
        .order('created_at', { ascending: false });
      if (photosError) throw new Error(photosError.message);

      const photoRows = rows ?? [];
      if (photoRows.length === 0) return { groups: [], recentPhotos: [] };

      // Step 3 — plan titles + dates
      const uniquePlanIds = [...new Set(photoRows.map((r) => r.plan_id as string))];
      const { data: planRows, error: planTitleError } = await supabase
        .from('plans')
        .select('id, title, scheduled_for')
        .in('id', uniquePlanIds);
      if (planTitleError) throw new Error(planTitleError.message);

      const planTitleMap = new Map(
        (planRows ?? []).map((p) => [p.id as string, p.title as string]),
      );
      const planScheduledMap = new Map(
        (planRows ?? []).map((p) => [p.id as string, (p.scheduled_for as string | null) ?? null]),
      );

      // Step 4 — uploader profiles
      const uploaderIds = [...new Set(photoRows.map((r) => r.uploader_id as string))];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', uploaderIds);
      if (profileError) throw new Error(profileError.message);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

      // Step 5 — batch signed URLs (Anti-pattern: DO NOT loop createSignedUrl)
      const paths = photoRows.map((r) => r.storage_path as string);
      const { data: signedData, error: signedUrlError } = await supabase.storage
        .from('plan-gallery')
        .createSignedUrls(paths, 3600);
      if (signedUrlError) throw new Error(signedUrlError.message);
      const signedMap = new Map((signedData ?? []).map((s) => [s.path, s.signedUrl]));

      // Step 6 — assemble PlanPhotoWithUploader[]
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

      // Step 7 — group by planId, sort newest-first, derive recentPhotos
      const groupMap = new Map<string, PlanPhotoWithUploader[]>();
      for (const photo of assembled) {
        if (!groupMap.has(photo.planId)) groupMap.set(photo.planId, []);
        groupMap.get(photo.planId)!.push(photo);
      }
      const groups: PlanPhotoGroup[] = [...groupMap.entries()]
        .map(([gPlanId, photos]) => ({
          planId: gPlanId,
          planTitle: planTitleMap.get(gPlanId) ?? 'Unknown Plan',
          planScheduledFor: planScheduledMap.get(gPlanId) ?? null,
          photos,
        }))
        .sort(
          (a, b) =>
            (b.photos[0]?.createdAt ?? '').localeCompare(a.photos[0]?.createdAt ?? ''),
        );

      const recentPhotos: PlanPhotoWithTitle[] = assembled.slice(0, 6).map((photo) => ({
        ...photo,
        planTitle: planTitleMap.get(photo.planId) ?? 'Unknown Plan',
      }));

      return { groups, recentPhotos };
    },
    enabled: !!userId,
  });

  // deletePhoto — canonical Pattern 5. Optimistically filter out of BOTH the
  // aggregate cache AND the shared per-plan cache (plans.photos(planId)) so
  // both Memories and the plan detail grid stay in sync.
  const deleteMutation = useMutation({
    mutationFn: async (input: { photoId: string; planId: string; storagePath: string }) => {
      const { error: dbError } = await supabase
        .from('plan_photos')
        .delete()
        .eq('id', input.photoId);
      if (dbError) throw new Error(dbError.message);

      const { error: storageError } = await supabase.storage
        .from('plan-gallery')
        .remove([input.storagePath]);
      if (storageError) {
        console.error(
          '[useAllPlanPhotos] Storage delete failed (row already deleted):',
          storageError.message,
        );
      }
    },
    onMutate: async (input) => {
      const photosKey = queryKeys.plans.photos(input.planId);
      await queryClient.cancelQueries({ queryKey: aggregateKey });
      await queryClient.cancelQueries({ queryKey: photosKey });
      const previousAggregate = queryClient.getQueryData<AllPlanPhotosComposite>(aggregateKey);
      const previousPerPlan = queryClient.getQueryData<PlanPhotoWithUploader[]>(photosKey);

      queryClient.setQueryData<AllPlanPhotosComposite>(aggregateKey, (old) => {
        if (!old) return old;
        const groups = old.groups
          .map((g) =>
            g.planId === input.planId
              ? { ...g, photos: g.photos.filter((p) => p.id !== input.photoId) }
              : g,
          )
          .filter((g) => g.photos.length > 0);
        const recentPhotos = old.recentPhotos.filter((p) => p.id !== input.photoId);
        return { groups, recentPhotos };
      });
      queryClient.setQueryData<PlanPhotoWithUploader[]>(photosKey, (old) =>
        old?.filter((p) => p.id !== input.photoId) ?? old,
      );

      return { previousAggregate, previousPerPlan };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.previousAggregate) {
        queryClient.setQueryData(aggregateKey, ctx.previousAggregate);
      }
      if (ctx?.previousPerPlan) {
        queryClient.setQueryData(
          queryKeys.plans.photos(input.planId),
          ctx.previousPerPlan,
        );
      }
    },
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: aggregateKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.photos(input.planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  return {
    groups: query.data?.groups ?? [],
    recentPhotos: query.data?.recentPhotos ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    deletePhoto: async (photoId: string, planId: string) => {
      const group = (query.data?.groups ?? []).find((g) => g.planId === planId);
      const photo = group?.photos.find((p) => p.id === photoId);
      if (!photo) return { error: new Error('Photo not found in local state') };
      try {
        await deleteMutation.mutateAsync({
          photoId,
          planId,
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
