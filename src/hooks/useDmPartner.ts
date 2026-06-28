// Resolves the "other" participant of a DM channel → their profile basics.
// Used by the chat-room header (subtitle = @username), DmInfoScreen
// ("View full profile" deep-link + Create Group pre-include), so the DM
// partner lookup lives in one cached place instead of being duplicated.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface DmPartner {
  friendId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface UseDmPartnerResult {
  partner: DmPartner | null;
  isLoading: boolean;
  error: string | null;
}

export function useDmPartner(dmChannelId: string | null): UseDmPartnerResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? '';

  const query = useQuery({
    queryKey: [...queryKeys.chat.room(dmChannelId ?? ''), 'partner', userId],
    queryFn: async (): Promise<DmPartner | null> => {
      const { data: channel, error: chErr } = await supabase
        .from('dm_channels')
        .select('user_a, user_b')
        .eq('id', dmChannelId ?? '')
        .maybeSingle();
      if (chErr) throw chErr;
      if (!channel) return null;

      const otherId =
        channel.user_a === userId ? (channel.user_b as string) : (channel.user_a as string);

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', otherId)
        .maybeSingle();
      if (pErr) throw pErr;

      return {
        friendId: otherId,
        username: (profile?.username as string | null) ?? null,
        displayName: (profile?.display_name as string | null) ?? 'Unknown',
        avatarUrl: (profile?.avatar_url as string | null) ?? null,
      };
    },
    enabled: !!dmChannelId && !!userId,
    staleTime: 5 * 60_000,
  });

  return {
    partner: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
