// Phase 29.1 follow-up (0026) — useChatMembers hook.
//
// Returns the participants of a chat as { user_id, display_name, avatar_url }
// rows for the assignee picker, regardless of chat scope:
//   • group_channels → group_channel_members → profiles
//   • plans          → plan_members          → profiles
//   • dm_channels    → user_a + user_b       → profiles
//
// Supersedes useGroupMembers which assumed every chat was a group channel.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
  refetch: () => Promise<void>;
}

export function useChatMembers(scope: ChatScope | null): UseChatMembersResult {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [loading, setLoading] = useState<boolean>(scope !== null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!scope) {
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    let ids: string[] = [];
    if (scope.kind === 'group') {
      const { data, error: err } = await supabase
        .from('group_channel_members')
        .select('user_id')
        .eq('group_channel_id', scope.groupChannelId);
      if (err) {
        console.warn('useChatMembers: group fetch failed', err);
        setMembers([]);
        setError(err.message);
        setLoading(false);
        return;
      }
      ids = (data ?? []).map((m) => m.user_id as string);
    } else if (scope.kind === 'plan') {
      const { data, error: err } = await supabase
        .from('plan_members')
        .select('user_id')
        .eq('plan_id', scope.planId);
      if (err) {
        console.warn('useChatMembers: plan fetch failed', err);
        setMembers([]);
        setError(err.message);
        setLoading(false);
        return;
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
        setMembers([]);
        setError(err.message);
        setLoading(false);
        return;
      }
      if (data) {
        ids = [data.user_a as string, data.user_b as string];
      }
    }

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
      console.warn('useChatMembers: profiles fetch failed', profErr);
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
  }, [scope]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { members, loading, error, refetch };
}
