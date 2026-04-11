import { supabase } from '@/lib/supabase';

/**
 * Uploads a local image URI to Supabase Storage plan-covers bucket.
 * D-15: Uses Supabase Storage for image hosting.
 * Returns the public URL on success, or null on failure.
 *
 * Pattern: FormData upload — React Native's fetch(fileUri).blob() produces
 * empty blobs, so we use FormData which RN handles natively for file URIs.
 * upsert: true allows safe re-upload when editing an existing plan's cover.
 */
export async function uploadPlanCover(
  planId: string,
  localUri: string
): Promise<string | null> {
  try {
    const path = `${planId}/cover.jpg`;

    const formData = new FormData();
    formData.append('', {
      uri: localUri,
      name: 'cover.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    const { error: uploadError } = await supabase.storage
      .from('plan-covers')
      .upload(path, formData, {
        upsert: true, // allow re-upload on plan edit
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
