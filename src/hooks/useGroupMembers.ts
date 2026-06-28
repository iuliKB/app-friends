// Group member list for the group-info screen (and, going forward, the
// GroupParticipantsSheet). Ports the two-step query that previously lived
// inline in GroupParticipantsSheet.tsx (members → profiles) into a shared
// TanStack Query hook keyed by queryKeys.chat.members(groupChannelId).

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface GroupMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface UseGroupMembersResult {
  members: GroupMember[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useGroupMembers(groupChannelId: string | null): UseGroupMembersResult {
  const query = useQuery({
    queryKey: queryKeys.chat.members(groupChannelId ?? ''),
    queryFn: async (): Promise<GroupMember[]> => {
      if (!groupChannelId) return [];
      const { data: members, error: membersError } = await supabase
        .from('group_channel_members')
        .select('user_id')
        .eq('group_channel_id', groupChannelId);
      if (membersError) throw membersError;

      const ids = (members ?? []).map((m) => m.user_id as string);
      if (ids.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids);
      if (profilesError) throw profilesError;

      return (profiles ?? []).map((p) => ({
        id: p.id as string,
        display_name: (p.display_name as string | null) ?? 'Unknown',
        avatar_url: p.avatar_url as string | null,
      }));
    },
    enabled: !!groupChannelId,
    staleTime: 30_000,
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
