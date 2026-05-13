// Phase 31 Plan 05 — Migrated to TanStack Query.
// Multi-step Supabase query to find all expenses shared between the caller and a
// specific friend. Public shape preserved verbatim: { expenses, loading, error, refetch }.
//
// 3-step approach required because iou_members composite PK doesn't map cleanly to
// supabase-js join. RLS note: step 1 validates caller membership; step 2 queries those
// same group IDs for the friend — RLS permits access because caller is already a member.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface ExpenseWithFriend {
  id: string;
  title: string;
  totalCents: number;
  payerName: string;
  createdAt: string;
  isFullySettled: boolean;
}

export interface ExpensesWithFriendData {
  expenses: ExpenseWithFriend[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useExpensesWithFriend(friendId: string): ExpensesWithFriendData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.expenses.withFriend(friendId),
    queryFn: async (): Promise<ExpenseWithFriend[]> => {
      if (!userId || !friendId) return [];

      // Step 1: all group IDs where caller is a member
      const { data: callerMemberships, error: callerErr } = await supabase
        .from('iou_members')
        .select('iou_group_id')
        .eq('user_id', userId);
      if (callerErr) throw callerErr;

      const callerGroupIds = (callerMemberships ?? []).map((m) => m.iou_group_id);
      if (callerGroupIds.length === 0) return [];

      // Step 2: of those groups, ones where friendId is also a member
      const { data: friendMemberships, error: friendErr } = await supabase
        .from('iou_members')
        .select('iou_group_id')
        .eq('user_id', friendId)
        .in('iou_group_id', callerGroupIds);
      if (friendErr) throw friendErr;

      const sharedGroupIds = (friendMemberships ?? []).map((m) => m.iou_group_id);
      if (sharedGroupIds.length === 0) return [];

      // Steps 3+4 in parallel: groups rows + all member rows (for settlement)
      const [groupsResult, membersResult] = await Promise.all([
        supabase
          .from('iou_groups')
          .select('id, title, total_amount_cents, created_by, created_at')
          .in('id', sharedGroupIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('iou_members')
          .select('iou_group_id, user_id, settled_at')
          .in('iou_group_id', sharedGroupIds),
      ]);
      if (groupsResult.error) throw groupsResult.error;
      if (membersResult.error) throw membersResult.error;

      const groups = groupsResult.data ?? [];
      const allMembers = membersResult.data ?? [];

      // Fetch payer profiles
      const creatorIds = [...new Set(groups.map((g) => g.created_by))];
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', creatorIds);
      if (profilesErr) throw profilesErr;

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      // Build isFullySettled map: groupId → all members settled
      const settledMap = new Map<string, boolean>();
      for (const groupId of sharedGroupIds) {
        const groupMembers = allMembers.filter((m) => m.iou_group_id === groupId);
        settledMap.set(
          groupId,
          groupMembers.length > 0 && groupMembers.every((m) => m.settled_at !== null),
        );
      }

      return groups.map((g) => ({
        id: g.id,
        title: g.title,
        totalCents: g.total_amount_cents,
        payerName: profileMap.get(g.created_by) ?? 'Unknown',
        createdAt: g.created_at,
        isFullySettled: settledMap.get(g.id) ?? false,
      }));
    },
    enabled: !!userId && !!friendId,
  });

  return {
    expenses: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
