// Shared-media reader for the chat info screens (DM + group).
//
// Selects every image message in a channel so the info screen can render a
// media grid. Exactly one of the three id columns is set on a message row
// (messages_exactly_one_channel constraint), so we filter on whichever scope
// the caller passes. Ordered newest-first to match the Messenger/Telegram grid.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export type ChatMediaScope =
  | { kind: 'dm'; dmChannelId: string }
  | { kind: 'group'; groupChannelId: string }
  | { kind: 'plan'; planId: string };

export interface ChatMediaItem {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export interface UseChatMediaResult {
  media: ChatMediaItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

function scopeColumn(scope: ChatMediaScope): { column: string; id: string } {
  if (scope.kind === 'dm') return { column: 'dm_channel_id', id: scope.dmChannelId };
  if (scope.kind === 'group') return { column: 'group_channel_id', id: scope.groupChannelId };
  return { column: 'plan_id', id: scope.planId };
}

export function useChatMedia(scope: ChatMediaScope | null): UseChatMediaResult {
  const resolved = scope ? scopeColumn(scope) : null;

  const query = useQuery({
    queryKey: queryKeys.chat.media(resolved?.id ?? ''),
    queryFn: async (): Promise<ChatMediaItem[]> => {
      if (!resolved) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('id, image_url, created_at')
        .eq(resolved.column, resolved.id)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((r) => !!r.image_url)
        .map((r) => ({
          id: r.id as string,
          imageUrl: r.image_url as string,
          createdAt: r.created_at as string,
        }));
    },
    enabled: !!resolved,
    staleTime: 30_000,
  });

  return {
    media: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
