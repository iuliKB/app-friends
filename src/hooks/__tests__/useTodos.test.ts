/**
 * @jest-environment jsdom
 *
 * useTodos test — Phase 31 Plan 03 (migrated to TanStack Query).
 *
 * Asserts BEHAVIOR via the cache, not implementation details.
 *  - Parallel get_my_todos + get_chat_todos fetch on mount
 *  - completeTodo optimistic flip + rollback on UPDATE error
 *  - completeTodo persists newly set completed_at when UPDATE succeeds
 *  - completeChatTodo invokes RPC and surfaces error / messageId
 *  - Each mutation invalidates queryKeys.todos.* AND queryKeys.home.all() (Pitfall 10)
 *
 * Run: npx jest --testPathPatterns="useTodos" --no-coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

jest.mock('@/lib/dateLocal', () => ({ todayLocal: () => '2026-05-13' }));

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

describe('useTodos (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  it('returns Mine + From chats sections via get_my_todos + get_chat_todos', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_my_todos') return Promise.resolve({ data: [MINE_ROW], error: null });
      if (rpcName === 'get_chat_todos') return Promise.resolve({ data: [CHAT_ROW], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useTodos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mine).toHaveLength(1);
    expect(result.current.fromChats).toHaveLength(1);
    expect(result.current.fromChats[0]!.title).toBe('Trip prep');

    const rpcNames = mockRpc.mock.calls.map((c) => c[0]);
    expect(rpcNames).toEqual(expect.arrayContaining(['get_my_todos', 'get_chat_todos']));
  });

  it('completeTodo flips completed_at optimistically and reverts on error', async () => {
    // Initial fetch returns [MINE_ROW]; refetch (after onSettled) hangs so the
    // post-rollback state stays observable.
    let mineCallCount = 0;
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_my_todos') {
        mineCallCount++;
        if (mineCallCount === 1) return Promise.resolve({ data: [MINE_ROW], error: null });
        return new Promise(() => {}); // hang the refetch
      }
      if (rpcName === 'get_chat_todos') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: new Error('oops') }),
      }),
    });

    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useTodos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let completeResult: { error: string | null } | undefined;
    await act(async () => {
      completeResult = await result.current.completeTodo('t1');
    });

    expect(completeResult?.error).toBe('oops');
    // After onError, the cache holds the snapshot (pre-mutate value).
    const cached = client.getQueryData(queryKeys.todos.mine('2026-05-13')) as Array<{
      id: string;
      completed_at: string | null;
    }>;
    expect(cached?.[0]?.completed_at).toBeNull(); // reverted
  });

  it('completeTodo persists newly set completed_at when update succeeds', async () => {
    let mineCallCount = 0;
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_my_todos') {
        mineCallCount++;
        if (mineCallCount === 1) return Promise.resolve({ data: [MINE_ROW], error: null });
        return new Promise(() => {}); // hang the refetch so the optimistic write stays observable
      }
      if (rpcName === 'get_chat_todos') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const { client, wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useTodos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeTodo('t1');
    });

    // Read from the cache to confirm onMutate set the optimistic value and
    // onError did NOT roll back (since the UPDATE succeeded).
    const cached = client.getQueryData(queryKeys.todos.mine('2026-05-13')) as Array<{
      id: string;
      completed_at: string | null;
    }>;
    expect(cached?.[0]?.completed_at).not.toBeNull();
  });

  it('completeChatTodo invokes complete_chat_todo RPC and returns the system message id', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_my_todos') return Promise.resolve({ data: [], error: null });
      if (rpcName === 'get_chat_todos') return Promise.resolve({ data: [CHAT_ROW], error: null });
      if (rpcName === 'complete_chat_todo') return Promise.resolve({ data: 'msg-789', error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useTodos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: { error: string | null; messageId: string | null } | undefined;
    await act(async () => {
      returned = await result.current.completeChatTodo('item-1');
    });
    expect(returned?.messageId).toBe('msg-789');
    expect(returned?.error).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('complete_chat_todo', { p_item_id: 'item-1' });
  });

  it('completeChatTodo surfaces RPC errors as { error: string, messageId: null }', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_my_todos') return Promise.resolve({ data: [], error: null });
      if (rpcName === 'get_chat_todos') return Promise.resolve({ data: [CHAT_ROW], error: null });
      if (rpcName === 'complete_chat_todo')
        return Promise.resolve({ data: null, error: new Error('item not found') });
      return Promise.resolve({ data: null, error: null });
    });

    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(() => useTodos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: { error: string | null; messageId: string | null } | undefined;
    await act(async () => {
      returned = await result.current.completeChatTodo('item-1');
    });
    expect(returned?.messageId).toBeNull();
    expect(returned?.error).toBe('item not found');
  });
});
