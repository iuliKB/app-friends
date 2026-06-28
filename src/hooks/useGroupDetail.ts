// Group channel detail (name, creator, birthday flag). Shared by GroupInfoScreen
// and ChatMembersScreen via the same cache key so a rename/refetch in one is
// reflected in the other.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface GroupDetail {
  name: string;
  createdBy: string;
  birthdayPersonId: string | null;
}

export interface UseGroupDetailResult {
  detail: GroupDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useGroupDetail(groupChannelId: string | null): UseGroupDetailResult {
  const query = useQuery({
    queryKey: [...queryKeys.chat.room(groupChannelId ?? ''), 'detail'],
    queryFn: async (): Promise<GroupDetail | null> => {
      const { data, error } = await supabase
        .from('group_channels')
        .select('name, created_by, birthday_person_id')
        .eq('id', groupChannelId ?? '')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        name: (data.name as string | null) ?? 'Group',
        createdBy: data.created_by as string,
        birthdayPersonId: data.birthday_person_id as string | null,
      };
    },
    enabled: !!groupChannelId,
    staleTime: 30_000,
  });

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
