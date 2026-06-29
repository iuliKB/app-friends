// Quick "mark settled" for a whole expense, used by the chat-info Expenses
// sections (DM + group). Settles every still-unsettled participant of one
// iou_group in a single UPDATE. RLS (iou_members_update_creator_settles)
// enforces creator-only — non-creators get a no-op/empty result, so callers
// gate the button on createdBy === currentUserId.
//
// Invalidation mirrors useExpenseDetail.settle: detail + iouSummary + home +
// the broad expenses prefix (covers withFriend(*) and channel(*) caches).

import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface UseExpenseSettleAllResult {
  settleExpense: (expenseId: string) => Promise<void>;
  pendingId: string | null;
}

export function useExpenseSettleAll(): UseExpenseSettleAllResult {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const queryClient = useQueryClient();

  // Settle-all is a fire-and-refresh write (no per-row cache to splice), so it
  // uses onSettled invalidation rather than the optimistic onMutate/onError shape.
  // @mutationShape: no-optimistic
  const mutation = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('iou_members')
        .update({ settled_at: new Date().toISOString(), settled_by: userId })
        .eq('iou_group_id', expenseId)
        .is('settled_at', null);
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.iouSummary(userId ?? ''),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
      // Broad prefix covers detail(*), withFriend(*) and channel(*) caches.
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
  });

  return {
    settleExpense: async (expenseId: string) => {
      try {
        await mutation.mutateAsync(expenseId);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        // Error surfaces on the next render via cache refresh; the button just
        // re-enables. (Most common cause: non-creator blocked by RLS.)
      }
    },
    pendingId: mutation.isPending ? (mutation.variables ?? null) : null,
  };
}
