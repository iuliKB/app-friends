---
phase: 22-gallery-ui
reviewed: 2026-04-30T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/components/plans/GalleryViewerModal.tsx
  - src/screens/plans/PlanDashboardScreen.tsx
  - tests/unit/gallery.photoCap.test.ts
  - tests/visual/plan-gallery.spec.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-04-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files reviewed covering the gallery viewer modal, the plan dashboard screen with photo grid integration, a unit test for the photo-cap guard, and a visual spec stub. The implementation is solid overall — the modal's FlatList pager, save/delete flow, and per-user cap logic are all correct. Three warnings were found: a stale index reference in the viewer modal that could display a wrong photo after a deletion, a missing `isMember` guard on the Add Photo button that lets invited-only users initiate an upload, and a potential crash when the photo list is mutated while the viewer is open. Three info items cover a no-op `useMemo` dependency, permanently-skipped visual tests with hardcoded placeholder routes, and a `console.error` left in the delete path.

---

## Warnings

### WR-01: Viewer can show wrong photo after in-modal delete

**File:** `src/components/plans/GalleryViewerModal.tsx:96-104`

`confirmDelete` calls `deletePhoto(currentPhoto.id)` and then `onClose()`. In `PlanDashboardScreen`, `deletePhoto` calls `refetch()` internally which updates the `photos` array in state — but `GalleryViewerModal` is still open and has already received the old `photos` prop. `currentIndex` still points to the original index. On the next render cycle with the shortened array, `photos[currentIndex]` will either be a different photo or `undefined`. The `if (!currentPhoto) return null` guard on line 178 prevents an outright crash, but before the modal fully closes React may briefly render the wrong photo's overlay (including the wrong uploader name and delete button visibility).

This is a logic correctness issue: the delete confirmation is shown for photo A but photo B's metadata is displayed for a frame.

**Fix:** Close the modal _before_ awaiting `deletePhoto`, or capture a local snapshot of the photo id/index before the async call, so the displayed metadata cannot shift mid-operation:

```tsx
async function confirmDelete() {
  if (!currentPhoto) return;
  onClose(); // close first — viewer is gone before photos array shrinks
  const { error } = await deletePhoto(currentPhoto.id);
  if (error) {
    Alert.alert('Error', 'Could not delete photo.');
  }
  // deletePhoto calls refetch() internally; no stale index to worry about
}
```

---

### WR-02: `isMember` guard missing on "Add Photo" button in photo grid

**File:** `src/screens/plans/PlanDashboardScreen.tsx:807-818`

The Add Photo button in the `ListFooterComponent` is gated only on `ownPhotoCount < 10` (line 807). It is not gated on `isMember`. An invited-only user (`currentUserRsvp === 'invited'`) who has not yet accepted sees the button and can tap it. `pickFromLibrary`/`pickFromCamera` then call `uploadPhoto`, which attempts a full upload. The RLS-backed RPC (`add_plan_photo`) will ultimately reject it, but the upload to Storage succeeds first, wasting bandwidth and producing an orphaned storage object before the cleanup path runs.

Note: the `EmptyState` CTA _is_ correctly gated on `isMember` (line 825-826). The standalone button is not.

**Fix:**

```tsx
{ownPhotoCount < 10 && isMember && (
  <TouchableOpacity
    style={styles.addPhotoRow}
    onPress={handleAddPhoto}
    ...
  >
```

---

### WR-03: Race condition — `photos` prop snapshot vs. `currentIndex` during rapid swipe + delete

**File:** `src/components/plans/GalleryViewerModal.tsx:54`

`currentPhoto` is derived as `photos[currentIndex]` on every render. `photos` is a prop that can be updated from the parent at any time (e.g., if another user deletes a photo and the parent refetches in the background). If `photos` shrinks while the user is viewing the last photo, `currentIndex` will be out of bounds, `currentPhoto` will be `undefined`, and the modal will silently return `null` (disappearing without a close animation). This is a jarring UX break but also a latent logic error: the `FlatList` is still mounted with `initialScrollIndex` pointing to the now-gone index.

**Fix:** Clamp `currentIndex` when `photos` changes, and close gracefully if the viewed photo is no longer present:

```tsx
React.useEffect(() => {
  if (!visible) return;
  if (photos.length === 0) {
    onClose();
    return;
  }
  // clamp in case photos array shrank
  setCurrentIndex((prev) => Math.min(prev, photos.length - 1));
}, [photos, visible, onClose]);
```

---

## Info

### IN-01: `useMemo` for styles has a stale dependency — `colors` is the only real dependency

**File:** `src/components/plans/GalleryViewerModal.tsx:106-174`

The `useMemo` on line 106 lists `[colors]` as its dependency, but the styles object does not use `colors` — none of the style properties reference `colors.*`. All color values are hardcoded literals (`'#000'`, `'rgba(0,0,0,0.6)'`, `'#fff'`). The `useMemo` recomputes on every theme change but that computation is not incorrect — it just memoizes against a dependency it does not use. More importantly, the comment `// eslint-disable-next-line campfire/no-hardcoded-styles` appears six times, suggesting the colors were intentionally hardcoded as the overlay needs fixed contrast colors. The `[colors]` dependency could be removed or a comment added to make the intent explicit.

**Fix:** Either pass an empty dependency array `[]` (since none of the styles depend on `colors`) or add a comment explaining the dependency is a placeholder for future theme-aware overlay colors:

```tsx
// styles intentionally use fixed overlay colors (#000, rgba(0,0,0,0.6), #fff)
// for contrast; [colors] retained so useMemo recomputes if theme tokens expand
}, [colors]);
```

---

### IN-02: Visual spec tests are permanently skipped with a hardcoded placeholder route

**File:** `tests/visual/plan-gallery.spec.ts:19-50`

All meaningful tests in the spec use `test.skip(true, 'TODO: ...')` and navigate to `'/plans/[planId]'` — a literal bracket-templated string, not an actual plan ID. These tests will never run as-is. The `test.beforeEach` block (lines 13-15) is also empty with a comment about required setup. The one test that runs (`'spec file loads without error'`) asserts `expect(true).toBe(true)`, providing no real coverage.

This is an info item because the skips are clearly intentional stubs, but they should be tracked: if they remain skipped when the phase ships they provide false confidence that E2E coverage exists.

**Suggestion:** Replace `test.skip(true, ...)` with `test.fixme(...)` so Playwright surfaces them as "needs fixing" rather than silently skipped in CI output, and replace the `[planId]` placeholder with a note about the seeded test fixture ID to use.

---

### IN-03: `console.error` left in `usePlanPhotos` storage-cleanup path

**File:** `src/hooks/usePlanPhotos.ts:117` and `src/hooks/usePlanPhotos.ts:155`

Two `console.error` calls remain in production paths: one for orphaned-storage cleanup on upload failure (line 117) and one for storage delete failure after a DB row deletion (line 155). These are not bugs — the error handling logic around them is sound — but raw `console.error` in production React Native code shows up in device logs and Expo crash reporters, which can confuse triage. This file is not in the review scope directly but was read as a dependency; flagging it here as a light housekeeping item.

**Note:** `usePlanPhotos.ts` was read as a cross-file dependency, not listed in the review scope. This finding is informational only and does not block the phase.

---

_Reviewed: 2026-04-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
