// Unit tests for useChatRoom reaction logic — run via: npx tsx tests/unit/useChatRoom.reactions.test.ts
// Tests the pure optimistic mutation logic extracted from addReaction and removeReaction.
// Since useChatRoom requires React hooks and Supabase, we test the state transformation
// functions independently as pure arrow functions — matching the existing test pattern.

import assert from 'node:assert/strict';
import type { MessageReaction, MessageWithProfile } from '../../src/types/chat';

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
// Pure state mutation logic extracted from addReaction / removeReaction
// These mirror exactly the setMessages callbacks in useChatRoom.ts
// ---------------------------------------------------------------------------

function applyAddReaction(
  messages: MessageWithProfile[],
  messageId: string,
  emoji: string,
): MessageWithProfile[] {
  return messages.map((m) => {
    if (m.id !== messageId) return m;
    const existing = m.reactions ?? [];
    // Remove previous reaction by this user (one-emoji-per-user — D-03)
    const withoutOld = existing
      .map((r) =>
        r.reacted_by_me ? { ...r, count: r.count - 1, reacted_by_me: false } : r
      )
      .filter((r) => r.count > 0);
    // Add or increment new emoji
    const idx = withoutOld.findIndex((r) => r.emoji === emoji);
    if (idx >= 0) {
      const updated = [...withoutOld];
      updated[idx] = { ...updated[idx]!, count: updated[idx]!.count + 1, reacted_by_me: true };
      return { ...m, reactions: updated };
    }
    return { ...m, reactions: [...withoutOld, { emoji, count: 1, reacted_by_me: true }] };
  });
}

function applyRemoveReaction(
  messages: MessageWithProfile[],
  messageId: string,
  emoji: string,
): MessageWithProfile[] {
  return messages.map((m) => {
    if (m.id !== messageId) return m;
    const updated = (m.reactions ?? [])
      .map((r) =>
        r.emoji === emoji ? { ...r, count: r.count - 1, reacted_by_me: false } : r
      )
      .filter((r) => r.count > 0);
    return { ...m, reactions: updated };
  });
}

function applyRollback(
  messages: MessageWithProfile[],
  messageId: string,
  snapshot: MessageReaction[],
): MessageWithProfile[] {
  return messages.map((m) => (m.id === messageId ? { ...m, reactions: snapshot } : m));
}

// Helper to build a minimal MessageWithProfile
function makeMsg(id: string, reactions: MessageReaction[] = []): MessageWithProfile {
  return {
    id,
    plan_id: null,
    dm_channel_id: null,
    group_channel_id: null,
    sender_id: 'user-1',
    body: 'hello',
    created_at: new Date().toISOString(),
    image_url: null,
    reply_to_message_id: null,
    message_type: 'text',
    poll_id: null,
    reactions,
    sender_display_name: 'Alice',
    sender_avatar_url: null,
  };
}

// ---------------------------------------------------------------------------
// Tests for addReaction optimistic update
// ---------------------------------------------------------------------------

console.log('\naddReaction — optimistic update');

test('adds new emoji pill when no reactions exist', () => {
  const msgs = [makeMsg('msg-1', [])];
  const result = applyAddReaction(msgs, 'msg-1', '❤️');
  const reactions = result[0]!.reactions!;
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0]!.emoji, '❤️');
  assert.equal(reactions[0]!.count, 1);
  assert.equal(reactions[0]!.reacted_by_me, true);
});

test('increments count on existing emoji pill from another user', () => {
  const msgs = [makeMsg('msg-1', [{ emoji: '❤️', count: 2, reacted_by_me: false }])];
  const result = applyAddReaction(msgs, 'msg-1', '❤️');
  const reactions = result[0]!.reactions!;
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0]!.count, 3);
  assert.equal(reactions[0]!.reacted_by_me, true);
});

test('removes old reaction and adds new one (one-emoji-per-user rule)', () => {
  // User already reacted with ❤️ (reacted_by_me=true), now taps 😂
  const msgs = [makeMsg('msg-1', [{ emoji: '❤️', count: 1, reacted_by_me: true }])];
  const result = applyAddReaction(msgs, 'msg-1', '😂');
  const reactions = result[0]!.reactions!;
  // ❤️ count went to 0 so it was removed; 😂 added
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0]!.emoji, '😂');
  assert.equal(reactions[0]!.count, 1);
  assert.equal(reactions[0]!.reacted_by_me, true);
});

test('does not modify other messages', () => {
  const msgs = [makeMsg('msg-1', []), makeMsg('msg-2', [{ emoji: '👍', count: 1, reacted_by_me: false }])];
  const result = applyAddReaction(msgs, 'msg-1', '❤️');
  // msg-2 should be untouched
  assert.deepEqual(result[1]!.reactions, [{ emoji: '👍', count: 1, reacted_by_me: false }]);
});

// ---------------------------------------------------------------------------
// Tests for removeReaction optimistic update
// ---------------------------------------------------------------------------

