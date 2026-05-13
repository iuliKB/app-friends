// Phase 31 Plan 08 — useChatMembers migrated to TanStack Query.
//
// Returns the participants of a chat as { user_id, display_name, avatar_url }
// rows for the assignee picker, regardless of chat scope:
//   • group_channels → group_channel_members → profiles
//   • plans          → plan_members          → profiles
//   • dm_channels    → user_a + user_b       → profiles
//
// Read-only — no mutations. Public shape (UseChatMembersResult) preserved verbatim
// so the ChatRoomScreen callsite is unchanged.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { ChatScope } from '@/hooks/useChatTodos';

export interface ChatMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface UseChatMembersResult {
  members: ChatMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

function scopeId(scope: ChatScope | null): string {
  if (!scope) return '';
  if (scope.kind === 'group') return `g:${scope.groupChannelId}`;
  if (scope.kind === 'plan') return `p:${scope.planId}`;
  return `d:${scope.dmChannelId}`;
}

export function useChatMembers(scope: ChatScope | null): UseChatMembersResult {
  const query = useQuery({
    // Use the (group_channel_id|plan_id|dm_channel_id) as the cache anchor —
    // queryKeys.chat.members keys by channelId; the kind prefix is encoded in
    // scopeId so the three branches don't collide.
    queryKey: queryKeys.chat.members(scopeId(scope)),
    queryFn: async (): Promise<ChatMember[]> => {
      if (!scope) return [];

      let ids: string[] = [];
      if (scope.kind === 'group') {
        const { data, error: err } = await supabase
          .from('group_channel_members')
          .select('user_id')
          .eq('group_channel_id', scope.groupChannelId);
        if (err) {
          console.warn('useChatMembers: group fetch failed', err);
          throw err;
        }
        ids = (data ?? []).map((m) => m.user_id as string);
      } else if (scope.kind === 'plan') {
        const { data, error: err } = await supabase
          .from('plan_members')
          .select('user_id')
          .eq('plan_id', scope.planId);
        if (err) {
          console.warn('useChatMembers: plan fetch failed', err);
          throw err;
        }
        ids = (data ?? []).map((m) => m.user_id as string);
      } else {
        const { data, error: err } = await supabase
          .from('dm_channels')
          .select('user_a, user_b')
          .eq('id', scope.dmChannelId)
          .maybeSingle();
        if (err) {
          console.warn('useChatMembers: dm fetch failed', err);
          throw err;
        }
        if (data) {
          ids = [data.user_a as string, data.user_b as string];
        }
      }

      if (ids.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids);
      if (profErr) {
        console.warn('useChatMembers: profiles fetch failed', profErr);
        throw profErr;
      }
      return (profiles ?? []).map((p) => ({
        user_id: p.id as string,
        display_name: (p.display_name as string | null) ?? 'Unknown',
        avatar_url: (p.avatar_url as string | null) ?? null,
      }));
    },
    enabled: scope !== null,
  });

  return {
    members: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
