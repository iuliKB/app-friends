// Phase 29.1 Plan 07 — useGroupMembers hook.
//
// Loads the members of a `group_channels` row joined with profiles, returning
// the minimal shape ChatTodoPickerSheet needs for its assignee picker. Pulled
// out so the query doesn't have to live inline in ChatRoomScreen.
//
// Pattern: mirrors GroupParticipantsSheet.fetchParticipants (two-step select:
// member ids first, then a profiles `.in('id', ids)` query) but exposed as a
// reusable hook with reactive state + loading/error tracking.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface GroupMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface UseGroupMembersResult {
  members: GroupMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGroupMembers(groupChannelId: string | null): UseGroupMembersResult {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState<boolean>(!!groupChannelId);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!groupChannelId) {
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: memberRows, error: memberErr } = await supabase
      .from('group_channel_members')
      .select('user_id')
      .eq('group_channel_id', groupChannelId);
    if (memberErr) {
      console.warn('useGroupMembers: failed to load member ids', memberErr);
      setMembers([]);
      setError(memberErr.message);
      setLoading(false);
      return;
    }
    const ids = (memberRows ?? []).map((m) => m.user_id as string);
    if (ids.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);
    if (profErr) {
      console.warn('useGroupMembers: failed to load profiles', profErr);
      setMembers([]);
      setError(profErr.message);
      setLoading(false);
      return;
    }
    setMembers(
      (profiles ?? []).map((p) => ({
        user_id: p.id as string,
        display_name: (p.display_name as string | null) ?? 'Unknown',
        avatar_url: (p.avatar_url as string | null) ?? null,
      }))
    );
    setLoading(false);
  }, [groupChannelId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { members, loading, error, refetch };
}
