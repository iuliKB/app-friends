// Phase 9 v1.4 — useExpensesWithFriend hook (IOU-05).
// Multi-step Supabase query to find all expenses shared between
// the current user and a specific friend. Three-step approach required
// because iou_members composite PK doesn't map cleanly to supabase-js join.
// RLS note: step 1 validates caller membership; step 2 queries those same
// group IDs for friend — RLS permits access because caller is already a member.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

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
  refetch: () => Promise<void>;
}

export function useExpensesWithFriend(friendId: string): ExpensesWithFriendData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [expenses, setExpenses] = useState<ExpenseWithFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !friendId) {
      setLoading(false);
      setExpenses([]);
      return;
    }
    setLoading(true);
    setError(null);

    // Step 1: get all group IDs where current user is a member
    const { data: callerMemberships, error: callerErr } = await supabase
      .from('iou_members')
      .select('iou_group_id')
      .eq('user_id', userId);

    if (callerErr) {
      console.warn('useExpensesWithFriend step1 failed', callerErr);
      setError("Couldn't load expenses. Pull down to refresh.");
      setExpenses([]);
      setLoading(false);
      return;
    }

    const callerGroupIds = (callerMemberships ?? []).map((m) => m.iou_group_id);
    if (callerGroupIds.length === 0) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    // Step 2: from those groups, find ones where friendId is also a member
    const { data: friendMemberships, error: friendErr } = await supabase
      .from('iou_members')
      .select('iou_group_id')
      .eq('user_id', friendId)
      .in('iou_group_id', callerGroupIds);

    if (friendErr) {
      console.warn('useExpensesWithFriend step2 failed', friendErr);
      setError("Couldn't load expenses. Pull down to refresh.");
      setExpenses([]);
      setLoading(false);
      return;
    }

    const sharedGroupIds = (friendMemberships ?? []).map((m) => m.iou_group_id);
    if (sharedGroupIds.length === 0) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    // Steps 3+4 in parallel: groups rows, all member rows (for settlement)
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

    if (groupsResult.error || membersResult.error) {
      console.warn('useExpensesWithFriend step3/4 failed', groupsResult.error ?? membersResult.error);
      setError("Couldn't load expenses. Pull down to refresh.");
      setExpenses([]);
      setLoading(false);
      return;
    }

    const groups = groupsResult.data ?? [];
    const allMembers = membersResult.data ?? [];

    // Fetch payer profiles
    const creatorIds = [...new Set(groups.map((g) => g.created_by))];
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', creatorIds);

    if (profilesErr) {
      console.warn('useExpensesWithFriend profiles failed', profilesErr);
      setError("Couldn't load expenses. Pull down to refresh.");
      setExpenses([]);
      setLoading(false);
      return;
    }

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    // Build isFullySettled map: groupId → all members settled
    const settledMap = new Map<string, boolean>();
    for (const groupId of sharedGroupIds) {
      const groupMembers = allMembers.filter((m) => m.iou_group_id === groupId);
      settledMap.set(
        groupId,
        groupMembers.length > 0 && groupMembers.every((m) => m.settled_at !== null)
      );
    }

    const result: ExpenseWithFriend[] = groups.map((g) => ({
      id: g.id,
      title: g.title,
      totalCents: g.total_amount_cents,
      payerName: profileMap.get(g.created_by) ?? 'Unknown',
      createdAt: g.created_at,
      isFullySettled: settledMap.get(g.id) ?? false,
    }));

    setExpenses(result);
    setLoading(false);
  }, [userId, friendId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { expenses, loading, error, refetch };
}
