// Phase 8 — useExpenseCreate hook (IOU-01, IOU-02, IOU-04).
// Manages all form state for the create-expense screen and calls the
// create_expense RPC on submit. Payer (userId) is auto-included in
// participant IDs per RESEARCH.md Pitfall 6.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface FriendEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ExpenseCreateData {
  // Form state
  title: string;
  setTitle: (t: string) => void;
  rawDigits: string; // D-01: cents as digit string e.g. "4250"
  setRawDigits: (d: string) => void;
  splitMode: 'even' | 'custom';
  setSplitMode: (m: 'even' | 'custom') => void;
  selectedFriendIds: Set<string>;
  toggleFriend: (id: string) => void;
  // Custom split per-person amounts: map from userId to rawDigits string
  customAmounts: Record<string, string>;
  setCustomAmount: (userId: string, rawDigits: string) => void;

  // Derived
  totalCents: number; // parseInt(rawDigits || '0', 10)
  allocatedCents: number; // sum of customAmounts values as int

  // Friends for picker
  friends: FriendEntry[];
  friendsLoading: boolean;

  // Submit state
  submitting: boolean;
  submitError: string | null;
  canSubmit: boolean; // title non-empty && totalCents > 0 && selectedFriendIds.size > 0 && (even OR remaining === 0)

  // Actions
  submit: () => Promise<void>; // calls create_expense RPC, fires haptic, navigates to /squad/expenses/[id]
}

export function useExpenseCreate(opts?: { groupChannelId?: string | null }): ExpenseCreateData {
  const groupChannelId = opts?.groupChannelId ?? null;
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [rawDigits, setRawDigits] = useState('');
  const [splitMode, setSplitMode] = useState<'even' | 'custom'>('even');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Friends list state
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derived values
  const totalCents = parseInt(rawDigits || '0', 10);
  const allocatedCents = Object.values(customAmounts).reduce(
    (sum, v) => sum + parseInt(v || '0', 10),
    0
  );

  // canSubmit — double as DoS guard: submitting=true disables re-entry (T-08-P03-04)
  const canSubmit =
    !submitting &&
    title.trim().length > 0 &&
    totalCents > 0 &&
    selectedFriendIds.size > 0 &&
    (splitMode === 'even' || allocatedCents === totalCents);

  // Load friends — filtered to group members when groupChannelId is provided
  const loadFriends = useCallback(async () => {
    if (!userId) {
      setFriendsLoading(false);
      setFriends([]);
      return;
    }
    setFriendsLoading(true);

    if (groupChannelId) {
      const { data: members } = await supabase
        .from('group_channel_members')
        .select('user_id')
        .eq('group_channel_id', groupChannelId);

      const memberIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== userId);

      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', memberIds);

        const entries = (profiles ?? []).map((p) => ({
          id: p.id,
          display_name: (p.display_name as string | null) ?? '',
          avatar_url: p.avatar_url as string | null,
        }));
        setFriends(entries);
        setSelectedFriendIds(new Set(memberIds));
      } else {
        setFriends([]);
      }
    } else {
      const { data, error: rpcErr } = await supabase.rpc('get_friends');
      if (rpcErr) {
        console.warn('useExpenseCreate: get_friends failed', rpcErr);
        setFriends([]);
      } else {
        const rows = (data ?? []) as {
          friend_id: string;
          display_name: string;
          avatar_url: string | null;
        }[];
        setFriends(
          rows.map((r) => ({
            id: r.friend_id,
            display_name: r.display_name,
            avatar_url: r.avatar_url,
          }))
        );
      }
    }

    setFriendsLoading(false);
  }, [userId, groupChannelId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const toggleFriend = useCallback((id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setCustomAmount = useCallback((uid: string, digits: string) => {
    setCustomAmounts((prev) => ({ ...prev, [uid]: digits }));
  }, []);

  const submit = useCallback(async () => {
    if (!canSubmit || !userId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Build participant IDs — auto-include payer (Pitfall 6 guard)
      const ids = Array.from(selectedFriendIds);
      if (!ids.includes(userId)) ids.push(userId);

      // Build custom cents array only for custom mode; order matches ids
      const customCents =
        splitMode === 'custom' ? ids.map((id) => parseInt(customAmounts[id] || '0', 10)) : null;

      const { data: groupId, error } = await supabase.rpc('create_expense', {
        p_title: title.trim(),
        p_total_amount_cents: totalCents,
        p_participant_ids: ids,
        p_split_mode: splitMode,
        p_custom_cents: customCents,
      });

      if (error) {
        setSubmitError("Couldn't create expense. Check your connection and try again.");
        return;
      }

      // Success: haptic feedback then navigate to detail screen
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push(`/squad/expenses/${groupId}` as never);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, userId, selectedFriendIds, splitMode, customAmounts, title, totalCents, router]);

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
