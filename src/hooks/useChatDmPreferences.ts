// Phase 33 — Mute state read for the friend profile QuickActionsRow.
//
// Reads chat_preferences for (myId, 'dm', channelId). When channelId is null
// (no DM created yet) the query is disabled — data stays null and the Mute
// button defaults to "Mute" (not muted) per UI-SPEC §Quick-Action Buttons.
//
// The Mute mutation itself lives inline in the friend profile screen (Plan 06)
// — this hook only handles the read so the screen's Mute button label/icon
// reflects current state on mount.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface ChatDmPreferencesData {
  isMuted: boolean;
}

export interface UseChatDmPreferencesResult {
  data: ChatDmPreferencesData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export type ChatPrefType = 'dm' | 'group' | 'plan';

export function useChatDmPreferences(
  channelId: string | null,
  chatType: ChatPrefType = 'dm'
): UseChatDmPreferencesResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.chat.preferences(channelId ?? ''),
    queryFn: async (): Promise<ChatDmPreferencesData> => {
      if (!userId || !channelId) return { isMuted: false };
      const { data, error } = await supabase
        .from('chat_preferences')
        .select('is_muted')
        .eq('user_id', userId)
        .eq('chat_type', chatType)
        .eq('chat_id', channelId)
        .maybeSingle();
      if (error) throw error;
      return { isMuted: data?.is_muted ?? false };
    },
    enabled: !!userId && !!channelId,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
