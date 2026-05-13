// Phase 31 Plan 03 — Migrated to TanStack Query.
//
// Public shape (UseTodosResult) verbatim-preserved so callers don't change:
//   { mine, fromChats, loading, error, refetch, completeTodo, completeChatTodo }
//
// The pre-migration hook drove two parallel RPCs (get_my_todos + get_chat_todos)
// from a single useEffect. Migrated shape: TWO useQuery calls (one per RPC) keyed
// by today's local date, plus two useMutation calls (completeTodo via direct
// UPDATE, completeChatTodo via RPC). The Wave 2 canonical Pattern 5 mutation
// shape (mutationFn + onMutate snapshot + onError rollback + onSettled invalidate)
// is locked here too — mutationShape.test.ts enforces.
//
// Pitfall 10 mitigation: every mutator invalidates BOTH queryKeys.todos.mine(today)
// AND queryKeys.home.all() because TodosTile/HomeTodosTile read from this hook
// while the Home aggregate's reactivity story requires a fan-out invalidation.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { todayLocal } from '@/lib/dateLocal';
import { queryKeys } from '@/lib/queryKeys';
import type { MyTodoRow, ChatTodoRow } from '@/types/todos';

export interface UseTodosResult {
  mine: MyTodoRow[];
  fromChats: ChatTodoRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  completeTodo: (todoId: string) => Promise<{ error: string | null }>;
  completeChatTodo: (
    itemId: string
  ) => Promise<{ error: string | null; messageId: string | null }>;
}

export function useTodos(): UseTodosResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const today = todayLocal();
  const queryClient = useQueryClient();
  const mineKey = queryKeys.todos.mine(today);
  const fromChatsKey = queryKeys.todos.fromChats(today);

  const mineQuery = useQuery({
    queryKey: mineKey,
    queryFn: async (): Promise<MyTodoRow[]> => {
      const { data, error } = await (supabase as any).rpc('get_my_todos', { p_today: today });
      if (error) throw error;
      return ((data ?? []) as unknown) as MyTodoRow[];
    },
    enabled: !!userId,
  });

  const fromChatsQuery = useQuery({
    queryKey: fromChatsKey,
    queryFn: async (): Promise<ChatTodoRow[]> => {
      const { data, error } = await (supabase as any).rpc('get_chat_todos', { p_today: today });
      if (error) throw error;
      return ((data ?? []) as unknown) as ChatTodoRow[];
    },
    enabled: !!userId,
  });

  // completeTodo — optimistic flip of completed_at, persisted via direct UPDATE
  // on `todos` (RLS UPDATE policy gates ownership, mitigates T-29.1-19).
  const completeMutation = useMutation({
    mutationFn: async (input: { todoId: string; newCompletedAt: string | null }) => {
      const { error } = await (supabase as any)
        .from('todos')
        .update({ completed_at: input.newCompletedAt })
        .eq('id', input.todoId);
      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: mineKey });
      const previous = queryClient.getQueryData<MyTodoRow[]>(mineKey);
      queryClient.setQueryData<MyTodoRow[]>(mineKey, (old) =>
        old?.map((t) =>
          t.id === input.todoId ? { ...t, completed_at: input.newCompletedAt } : t,
        ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(mineKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: mineKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  // completeChatTodo — RPC atomically writes the system message + state update.
  // No optimistic write on this side (chat thread Realtime delivers the system
  // message). Invalidate both chat-todo and Home aggregate keys on settle.
  const completeChatMutation = useMutation({
    mutationFn: async (
      itemId: string,
    ): Promise<{ messageId: string | null }> => {
      const { data, error } = await (supabase as any).rpc('complete_chat_todo', {
        p_item_id: itemId,
      });
      if (error) throw error;
      return { messageId: (data as string | null) ?? null };
    },
    onMutate: async (_itemId) => {
      await queryClient.cancelQueries({ queryKey: fromChatsKey });
      const previous = queryClient.getQueryData<ChatTodoRow[]>(fromChatsKey);
      // No optimistic mutation of done_count here — the RPC owns the cross-
      // table state; rollback ctx still snapshots the prior cache for parity
      // with Pattern 5 (a future iteration could bump done_count optimistically).
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(fromChatsKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: fromChatsKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  const refetch = async () => {
    return Promise.all([mineQuery.refetch(), fromChatsQuery.refetch()]);
  };

  return {
    mine: mineQuery.data ?? [],
    fromChats: fromChatsQuery.data ?? [],
    loading: mineQuery.isLoading || fromChatsQuery.isLoading,
    error:
      mineQuery.error
        ? (mineQuery.error as Error).message
        : fromChatsQuery.error
          ? (fromChatsQuery.error as Error).message
          : null,
    refetch,
    completeTodo: async (todoId: string) => {
      const snapshot = (mineQuery.data ?? []).find((t) => t.id === todoId);
      if (!snapshot) return { error: 'todo-not-found' };
      const wasCompleted = snapshot.completed_at !== null;
      const newCompletedAt = wasCompleted ? null : new Date().toISOString();
      try {
        await completeMutation.mutateAsync({ todoId, newCompletedAt });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'complete failed' };
      }
    },
    completeChatTodo: async (itemId: string) => {
      try {
        const result = await completeChatMutation.mutateAsync(itemId);
        return { error: null, messageId: result.messageId };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : 'completeChatTodo failed',
          messageId: null,
        };
      }
    },
  };
}
