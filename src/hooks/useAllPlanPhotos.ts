import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PlanPhotoWithUploader } from '@/types/database';

export type PlanPhotoGroup = {
  planId: string;
  planTitle: string;
  planScheduledFor: string | null; // ISO timestamp of the plan, for section header subtitle
  photos: PlanPhotoWithUploader[]; // sorted created_at DESC within group
};

export type PlanPhotoWithTitle = PlanPhotoWithUploader & { planTitle: string };

export type UseAllPlanPhotosResult = {
  groups: PlanPhotoGroup[];
  recentPhotos: PlanPhotoWithTitle[]; // flat, most recent 6 across all plans (for widget)
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deletePhoto: (photoId: string, planId: string) => Promise<{ error: Error | null }>;
};

export function useAllPlanPhotos(): UseAllPlanPhotosResult {
  const session = useAuthStore((s) => s.session);
  const [groups, setGroups] = useState<PlanPhotoGroup[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<PlanPhotoWithTitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    if (!session?.user) return;
    setIsLoading(true);
    setError(null);

    try {
      // Step 1 — get user's plan IDs (copy from usePlans.ts lines 41–53)
      const { data: memberRows, error: memberError } = await supabase
        .from('plan_members')
        .select('plan_id, rsvp')
        .eq('user_id', session.user.id)
        .in('rsvp', ['going', 'maybe']);

      if (memberError) {
        setError(memberError.message);
        setIsLoading(false);
        return;
      }

      const planIds = (memberRows ?? []).map((r) => r.plan_id as string);
      if (planIds.length === 0) {
        setGroups([]);
        setRecentPhotos([]);
        setIsLoading(false);
        return;
      }

      // Step 2 — fetch all plan_photos across those plans
      const { data: rows, error: photosError } = await supabase
        .from('plan_photos')
        .select('id, plan_id, uploader_id, storage_path, created_at')
        .in('plan_id', planIds)
        .order('created_at', { ascending: false });

      if (photosError) {
        setError(photosError.message);
        setIsLoading(false);
        return;
      }

      const photoRows = rows ?? [];

      if (photoRows.length === 0) {
        setGroups([]);
        setRecentPhotos([]);
        setIsLoading(false);
        return;
      }

      // Step 3 — fetch plan titles + dates (separate query — avoids PostgREST join issues, per usePlanPhotos comment pattern)
      const uniquePlanIds = [...new Set(photoRows.map((r) => r.plan_id as string))];
      const { data: planRows, error: planTitleError } = await supabase
        .from('plans')
        .select('id, title, scheduled_for')
        .in('id', uniquePlanIds);
      if (planTitleError) {
        setError(planTitleError.message);
        setIsLoading(false);
        return;
      }
      const planTitleMap = new Map(
        (planRows ?? []).map((p) => [p.id as string, p.title as string])
      );
      const planScheduledMap = new Map(
        (planRows ?? []).map((p) => [p.id as string, (p.scheduled_for as string | null) ?? null])
      );

      // Step 4 — fetch uploader profiles (copy from usePlanPhotos.ts lines 50–58)
      const uploaderIds = [...new Set(photoRows.map((r) => r.uploader_id as string))];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', uploaderIds);
      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }
      const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

      // Step 5 — batch signed URLs (copy verbatim from usePlanPhotos.ts lines 62–70)
      // Anti-pattern: DO NOT loop createSignedUrl per photo — use createSignedUrls batch
      const paths = photoRows.map((r) => r.storage_path as string);
      const { data: signedData, error: signedUrlError } = await supabase.storage
        .from('plan-gallery')
        .createSignedUrls(paths, 3600);
      if (signedUrlError) {
        setError(signedUrlError.message);
        setIsLoading(false);
        return;
      }
      const signedMap = new Map((signedData ?? []).map((s) => [s.path, s.signedUrl]));

      // Step 6 — assemble PlanPhotoWithUploader[] (copy from usePlanPhotos.ts lines 73–87)
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

      // Step 7 — group by planId, sort groups newest-first, derive recentPhotos
      const groupMap = new Map<string, PlanPhotoWithUploader[]>();
      for (const photo of assembled) {
        if (!groupMap.has(photo.planId)) groupMap.set(photo.planId, []);
        groupMap.get(photo.planId)!.push(photo);
      }

      // Sort groups by most recent photo's createdAt DESC
      const grouped: PlanPhotoGroup[] = [...groupMap.entries()]
        .map(([planId, photos]) => ({
          planId,
          planTitle: planTitleMap.get(planId) ?? 'Unknown Plan',
          planScheduledFor: planScheduledMap.get(planId) ?? null,
          photos, // already sorted DESC from query
        }))
        .sort((a, b) => (b.photos[0]?.createdAt ?? '').localeCompare(a.photos[0]?.createdAt ?? ''));

      // Flat recent 6 across all plans for the widget (assembled is already sorted DESC)
      // Enrich with planTitle so the home widget caption is populated (MJ-01)
      const recent: PlanPhotoWithTitle[] = assembled.slice(0, 6).map((photo) => ({
        ...photo,
        planTitle: planTitleMap.get(photo.planId) ?? 'Unknown Plan',
      }));

      setGroups(grouped);
      setRecentPhotos(recent);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const deletePhoto = useCallback(
    async (photoId: string, planId: string): Promise<{ error: Error | null }> => {
      if (!session?.user) return { error: new Error('Not authenticated') };

      const group = groups.find((g) => g.planId === planId);
      const photo = group?.photos.find((p) => p.id === photoId);
      if (!photo) return { error: new Error('Photo not found in local state') };

      // Step 1: Delete DB row first — if this fails, storage object survives and is retryable
      // RLS: plan_photos_delete_own — uploader_id = auth.uid()
      const { error: dbError } = await supabase.from('plan_photos').delete().eq('id', photoId);

      if (dbError) return { error: new Error(dbError.message) };

      // Step 2: Remove storage object — DB row is already gone; a dangling storage object
      // here is invisible to the app but recoverable
      const { error: storageError } = await supabase.storage
        .from('plan-gallery')
        .remove([photo.storagePath]);

      if (storageError) {
        console.error(
          '[useAllPlanPhotos] Storage delete failed (row already deleted):',
          storageError.message
        );
        // Acceptable — row is gone; storage cleanup can be handled separately
      }

      await refetch();
      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, session?.user?.id, refetch]
  );

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return { groups, recentPhotos, isLoading, error, refetch, deletePhoto };
}
