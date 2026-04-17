// Phase 11 v1.4 — useWishListVotes
// Fetches votes for all wish list items in a birthday group channel.
// Each member can vote/unvote. Votes are scoped per (item, group).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface VoteState {
  voteCounts: Record<string, number>;   // itemId → total vote count
  myVotes: Set<string>;                 // itemIds the current user voted for
}

export function useWishListVotes(groupChannelId: string, itemIds: string[]) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const [voteState, setVoteState] = useState<VoteState>({ voteCounts: {}, myVotes: new Set() });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId || !groupChannelId || itemIds.length === 0) {
      setVoteState({ voteCounts: {}, myVotes: new Set() });
      return;
    }
    setLoading(true);

    const { data } = await supabase
      .from('wish_list_votes')
      .select('item_id, voter_id')
      .eq('group_channel_id', groupChannelId)
      .in('item_id', itemIds);

    const counts: Record<string, number> = {};
    const mine = new Set<string>();

    for (const row of data ?? []) {
      const id = row.item_id as string;
      counts[id] = (counts[id] ?? 0) + 1;
      if ((row.voter_id as string) === userId) mine.add(id);
    }

    setVoteState({ voteCounts: counts, myVotes: mine });
    setLoading(false);
  }, [userId, groupChannelId, itemIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toggleVote = useCallback(async (itemId: string) => {
    if (!userId || !groupChannelId) return;
    const hasVoted = voteState.myVotes.has(itemId);

    if (hasVoted) {
      await supabase
        .from('wish_list_votes')
        .delete()
        .eq('item_id', itemId)
        .eq('group_channel_id', groupChannelId)
        .eq('voter_id', userId);
    } else {
      await supabase
        .from('wish_list_votes')
        .insert({ item_id: itemId, group_channel_id: groupChannelId, voter_id: userId });
    }
    await refetch();
  }, [userId, groupChannelId, voteState.myVotes, refetch]);

  return { voteState, loading, toggleVote };
}
