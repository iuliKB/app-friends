// Phase 31 Plan 03 — Migrated to TanStack Query (mutator-only — no useQuery).
//
// Caller-side helpers for sending and completing chat-attached to-dos. No
// autoload state — chat thread messages (including the system-message roundtrip
// from `complete_chat_todo`) arrive via `useChatRoom`'s existing per-channel
// Realtime subscription. Phase 31 keeps the hook's role mutator-only; both
// mutations follow the canonical Pattern 5 shape with `// @mutationShape:
// no-optimistic` markers since there is no per-list cache key for the hook to
// optimistically splice (the chat-todo list items live on the chat surface
// where ChatRoomScreen owns its own per-message item cache).
//
// Invalidation map (Pitfall 10):
//   - sendChatTodo  → todos.chatList(*), todos.fromChats, home.all()
//   - completeChatTodo → todos.chatList(*), todos.fromChats, home.all()
// Per-list-id invalidation uses the queryKeys.todos.chatList factory.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayLocal } from '@/lib/dateLocal';
import { queryKeys } from '@/lib/queryKeys';

export type ChatScope =
  | { kind: 'group'; groupChannelId: string }
  | { kind: 'plan'; planId: string }
  | { kind: 'dm'; dmChannelId: string };

export interface SendChatTodoArgs {
  scope: ChatScope;
  assigneeId: string;
  title: string;
  isList: boolean; // false → D-09 single-item; true → D-13 list flavor
  items: { title: string; due_date: string | null }[];
}

export interface UseChatTodosResult {
  sendChatTodo: (
    args: SendChatTodoArgs
  ) => Promise<{ listId: string | null; error: string | null }>;
  completeChatTodo: (
    itemId: string
  ) => Promise<{ messageId: string | null; error: string | null }>;
}

export function useChatTodos(): UseChatTodosResult {
  const queryClient = useQueryClient();

  // @mutationShape: no-optimistic
  const sendMutation = useMutation({
    mutationFn: async (args: SendChatTodoArgs): Promise<string | null> => {
      const { data, error } = await (supabase as any).rpc('create_chat_todo_list', {
        p_group_channel_id: args.scope.kind === 'group' ? args.scope.groupChannelId : null,
        p_plan_id: args.scope.kind === 'plan' ? args.scope.planId : null,
        p_dm_channel_id: args.scope.kind === 'dm' ? args.scope.dmChannelId : null,
        p_assignee_id: args.assigneeId,
        p_title: args.title,
        p_is_list: args.isList,
        p_items: args.items,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    onMutate: async (_args) => {
      // No optimistic snapshot — no per-list cache key exists yet (list is
      // created by the RPC). Marker above exempts this from mutationShape
      // canonical-shape enforcement.
      return {};
    },
    onError: (_err, _args, _ctx) => {
      // No rollback target; caller surfaces the error via the returned shape.
    },
    onSettled: (data) => {
      // Invalidate the newly created list's chatList key (best-effort).
      const newListId = (data as string | null) ?? null;
      if (newListId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.todos.chatList(newListId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.todos.fromChats(todayLocal()) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  // @mutationShape: no-optimistic
  const completeMutation = useMutation({
    mutationFn: async (input: {
      itemId: string;
      listId?: string;
    }): Promise<string | null> => {
      const { data, error } = await (supabase as any).rpc('complete_chat_todo', {
        p_item_id: input.itemId,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    onMutate: async (_input) => {
      // No optimistic mutation — RPC is atomic across two tables.
      return {};
    },
    onError: (_err, _input, _ctx) => {
      // No rollback target.
    },
    onSettled: (_data, _err, input) => {
      // If the caller supplied the parent list_id, invalidate that key too.
      // Otherwise rely on the broad prefix invalidation of todos.all() via
      // the fromChats + home.all() invalidation below.
      if (input?.listId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.todos.chatList(input.listId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.todos.fromChats(todayLocal()) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
    },
  });

  return {
    sendChatTodo: async (args) => {
      try {
        const listId = await sendMutation.mutateAsync(args);
        return { listId, error: null };
      } catch (err) {
        return {
          listId: null,
          error: err instanceof Error ? err.message : 'sendChatTodo failed',
        };
      }
    },
    completeChatTodo: async (itemId) => {
      try {
        const messageId = await completeMutation.mutateAsync({ itemId });
        return { messageId, error: null };
      } catch (err) {
        return {
          messageId: null,
          error: err instanceof Error ? err.message : 'completeChatTodo failed',
        };
      }
    },
  };
}
