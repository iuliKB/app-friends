// Phase 31 Plan 05 — Migrated to TanStack Query.
// Read-only useQuery + plain-async toggleClaim mutator (analog: usePlanDetail mutators
// stay plain async; invalidate on success rather than carrying full Pattern 5 boilerplate).
//
// Public shape preserved verbatim: { items, loading, error, refetch, toggleClaim }.
// RLS enforces owner exclusion: birthday person's own claims are not returned.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface WishListItemWithClaim {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  isClaimed: boolean;
  isClaimedByMe: boolean;
  claimerName: string | null; // display name of claimer (null if unclaimed or claimed by me)
}

export interface UseFriendWishListResult {
  items: WishListItemWithClaim[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  toggleClaim: (itemId: string, currentlyClaimed: boolean) => Promise<void>;
}

export function useFriendWishList(friendId: string): UseFriendWishListResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const listKey = queryKeys.friends.wishList(friendId);

  const query = useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<WishListItemWithClaim[]> => {
      if (!userId) return [];

      const { data: itemRows, error: itemsErr } = await supabase
        .from('wish_list_items')
        .select('id, title, url, notes')
        .eq('user_id', friendId)
        .order('created_at', { ascending: true });

      if (itemsErr) throw itemsErr;

      const itemIds = (itemRows ?? []).map((i) => i.id as string);

      // Fetch claims — RLS hides claims from item owner (D-10)
      const claimsResult =
        itemIds.length > 0
          ? await supabase
              .from('wish_list_claims')
              .select('item_id, claimer_id')
              .in('item_id', itemIds)
          : { data: [] as { item_id: string; claimer_id: string }[], error: null };
      if (claimsResult.error) throw claimsResult.error;
      const claimRows = claimsResult.data ?? [];

      const claimedByMe = new Set(
        claimRows
          .filter((c) => (c.claimer_id as string) === userId)
          .map((c) => c.item_id as string),
      );
      const claimedByAnyone = new Set(claimRows.map((c) => c.item_id as string));

      // Build item_id → claimer display name for items claimed by others
      const otherClaimerIds = [
        ...new Set(
          claimRows
            .filter((c) => (c.claimer_id as string) !== userId)
            .map((c) => c.claimer_id as string),
        ),
      ];
      const claimerNames: Record<string, string> = {};
      if (otherClaimerIds.length > 0) {
        const { data: profileRows, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', otherClaimerIds);
        if (profErr) throw profErr;
        for (const p of profileRows ?? []) {
          claimerNames[p.id as string] = p.display_name as string;
        }
      }
      const itemClaimerName: Record<string, string | null> = {};
      for (const c of claimRows) {
        const cid = c.claimer_id as string;
        if (cid !== userId) {
          itemClaimerName[c.item_id as string] = claimerNames[cid] ?? null;
        }
      }

      return (itemRows ?? []).map((item) => ({
        id: item.id as string,
        title: item.title as string,
        url: (item.url as string | null) ?? null,
        notes: (item.notes as string | null) ?? null,
        isClaimed: claimedByAnyone.has(item.id as string),
        isClaimedByMe: claimedByMe.has(item.id as string),
        claimerName: itemClaimerName[item.id as string] ?? null,
      }));
    },
    enabled: !!userId && !!friendId,
  });

  // toggleClaim — plain async (analog: usePlanDetail mutators) invalidates the
  // wish-list cache on success. No optimistic write — claim toggles are rare and
  // RLS enforces single-claim-per-item.
  const toggleClaim = useCallback(
    async (itemId: string, currentlyClaimed: boolean) => {
      if (!userId) return;
      let opError;
      if (currentlyClaimed) {
        ({ error: opError } = await supabase
          .from('wish_list_claims')
          .delete()
          .eq('item_id', itemId)
          .eq('claimer_id', userId));
      } else {
        ({ error: opError } = await supabase
          .from('wish_list_claims')
          .insert({ item_id: itemId, claimer_id: userId }));
      }
      if (opError) {
        console.warn('toggleClaim failed', opError);
      }
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
    [userId, queryClient, listKey],
  );

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    toggleClaim,
  };
}
