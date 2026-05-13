/**
 * @jest-environment node
 */
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  subscribeChatList,
  subscribeChatRoom,
  subscribeHabitCheckins,
  subscribeHomeStatuses,
  subscribePollVotes,
  _resetRealtimeBridgeForTests,
} from '@/lib/realtimeBridge';

// Capture payload handler so tests can fire events at it.
// Variables consumed inside jest.mock() factories MUST be prefixed with `mock`
// (case-insensitive) — jest hoists the mock factory above declarations and
// otherwise throws "module factory is not allowed to reference any out-of-scope
// variables" (see Rule 2 of jest babel plugin).
let mockCapturedHandler: ((payload: any) => void) | null = null;
// Per-event handlers for chained .on() calls (subscribeChatRoom uses three).
// Maps event name (e.g. 'INSERT') to the callback registered for it.
const mockHandlersByEvent: Map<string, (payload: any) => void> = new Map();
const mockOn = jest.fn().mockImplementation(function chainOn(
  this: any,
  _evt: string,
  filter: { event?: string },
  cb: (payload: any) => void,
) {
  mockCapturedHandler = cb;
  if (filter && typeof filter.event === 'string') {
    mockHandlersByEvent.set(filter.event, cb);
  }
  // Return an object that exposes both .on (for further chaining) and .subscribe.
  return { on: mockOn, subscribe: jest.fn().mockReturnValue({}) };
});
const mockChannel = jest.fn().mockImplementation(() => ({ on: mockOn }));
const mockRemoveChannel = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}));

describe('realtimeBridge.subscribeHabitCheckins', () => {
  let qc: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCapturedHandler = null;
    mockChannel.mockClear();
    mockOn.mockClear();
    mockRemoveChannel.mockClear();
    _resetRealtimeBridgeForTests();
    qc = new QueryClient();
    invalidateSpy = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue();
  });

  it('dedups two subscriptions to the same userId into ONE supabase.channel call', () => {
    const u1 = subscribeHabitCheckins(qc, 'user-1', '2026-05-13');
    const u2 = subscribeHabitCheckins(qc, 'user-1', '2026-05-13');
    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledWith('habit-checkins-user-1');
    u1();
    u2();
  });

  it('tears down only after all subscribers have unsubscribed', () => {
    const u1 = subscribeHabitCheckins(qc, 'user-1', '2026-05-13');
    const u2 = subscribeHabitCheckins(qc, 'user-1', '2026-05-13');
    u1();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    u2();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('opens distinct channels for different userIds', () => {
    subscribeHabitCheckins(qc, 'user-1', '2026-05-13');
    subscribeHabitCheckins(qc, 'user-2', '2026-05-13');
    expect(mockChannel).toHaveBeenCalledTimes(2);
    expect(mockChannel).toHaveBeenCalledWith('habit-checkins-user-1');
    expect(mockChannel).toHaveBeenCalledWith('habit-checkins-user-2');
  });

  it.each(['INSERT', 'UPDATE', 'DELETE'] as const)(
    'invalidates habits.overview on %s payload',
    (eventType) => {
      subscribeHabitCheckins(qc, 'user-1', '2026-05-13');
      expect(mockCapturedHandler).not.toBeNull();
      mockCapturedHandler!({ eventType, new: {}, old: {} });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.habits.overview('2026-05-13'),
      });
    },
  );
});

describe('realtimeBridge.subscribeHomeStatuses', () => {
  let qc: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCapturedHandler = null;
    mockChannel.mockClear();
    mockOn.mockClear();
    mockRemoveChannel.mockClear();
    _resetRealtimeBridgeForTests();
    qc = new QueryClient();
    invalidateSpy = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue();
  });

  it('subscribes to home-statuses-${userId} with an IN-filter for friend ids', () => {
    subscribeHomeStatuses(qc, 'u1', ['f1', 'f2']);
    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledWith('home-statuses-u1');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'statuses',
        filter: 'user_id=in.(f1,f2)',
      }),
      expect.any(Function),
    );
  });

  it('dedups two subscriptions to the same userId into ONE supabase.channel call', () => {
    const u1 = subscribeHomeStatuses(qc, 'u1', ['f1']);
    const u2 = subscribeHomeStatuses(qc, 'u1', ['f1']);
    expect(mockChannel).toHaveBeenCalledTimes(1);
    u1();
    u2();
  });

  it('invalidates home.friends on any statuses payload', () => {
    subscribeHomeStatuses(qc, 'u1', ['f1', 'f2']);
    expect(mockCapturedHandler).not.toBeNull();
    mockCapturedHandler!({ eventType: 'UPDATE', new: {}, old: {} });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.home.friends('u1'),
    });
  });

  it('opens no channel when friendIds is empty', () => {
    const unsub = subscribeHomeStatuses(qc, 'u1', []);
    expect(mockChannel).not.toHaveBeenCalled();
    // unsubscribe must be a safe no-op
    expect(() => unsub()).not.toThrow();
  });

  it('tears down only after all subscribers have unsubscribed', () => {
    const u1 = subscribeHomeStatuses(qc, 'u1', ['f1']);
    const u2 = subscribeHomeStatuses(qc, 'u1', ['f1']);
    u1();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    u2();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});

