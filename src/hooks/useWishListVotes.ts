// Phase 31 Plan 05 — Migrated to TanStack Query.
//
// Fetches votes for all wish-list items in a birthday-group channel and exposes
// a toggleVote mutator. Each member can vote/unvote; votes are scoped per
// (item, group). RLS gates per-row writes.
//
// Public shape preserved verbatim ({ voteState, loading, toggleVote }) plus an
// optional `birthdayPersonId` argument — additive, no caller change — that lets
// toggleVote also invalidate that person's wish-list cache (vote counts surface
// in the wish-list rendering).
//
// Pattern: useQuery + canonical Pattern 5 useMutation. The mutation optimistically
// flips `myVotes` (Set membership) and bumps/decrements `voteCounts` by 1 — the
// exact analog to useHabits.toggleToday's flip-flag + bump-counter shape (research
// §Pattern 5 line 488-502; PATTERNS line 69 calls this the EXACT analog).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface VoteState {
  voteCounts: Record<string, number>; // itemId → total vote count
  myVotes: Set<string>; // itemIds the current user voted for
}

export interface UseWishListVotesResult {
  voteState: VoteState;
  loading: boolean;
  toggleVote: (itemId: string) => Promise<void>;
}

interface VoteRow {
  item_id: string;
  voter_id: string;
}

interface CachedVotesShape {
  voteCounts: Record<string, number>;
  myVoteItemIds: string[]; // Sets aren't structured-clone-friendly inside the cache.
}

export function useWishListVotes(
  groupChannelId: string,
  itemIds: string[],
  birthdayPersonId?: string,
): UseWishListVotesResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();

  // Key by the group channel id — votes are scoped per-group. The itemIds list
  // is the read filter, not part of the key (membership change → invalidate to
  // re-fetch with the new set).
  const votesKey = queryKeys.polls.wishListVotes(groupChannelId);
  const itemIdsKey = itemIds.join(',');

  const query = useQuery({
    queryKey: votesKey,
    queryFn: async (): Promise<CachedVotesShape> => {
      if (!userId || !groupChannelId || itemIds.length === 0) {
        return { voteCounts: {}, myVoteItemIds: [] };
      }
      const { data, error } = await supabase
        .from('wish_list_votes')
        .select('item_id, voter_id')
        .eq('group_channel_id', groupChannelId)
        .in('item_id', itemIds);
      if (error) throw error;

      const counts: Record<string, number> = {};
      const mine: string[] = [];
      for (const row of ((data ?? []) as VoteRow[])) {
        counts[row.item_id] = (counts[row.item_id] ?? 0) + 1;
        if (row.voter_id === userId) mine.push(row.item_id);
      }
      return { voteCounts: counts, myVoteItemIds: mine };
    },
    enabled: !!userId && !!groupChannelId && itemIds.length > 0,
  });

  // Suppress unused-var warning — itemIdsKey is the stable string for downstream
  // dependent-effect callers (not currently used; documented for future Wave 6+).
  void itemIdsKey;

  // toggleVote — canonical Pattern 5 (flip flag + bump/decrement counter). EXACT
  // analog to useHabits.toggleToday (PATTERNS.md line 69).
  const toggleMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!userId || !groupChannelId) throw new Error('Not ready');
      const cached = queryClient.getQueryData<CachedVotesShape>(votesKey);
      const hasVoted = !!cached?.myVoteItemIds.includes(itemId);

      if (hasVoted) {
        const { error } = await supabase
          .from('wish_list_votes')
          .delete()
          .eq('item_id', itemId)
          .eq('group_channel_id', groupChannelId)
          .eq('voter_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wish_list_votes')
          .insert({
            item_id: itemId,
            group_channel_id: groupChannelId,
            voter_id: userId,
          });
        if (error) throw error;
      }
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: votesKey });
      const previous = queryClient.getQueryData<CachedVotesShape>(votesKey);
      const wasVoted = !!previous?.myVoteItemIds.includes(itemId);
      queryClient.setQueryData<CachedVotesShape>(votesKey, (old) => {
        const o = old ?? { voteCounts: {}, myVoteItemIds: [] };
        const currentCount = o.voteCounts[itemId] ?? 0;
        return {
          voteCounts: {
            ...o.voteCounts,
            [itemId]: wasVoted ? Math.max(0, currentCount - 1) : currentCount + 1,
          },
          myVoteItemIds: wasVoted
            ? o.myVoteItemIds.filter((id) => id !== itemId)
            : [...o.myVoteItemIds, itemId],
        };
      });
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(votesKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.polls.wishListVotes(groupChannelId) });
      // Invalidate the birthday person's wish-list cache so aggregate vote counts
      // surface — when caller supplies birthdayPersonId. Fall back to the broader
      // friends prefix when unknown.
      if (birthdayPersonId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.friends.wishList(birthdayPersonId),
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.friends.all() });
      }
    },
  });

  const cached = query.data ?? { voteCounts: {}, myVoteItemIds: [] };
  const voteState: VoteState = {
    voteCounts: cached.voteCounts,
    myVotes: new Set(cached.myVoteItemIds),
  };

  return {
    voteState,
    loading: query.isLoading,
    toggleVote: async (itemId: string) => {
      try {
        await toggleMutation.mutateAsync(itemId);
      } catch (_err) {
        // Caller already gets state via voteState; error path is logged via
        // TanStack Query devtools in dev builds.
      }
    },
  };
}
