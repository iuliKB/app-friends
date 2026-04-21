import { supabase } from '@/lib/supabase';

/**
 * Uploads a compressed local image URI to the chat-media Supabase Storage bucket.
 * D-06: Uses fetch(localUri).arrayBuffer() pattern — FormData + file:// fails in RN.
 * Returns the public CDN URL on success, or null on failure.
 * upsert: false — each messageId is a UUID; no re-upload needed.
 */
export async function uploadChatMedia(
  userId: string,
  messageId: string,
  localUri: string
): Promise<string | null> {
  try {
    const path = `${userId}/${messageId}.jpg`;

    const response = await fetch(localUri);
    if (!response.ok) {
      console.error('[uploadChatMedia] Failed to read local file:', response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploadChatMedia] Upload failed:', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[uploadChatMedia] Unexpected error:', message);
    return null;
  }
}