describe('realtimeBridge.subscribePollVotes', () => {
  let qc: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCapturedHandler = null;
    // Reset first so any leftover teardown calls drain BEFORE we clear counters.
    _resetRealtimeBridgeForTests();
    mockChannel.mockClear();
    mockOn.mockClear();
    mockRemoveChannel.mockClear();
    qc = new QueryClient();
    invalidateSpy = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue();
  });

  it('subscribes to poll-votes-${pollId} with a poll_id eq filter', () => {
    subscribePollVotes(qc, 'p1');
    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledWith('poll-votes-p1');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'poll_votes',
        filter: 'poll_id=eq.p1',
      }),
      expect.any(Function),
    );
  });

  it('dedups two subscriptions to the same pollId into ONE supabase.channel call', () => {
    const u1 = subscribePollVotes(qc, 'p1');
    const u2 = subscribePollVotes(qc, 'p1');
    expect(mockChannel).toHaveBeenCalledTimes(1);
    u1();
    u2();
  });

  it.each(['INSERT', 'UPDATE', 'DELETE'] as const)(
    'invalidates polls.poll on %s payload',
    (eventType) => {
      subscribePollVotes(qc, 'p1');
      expect(mockCapturedHandler).not.toBeNull();
      mockCapturedHandler!({ eventType, new: {}, old: {} });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.polls.poll('p1'),
      });
    },
  );

  it('tears down only after all subscribers have unsubscribed', () => {
    const u1 = subscribePollVotes(qc, 'p1');
    const u2 = subscribePollVotes(qc, 'p1');
    u1();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    u2();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});

describe('realtimeBridge.subscribeChatList', () => {
  let qc: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCapturedHandler = null;
    _resetRealtimeBridgeForTests();
    mockChannel.mockClear();
    mockOn.mockClear();
    mockRemoveChannel.mockClear();
    qc = new QueryClient();
    invalidateSpy = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue();
  });

  it('subscribes to chat-list-${userId} with NO filter on messages table', () => {
    subscribeChatList(qc, 'u1');
    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledWith('chat-list-u1');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'messages',
      }),
      expect.any(Function),
    );
    // Crucially — NO `filter` key in the options object.
    const [, opts] = (mockOn.mock.calls[0] ?? []);
    expect(opts).not.toHaveProperty('filter');
  });

  it('dedups two subscriptions for the same userId into ONE supabase.channel call', () => {
    const unsub1 = subscribeChatList(qc, 'u1');
    const unsub2 = subscribeChatList(qc, 'u1');
    expect(mockChannel).toHaveBeenCalledTimes(1); // refcount, not a new channel
    unsub1();
    unsub2();
  });

  it.each(['INSERT', 'UPDATE', 'DELETE'] as const)(
    'invalidates queryKeys.chat.list(userId) on %s payload',
    (eventType) => {
      subscribeChatList(qc, 'u1');
      // The captured handler is the second argument of mockOn (set by the mock).
      const handler = mockCapturedHandler;
      expect(handler).toBeTruthy();
      handler?.({ eventType, new: { id: 'm1' }, old: null });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.chat.list('u1'),
      });
    },
  );

  it('tears down the channel only after all subscribers have unsubscribed', () => {
    const unsub1 = subscribeChatList(qc, 'u1');
    const unsub2 = subscribeChatList(qc, 'u1');
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    unsub1();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    unsub2();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('opens a NEW channel when userId changes (different cache key)', () => {
    subscribeChatList(qc, 'u1');
    subscribeChatList(qc, 'u2');
    expect(mockChannel).toHaveBeenCalledTimes(2);
    expect(mockChannel).toHaveBeenNthCalledWith(1, 'chat-list-u1');
    expect(mockChannel).toHaveBeenNthCalledWith(2, 'chat-list-u2');
  });
});

