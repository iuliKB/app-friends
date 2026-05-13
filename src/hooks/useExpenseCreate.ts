// Phase 31 Plan 05 — Migrated to TanStack Query.
//
// Mutator-only migration: form state stays as local useState (NOT migrated — the
// consumer `/squad/expenses/create.tsx` reads form fields directly off the hook
// result; pulling form state into a separate screen-level layer would require a
// full consumer refactor that the plan explicitly defers).
//
// Migrated surface:
//   - useQuery for the friends-picker list (keyed by friends.list(userId) when not
//     scoped to a group channel; per-channel cached when scoped — that path uses
//     queryKeys.chat.members(groupChannelId) so the picker reuses the same cache
//     as the chat room's member list).
//   - useMutation for the submit (create_expense RPC). Side-effect-heavy (server-
//     generated group id; multiple table writes); follows `@mutationShape:
//     no-optimistic` exemption marker. On settle invalidates the full triple:
//     expenses.list, expenses.iouSummary, home.all (Pitfall 10 fan-out).
//
// Payer (userId) is auto-included in participant IDs per RESEARCH.md Pitfall 6.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface FriendEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ExpenseCreateData {
  // Form state
  title: string;
  setTitle: (t: string) => void;
  rawDigits: string;
  setRawDigits: (d: string) => void;
  splitMode: 'even' | 'custom';
  setSplitMode: (m: 'even' | 'custom') => void;
  selectedFriendIds: Set<string>;
  toggleFriend: (id: string) => void;
  customAmounts: Record<string, string>;
  setCustomAmount: (userId: string, rawDigits: string) => void;

  // Derived
  totalCents: number;
  allocatedCents: number;

  // Friends for picker
  friends: FriendEntry[];
  friendsLoading: boolean;

  // Submit state
  submitting: boolean;
  submitError: string | null;
  canSubmit: boolean;

  // Actions
  submit: () => Promise<void>;
}

interface FriendsQueryShape {
  entries: FriendEntry[];
  defaultSelected: Set<string>; // for group-scoped: pre-select all members
}

