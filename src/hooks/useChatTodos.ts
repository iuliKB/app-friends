// Phase 29.1 Plan 03 — useChatTodos hook.
// Caller-side helpers for sending and completing chat-attached to-dos. No
// autoload of state — chat thread messages (including the system-message
// roundtrip from `complete_chat_todo`) arrive via `useChatRoom`'s existing
// per-channel Realtime subscription.
//
// - `sendChatTodo(...)`: invokes `create_chat_todo_list` RPC with the
//   single-item shape (D-09, is_list=false, items length 1) or the list
//   shape (D-13, is_list=true, items length 1-30).
// - `completeChatTodo(itemId)`: invokes `complete_chat_todo` RPC; returns
//   the system message id surfaced by the RPC so callers can correlate.
//
// Errors are silent: return null id + error message string.

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SendChatTodoArgs {
  groupChannelId: string;
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

/**
 * @param _groupChannelId  Reserved for future per-channel Realtime
 *   subscriptions; v1 relies on useChatRoom's existing channel subscription
 *   to surface the system-message roundtrip from `complete_chat_todo`.
 */
export function useChatTodos(_groupChannelId: string): UseChatTodosResult {
  const sendChatTodo = useCallback(
    async (
      args: SendChatTodoArgs
    ): Promise<{ listId: string | null; error: string | null }> => {
      const { data, error: rpcErr } = await supabase.rpc(
        'create_chat_todo_list',
        {
          p_group_channel_id: args.groupChannelId,
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