console.log('\nremoveReaction — optimistic update');

test('decrements count and removes pill when count reaches 0', () => {
  const msgs = [makeMsg('msg-1', [{ emoji: '❤️', count: 1, reacted_by_me: true }])];
  const result = applyRemoveReaction(msgs, 'msg-1', '❤️');
  const reactions = result[0]!.reactions!;
  // count was 1 → 0 → filtered out
  assert.equal(reactions.length, 0);
});

test('decrements count but keeps pill when others still have the reaction', () => {
  const msgs = [makeMsg('msg-1', [{ emoji: '❤️', count: 3, reacted_by_me: true }])];
  const result = applyRemoveReaction(msgs, 'msg-1', '❤️');
  const reactions = result[0]!.reactions!;
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0]!.count, 2);
  assert.equal(reactions[0]!.reacted_by_me, false);
});

test('does not affect other emoji pills', () => {
  const msgs = [makeMsg('msg-1', [
    { emoji: '❤️', count: 1, reacted_by_me: true },
    { emoji: '😂', count: 2, reacted_by_me: false },
  ])];
  const result = applyRemoveReaction(msgs, 'msg-1', '❤️');
  const reactions = result[0]!.reactions!;
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0]!.emoji, '😂');
  assert.equal(reactions[0]!.count, 2);
});

// ---------------------------------------------------------------------------
// Tests for rollback on DB error
// ---------------------------------------------------------------------------

console.log('\nrollback — on DB error');

test('addReaction rollback restores pre-tap snapshot', () => {
  const snapshot: MessageReaction[] = [{ emoji: '❤️', count: 1, reacted_by_me: false }];
  // Simulate state after optimistic add (😂 was added)
  const msgsAfterOptimistic = [makeMsg('msg-1', [
    { emoji: '❤️', count: 1, reacted_by_me: false },
    { emoji: '😂', count: 1, reacted_by_me: true },
  ])];
  const rolled = applyRollback(msgsAfterOptimistic, 'msg-1', snapshot);
  assert.deepEqual(rolled[0]!.reactions, snapshot);
});

test('removeReaction rollback restores pre-tap snapshot', () => {
  const snapshot: MessageReaction[] = [{ emoji: '❤️', count: 1, reacted_by_me: true }];
  // Simulate state after optimistic remove (pill removed)
  const msgsAfterOptimistic = [makeMsg('msg-1', [])];
  const rolled = applyRollback(msgsAfterOptimistic, 'msg-1', snapshot);
  assert.deepEqual(rolled[0]!.reactions, snapshot);
});

// ---------------------------------------------------------------------------
// Realtime handler dedup guard tests (own-user guard — Pitfall 1 & 2)
// ---------------------------------------------------------------------------

console.log('\nRealtime dedup guard');

// handleReactionInsert skips own user_id
function handleReactionInsertGuard(
  payload: { new: { user_id: string; message_id: string; emoji: string } },
  currentUserId: string,
  messages: MessageWithProfile[],
): MessageWithProfile[] {
  const raw = payload.new;
  // Pitfall 1 dedup: own INSERT already applied via optimistic update
  if (raw.user_id === currentUserId) return messages;

  return messages.map((m) => {
    if (m.id !== raw.message_id) return m;
    const reactions = m.reactions ?? [];
    const existingIdx = reactions.findIndex((r) => r.emoji === raw.emoji);
    if (existingIdx >= 0) {
      const updated = reactions.map((r, i) =>
        i === existingIdx ? { ...r, count: r.count + 1 } : r
      );
      return { ...m, reactions: updated };
    }
    return { ...m, reactions: [...reactions, { emoji: raw.emoji, count: 1, reacted_by_me: false }] };
  });
}

test('handleReactionInsert skips event when user_id === currentUserId (own event dedup)', () => {
  const msgs = [makeMsg('msg-1', [])];
  const result = handleReactionInsertGuard(
    { new: { user_id: 'current-user', message_id: 'msg-1', emoji: '❤️' } },
    'current-user',
    msgs,
  );
  // State unchanged — own event skipped
  assert.equal(result[0]!.reactions!.length, 0);
});

test('handleReactionInsert processes event from other user', () => {
  const msgs = [makeMsg('msg-1', [])];
  const result = handleReactionInsertGuard(
    { new: { user_id: 'other-user', message_id: 'msg-1', emoji: '❤️' } },
    'current-user',
    msgs,
  );
  assert.equal(result[0]!.reactions!.length, 1);
  assert.equal(result[0]!.reactions![0]!.emoji, '❤️');
});

test('handleReactionInsert skips event for message not in current room', () => {
  const msgs = [makeMsg('msg-1', [])];
  const result = handleReactionInsertGuard(
    { new: { user_id: 'other-user', message_id: 'msg-999', emoji: '❤️' } },
    'current-user',
    msgs,
  );
  // msg-999 not in state — unchanged
  assert.equal(result[0]!.reactions!.length, 0);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
