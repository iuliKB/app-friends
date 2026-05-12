/**
 * openChat test — Phase 30, Plan 02.
 *
 * Verifies the single chat-entry helper consolidating 13 inline router.push
 * blocks and 8 duplicate get_or_create_dm_channel + push pairs. The helper
 * MUST preserve every existing callsite's behavior byte-for-byte:
 *   - dmChannel: synchronous push, no RPC
 *   - dmFriend: RPC then push; Alert on error; onLoadingChange wraps the RPC
 *   - plan: synchronous push, no RPC
 *   - group: synchronous push, optional birthday_person_id param
 *
 * Run: npx jest --testPathPatterns="openChat" --no-coverage
 *
 * All tests below SHOULD FAIL until src/lib/openChat.ts is implemented.
 */

import { Alert } from 'react-native';

jest.mock('@/lib/supabase', () => {
  const rpc = jest.fn();
  return {
    supabase: {
      rpc,
    },
  };
});

import { supabase } from '@/lib/supabase';
import { openChat } from '../openChat';

const mockRpc = supabase.rpc as jest.Mock;

function makeRouter() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
    setParams: jest.fn(),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: jest.fn(),
  };
}

describe('openChat (Phase 30 Plan 02)', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRpc.mockReset();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("Test 1: 'dmChannel' variant pushes /chat/room?dm_channel_id=...&friend_name=... with no RPC", async () => {
    const router = makeRouter();
    await openChat(router as never, {
      kind: 'dmChannel',
      dmChannelId: 'abc',
      friendName: 'Alice',
    });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/chat/room?dm_channel_id=abc&friend_name=Alice');
  });

  it("Test 2: 'dmFriend' variant calls get_or_create_dm_channel then pushes with the returned channel id", async () => {
    mockRpc.mockResolvedValueOnce({ data: 'ch-42', error: null });
    const router = makeRouter();
    await openChat(router as never, {
      kind: 'dmFriend',
      friendId: 'uid-1',
      friendName: 'Alice',
    });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('get_or_create_dm_channel', {
      other_user_id: 'uid-1',
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/chat/room?dm_channel_id=ch-42&friend_name=Alice');
  });

  it("Test 3: 'plan' variant pushes /chat/room?plan_id=... synchronously (zero RPCs)", async () => {
    const router = makeRouter();
    await openChat(router as never, { kind: 'plan', planId: 'p1' });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/chat/room?plan_id=p1');
  });

  it("Test 4: 'group' variant pushes /chat/room?group_channel_id=...&friend_name=... (URL-encoded name)", async () => {
    const router = makeRouter();
    await openChat(router as never, {
      kind: 'group',
      groupChannelId: 'g1',
      friendName: 'Birthday party',
    });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(
      '/chat/room?group_channel_id=g1&friend_name=Birthday%20party'
    );
  });

  it("Test 5: 'group' variant with birthdayPersonId appends &birthday_person_id=...", async () => {
    const router = makeRouter();
    await openChat(router as never, {
      kind: 'group',
      groupChannelId: 'g1',
      friendName: 'X',
      birthdayPersonId: 'b1',
    });
    expect(router.push).toHaveBeenCalledWith(
      '/chat/room?group_channel_id=g1&friend_name=X&birthday_person_id=b1'
    );
  });

  it("Test 6: 'dmFriend' RPC error fires Alert.alert and does NOT push", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const router = makeRouter();
    await openChat(router as never, {
      kind: 'dmFriend',
      friendId: 'uid-2',
      friendName: 'Bob',
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Error', "Couldn't open chat. Try again.");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("Test 7: 'dmFriend' RPC error with silentError: true returns without alerting", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const router = makeRouter();
    await openChat(
      router as never,
      { kind: 'dmFriend', friendId: 'uid-3', friendName: 'C' },
      { silentError: true }
    );
    expect(alertSpy).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("Test 8: 'dmFriend' onLoadingChange called true before RPC and false after — both success and error paths", async () => {
    // Success path
    mockRpc.mockResolvedValueOnce({ data: 'ch-x', error: null });
    const onLoadingChangeSuccess = jest.fn();
    const routerSuccess = makeRouter();
    await openChat(
      routerSuccess as never,
      { kind: 'dmFriend', friendId: 'uid-s', friendName: 'S' },
      { onLoadingChange: onLoadingChangeSuccess }
    );
    expect(onLoadingChangeSuccess).toHaveBeenCalledTimes(2);
    expect(onLoadingChangeSuccess).toHaveBeenNthCalledWith(1, true);
    expect(onLoadingChangeSuccess).toHaveBeenNthCalledWith(2, false);

    // Error path
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const onLoadingChangeError = jest.fn();
    const routerError = makeRouter();
    await openChat(
      routerError as never,
      { kind: 'dmFriend', friendId: 'uid-e', friendName: 'E' },
      { onLoadingChange: onLoadingChangeError, silentError: true }
    );
    expect(onLoadingChangeError).toHaveBeenCalledTimes(2);
    expect(onLoadingChangeError).toHaveBeenNthCalledWith(1, true);
    expect(onLoadingChangeError).toHaveBeenNthCalledWith(2, false);
  });

  it("Test 9: friendName with spaces and special chars is URL-encoded", async () => {
    mockRpc.mockResolvedValueOnce({ data: 'ch-q', error: null });
    const router = makeRouter();
    await openChat(router as never, {
      kind: 'dmFriend',
      friendId: 'uid-q',
      friendName: 'Alice & Bob',
    });
    expect(router.push).toHaveBeenCalledWith(
      '/chat/room?dm_channel_id=ch-q&friend_name=Alice%20%26%20Bob'
    );
  });

  it("Test 10: synchronous variants (dmChannel, plan, group) do NOT call onLoadingChange", async () => {
    const onLoadingChange = jest.fn();
    const router = makeRouter();

    await openChat(
      router as never,
      { kind: 'dmChannel', dmChannelId: 'a', friendName: 'A' },
      { onLoadingChange }
    );
    await openChat(router as never, { kind: 'plan', planId: 'p' }, { onLoadingChange });
    await openChat(
      router as never,
      { kind: 'group', groupChannelId: 'g', friendName: 'G' },
      { onLoadingChange }
    );

    expect(onLoadingChange).not.toHaveBeenCalled();
  });
});
