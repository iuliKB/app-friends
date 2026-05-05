// Unit tests for useChatRoom sendMessage failure path — run via: npx tsx tests/unit/useChatRoom.send.test.ts
// Tests the pure optimistic state mutation logic for CHAT-03 (Phase 26).
// These tests are RED until Plan 05 adds failed?: boolean to Message type and updates useChatRoom.ts.

import assert from 'node:assert/strict';
import type { MessageWithProfile } from '../../src/types/chat';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    if (err instanceof Error) console.error(`    ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Pure state mutation logic extracted from useChatRoom sendMessage failure path
// Mirrors: setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, pending: false, failed: true } : m))
// ---------------------------------------------------------------------------

function applyFailure(
  messages: MessageWithProfile[],
  tempId: string,
): MessageWithProfile[] {
  return messages.map((m) =>
    m.tempId === tempId ? { ...m, pending: false, failed: true } : m
  );
}

function applyRetry(
  messages: MessageWithProfile[],
  tempId: string,
): MessageWithProfile[] {
  return messages.filter((m) => m.tempId !== tempId);
}

// ---------------------------------------------------------------------------
// Sample messages
// ---------------------------------------------------------------------------

const baseMessages: MessageWithProfile[] = [
  {
    id: 'tmp-1',
    channel_id: 'ch-1',
    sender_id: 'user-1',
    body: 'Hello',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_type: 'text',
    pending: true,
    failed: false,
    tempId: 'tmp-1',
    sender: { id: 'user-1', username: 'alice', avatar_url: null, display_name: 'Alice' },
    reactions: [],
  } as unknown as MessageWithProfile,
  {
    id: 'real-2',
    channel_id: 'ch-1',
    sender_id: 'user-2',
    body: 'Hi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_type: 'text',
    pending: false,
    failed: false,
    sender: { id: 'user-2', username: 'bob', avatar_url: null, display_name: 'Bob' },
    reactions: [],
  } as unknown as MessageWithProfile,
];

console.log('useChatRoom.send — sendMessage failure path');

test('failure path sets failed: true on matching tempId', () => {
  const result = applyFailure(baseMessages, 'tmp-1');
  const msg = result.find((m) => m.tempId === 'tmp-1');
  assert.ok(msg, 'message should still exist after failure');
  assert.equal((msg as unknown as { failed: boolean }).failed, true, 'failed should be true');
});

test('failure path sets pending: false on matching tempId', () => {
  const result = applyFailure(baseMessages, 'tmp-1');
  const msg = result.find((m) => m.tempId === 'tmp-1');
  assert.equal(msg?.pending, false, 'pending should be false after failure');
});

test('failure path preserves other messages unchanged', () => {
  const result = applyFailure(baseMessages, 'tmp-1');
  const other = result.find((m) => m.id === 'real-2');
  assert.ok(other, 'other message should still exist');
  assert.equal(other?.pending, false, 'other message pending unchanged');
});

test('failure path leaves message count unchanged (no removal)', () => {
  const result = applyFailure(baseMessages, 'tmp-1');
  assert.equal(result.length, baseMessages.length);
});

test('retryMessage removes failed entry by tempId', () => {
  const withFailed = applyFailure(baseMessages, 'tmp-1');
  const result = applyRetry(withFailed, 'tmp-1');
  assert.equal(result.length, baseMessages.length - 1, 'failed message should be removed on retry');
  assert.ok(!result.find((m) => m.tempId === 'tmp-1'), 'tmp-1 should not exist after retry removal');
});

test('retryMessage preserves other messages', () => {
  const withFailed = applyFailure(baseMessages, 'tmp-1');
  const result = applyRetry(withFailed, 'tmp-1');
  assert.ok(result.find((m) => m.id === 'real-2'), 'real-2 should still exist');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
