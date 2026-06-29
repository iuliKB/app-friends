// Chat-info Expenses section for GROUP and PLAN chats.
//
// iou_groups.group_channel_id (migration 0032) / iou_groups.plan_id (migration
// 0035) tie an expense to a group or plan chat (set by create_expense when
// created from the chat). RLS still scopes SELECT to expenses the caller
// participates in, so this lists the chat's expenses that involve the caller.
// Returns the same ExpenseWithFriend shape the DM section uses
// (useExpensesWithFriend) so one section component renders all sources.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import type { ExpenseWithFriend } from '@/hooks/useExpensesWithFriend';

export interface ChatChannelExpensesData {
  expenses: ExpenseWithFriend[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

// Exactly one of groupChannelId / planId identifies the chat scope.
export type ChatExpensesScope = { groupChannelId: string } | { planId: string };

export function useChatChannelExpenses(scope: ChatExpensesScope): ChatChannelExpensesData {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const isPlan = 'planId' in scope;
  const id = isPlan ? scope.planId : scope.groupChannelId;

  const query = useQuery({
    queryKey: isPlan ? queryKeys.expenses.planChannel(id) : queryKeys.expenses.channel(id),
    queryFn: async (): Promise<ExpenseWithFriend[]> => {
      if (!id) return [];

      const { data: groups, error: groupsErr } = await supabase
        .from('iou_groups')
        .select('id, title, total_amount_cents, created_by, created_at')
        .eq(isPlan ? 'plan_id' : 'group_channel_id', id)
        .order('created_at', { ascending: false });
      if (groupsErr) throw groupsErr;
      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map((g) => g.id);
      const [membersResult, profilesResult] = await Promise.all([
        supabase
          .from('iou_members')
          .select('iou_group_id, settled_at')
          .in('iou_group_id', groupIds),
        supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', [...new Set(groups.map((g) => g.created_by))]),
      ]);
      if (membersResult.error) throw membersResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const allMembers = membersResult.data ?? [];
      const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p.display_name]));

      const settledMap = new Map<string, boolean>();
      for (const gid of groupIds) {
        const rows = allMembers.filter((m) => m.iou_group_id === gid);
        settledMap.set(gid, rows.length > 0 && rows.every((m) => m.settled_at !== null));
      }

      return groups.map((g) => ({
        id: g.id,
        title: g.title,
        totalCents: g.total_amount_cents,
        payerName: profileMap.get(g.created_by) ?? 'Unknown',
        createdBy: g.created_by,
        createdAt: g.created_at,
        isFullySettled: settledMap.get(g.id) ?? false,
      }));
    },
    enabled: !!userId && !!id,
  });

  return {
    expenses: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