export function useExpenseCreate(opts?: { groupChannelId?: string | null }): ExpenseCreateData {
  const groupChannelId = opts?.groupChannelId ?? null;
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state — local useState; pulled into the hook for consumer compatibility.
  const [title, setTitle] = useState('');
  const [rawDigits, setRawDigits] = useState('');
  const [splitMode, setSplitMode] = useState<'even' | 'custom'>('even');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derived values
  const totalCents = parseInt(rawDigits || '0', 10);
  const allocatedCents = Object.values(customAmounts).reduce(
    (sum, v) => sum + parseInt(v || '0', 10),
    0,
  );

  // Friends list — useQuery branched on group-scope. The picker needs a richer
  // shape (FriendsQueryShape with defaultSelected) than the canonical friends.list
  // (FriendRow[]) and chat.members caches; use a hook-local key under the friends
  // prefix so it's still cleared by friends.all() prefix invalidation but doesn't
  // collide with useFriends's cache.
  const friendsKey = (
    groupChannelId
      ? ([...queryKeys.friends.all(), 'expenseCreatePicker', 'group', groupChannelId] as const)
      : ([...queryKeys.friends.all(), 'expenseCreatePicker', 'all', userId ?? ''] as const)
  );

  const friendsQuery = useQuery({
    queryKey: friendsKey,
    queryFn: async (): Promise<FriendsQueryShape> => {
      if (!userId) return { entries: [], defaultSelected: new Set() };

      if (groupChannelId) {
        const { data: members, error: membersErr } = await supabase
          .from('group_channel_members')
          .select('user_id')
          .eq('group_channel_id', groupChannelId);
        if (membersErr) throw membersErr;
        const memberIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== userId);
        if (memberIds.length === 0) {
          return { entries: [], defaultSelected: new Set() };
        }
        const { data: profiles, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', memberIds);
        if (profilesErr) throw profilesErr;
        const entries: FriendEntry[] = (profiles ?? []).map((p) => ({
          id: p.id,
          display_name: (p.display_name as string | null) ?? '',
          avatar_url: p.avatar_url as string | null,
        }));
        return { entries, defaultSelected: new Set(memberIds) };
      }

      const { data, error } = await supabase.rpc('get_friends');
      if (error) throw error;
      const rows = (data ?? []) as {
        friend_id: string;
        display_name: string;
        avatar_url: string | null;
      }[];
      return {
        entries: rows.map((r) => ({
          id: r.friend_id,
          display_name: r.display_name,
          avatar_url: r.avatar_url,
        })),
        defaultSelected: new Set(),
      };
    },
    enabled: !!userId,
  });

  // Group-scoped pre-select: when the friends query resolves, seed selectedFriendIds
  // once with the default set. After that, user-driven toggles take over.
  useEffect(() => {
    if (!friendsQuery.data) return;
    if (friendsQuery.data.defaultSelected.size === 0) return;
    setSelectedFriendIds((prev) => {
      if (prev.size > 0) return prev; // user already interacted — don't clobber
      return new Set(friendsQuery.data.defaultSelected);
    });
  }, [friendsQuery.data]);

  const friends = friendsQuery.data?.entries ?? [];
  const friendsLoading = friendsQuery.isLoading;

  // Submit mutation — create_expense RPC. Side-effect-heavy (writes iou_groups +
  // iou_members server-side); no per-list cache to optimistically splice. On
  // settle invalidates expenses.list + expenses.iouSummary + home.all (Pitfall 10
  // fan-out so the IOU eyebrow on home + the expenses list both refresh).
  // @mutationShape: no-optimistic
  const submitMutation = useMutation({
    mutationFn: async (input: {
      title: string;
      totalCents: number;
      participantIds: string[];
      splitMode: 'even' | 'custom';
      customCents: number[] | null;
    }) => {
      const { data: groupId, error } = await supabase.rpc('create_expense', {
        p_title: input.title,
        p_total_amount_cents: input.totalCents,
        p_participant_ids: input.participantIds,
        p_split_mode: input.splitMode,
        p_custom_cents: input.customCents,
      });
      if (error) throw error;
      return groupId as string;
    },
    onMutate: async () => {
      return {};
    },
    onError: (_err, _input, _ctx) => {
      // No rollback target.
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.list(userId ?? ''),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.iouSummary(userId ?? ''),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
      // Broad expenses prefix covers expenses.withFriend(*) caches for the
      // payer's involved friends (Pitfall 10 fan-out).
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
  });

  const submitting = submitMutation.isPending;

  const canSubmit =
    !submitting &&
    title.trim().length > 0 &&
    totalCents > 0 &&
    selectedFriendIds.size > 0 &&
    (splitMode === 'even' || allocatedCents === totalCents);

  const toggleFriend = useCallback((id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setCustomAmount = useCallback((uid: string, digits: string) => {
    setCustomAmounts((prev) => ({ ...prev, [uid]: digits }));
  }, []);

  const submit = useCallback(async () => {
    if (!canSubmit || !userId) return;

    setSubmitError(null);

    // Build participant IDs — auto-include payer (Pitfall 6 guard)
    const ids = Array.from(selectedFriendIds);
    if (!ids.includes(userId)) ids.push(userId);

    const customCents =
      splitMode === 'custom'
        ? ids.map((id) => parseInt(customAmounts[id] || '0', 10))
        : null;

    try {
      const groupId = await submitMutation.mutateAsync({
        title: title.trim(),
        totalCents,
        participantIds: ids,
        splitMode,
        customCents,
      });

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push(`/squad/expenses/${groupId}` as never);
    } catch (_err) {
      setSubmitError("Couldn't create expense. Check your connection and try again.");
    }
  }, [
    canSubmit,
    userId,
    selectedFriendIds,
    splitMode,
    customAmounts,
    title,
    totalCents,
    router,
    submitMutation,
  ]);

  return {
    title,
    setTitle,
    rawDigits,
    setRawDigits,
    splitMode,
    setSplitMode,
    selectedFriendIds,
    toggleFriend,
    customAmounts,
    setCustomAmount,
    totalCents,
    allocatedCents,
    friends,
    friendsLoading,
    submitting,
    submitError,
    canSubmit,
    submit,
  };
}
