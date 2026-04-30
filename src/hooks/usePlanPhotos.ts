import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { uploadPlanPhoto } from '@/lib/uploadPlanPhoto';
import type { PlanPhotoWithUploader } from '@/types/database';

type UploadError = 'photo_cap_exceeded' | 'upload_failed' | null;

export function usePlanPhotos(planId: string): {
  photos: PlanPhotoWithUploader[];
  loading: boolean;
  error: string | null;
  uploadPhoto: (localUri: string) => Promise<{ error: UploadError }>;
  deletePhoto: (photoId: string) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
} {
  const session = useAuthStore((s) => s.session);
  const [photos, setPhotos] = useState<PlanPhotoWithUploader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    if (!session?.user || !planId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch plan_photos rows ordered by created_at ASC (D-07)
      const { data: rows, error: photosError } = await supabase
        .from('plan_photos')
        .select('id, plan_id, uploader_id, storage_path, created_at')
        .eq('plan_id', planId)
        .order('created_at', { ascending: true });

      if (photosError) {
        setError(photosError.message);
        setLoading(false);
        return;
      }

      const photoRows = rows ?? [];

      if (photoRows.length === 0) {
        setPhotos([]);
        setLoading(false);
        return;
      }

      // Fetch uploader profiles in a single query (separate join — avoids PostgREST join issues)
      const uploaderIds = [...new Set(photoRows.map((r) => r.uploader_id as string))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', uploaderIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p])
      );

      // Generate signed URLs in a single batch call (D-02: 1-hour TTL)
      // Anti-pattern: DO NOT loop createSignedUrl per photo — use createSignedUrls batch
      const paths = photoRows.map((r) => r.storage_path as string);
      const { data: signedData } = await supabase.storage
        .from('plan-gallery')
        .createSignedUrls(paths, 3600); // 3600 seconds = 1 hour (D-02)

      // signedData is index-aligned with paths array
      const signedMap = new Map(
        (signedData ?? []).map((s) => [s.path, s.signedUrl])
      );

      // Assemble PlanPhotoWithUploader array (D-14)
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

      setPhotos(assembled);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [planId, session?.user?.id]);

  // uploadPhoto: compress → upload storage → call RPC → refetch (D-15)
  const uploadPhoto = useCallback(
    async (localUri: string): Promise<{ error: UploadError }> => {
      if (!session?.user) return { error: 'upload_failed' };

      // Step 1: Upload compressed image to Storage (compression happens inside uploadPlanPhoto)
      const storagePath = await uploadPlanPhoto(planId, session.user.id, localUri);
      if (!storagePath) return { error: 'upload_failed' };

      // Step 2: Register row via add_plan_photo RPC (D-09: atomic cap check + insert)
      const { error: rpcError } = await supabase.rpc('add_plan_photo', {
        p_plan_id: planId,
        p_storage_path: storagePath,
      });

      if (rpcError) {
        // Clean up orphaned storage object on RPC failure
        const { error: cleanupError } = await supabase.storage.from('plan-gallery').remove([storagePath]);
        if (cleanupError) {
          console.error('[usePlanPhotos] Orphan cleanup failed for path:', storagePath, cleanupError.message);
        }
        if (rpcError.code === 'P0001') return { error: 'photo_cap_exceeded' }; // D-10
        return { error: 'upload_failed' };
      }

      await refetch();
      return { error: null };
    },
    [planId, session?.user, refetch]
  );

  // deletePhoto: remove storage object first, then delete DB row (D-16)
  const deletePhoto = useCallback(
    async (photoId: string): Promise<{ error: Error | null }> => {
      if (!session?.user) return { error: new Error('Not authenticated') };

      // Find storage path from local state (avoids extra DB query)
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return { error: new Error('Photo not found in local state') };

      // Step 1: Delete DB row first — if this fails, storage object survives and is retryable
      // RLS: plan_photos_delete_own — uploader_id = auth.uid()
      const { error: dbError } = await supabase
        .from('plan_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) return { error: new Error(dbError.message) };

      // Step 2: Remove storage object — DB row is already gone; a dangling storage object
      // here is invisible to the app but recoverable; a dangling object with no DB row is not.
      // RLS: plan_gallery_delete_own — (storage.foldername(name))[2] = auth.uid()::text
      const { error: storageError } = await supabase.storage
        .from('plan-gallery')
        .remove([photo.storagePath]);

      if (storageError) {
        console.error('[usePlanPhotos] Storage delete failed (row already deleted):', storageError.message);
        // Acceptable — row is gone; storage cleanup can be handled separately
      }

      await refetch();
      return { error: null };
    },
    [photos, session?.user, refetch]
  );

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, session?.user?.id]);

  return { photos, loading, error, uploadPhoto, deletePhoto, refetch };
}
