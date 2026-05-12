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

  it('sendChatTodo invokes create_chat_todo_list with is_list=false for the single-item flavor (D-09)', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 'list-id-123', error: null });
    const { result } = renderHook(() => useChatTodos('gc1'));
    await act(async () => {
      await result.current.sendChatTodo({
        groupChannelId: 'gc1',
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
        p_assignee_id: 'u-other',
        p_title: 'Buy bread',
        p_is_list: false,
      })
    );
  });

  it('sendChatTodo invokes RPC with is_list=true + items array for the list flavor (D-13)', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 'list-id-456', error: null });
    const { result } = renderHook(() => useChatTodos('gc1'));
    await act(async () => {
      await result.current.sendChatTodo({
        groupChannelId: 'gc1',
        assigneeId: 'u-other',
        title: 'Trip prep',
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
        p_is_list: true,
        p_items: expect.arrayContaining([
          expect.objectContaining({ title: 'Pack' }),
          expect.objectContaining({ title: 'Charge' }),
        ]),
      })
    );
  });

  it('completeChatTodo invokes complete_chat_todo RPC and returns the system message id', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 'msg-789', error: null });
    const { result } = renderHook(() => useChatTodos('gc1'));
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
    const { result } = renderHook(() => useChatTodos('gc1'));
    let returned: { messageId: string | null; error: string | null } | undefined;
    await act(async () => {
      returned = await result.current.completeChatTodo('item-1');
    });
    expect(returned?.messageId).toBeNull();
    expect(returned?.error).toBe('item not found');
  });
});
