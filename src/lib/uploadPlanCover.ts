import { supabase } from '@/lib/supabase';

/**
 * Uploads a local image URI to Supabase Storage plan-covers bucket.
 * D-15: Uses Supabase Storage for image hosting.
 * Returns the public URL on success, or null on failure.
 *
 * Pattern: fetch local URI → ArrayBuffer → Supabase upload.
 * FormData + file:// URI fails in React Native because the Supabase SDK's
 * internal fetch polyfill cannot stream local file URIs. ArrayBuffer bypasses
 * that issue — RN's native fetch handles file:// correctly.
 * upsert: true allows safe re-upload when editing an existing plan's cover.
 */
export async function uploadPlanCover(
  planId: string,
  localUri: string
): Promise<string | null> {
  try {
    const path = `${planId}/cover.jpg`;

    const response = await fetch(localUri);
    if (!response.ok) {
      console.error('[uploadPlanCover] Failed to read local file:', response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('plan-covers')
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('[uploadPlanCover] Upload failed:', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('plan-covers').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[uploadPlanCover] Unexpected error:', message);
    return null;
  }
}