describe('realtimeBridge.subscribeChatRoom', () => {
  let qc: QueryClient;
  let invalidateSpy: jest.SpyInstance;
  let setDataSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCapturedHandler = null;
    mockHandlersByEvent.clear();
    // Reset first so any leftover teardowns drain BEFORE we clear counters.
    _resetRealtimeBridgeForTests();
    mockChannel.mockClear();
    mockOn.mockClear();
    mockRemoveChannel.mockClear();
    qc = new QueryClient();
    invalidateSpy = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue();
    setDataSpy = jest.spyOn(qc, 'setQueryData');
  });

  it('subscribes to chat-${channelId} with three postgres_changes listeners (INSERT/UPDATE/DELETE)', () => {
    subscribeChatRoom(qc, 'room-1');
    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledWith('chat-room-1');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', schema: 'public', table: 'messages' }),
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE', schema: 'public', table: 'messages' }),
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'DELETE', schema: 'public', table: 'messages' }),
      expect.any(Function),
    );
  });

  it('dedups two subscriptions to the same channelId into ONE supabase.channel call', () => {
    const u1 = subscribeChatRoom(qc, 'room-1');
    const u2 = subscribeChatRoom(qc, 'room-1');
    expect(mockChannel).toHaveBeenCalledTimes(1);
    u1();
    u2();
  });

  it('INSERT payload prepends a new message via setQueryData (with id-based dedup of optimistic)', () => {
    // Seed cache with an optimistic message keyed by the SAME id the server INSERT will carry.
    const existingId = 'msg-1';
    qc.setQueryData(queryKeys.chat.messages('room-1'), [
      { id: existingId, body: 'hello', pending: true },
    ]);
    setDataSpy.mockClear();
    subscribeChatRoom(qc, 'room-1');
    const insertHandler = mockHandlersByEvent.get('INSERT')!;
    expect(insertHandler).toBeDefined();
    insertHandler({ new: { id: existingId, body: 'hello' } });
    const next = qc.getQueryData(queryKeys.chat.messages('room-1')) as any[];
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(existingId);
    expect(next[0].pending).toBe(false);
  });

  it('INSERT payload with same id as canonical existing message is a no-op (dedup)', () => {
    qc.setQueryData(queryKeys.chat.messages('room-1'), [
      { id: 'msg-2', body: 'world' },
    ]);
    subscribeChatRoom(qc, 'room-1');
    const insertHandler = mockHandlersByEvent.get('INSERT')!;
    insertHandler({ new: { id: 'msg-2', body: 'world' } });
    const next = qc.getQueryData(queryKeys.chat.messages('room-1')) as any[];
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('msg-2');
  });

  it('INSERT payload with new id prepends the message', () => {
    qc.setQueryData(queryKeys.chat.messages('room-1'), [
      { id: 'msg-old', body: 'older' },
    ]);
    subscribeChatRoom(qc, 'room-1');
    const insertHandler = mockHandlersByEvent.get('INSERT')!;
    insertHandler({ new: { id: 'msg-new', body: 'newer' } });
    const next = qc.getQueryData(queryKeys.chat.messages('room-1')) as any[];
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe('msg-new');
    expect(next[1].id).toBe('msg-old');
  });

  it('UPDATE payload invalidates chat.messages', () => {
    subscribeChatRoom(qc, 'room-1');
    const updateHandler = mockHandlersByEvent.get('UPDATE')!;
    expect(updateHandler).toBeDefined();
    updateHandler({ new: { id: 'msg-x' } });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.chat.messages('room-1'),
    });
  });

  it('DELETE payload filters out the deleted message via setQueryData', () => {
    qc.setQueryData(queryKeys.chat.messages('room-1'), [
      { id: 'msg-keep' },
      { id: 'msg-delete' },
    ]);
    subscribeChatRoom(qc, 'room-1');
    const deleteHandler = mockHandlersByEvent.get('DELETE')!;
    expect(deleteHandler).toBeDefined();
    deleteHandler({ old: { id: 'msg-delete' } });
    const next = qc.getQueryData(queryKeys.chat.messages('room-1')) as any[];
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('msg-keep');
  });

  it('tears down only after all subscribers have unsubscribed', () => {
    const u1 = subscribeChatRoom(qc, 'room-1');
    const u2 = subscribeChatRoom(qc, 'room-1');
    u1();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    u2();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
