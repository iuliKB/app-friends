// Phase 31 Plan 05 — Migrated to TanStack Query.
//
// CRUD for the current user's own wish list items. Owner can add, edit, delete.
// No claim information returned (owner cannot see claims — D-10).
//
// Migrated shape: ONE useQuery + THREE useMutation (add / update / delete), each
// follows canonical Pattern 5 (optimistic + rollback + invalidate). Public shape
// preserved verbatim: { items, loading, error, refetch, addItem, updateItem, deleteItem }.
//
// Optimistic add uses Math.random UUID template (crypto.randomUUID() unavailable in
// Hermes per v1.5 decision in STATE.md).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface WishListItem {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  created_at: string;
}

export interface UseMyWishListResult {
  items: WishListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  addItem: (
    title: string,
    url?: string,
    notes?: string,
  ) => Promise<{ error: Error | null }>;
  updateItem: (
    itemId: string,
    title: string,
    url?: string,
    notes?: string,
  ) => Promise<{ error: Error | null }>;
  deleteItem: (itemId: string) => Promise<{ error: Error | null }>;
}

// Hermes-safe UUID template (v1.5 STATE decision — crypto.randomUUID unavailable).
function tempId(): string {
  return 'tmp-xxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

export function useMyWishList(): UseMyWishListResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const listKey = queryKeys.friends.wishList(userId ?? '');

  const query = useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<WishListItem[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wish_list_items')
        .select('id, title, url, notes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown) as WishListItem[];
    },
    enabled: !!userId,
  });

  const addMutation = useMutation({
    mutationFn: async (input: { title: string; url?: string; notes?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('wish_list_items').insert({
        user_id: userId,
        title: input.title,
        url: input.url ?? null,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<WishListItem[]>(listKey);
      const optimistic: WishListItem = {
        id: tempId(),
        title: input.title,
        url: input.url ?? null,
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<WishListItem[]>(listKey, (old) => [...(old ?? []), optimistic]);
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(listKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.friends.wishList(userId ?? ''),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      itemId: string;
      title: string;
      url?: string;
      notes?: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('wish_list_items')
        .update({
          title: input.title,
          url: input.url ?? null,
          notes: input.notes ?? null,
        })
        .eq('id', input.itemId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<WishListItem[]>(listKey);
      queryClient.setQueryData<WishListItem[]>(listKey, (old) =>
        old?.map((it) =>
          it.id === input.itemId
            ? {
                ...it,
                title: input.title,
                url: input.url ?? null,
                notes: input.notes ?? null,
              }
            : it,
        ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(listKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.friends.wishList(userId ?? ''),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('wish_list_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<WishListItem[]>(listKey);
      queryClient.setQueryData<WishListItem[]>(listKey, (old) =>
        (old ?? []).filter((it) => it.id !== itemId),
      );
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(listKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.friends.wishList(userId ?? ''),
      });
    },
  });

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    addItem: async (title, url, notes) => {
      try {
        await addMutation.mutateAsync({ title, url, notes });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('addItem failed') };
      }
    },
    updateItem: async (itemId, title, url, notes) => {
      try {
        await updateMutation.mutateAsync({ itemId, title, url, notes });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('updateItem failed') };
      }
    },
    deleteItem: async (itemId) => {
      try {
        await deleteMutation.mutateAsync(itemId);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('deleteItem failed') };
      }
    },
  };
}
