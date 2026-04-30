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

// ---------------------------------------------------------------------------
// Photo assembly logic (D-14 shape verification)
// ---------------------------------------------------------------------------

type MinimalPhotoRow = {
  id: string;
  plan_id: string;
  uploader_id: string;
  storage_path: string;
  created_at: string;
};

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };

// Pure assembly function (mirrors the assembly logic in usePlanPhotos refetch)
function assemblePhotoWithUploader(
  row: MinimalPhotoRow,
  profile: ProfileRow | undefined,
  signedUrl: string
) {
  return {
    id: row.id,
    planId: row.plan_id,
    uploaderId: row.uploader_id,
    storagePath: row.storage_path,
    signedUrl,
    createdAt: row.created_at,
    uploader: {
      displayName: profile?.display_name ?? 'Unknown',
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

test('assemblePhotoWithUploader: uses profile displayName when profile exists', () => {
  const row: MinimalPhotoRow = { id: 'p1', plan_id: 'plan-abc', uploader_id: 'user-xyz', storage_path: 'plan-abc/user-xyz/photo.jpg', created_at: '2026-04-30T00:00:00Z' };
  const profile: ProfileRow = { id: 'user-xyz', display_name: 'Alice', avatar_url: null };
  const result = assemblePhotoWithUploader(row, profile, 'https://signed-url.example.com/photo.jpg');
  assert.strictEqual(result.uploader.displayName, 'Alice');
  assert.strictEqual(result.signedUrl, 'https://signed-url.example.com/photo.jpg');
  assert.strictEqual(result.planId, 'plan-abc');
});

test('assemblePhotoWithUploader: falls back to Unknown when profile missing', () => {
  const row: MinimalPhotoRow = { id: 'p2', plan_id: 'plan-abc', uploader_id: 'user-xyz', storage_path: 'plan-abc/user-xyz/photo2.jpg', created_at: '2026-04-30T00:01:00Z' };
  const result = assemblePhotoWithUploader(row, undefined, 'https://signed.example/2');
  assert.strictEqual(result.uploader.displayName, 'Unknown');
  assert.strictEqual(result.uploader.avatarUrl, null);
});

test('assemblePhotoWithUploader: storagePath is path string, not a URL', () => {
  const row: MinimalPhotoRow = { id: 'p3', plan_id: 'plan-abc', uploader_id: 'user-xyz', storage_path: 'plan-abc/user-xyz/photo3.jpg', created_at: '2026-04-30T00:02:00Z' };
  const result = assemblePhotoWithUploader(row, undefined, 'https://signed.example/3');
  assert.ok(!result.storagePath.startsWith('http'), 'storagePath must be a storage path, not a URL');
});

// ---------------------------------------------------------------------------
// deletePhoto precondition
// ---------------------------------------------------------------------------

function findPhotoInState(photos: Array<{ id: string; storagePath: string }>, photoId: string): { id: string; storagePath: string } | undefined {
  return photos.find((p) => p.id === photoId);
}

test('findPhotoInState: returns photo when found', () => {
  const photos = [
    { id: 'p1', storagePath: 'plan/user/p1.jpg' },
    { id: 'p2', storagePath: 'plan/user/p2.jpg' },
  ];
  const result = findPhotoInState(photos, 'p1');
  assert.ok(result !== undefined);
  assert.strictEqual(result?.storagePath, 'plan/user/p1.jpg');
});

test('findPhotoInState: returns undefined when photo not in local state', () => {
  const photos = [{ id: 'p1', storagePath: 'plan/user/p1.jpg' }];
  const result = findPhotoInState(photos, 'nonexistent');
  assert.strictEqual(result, undefined);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
