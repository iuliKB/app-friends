/**
 * @jest-environment node
 */
import { QueryClient } from '@tanstack/react-query';
import { attachAuthBridge } from '@/lib/authBridge';

// Variables consumed inside jest.mock() factories MUST be prefixed with `mock`
// (case-insensitive) — jest hoists the mock factory above declarations.
let mockCapturedHandler: ((event: string, session: any) => void) | null = null;
const mockSubscriptionUnsubscribe = jest.fn();
const mockOnAuthStateChange = jest.fn().mockImplementation((cb: (e: string, s: any) => void) => {
  mockCapturedHandler = cb;
  return { data: { subscription: { unsubscribe: mockSubscriptionUnsubscribe } } };
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...(args as [any])),
    },
  },
}));

describe('authBridge.attachAuthBridge', () => {
  let qc: QueryClient;
  let removeSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCapturedHandler = null;
    mockSubscriptionUnsubscribe.mockClear();
    mockOnAuthStateChange.mockClear();
    qc = new QueryClient();
    removeSpy = jest.spyOn(qc, 'removeQueries');
  });

  it('subscribes to onAuthStateChange exactly once and returns an unsubscribe', () => {
    const off = attachAuthBridge(qc);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(typeof off).toBe('function');
    off();
    expect(mockSubscriptionUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('calls removeQueries() on SIGNED_OUT', () => {
    attachAuthBridge(qc);
    expect(mockCapturedHandler).not.toBeNull();
    mockCapturedHandler!('SIGNED_OUT', null);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(); // no args = removeAll
  });

  it.each(['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'INITIAL_SESSION'])(
    'does NOT call removeQueries on %s',
    (event) => {
      attachAuthBridge(qc);
      mockCapturedHandler!(event, { user: { id: 'u1' } });
      expect(removeSpy).not.toHaveBeenCalled();
    },
  );
});
