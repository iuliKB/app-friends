// Chat-info To-Dos section (migration 0032).
//
// Loads every chat to-do list for ONE channel that the caller may see
// (creator OR assignee) via get_chat_todos_for_channel, with item rows inlined.
// Completion reuses useChatTodos.completeChatTodo (assignee-only, RPC-side);
// after a complete the new RPC result is invalidated so the section refreshes.
//
// Scope mirrors useChatTodos.ChatScope. Group, DM and plan chats all carry an
// info screen, so every scope resolves through get_chat_todos_for_channel
// (the plan arg was added in migration 0035).

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useChatTodos, type ChatScope } from '@/hooks/useChatTodos';
import type { ChatChannelTodoRow } from '@/types/todos';

function channelId(scope: ChatScope): string {
  switch (scope.kind) {
    case 'group':
      return scope.groupChannelId;
    case 'dm':
      return scope.dmChannelId;
    case 'plan':
      return scope.planId;
  }
}

export interface UseChatChannelTodosResult {
  lists: ChatChannelTodoRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  /** Mark a single item done (assignee-only); refreshes this section on success. */
  toggleItem: (itemId: string, listId: string) => Promise<{ error: string | null }>;
}

export function useChatChannelTodos(scope: ChatScope): UseChatChannelTodosResult {
  const queryClient = useQueryClient();
  const { completeChatTodo } = useChatTodos();
  const id = channelId(scope);
  const key = queryKeys.todos.channel(id);

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ChatChannelTodoRow[]> => {
      const { data, error } = await (supabase as any).rpc('get_chat_todos_for_channel', {
        p_group_channel_id: scope.kind === 'group' ? scope.groupChannelId : null,
        p_dm_channel_id: scope.kind === 'dm' ? scope.dmChannelId : null,
        p_plan_id: scope.kind === 'plan' ? scope.planId : null,
      });
      if (error) throw error;
      return (data ?? []) as ChatChannelTodoRow[];
    },
    enabled: !!id,
  });

  return {
    lists: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    toggleItem: async (itemId, listId) => {
      const { error } = await completeChatTodo(itemId, { listId, chatScope: scope });
      // completeChatTodo already fans out to fromChats/home/chat caches; refresh
      // this channel-scoped view too (it is keyed independently).
      void queryClient.invalidateQueries({ queryKey: key });
      return { error };
    },
  };
}
