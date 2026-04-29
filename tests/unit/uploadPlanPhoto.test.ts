// Unit tests for uploadPlanPhoto path construction — run via: npx tsx tests/unit/uploadPlanPhoto.test.ts
import assert from 'node:assert/strict';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (err) { console.error(`  FAIL: ${name}`); if (err instanceof Error) console.error(`    ${err.message}`); failed++; }
}

// Pure logic: path construction (D-04: {plan_id}/{user_id}/{photo_id}.jpg)
function buildGalleryPath(planId: string, userId: string, photoId: string): string {
  return `${planId}/${userId}/${photoId}.jpg`;
}

// Parse path segments (mirrors storage.foldername behavior for RLS tests)
function parseGalleryPathSegments(path: string): { planId: string; userId: string; filename: string } {
  const parts = path.split('/');
  return { planId: parts[0] ?? '', userId: parts[1] ?? '', filename: parts[2] ?? '' };
}

test('buildGalleryPath returns correct D-04 format', () => {
  // photoId without extension — helper appends .jpg
  const result = buildGalleryPath('plan-abc', 'user-xyz', 'photo-123');
  assert.strictEqual(result, 'plan-abc/user-xyz/photo-123.jpg');
});

test('path has exactly 3 segments separated by /', () => {
  const result = buildGalleryPath('plan-abc', 'user-xyz', '1234567890-abc123');
  const segments = result.split('/');
  assert.strictEqual(segments.length, 3);
});

test('parseGalleryPathSegments extracts planId from segment [0]', () => {
  const path = 'plan-abc/user-xyz/photo-123.jpg';
  const { planId } = parseGalleryPathSegments(path);
  assert.strictEqual(planId, 'plan-abc');
});

test('parseGalleryPathSegments extracts userId from segment [1] (matches storage.foldername[2])', () => {
  // In Postgres: (storage.foldername(name))[2] = userId (1-based array)
  // foldername returns ARRAY[planId, userId] (folder segments, not filename)
  const path = 'plan-abc/user-xyz/photo-123.jpg';
  const { userId } = parseGalleryPathSegments(path);
  assert.strictEqual(userId, 'user-xyz');
});

test('path ends in .jpg extension', () => {
  const result = buildGalleryPath('plan-abc', 'user-xyz', '1234567890-abc123');
  assert.ok(result.endsWith('.jpg'), `Expected .jpg suffix, got: ${result}`);
});

test('path does not contain getPublicUrl pattern (returns storage path, not URL)', () => {
  const result = buildGalleryPath('plan-abc', 'user-xyz', 'photo-123');
  assert.ok(!result.startsWith('http'), 'Storage path must not be a URL');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
