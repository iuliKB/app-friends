/**
 * @jest-environment node
 */
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
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
const mockOn = jest.fn().mockImplementation((_evt, _filter, cb) => {
  mockCapturedHandler = cb;
  return { subscribe: jest.fn().mockReturnValue({}) };
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
