// Phase 29.1 Plan 03 — useChatTodos hook.
// Caller-side helpers for sending and completing chat-attached to-dos. No
// autoload of state — chat thread messages (including the system-message
// roundtrip from `complete_chat_todo`) arrive via `useChatRoom`'s existing
// per-channel Realtime subscription.
//
// Phase 29.1 follow-up (0026): scope is a union of group_channel / plan / dm
// to cover birthday chats, plan chats, and DMs uniformly. The RPC takes all
// three scope params and validates that exactly one is non-null.

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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
  const sendChatTodo = useCallback(
    async (
      args: SendChatTodoArgs
    ): Promise<{ listId: string | null; error: string | null }> => {
      const { data, error: rpcErr } = await supabase.rpc(
        'create_chat_todo_list',
        {
          p_group_channel_id: args.scope.kind === 'group' ? args.scope.groupChannelId : null,
          p_plan_id: args.scope.kind === 'plan' ? args.scope.planId : null,
          p_dm_channel_id: args.scope.kind === 'dm' ? args.scope.dmChannelId : null,
          p_assignee_id: args.assigneeId,
          p_title: args.title,
          p_is_list: args.isList,
          p_items: args.items, // jsonb on the server side
        }
      );
      if (rpcErr) {
        console.warn('create_chat_todo_list failed', rpcErr);
        return { listId: null, error: rpcErr.message };
      }
      return { listId: (data as string | null) ?? null, error: null };
    },
    []
  );

  const completeChatTodo = useCallback(
    async (
      itemId: string
    ): Promise<{ messageId: string | null; error: string | null }> => {
      const { data, error: rpcErr } = await supabase.rpc('complete_chat_todo', {
        p_item_id: itemId,
      });
      if (rpcErr) {
        console.warn('complete_chat_todo failed', rpcErr);
        return { messageId: null, error: rpcErr.message };
      }
      return { messageId: (data as string | null) ?? null, error: null };
    },
    []
  );

  return { sendChatTodo, completeChatTodo };
}
