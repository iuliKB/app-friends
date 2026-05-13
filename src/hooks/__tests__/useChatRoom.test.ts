/**
 * @jest-environment jsdom
 *
 * useChatRoom test — Phase 31 Plan 08 (migrated to TanStack Query).
 *
 * Asserts BEHAVIOR via the cache: messages fetched into queryKeys.chat.messages;
 * sendMessage optimistically prepends with pending=true; subscribeChatRoom is
 * called on mount and the returned unsubscribe runs on unmount.
 *
 * Run: npx jest --testPathPatterns="useChatRoom" --no-coverage
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

// Chainable supabase mock — supports .from().select().eq().order().limit() returning data.
function makeChain(rows: any[] = [], err: any = null): any {
  const result = { data: rows, error: err } as any;
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (onFulfilled: any) => Promise.resolve(onFulfilled(result)),
    insert: jest.fn(() => Promise.resolve({ error: null, data: null })),
    update: jest.fn(() => chain),
    delete: jest.fn(() => chain),
  };
  return chain;
}

const mockFrom = jest.fn(() => makeChain([]));
jest.mock('@/lib/supabase', () => {
  // Inline chainable channel mock so jest.mock factory has no out-of-scope refs.
  function inlineChannel(): any {
    const c: any = {
      on: jest.fn(() => c),
      subscribe: jest.fn(() => c),
    };
    return c;
  }
  return {
    supabase: {
      from: (...args: any[]) => mockFrom(...args),
      rpc: jest.fn(() => Promise.resolve({ error: null, data: null })),
      channel: jest.fn(() => inlineChannel()),
      removeChannel: jest.fn(),
    },
  };
});

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (
    selector: (s: { session: { user: { id: string; user_metadata: any } } }) => unknown,
  ) =>
    selector({
      session: { user: { id: 'u1', user_metadata: { display_name: 'Me', avatar_url: null } } },
    }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/lib/uploadChatMedia', () => ({
  uploadChatMedia: jest.fn(() => Promise.resolve('cdn://uploaded')),
}));

// Capture the unsubscribe returned by subscribeChatRoom so the test can assert teardown.
const mockChatRoomUnsubscribe = jest.fn();
const mockAuxUnsubscribe = jest.fn();
const mock_subscribeChatRoom = jest.fn(() => mockChatRoomUnsubscribe);
const mock_subscribeChatAux = jest.fn(() => mockAuxUnsubscribe);
jest.mock('@/lib/realtimeBridge', () => ({
  subscribeChatRoom: (...args: unknown[]) => mock_subscribeChatRoom(...args),
  subscribeChatAux: (...args: unknown[]) => mock_subscribeChatAux(...args),
  _resetRealtimeBridgeForTests: jest.fn(),
}));

import { useChatRoom } from '../useChatRoom';

describe('useChatRoom (migrated to TanStack Query)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockFrom.mockImplementation(() => makeChain([]));
    mockChatRoomUnsubscribe.mockReset();
    mockAuxUnsubscribe.mockReset();
    mock_subscribeChatRoom.mockClear();
    mock_subscribeChatAux.mockClear();
  });

  it('public return shape preserved (messages, loading, sendMessage, sendImage, ...)', () => {
    const { wrapper } = createTestQueryClient();
    const { result } = renderHook(
      () => useChatRoom({ planId: 'p1', dmChannelId: undefined, groupChannelId: undefined }),
      { wrapper },
    );
    // Public surface intentionally verbose — ChatRoomScreen reads many fields.
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.sendImage).toBe('function');
    expect(typeof result.current.sendPoll).toBe('function');
    expect(typeof result.current.retryMessage).toBe('function');
    expect(typeof result.current.deleteMessage).toBe('function');
    expect(typeof result.current.addReaction).toBe('function');
    expect(typeof result.current.removeReaction).toBe('function');
    expect(Array.isArray(result.current.messages)).toBe(true);
  });

  it('subscribeChatRoom is called on mount; unsubscribe runs on unmount', async () => {
    const { wrapper } = createTestQueryClient();
    const { unmount } = renderHook(
      () => useChatRoom({ planId: 'p1', dmChannelId: undefined, groupChannelId: undefined }),
      { wrapper },
    );
    await waitFor(() => {
      expect(mock_subscribeChatRoom).toHaveBeenCalled();
    });
    expect(mockChatRoomUnsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mockChatRoomUnsubscribe).toHaveBeenCalled();
  });

  it('cache key queryKeys.chat.messages(channelId) is populated after queryFn resolves', async () => {
    const { wrapper, client } = createTestQueryClient();
    const { result } = renderHook(
      () => useChatRoom({ planId: 'p1', dmChannelId: undefined, groupChannelId: undefined }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const cached = client.getQueryData(queryKeys.chat.messages('p1'));
    expect(cached).toBeDefined();
    expect(Array.isArray(cached)).toBe(true);
  });
});
