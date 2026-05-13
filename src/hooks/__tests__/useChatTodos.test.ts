/**
 * @jest-environment jsdom
 *
 * useChatTodos test — Phase 31 Plan 03 (migrated to TanStack Query).
 *
 * Mutator-only hook (no useQuery). Asserts:
 *  - sendChatTodo invokes create_chat_todo_list with correct scope params
 *  - completeChatTodo invokes complete_chat_todo and returns the messageId
 *  - Both mutations invalidate queryKeys.todos.fromChats AND queryKeys.home.all() on settle
 *  - Per-list-id invalidation hits queryKeys.todos.chatList(*)
 *
 * Run: npx jest --testPathPatterns="useChatTodos" --no-coverage
 */

import { renderHook, act } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/lib/dateLocal', () => ({ todayLocal: () => '2026-05-13' }));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u1' } } }),
}));

import { useChatTodos } from '../useChatTodos';

describe('useChatTodos (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('sendChatTodo invokes RPC with group scope (D-09 single-item flavor)', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'list-id-123', error: null });
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useChatTodos(), { wrapper });
    await act(async () => {
      await result.current.sendChatTodo({
        scope: { kind: 'group', groupChannelId: 'gc1' },
        assigneeId: 'u-other',
        title: 'Buy bread',
        isList: false,
        items: [{ title: 'Buy bread', due_date: null }],
      });
    });
    expect(mockRpc).toHaveBeenCalledWith(
      'create_chat_todo_list',
      expect.objectContaining({
        p_group_channel_id: 'gc1',
        p_plan_id: null,
        p_dm_channel_id: null,
        p_assignee_id: 'u-other',
        p_title: 'Buy bread',
        p_is_list: false,
      }),
    );
  });

  it('sendChatTodo invokes RPC with plan scope', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'list-id-plan', error: null });
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useChatTodos(), { wrapper });
    await act(async () => {
      await result.current.sendChatTodo({
        scope: { kind: 'plan', planId: 'plan-7' },
        assigneeId: 'u-other',
        title: 'Plan prep',
        isList: true,
        items: [
          { title: 'Pack', due_date: null },
          { title: 'Charge', due_date: null },
        ],
      });
    });
    expect(mockRpc).toHaveBeenCalledWith(
      'create_chat_todo_list',
      expect.objectContaining({
        p_group_channel_id: null,
        p_plan_id: 'plan-7',
        p_dm_channel_id: null,
        p_is_list: true,
      }),
    );
  });

  it('sendChatTodo invokes RPC with dm scope', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'list-id-dm', error: null });
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useChatTodos(), { wrapper });
    await act(async () => {
      await result.current.sendChatTodo({
        scope: { kind: 'dm', dmChannelId: 'dm-9' },
        assigneeId: 'u-peer',
        title: 'Send doc',
        isList: false,
        items: [{ title: 'Send doc', due_date: null }],
      });
    });
    expect(mockRpc).toHaveBeenCalledWith(
      'create_chat_todo_list',
      expect.objectContaining({
        p_group_channel_id: null,
        p_plan_id: null,
        p_dm_channel_id: 'dm-9',
      }),
    );
  });

  it('completeChatTodo invokes complete_chat_todo RPC and returns the system message id', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'msg-789', error: null });
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useChatTodos(), { wrapper });
    let returned: { messageId: string | null; error: string | null } | undefined;
    await act(async () => {
      returned = await result.current.completeChatTodo('item-1');
    });
    expect(mockRpc).toHaveBeenCalledWith('complete_chat_todo', { p_item_id: 'item-1' });
    expect(returned?.messageId).toBe('msg-789');
    expect(returned?.error).toBeNull();
  });

  it('completeChatTodo surfaces RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('item not found') });
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useChatTodos(), { wrapper });
    let returned: { messageId: string | null; error: string | null } | undefined;
    await act(async () => {
      returned = await result.current.completeChatTodo('item-1');
    });
    expect(returned?.messageId).toBeNull();
    expect(returned?.error).toBe('item not found');
  });

  it('sendChatTodo onSettled invalidates todos.fromChats + home.all() + chatList + chat.messages + chat.list', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'list-new', error: null });
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useChatTodos(), { wrapper });
    await act(async () => {
      await result.current.sendChatTodo({
        scope: { kind: 'plan', planId: 'p1' },
        assigneeId: 'u-other',
        title: 't',
        isList: false,
        items: [{ title: 't', due_date: null }],
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.todos.chatList('list-new'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.todos.fromChats('2026-05-13'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.home.all(),
    });
    // Phase 32 — chat caches invalidate too (Tier B).
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.chat.messages('p1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.chat.list('u1'),
    });
  });

  it('completeChatTodo onSettled invalidates todos.fromChats + home.all() + chat.messages + chat.list', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'msg-1', error: null });
    const { client, wrapper } = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useChatTodos(), { wrapper });
    await act(async () => {
      await result.current.completeChatTodo('item-1', {
        chatScope: { kind: 'plan', planId: 'p1' },
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.todos.fromChats('2026-05-13'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.home.all(),
    });
    // Phase 32 — chat caches invalidate too (Tier B).
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.chat.messages('p1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.chat.list('u1'),
    });
  });
});
