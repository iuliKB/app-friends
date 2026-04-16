// Phase 11 v1.4 — useMyWishList (D-04, D-05)
// CRUD for the current user's own wish list items.
// Owner can add, delete. No claim information returned (owner cannot see claims — D-10).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface WishListItem {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  created_at: string;
}

export function useMyWishList() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<WishListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('wish_list_items')
      .select('id, title, url, notes, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (fetchErr) {
      console.warn('useMyWishList fetch failed', fetchErr);
      setError(fetchErr.message);
      setItems([]);
    } else {
      setItems((data ?? []) as WishListItem[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function addItem(title: string, url?: string, notes?: string) {
    if (!userId) return { error: new Error('Not authenticated') };
    const { error: insertErr } = await supabase.from('wish_list_items').insert({
      user_id: userId,
      title,
      url: url ?? null,
      notes: notes ?? null,
    });
    if (!insertErr) await refetch();
    return { error: insertErr };
  }

  async function deleteItem(itemId: string) {
    if (!userId) return { error: new Error('Not authenticated') };
    const { error: deleteErr } = await supabase
      .from('wish_list_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId); // belt-and-suspenders; RLS also enforces
    if (!deleteErr) await refetch();
    return { error: deleteErr };
  }

  return { items, loading, error, refetch, addItem, deleteItem };
}
