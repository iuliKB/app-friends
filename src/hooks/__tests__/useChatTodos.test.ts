/**
 * useChatTodos test — Phase 29.1 Plan 03 (Wave 0).
 *
 * Asserts the RPC argument shape for both single-item (D-09, is_list=false)
 * and list (D-13, is_list=true) flavors of `sendChatTodo`, plus the
 * `complete_chat_todo` round-trip that returns the system-message id.
 *
 * Run: npx jest --testPathPatterns="useChatTodos" --no-coverage
 */

import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/lib/supabase', () => {
  const rpc = jest.fn();
  return {
    supabase: {
      rpc,
      channel: jest.fn(() => {
        const builder: { on: jest.Mock; subscribe: jest.Mock } = {
          on: jest.fn(),
          subscribe: jest.fn(),
        };
        builder.on.mockReturnValue(builder);
        builder.subscribe.mockReturnValue(builder);
        return builder;
      }),
      removeChannel: jest.fn(),
    },
  };
});

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

import { supabase } from '@/lib/supabase';
import { useChatTodos } from '../useChatTodos';

describe('useChatTodos', () => {
  beforeEach(() => {
    (supabase.rpc as jest.Mock).mockReset();
  });

  it('sendChatTodo invokes RPC with group scope (D-09 single-item flavor)', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 'list-id-123', error: null });
    const { result } = renderHook(() => useChatTodos());
    await act(async () => {
      await result.current.sendChatTodo({
        scope: { kind: 'group', groupChannelId: 'gc1' },
        assigneeId: 'u-other',
        title: 'Buy bread',
        isList: false,
        items: [{ title: 'Buy bread', due_date: null }],
      });
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_chat_todo_list',
      expect.objectContaining({
        p_group_channel_id: 'gc1',
        p_plan_id: null,
        p_dm_channel_id: null,
        p_assignee_id: 'u-other',
        p_title: 'Buy bread',
        p_is_list: false,
      })
    );
  });

  it('sendChatTodo invokes RPC with plan scope (plan chat)', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 'list-id-plan', error: null });
    const { result } = renderHook(() => useChatTodos());
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
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_chat_todo_list',
      expect.objectContaining({
        p_group_channel_id: null,
        p_plan_id: 'plan-7',
        p_dm_channel_id: null,
        p_is_list: true,
        p_items: expect.arrayContaining([
          expect.objectContaining({ title: 'Pack' }),
          expect.objectContaining({ title: 'Charge' }),
        ]),
      })
    );
  });

  it('sendChatTodo invokes RPC with dm scope (1:1 DM)', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 'list-id-dm', error: null });
    const { result } = renderHook(() => useChatTodos());
    await act(async () => {
      await result.current.sendChatTodo({
        scope: { kind: 'dm', dmChannelId: 'dm-9' },
        assigneeId: 'u-peer',
        title: 'Send doc',
        isList: false,
        items: [{ title: 'Send doc', due_date: null }],
      });
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_chat_todo_list',
      expect.objectContaining({
        p_group_channel_id: null,
        p_plan_id: null,
        p_dm_channel_id: 'dm-9',
        p_is_list: false,
      })
    );
  });

  it('completeChatTodo invokes complete_chat_todo RPC and returns the system message id', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 'msg-789', error: null });
    const { result } = renderHook(() => useChatTodos());
    let returned: { messageId: string | null; error: string | null } | undefined;
    await act(async () => {
      returned = await result.current.completeChatTodo('item-1');
    });
    expect(supabase.rpc).toHaveBeenCalledWith('complete_chat_todo', { p_item_id: 'item-1' });
    expect(returned?.messageId).toBe('msg-789');
    expect(returned?.error).toBeNull();
  });

  it('completeChatTodo surfaces RPC errors as { messageId: null, error: string }', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'item not found' },
    });
    const { result } = renderHook(() => useChatTodos());
    let returned: { messageId: string | null; error: string | null } | undefined;
    await act(async () => {
      returned = await result.current.completeChatTodo('item-1');
    });
    expect(returned?.messageId).toBeNull();
    expect(returned?.error).toBe('item not found');
  });
});
