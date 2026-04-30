// Unit tests for gallery photo cap UI logic — run via: npx tsx tests/unit/gallery.photoCap.test.ts
// Tests shouldShowAddButton and derivedIsMember pure functions extracted from PlanDashboardScreen D-13 and D-17.
import assert from 'node:assert/strict';

// Pure logic extracted from PlanDashboardScreen D-13 and D-17
function shouldShowAddButton(
  photos: Array<{ uploaderId: string }>,
  currentUserId: string
): boolean {
  return photos.filter((p) => p.uploaderId === currentUserId).length < 10;
}

function derivedIsMember(rsvp: string): boolean {
  return rsvp !== 'invited';
}

// --- shouldShowAddButton tests ---
assert.equal(shouldShowAddButton([], 'user-1'), true, 'empty gallery: show button');

const tenOwnPhotos = Array.from({ length: 10 }, () => ({ uploaderId: 'user-1' }));
assert.equal(shouldShowAddButton(tenOwnPhotos, 'user-1'), false, '10 own photos: hide button');

const nineOwn = Array.from({ length: 9 }, () => ({ uploaderId: 'user-1' }));
assert.equal(shouldShowAddButton(nineOwn, 'user-1'), true, '9 own photos: show button');

const fifteenOthers = Array.from({ length: 15 }, () => ({ uploaderId: 'user-2' }));
assert.equal(shouldShowAddButton(fifteenOthers, 'user-1'), true, 'all others: show button');

const mixedNineOwn = [
  ...Array.from({ length: 9 }, () => ({ uploaderId: 'user-1' })),
  ...Array.from({ length: 5 }, () => ({ uploaderId: 'user-2' })),
];
assert.equal(shouldShowAddButton(mixedNineOwn, 'user-1'), true, '9 own + 5 others: show button');

const mixedTenOwn = [
  ...Array.from({ length: 10 }, () => ({ uploaderId: 'user-1' })),
  ...Array.from({ length: 3 }, () => ({ uploaderId: 'user-2' })),
];
assert.equal(shouldShowAddButton(mixedTenOwn, 'user-1'), false, '10 own + 3 others: hide button');

// --- derivedIsMember tests ---
assert.equal(derivedIsMember('going'), true, 'going is member');
assert.equal(derivedIsMember('maybe'), true, 'maybe is member');
assert.equal(derivedIsMember('out'), true, 'out is member');
assert.equal(derivedIsMember('invited'), false, 'invited is not member');

console.log('gallery.photoCap: all tests passed');
