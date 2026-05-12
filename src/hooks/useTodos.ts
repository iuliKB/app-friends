// Phase 29.1 Plan 03 — useTodos hook.
// Returns the two-section To-Dos view (D-04): personal "Mine" todos plus
// "From chats" todos assigned via group chat (D-13 list flavor + D-09 single).
//
// - On mount: parallel `get_my_todos(p_today)` + `get_chat_todos(p_today)`.
// - `completeTodo(todoId)`: optimistic flip of `completed_at` (null ↔ now()),
//   persisted via direct UPDATE (RLS gates ownership — T-29.1-19). Reverts
//   on UPDATE error using the snapshot+revert pattern.
// - `completeChatTodo(itemId)`: invokes `complete_chat_todo` RPC; the RPC
//   atomically writes the system message + state update, so we simply
//   refetch to pull the new done_count.
//
// Errors are silent: fall back to empty arrays, warn to console.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { todayLocal } from '@/lib/dateLocal';
import type { MyTodoRow, ChatTodoRow } from '@/types/todos';

export interface UseTodosResult {
  mine: MyTodoRow[];
  fromChats: ChatTodoRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  completeTodo: (todoId: string) => Promise<{ error: string | null }>;
  completeChatTodo: (
    itemId: string
  ) => Promise<{ error: string | null; messageId: string | null }>;
}

export function useTodos(): UseTodosResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [mine, setMine] = useState<MyTodoRow[]>([]);
  const [fromChats, setFromChats] = useState<ChatTodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // mineRef mirrors the latest committed mine[] so completeTodo can capture
  // a synchronous pre-snapshot for revert without relying on setState
  // callback timing (Pitfall 3 stale-closure guard, robust across React
  // batching modes).
  const mineRef = useRef<MyTodoRow[]>([]);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setMine([]);
      setFromChats([]);
      return;
    }
    setLoading(true);
    setError(null);
    const today = todayLocal();
    const [
      { data: mineData, error: mineErr },
      { data: chatData, error: chatErr },
    ] = await Promise.all([
      supabase.rpc('get_my_todos', { p_today: today }),
      supabase.rpc('get_chat_todos', { p_today: today }),
    ]);
    if (mineErr || chatErr) {
      const msg = mineErr?.message ?? chatErr?.message ?? 'unknown';
      console.warn('useTodos fetch failed', msg);
      setError(msg);
    }
    const nextMine = ((mineData ?? []) as unknown) as MyTodoRow[];
    mineRef.current = nextMine;
    setMine(nextMine);
    setFromChats(((chatData ?? []) as unknown) as ChatTodoRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const completeTodo = useCallback(
    async (todoId: string): Promise<{ error: string | null }> => {
      // Snapshot+revert pattern (Pitfall 3). We read from mineRef rather
      // than relying on a `setMine((prev) => { snapshot = ...; return prev; })`
      // updater capture because React 18 may defer functional setState
      // callbacks past the next statement, leaving the snapshot null at the
      // moment we need it. mineRef is updated synchronously on every state
      // commit (refetch + the optimistic flip below) so it always mirrors
      // the latest committed mine[].
      const snapshot = mineRef.current.find((t) => t.id === todoId) ?? null;
      if (!snapshot) return { error: 'todo-not-found' };

      const wasCompleted = snapshot.completed_at !== null;
      const newCompletedAt = wasCompleted ? null : new Date().toISOString();

      // Optimistic flip
      const optimistic = mineRef.current.map((t) =>
        t.id === todoId ? { ...t, completed_at: newCompletedAt } : t
      );
      mineRef.current = optimistic;
      setMine(optimistic);

      // Direct UPDATE — RLS UPDATE policy gates on user_id = auth.uid()
      // (T-29.1-19 mitigation: client cannot bypass cross-user write).
      const { error: updErr } = await supabase
        .from('todos')
        .update({ completed_at: newCompletedAt })
        .eq('id', todoId);
      if (updErr) {
        // Revert: swap the row back to its pre-toggle state.
        const reverted = mineRef.current.map((t) =>
          t.id === todoId ? snapshot : t
        );
        mineRef.current = reverted;
        setMine(reverted);
        return { error: updErr.message };
      }
      return { error: null };
    },
    []
  );

  const completeChatTodo = useCallback(
    async (
      itemId: string
    ): Promise<{ error: string | null; messageId: string | null }> => {
      // RPC handles atomic state update + system message insert (Plan 01
      // §complete_chat_todo). On success the caller's "From chats" row needs
      // a fresh done_count, so we refetch — Realtime on the chat thread will
      // surface the system message into the existing chat subscription.
      const { data, error: rpcErr } = await supabase.rpc('complete_chat_todo', {
        p_item_id: itemId,
      });
      if (rpcErr) {
        console.warn('complete_chat_todo failed', rpcErr);
        return { error: rpcErr.message, messageId: null };
      }
      void refetch();
      return { error: null, messageId: (data as string | null) ?? null };
    },
    [refetch]
  );

  return {
    mine,
    fromChats,
    loading,
    error,
    refetch,
    completeTodo,
    completeChatTodo,
  };
}
