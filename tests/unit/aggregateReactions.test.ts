// Unit tests for aggregateReactions.ts — run via: npx tsx tests/unit/aggregateReactions.test.ts
// Tests aggregateReactions behavior per 15-01-PLAN.md <behavior> section.
// The behavior spec is authoritative; the inline code snippet in the plan is a reference only.

import assert from 'node:assert/strict';
import { aggregateReactions } from '../../src/utils/aggregateReactions';

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

console.log("aggregateReactions");

// Plan behavior spec (authoritative):
// aggregateReactions([], 'user-1') → []
// aggregateReactions([{emoji:'❤️', user_id:'user-1'}], 'user-1') → [{emoji:'❤️', count:1, reacted_by_me:true}]
// aggregateReactions([{emoji:'❤️', user_id:'user-2'}], 'user-1') → [{emoji:'❤️', count:1, reacted_by_me:false}]
// aggregateReactions([{emoji:'❤️', user_id:'user-1'},{emoji:'❤️', user_id:'user-2'}], 'user-1') → [{emoji:'❤️', count:2, reacted_by_me:true}]
// aggregateReactions([{emoji:'❤️', user_id:'user-1'},{emoji:'😂', user_id:'user-2'}], 'user-1') → [{emoji:'❤️', count:1, reacted_by_me:true},{emoji:'😂', count:1, reacted_by_me:false}]

test('empty input returns empty array', () => {
  assert.deepEqual(aggregateReactions([], 'user-1'), []);
});

test('single reaction by current user → reacted_by_me: true', () => {
  const result = aggregateReactions([{ emoji: '❤️', user_id: 'user-1' }], 'user-1');
  assert.deepEqual(result, [{ emoji: '❤️', count: 1, reacted_by_me: true }]);
});

test('single reaction by other user → reacted_by_me: false', () => {
  const result = aggregateReactions([{ emoji: '❤️', user_id: 'user-2' }], 'user-1');
  assert.deepEqual(result, [{ emoji: '❤️', count: 1, reacted_by_me: false }]);
});

test('multiple users same emoji → count aggregated, reacted_by_me true if currentUser present', () => {
  const result = aggregateReactions(
    [
      { emoji: '❤️', user_id: 'user-1' },
      { emoji: '❤️', user_id: 'user-2' },
    ],
    'user-1',
  );
  assert.deepEqual(result, [{ emoji: '❤️', count: 2, reacted_by_me: true }]);
});

test('multiple distinct emojis → each returned independently', () => {
  const result = aggregateReactions(
    [
      { emoji: '❤️', user_id: 'user-1' },
      { emoji: '😂', user_id: 'user-2' },
    ],
    'user-1',
  );
  assert.deepEqual(result, [
    { emoji: '❤️', count: 1, reacted_by_me: true },
    { emoji: '😂', count: 1, reacted_by_me: false },
  ]);
});

test('insertion order preserved in output', () => {
  const result = aggregateReactions(
    [
      { emoji: '😂', user_id: 'user-2' },
      { emoji: '❤️', user_id: 'user-1' },
    ],
    'user-1',
  );
  assert.equal(result[0]?.emoji, '😂');
  assert.equal(result[1]?.emoji, '❤️');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
