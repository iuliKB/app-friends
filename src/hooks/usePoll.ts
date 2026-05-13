// Phase 31 Plan 06 — Migrated to TanStack Query.
//
// Public shape preserved verbatim: { pollState, loading, vote, unVote }.
// (Pre-migration also took `lastPollVoteEvent` as a second arg to bridge
// Realtime events from useChatRoom; that's now replaced by realtimeBridge
// subscribePollVotes which owns the poll_votes channel. The second arg is
// accepted but ignored for backward compatibility with the existing PollCard
// callsite — the channel-based bridge supersedes it.)
//
// Pattern: useQuery for the aggregate poll detail + canonical Pattern 5
// useMutation for vote (optimistic flip + count bump, rollback on error,
// invalidate polls.poll on settle). EXACT analog to useWishListVotes.toggleVote
// (Wave 5) — same flip-flag + bump-counter shape, only the storage is per-row
// instead of per-(group, item).

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { subscribePollVotes } from '@/lib/realtimeBridge';

export interface PollOption {
  id: string;
  label: string;
  position: number;
  votes: number;
}

export interface PollState {
  pollId: string;
  question: string;
  options: PollOption[];
  myVotedOptionId: string | null;
  totalVotes: number;
}

// Second arg `_lastPollVoteEvent` is accepted but ignored — the realtimeBridge
// subscribePollVotes channel supersedes the pre-migration prop-drilled event.
export function usePoll(
  pollId: string | null,
  _lastPollVoteEvent?: { pollId: string; timestamp: number } | null,
): {
  pollState: PollState | null;
  loading: boolean;
  vote: (optionId: string) => Promise<{ error: Error | null }>;
  unVote: () => Promise<{ error: Error | null }>;
} {
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';
  const queryClient = useQueryClient();
  // Cache key: queryKeys.polls.poll(pollId) — see queryKeys taxonomy. Also referenced
  // by realtimeBridge.subscribePollVotes for invalidation on any poll_votes event.
  const pollKey = queryKeys.polls.poll(pollId ?? '');

  const query = useQuery({
    queryKey: queryKeys.polls.poll(pollId ?? ''),
    queryFn: async (): Promise<PollState | null> => {
      if (!pollId) return null;
      const { data: pollData, error: pollErr } = await supabase
        .from('polls')
        .select('id, question')
        .eq('id', pollId)
        .single();
      if (pollErr) throw pollErr;
      if (!pollData) return null;

      const { data: optionsData, error: optErr } = await supabase
        .from('poll_options')
        .select('id, label, position')
        .eq('poll_id', pollId)
        .order('position', { ascending: true });
      if (optErr) throw optErr;

      const { data: votesData, error: voteErr } = await supabase
        .from('poll_votes')
        .select('option_id, user_id')
        .eq('poll_id', pollId);
      if (voteErr) throw voteErr;

      const counts: Record<string, number> = {};
      let myVotedOptionId: string | null = null;
      for (const v of (votesData ?? []) as { option_id: string; user_id: string }[]) {
        counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
        if (v.user_id === currentUserId) myVotedOptionId = v.option_id;
      }

      const options: PollOption[] = ((optionsData ?? []) as {
        id: string;
        label: string;
        position: number;
      }[]).map((o) => ({
        id: o.id,
        label: o.label,
        position: o.position,
        votes: counts[o.id] ?? 0,
      }));

      return {
        pollId: (pollData as { id: string; question: string }).id,
        question: (pollData as { id: string; question: string }).question,
        options,
        myVotedOptionId,
        totalVotes: (votesData ?? []).length,
      };
    },
    enabled: !!pollId,
  });

  // Subscribe to poll_votes changes for this pollId via realtimeBridge.
  // The bridge owns the channel lifecycle; this hook only declares dependency.
  useEffect(() => {
    if (!pollId) return;
    return subscribePollVotes(queryClient, pollId);
  }, [queryClient, pollId]);

  // Vote mutation — canonical Pattern 5 with flip + count bump.
  const voteMutation = useMutation({
    mutationFn: async (input: { optionId: string | null }) => {
      if (!currentUserId) throw new Error('Not authenticated');
      if (!pollId) throw new Error('No poll');

      // optionId === null → unvote only (delete the user's row).
      // optionId !== null → if user had a prior vote, delete it; insert new.
      const cached = queryClient.getQueryData<PollState | null>(pollKey);
      const oldOptionId = cached?.myVotedOptionId ?? null;

      if (input.optionId === null) {
        // Pure unvote
        const { error } = await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        return;
      }

      // Vote — delete any prior vote then insert. (DB also has a unique-per-user
      // constraint that the pre-migration code worked around the same way.)
      if (oldOptionId) {
        const { error: deleteError } = await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', currentUserId);
        if (deleteError) throw deleteError;
      }

      const { error: insertError } = await supabase
        .from('poll_votes')
        .insert({ poll_id: pollId, option_id: input.optionId, user_id: currentUserId });
      if (insertError) throw insertError;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: pollKey });
      const previous = queryClient.getQueryData<PollState | null>(pollKey);

      queryClient.setQueryData<PollState | null>(pollKey, (old) => {
        if (!old) return old;
        const oldOptionId = old.myVotedOptionId;
        const newOptionId = input.optionId; // null = unvote
        if (oldOptionId === newOptionId) return old;

        const hadVote = !!oldOptionId;
        const willHaveVote = !!newOptionId;

        return {
          ...old,
          myVotedOptionId: newOptionId,
          totalVotes: hadVote && !willHaveVote
            ? Math.max(0, old.totalVotes - 1)
            : !hadVote && willHaveVote
              ? old.totalVotes + 1
              : old.totalVotes,
          options: old.options.map((o) => {
            if (o.id === oldOptionId) return { ...o, votes: Math.max(0, o.votes - 1) };
            if (o.id === newOptionId) return { ...o, votes: o.votes + 1 };
            return o;
          }),
        };
      });

      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(pollKey, ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.polls.poll(pollId ?? '') });
    },
  });

  const vote = async (optionId: string): Promise<{ error: Error | null }> => {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    if (!pollId) return { error: new Error('No poll') };

    const cached = queryClient.getQueryData<PollState | null>(pollKey);
    // Tap on already-selected option → un-vote.
    const isToggleOff = cached?.myVotedOptionId === optionId;
    try {
      await voteMutation.mutateAsync({ optionId: isToggleOff ? null : optionId });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('vote failed') };
    }
  };

  const unVote = async (): Promise<{ error: Error | null }> => {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    if (!pollId) return { error: new Error('No poll') };
    try {
      await voteMutation.mutateAsync({ optionId: null });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('unvote failed') };
    }
  };

  return {
    pollState: query.data ?? null,
    loading: query.isLoading,
    vote,
    unVote,
  };
}
