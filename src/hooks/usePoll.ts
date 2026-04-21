import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

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

export function usePoll(
  pollId: string | null,
  lastPollVoteEvent: { pollId: string; timestamp: number } | null
): {
  pollState: PollState | null;
  loading: boolean;
  vote: (optionId: string) => Promise<{ error: Error | null }>;
  unVote: () => Promise<{ error: Error | null }>;
} {
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';

  const [pollState, setPollState] = useState<PollState | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchPollData(id: string) {
    setLoading(true);

    const { data: pollData } = await supabase
      .from('polls')
      .select('id, question')
      .eq('id', id)
      .single();

    if (!pollData) {
      setLoading(false);
      return;
    }

    const { data: optionsData } = await supabase
      .from('poll_options')
      .select('id, label, position')
      .eq('poll_id', id)
      .order('position', { ascending: true });

    const { data: votesData } = await supabase
      .from('poll_votes')
      .select('option_id, user_id')
      .eq('poll_id', id);

    const counts: Record<string, number> = {};
    let myVotedOptionId: string | null = null;

    for (const v of votesData ?? []) {
      const optId = v.option_id as string;
      counts[optId] = (counts[optId] ?? 0) + 1;
      if ((v.user_id as string) === currentUserId) myVotedOptionId = optId;
    }

    const options: PollOption[] = (optionsData ?? []).map((o) => ({
      id: o.id as string,
      label: o.label as string,
      position: o.position as number,
      votes: counts[o.id as string] ?? 0,
    }));

    const built: PollState = {
      pollId: pollData.id as string,
      question: pollData.question as string,
      options,
      myVotedOptionId,
      totalVotes: (votesData ?? []).length,
    };

    setPollState(built);
    setLoading(false);
  }

  // Fetch on mount / pollId change
  useEffect(() => {
    if (!pollId) return;
    void fetchPollData(pollId);
  }, [pollId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bridge: re-fetch when a poll_votes Realtime event arrives for this poll
  useEffect(() => {
    if (!lastPollVoteEvent || !pollId) return;
    if (lastPollVoteEvent.pollId !== pollId) return;
    void fetchPollData(pollId);
  }, [lastPollVoteEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  async function unVote(): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    if (!pollId) return { error: new Error('No poll') };

    // Capture pre-snapshot inside updater (WR-03 stale closure fix)
    let preSnapshot: PollState | null = null;
    setPollState((prev) => {
      preSnapshot = prev;
      return prev;
    });

    // Optimistic update
    setPollState((prev) => {
      if (!prev) return prev;
      const oldOptionId = prev.myVotedOptionId;
      return {
        ...prev,
        myVotedOptionId: null,
        totalVotes: Math.max(0, prev.totalVotes - 1),
        options: prev.options.map((o) =>
          o.id === oldOptionId ? { ...o, votes: Math.max(0, o.votes - 1) } : o
        ),
      };
    });

    const { error: deleteError } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', currentUserId);

    if (deleteError) {
      setPollState(preSnapshot);
      return { error: deleteError };
    }

    return { error: null };
  }

  async function vote(optionId: string): Promise<{ error: Error | null }> {
    if (!currentUserId) return { error: new Error('Not authenticated') };
    if (!pollId) return { error: new Error('No poll') };

    // Capture pre-snapshot inside updater (WR-03 stale closure fix)
    let preSnapshot: PollState | null = null;
    setPollState((prev) => {
      preSnapshot = prev;
      return prev;
    });

    // Tap on already-selected option → un-vote
    if (preSnapshot?.myVotedOptionId === optionId) {
      return unVote();
    }

    const oldOptionId = preSnapshot?.myVotedOptionId ?? null;

    // Optimistic update
    setPollState((prev) => {
      if (!prev) return prev;
      const hadVote = !!prev.myVotedOptionId;
      return {
        ...prev,
        myVotedOptionId: optionId,
        totalVotes: hadVote ? prev.totalVotes : prev.totalVotes + 1,
        options: prev.options.map((o) => {
          if (o.id === oldOptionId) return { ...o, votes: Math.max(0, o.votes - 1) };
          if (o.id === optionId) return { ...o, votes: o.votes + 1 };
          return o;
        }),
      };
    });

    // If changing vote, delete old first
    if (oldOptionId) {
      const { error: deleteError } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', currentUserId);

      if (deleteError) {
        setPollState(preSnapshot);
        return { error: deleteError };
      }
    }

    const { error: insertError } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, user_id: currentUserId });

    if (insertError) {
      setPollState(preSnapshot);
      return { error: insertError };
    }

    return { error: null };
  }

  return { pollState, loading, vote, unVote };
}
