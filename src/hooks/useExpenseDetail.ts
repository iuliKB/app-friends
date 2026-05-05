// Phase 8 — useExpenseDetail hook (IOU-01, IOU-02, IOU-04).
// Fetches expense detail via three sequential Supabase queries and
// provides a settle() action. settle() uses composite PK (iou_group_id + user_id)
// — iou_members has no separate 'id' column (RESEARCH.md Pitfall 3).
// RLS UPDATE policy `iou_members_update_creator_settles` enforces creator-only;
// isCreator flag is UI convenience only (T-08-P03-01).

import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface ParticipantEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  shareCents: number;
  isSettled: boolean;
  settleLoading: boolean; // per-row loading state for settle button
}

export interface ExpenseDetail {
  id: string;
  title: string;
  totalCents: number;
  splitMode: 'even' | 'custom';
  createdBy: string; // userId of expense creator
  payerName: string; // display_name of creator
  createdAt: string;
  participants: ParticipantEntry[];
  allSettled: boolean; // true when every participant.isSettled === true
}

export interface ExpenseDetailData {
  detail: ExpenseDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  settle: (participantUserId: string) => Promise<void>;
  isCreator: boolean; // current userId === detail.createdBy
}

export function useExpenseDetail(expenseId: string): ExpenseDetailData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !expenseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Query 1: fetch the iou_groups row
    const { data: group, error: groupErr } = await supabase
      .from('iou_groups')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (groupErr || !group) {
      setError("Couldn't load expense. Pull down to refresh.");
      setDetail(null);
      setLoading(false);
      return;
    }

    // Query 2: fetch iou_members for this expense
    const { data: members, error: membersErr } = await supabase
      .from('iou_members')
      .select('user_id, share_amount_cents, settled_at, settled_by')
      .eq('iou_group_id', expenseId);

    if (membersErr) {
      setError("Couldn't load expense. Pull down to refresh.");
      setDetail(null);
      setLoading(false);
      return;
    }

    // Query 3: fetch profiles for all member user_ids
    const memberIds = (members ?? []).map((m) => m.user_id);
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', memberIds);

    if (profilesErr) {
      setError("Couldn't load expense. Pull down to refresh.");
      setDetail(null);
      setLoading(false);
      return;
    }

    // Build participants: join members with profiles
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const participants: ParticipantEntry[] = (members ?? []).map((m) => {
      const profile = profileMap.get(m.user_id);
      return {
        userId: m.user_id,
        displayName: profile?.display_name ?? 'Unknown',
        avatarUrl: profile?.avatar_url ?? null,
        shareCents: m.share_amount_cents,
        isSettled: m.settled_at !== null,
        settleLoading: false,
      };
    });

    const payerProfile = profileMap.get(group.created_by);
    const payerName = payerProfile?.display_name ?? 'Unknown';
    const allSettled = participants.length > 0 && participants.every((p) => p.isSettled);

    setDetail({
      id: group.id,
      title: group.title,
      totalCents: group.total_amount_cents,
      splitMode: group.split_mode,
      createdBy: group.created_by,
      payerName,
      createdAt: group.created_at,
      participants,
      allSettled,
    });
    setLoading(false);
  }, [userId, expenseId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const settle = useCallback(
    async (participantUserId: string) => {
      if (!userId || !expenseId) return;

      // Set per-row settleLoading = true (immutable update)
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.userId === participantUserId ? { ...p, settleLoading: true } : p
          ),
        };
      });

      // CRITICAL: composite PK — both eq clauses required (iou_members has no 'id' column)
      const { error: settleErr } = await supabase
        .from('iou_members')
        .update({ settled_at: new Date().toISOString(), settled_by: userId })
        .eq('iou_group_id', expenseId)
        .eq('user_id', participantUserId);

      if (settleErr) {
        // Reset per-row loading on error
        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === participantUserId ? { ...p, settleLoading: false } : p
            ),
          };
        });
        setError("Couldn't mark as settled. Try again.");
        return;
      }

      // Success: haptic feedback then reload fresh state
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refetch();
    },
    [userId, expenseId, refetch]
  );

  const isCreator = userId !== null && userId === detail?.createdBy;

  return { detail, loading, error, refetch, settle, isCreator };
}
