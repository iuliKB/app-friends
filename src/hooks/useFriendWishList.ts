// Phase 11 v1.4 — useFriendWishList (D-06, D-08, D-09, D-10)
// Fetches a friend's wish_list_items and wish_list_claims.
// RLS enforces owner exclusion: birthday person's claims are not returned.
// toggleClaim: insert claim (unclaimed) or delete claim (claimed by me).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface WishListItemWithClaim {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  isClaimed: boolean;      // true if anyone has claimed this item
  isClaimedByMe: boolean;  // true if the current user has claimed it
}

export function useFriendWishList(friendId: string) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<WishListItemWithClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !friendId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: itemRows, error: itemsErr } = await supabase
      .from('wish_list_items')
      .select('id, title, url, notes')
      .eq('user_id', friendId)
      .order('created_at', { ascending: true });

    if (itemsErr) {
      console.warn('useFriendWishList items fetch failed', itemsErr);
      setError("Couldn't load wish list.");
      setLoading(false);
      return;
    }

    const itemIds = (itemRows ?? []).map((i) => i.id as string);

    // Fetch claims — RLS hides claims from item owner (D-10)
    const { data: claimRows } = itemIds.length > 0
      ? await supabase
          .from('wish_list_claims')
          .select('item_id, claimer_id')
          .in('item_id', itemIds)
      : { data: [] as { item_id: string; claimer_id: string }[] };

    const claimedByMe = new Set(
      (claimRows ?? [])
        .filter((c) => (c.claimer_id as string) === userId)
        .map((c) => c.item_id as string)
    );
    const claimedByAnyone = new Set((claimRows ?? []).map((c) => c.item_id as string));

    setItems(
      (itemRows ?? []).map((item) => ({
        id: item.id as string,
        title: item.title as string,
        url: (item.url as string | null) ?? null,
        notes: (item.notes as string | null) ?? null,
        isClaimed: claimedByAnyone.has(item.id as string),
        isClaimedByMe: claimedByMe.has(item.id as string),
      }))
    );
    setLoading(false);
  }, [userId, friendId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const toggleClaim = useCallback(
    async (itemId: string, currentlyClaimed: boolean) => {
      if (!userId) return;
      if (currentlyClaimed) {
        await supabase
          .from('wish_list_claims')
          .delete()
          .eq('item_id', itemId)
          .eq('claimer_id', userId);
      } else {
        await supabase
          .from('wish_list_claims')
          .insert({ item_id: itemId, claimer_id: userId });
      }
      await refetch();
    },
    [userId, refetch]
  );

  return { items, loading, error, refetch, toggleClaim };
}
