import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

/**
 * Uploads a local image URI to the private plan-gallery Supabase Storage bucket.
 *
 * D-11: Uses fetch(localUri).arrayBuffer() — FormData + file:// fails in RN.
 * D-11: upsert: false — each photo gets a new UUID-like path; re-upload not meaningful.
 * D-11: contentType forced to 'image/jpeg' — prevents executable-disguised-as-image.
 * D-12: Compresses to 1920px max dimension / 0.85 JPEG quality before upload.
 * D-04: Path format: {plan_id}/{user_id}/{photo_id}.jpg
 *
 * Returns the storage path (relative to bucket root) on success, null on failure.
 * The bucket is PRIVATE — do NOT call getPublicUrl(). Use createSignedUrls in usePlanPhotos.
 */
export async function uploadPlanPhoto(
  planId: string,
  userId: string,
  localUri: string
): Promise<string | null> {
  try {
    // D-12: Compress before upload — gallery photos viewed full-screen (1920px / 0.85)
    const compressed = await manipulateAsync(
      localUri,
      [{ resize: { width: 1920 } }],
      { compress: 0.85, format: SaveFormat.JPEG }
    );

    // D-04: path format {plan_id}/{user_id}/{photo_id}.jpg
    // crypto.randomUUID() unavailable in Hermes — use established project pattern
    const photoId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const path = `${planId}/${userId}/${photoId}.jpg`;

    const response = await fetch(compressed.uri);
    if (!response.ok) {
      console.error('[uploadPlanPhoto] Failed to read compressed file:', response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('plan-gallery')
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg', // D-11: forced — prevents executable disguise
        upsert: false,             // D-11: new path per photo; no overwrite
      });

    if (uploadError) {
      console.error('[uploadPlanPhoto] Upload failed:', uploadError.message);
      return null;
    }

    // Return storage path — NOT a public URL. Bucket is private.
    // usePlanPhotos will call createSignedUrls(paths, 3600) to generate viewable URLs.
    return path;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[uploadPlanPhoto] Unexpected error:', message);
    return null;
  }
}
