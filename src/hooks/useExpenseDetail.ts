// Phase 31 Plan 05 — Migrated to TanStack Query.
//
// Single useQuery whose queryFn performs the 3 sequential reads (iou_groups row +
// iou_members rows + profiles for member user_ids). Public shape preserved verbatim.
//
// settle() is canonical Pattern 5: optimistic flip of settled_at on the participant
// row, rollback on error, invalidates expenses.detail + expenses.iouSummary +
// expenses.withFriend + home.all() on settle. (Settle has its own onMutate; the
// per-row settleLoading flag is purely UI — when there's no live ctx it just stays
// `false` and the optimistic flip of isSettled drives the visual change.)
//
// CRITICAL: composite PK — both eq clauses (iou_group_id + user_id) required on
// settle UPDATE (iou_members has no `id` column — RESEARCH.md Pitfall 3).
//
// RLS UPDATE policy `iou_members_update_creator_settles` enforces creator-only;
// isCreator flag is UI convenience only (T-08-P03-01).

import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface ParticipantEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  shareCents: number;
  isSettled: boolean;
  settleLoading: boolean; // per-row loading state for settle button (UI-only)
}

export interface ExpenseDetail {
  id: string;
  title: string;
  totalCents: number;
  splitMode: 'even' | 'custom';
  createdBy: string;
  payerName: string;
  createdAt: string;
  participants: ParticipantEntry[];
  allSettled: boolean;
}

export interface ExpenseDetailData {
  detail: ExpenseDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  settle: (participantUserId: string) => Promise<void>;
  isCreator: boolean;
}

export function useExpenseDetail(expenseId: string): ExpenseDetailData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const detailKey = queryKeys.expenses.detail(expenseId);

  const query = useQuery({
    queryKey: detailKey,
    queryFn: async (): Promise<ExpenseDetail | null> => {
      if (!userId || !expenseId) return null;

      // Query 1 + 2 in parallel: group row + member rows (independent)
      const [groupResult, membersResult] = await Promise.all([
        supabase.from('iou_groups').select('*').eq('id', expenseId).single(),
        supabase
          .from('iou_members')
          .select('user_id, share_amount_cents, settled_at, settled_by')
          .eq('iou_group_id', expenseId),
      ]);

      if (groupResult.error || !groupResult.data) {
        if (groupResult.error) throw groupResult.error;
        return null;
      }
      if (membersResult.error) throw membersResult.error;

      const group = groupResult.data;
      const members = membersResult.data ?? [];

      // Query 3 (sequenced — depends on member ids): profiles
      const memberIds = members.map((m) => m.user_id);
      const { data: profiles, error: profilesErr } =
        memberIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', memberIds)
          : { data: [], error: null };
      if (profilesErr) throw profilesErr;

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const participants: ParticipantEntry[] = members.map((m) => {
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

      return {
        id: group.id,
        title: group.title,
        totalCents: group.total_amount_cents,
        splitMode: group.split_mode,
        createdBy: group.created_by,
        payerName,
        createdAt: group.created_at,
        participants,
        allSettled,
      };
    },
    enabled: !!userId && !!expenseId,
  });

  const settleMutation = useMutation({
    mutationFn: async (participantUserId: string) => {
      if (!userId || !expenseId) throw new Error('Not ready');
      // Composite PK — both eq clauses required (Pitfall 3)
      const { error } = await supabase
        .from('iou_members')
        .update({ settled_at: new Date().toISOString(), settled_by: userId })
        .eq('iou_group_id', expenseId)
        .eq('user_id', participantUserId);
      if (error) throw error;
    },
    onMutate: async (participantUserId) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ExpenseDetail | null>(detailKey);
      queryClient.setQueryData<ExpenseDetail | null>(detailKey, (old) => {
        if (!old) return old;
        const nextParticipants = old.participants.map((p) =>
          p.userId === participantUserId ? { ...p, isSettled: true } : p,
        );
        return {
          ...old,
          participants: nextParticipants,
          allSettled:
            nextParticipants.length > 0 && nextParticipants.every((p) => p.isSettled),
        };
      });
      return { previous };
    },
    onError: (_err, _participantUserId, ctx) => {
      if (ctx?.previous !== undefined) queryClient.setQueryData(detailKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.iouSummary(userId ?? ''),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
      // expenses.withFriend cache is per-friend; broad expenses prefix invalidation
      // covers all friend pairings without enumerating them here.
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
  });

  const isCreator = userId !== null && userId === query.data?.createdBy;

  return {
    detail: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    settle: async (participantUserId: string) => {
      try {
        await settleMutation.mutateAsync(participantUserId);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {},
        );
      } catch (_err) {
        // Error already surfaces via the cache rollback; consumer's existing
        // error UI reads from `error` field on next render.
      }
    },
    isCreator,
  };
}
