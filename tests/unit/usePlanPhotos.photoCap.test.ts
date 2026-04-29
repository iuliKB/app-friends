// Unit tests for usePlanPhotos photo cap boundary logic — run via: npx tsx tests/unit/usePlanPhotos.photoCap.test.ts
import assert from 'node:assert/strict';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (err) { console.error(`  FAIL: ${name}`); if (err instanceof Error) console.error(`    ${err.message}`); failed++; }
}

// Pure cap check logic (mirrors plpgsql: IF v_count >= 10 THEN RAISE photo_cap_exceeded)
type CapCheckResult = { allowed: boolean; error: 'photo_cap_exceeded' | null };

function checkPhotoCap(existingCount: number): CapCheckResult {
  if (existingCount >= 10) return { allowed: false, error: 'photo_cap_exceeded' };
  return { allowed: true, error: null };
}

// Pure typed error surface logic (mirrors D-15: uploadPhoto return type)
type UploadError = 'photo_cap_exceeded' | 'upload_failed' | null;

function classifyRpcError(errorCode: string | null | undefined, errorMessage: string | null | undefined): UploadError {
  if (!errorCode && !errorMessage) return null;
  if (errorCode === 'P0001') return 'photo_cap_exceeded';
  return 'upload_failed';
}

test('checkPhotoCap: 0 existing photos → allowed', () => {
  const result = checkPhotoCap(0);
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.error, null);
});

test('checkPhotoCap: 9 existing photos → allowed (boundary)', () => {
  const result = checkPhotoCap(9);
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.error, null);
});

test('checkPhotoCap: 10 existing photos → photo_cap_exceeded (boundary)', () => {
  const result = checkPhotoCap(10);
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.error, 'photo_cap_exceeded');
});

test('checkPhotoCap: 11 existing photos → photo_cap_exceeded', () => {
  const result = checkPhotoCap(11);
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.error, 'photo_cap_exceeded');
});

test('classifyRpcError: null error → null (success)', () => {
  const result = classifyRpcError(null, null);
  assert.strictEqual(result, null);
});

test('classifyRpcError: P0001 code → photo_cap_exceeded', () => {
  const result = classifyRpcError('P0001', 'photo_cap_exceeded');
  assert.strictEqual(result, 'photo_cap_exceeded');
});

test('classifyRpcError: other error code → upload_failed', () => {
  const result = classifyRpcError('42501', 'permission denied');
  assert.strictEqual(result, 'upload_failed');
});

test('classifyRpcError: generic error (no code) → upload_failed', () => {
  const result = classifyRpcError(undefined, 'network error');
  assert.strictEqual(result, 'upload_failed');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
