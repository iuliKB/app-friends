/**
 * @jest-environment node
 */
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { subscribeHabitCheckins, _resetRealtimeBridgeForTests } from '@/lib/realtimeBridge';

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
