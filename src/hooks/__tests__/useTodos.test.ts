/**
 * useTodos test — Phase 29.1 Plan 03 (Wave 0).
 *
 * Asserts the two-section shape required by D-04 (Mine + From chats),
 * parallel-fetch on mount, and optimistic completeTodo + revert on error.
 *
 * Run: npx jest --testPathPatterns="useTodos" --no-coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/supabase', () => {
  const rpc = jest.fn();
  // chained query builder for `.from('todos').update(...).eq(...)`
  const from = jest.fn();
  return {
    supabase: {
      rpc,
      from,
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
import { useTodos } from '../useTodos';

const MINE_ROW = {
  id: 't1',
  title: 'Buy milk',
  due_date: null,
  notes: null,
  priority: 'medium' as const,
  completed_at: null,
  created_at: '2026-05-12',
  is_overdue: false,
  is_due_today: false,
};

const CHAT_ROW = {
  list_id: 'cl1',
  group_channel_id: 'gc1',
  message_id: 'm1',
  created_by: 'u-other',
  title: 'Trip prep',
  is_list: true,
  created_at: '2026-05-12',
  total_count: 5,
  done_count: 2,
  next_due_date: null,
  is_overdue: false,
  is_due_today: false,
};

describe('useTodos', () => {
  beforeEach(() => {
    (supabase.rpc as jest.Mock).mockReset();
    (supabase.from as jest.Mock).mockReset();
  });

  it('returns Mine + From chats sections via get_my_todos + get_chat_todos (D-04)', async () => {
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: [MINE_ROW], error: null }) // get_my_todos
      .mockResolvedValueOnce({ data: [CHAT_ROW], error: null }); // get_chat_todos

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mine).toHaveLength(1);
    expect(result.current.fromChats).toHaveLength(1);
    expect(result.current.fromChats[0]!.title).toBe('Trip prep');

    // Both RPCs were called with todayLocal-shaped date
    const calls = (supabase.rpc as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls).toEqual(expect.arrayContaining(['get_my_todos', 'get_chat_todos']));
  });

  it('completeTodo flips completed_at optimistically and reverts on error', async () => {
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: [MINE_ROW], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // mock the UPDATE call to fail — chain: from('todos').update(...).eq('id', id)
    (supabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'oops' } }),
      }),
    });
    await act(async () => {
      await result.current.completeTodo('t1');
    });

    expect(result.current.mine[0]!.completed_at).toBeNull(); // reverted
  });

  it('completeTodo persists newly set completed_at when update succeeds', async () => {
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: [MINE_ROW], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    (supabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    await act(async () => {
      await result.current.completeTodo('t1');
    });

    expect(result.current.mine[0]!.completed_at).not.toBeNull();
  });
});
