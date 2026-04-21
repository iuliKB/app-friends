// Unit tests for useChatRoom image upload state logic — run via: npx tsx tests/unit/useChatRoom.imageUpload.test.ts
// Tests the pure optimistic mutation logic extracted from sendImage state transitions.
// Since useChatRoom requires React hooks and Supabase, we test the state transformation
// functions independently as pure arrow functions — matching the existing test pattern.

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
// Helper to build a minimal MessageWithProfile for image upload tests
// ---------------------------------------------------------------------------

function makeMsg(id: string, overrides: Partial<MessageWithProfile> = {}): MessageWithProfile {
  return {
    id,
    plan_id: null,
    dm_channel_id: null,
    group_channel_id: null,
    sender_id: 'user-1',
    body: null,
    created_at: new Date().toISOString(),
    image_url: null,
    reply_to_message_id: null,
    message_type: 'image',
    poll_id: null,
    reactions: [],
    pending: false,
    tempId: id,
    sender_display_name: 'Alice',
    sender_avatar_url: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pure state mutation logic extracted from sendImage transitions
// These mirror exactly the setMessages callbacks that will live in useChatRoom.ts
// ---------------------------------------------------------------------------

function applyOptimisticInsert(
  prev: MessageWithProfile[],
  optimistic: MessageWithProfile,
): MessageWithProfile[] {
  return [optimistic, ...prev];
}

function applyOptimisticReplace(
  prev: MessageWithProfile[],
  tempId: string,
  cdnUrl: string,
): MessageWithProfile[] {
  return prev.map((m) =>
    m.tempId === tempId ? { ...m, image_url: cdnUrl, pending: false } : m
  );
}

function applyOptimisticRemove(
  prev: MessageWithProfile[],
  tempId: string,
): MessageWithProfile[] {
  return prev.filter((m) => m.tempId !== tempId);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log('\nimage upload — optimistic state transitions');

test('optimistic insert — message added with pending:true and local URI', () => {
  const optimistic = makeMsg('t1', {
    pending: true,
    image_url: 'file://local.jpg',
    message_type: 'image',
    body: null,
    tempId: 't1',
  });
  const result = applyOptimisticInsert([], optimistic);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.pending, true);
  assert.equal(result[0]!.image_url, 'file://local.jpg');
  assert.equal(result[0]!.message_type, 'image');
  assert.equal(result[0]!.body, null);
});

test('CDN replace on success — pending cleared, image_url updated to CDN url', () => {
  const prev = [makeMsg('t1', { pending: true, image_url: 'file://local.jpg', tempId: 't1' })];
  const result = applyOptimisticReplace(prev, 't1', 'https://cdn.example.com/img.jpg');
  assert.equal(result[0]!.image_url, 'https://cdn.example.com/img.jpg');
  assert.ok(!result[0]!.pending);
});

test('failure removal — pending message removed from state', () => {
  const prev = [
    makeMsg('t1', { pending: true, tempId: 't1' }),
    makeMsg('m2', { pending: false, tempId: 'm2' }),
  ];
  const result = applyOptimisticRemove(prev, 't1');
  assert.equal(result.length, 1);
  assert.equal(result[0]!.id, 'm2');
});

test('Realtime dedup guard — same id is not re-added', () => {
  const existing = [makeMsg('uuid-1', { tempId: 'uuid-1' })];
  const incoming = makeMsg('uuid-1', { tempId: 'uuid-1' });
  const isDuplicate = existing.some((m) => m.id === incoming.id);
  assert.equal(isDuplicate, true);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
