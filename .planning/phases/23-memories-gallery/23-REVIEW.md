---
phase: 23-memories-gallery
reviewed: 2026-05-01T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/hooks/useAllPlanPhotos.ts
  - src/components/home/RecentMemoriesSection.tsx
  - src/screens/home/HomeScreen.tsx
  - src/app/memories.tsx
  - src/app/(tabs)/squad.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-05-01
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files reviewed across two review passes. Pass 1 (plan 23-01 through 23-03) covered the memories hook, the home widget, HomeScreen, and the canonical memories screen. Pass 2 (plan 23-04) reviewed the squad.tsx gap-closure change that replaced the inline MemoriesTabContent with a MemoriesRedirect component and router.push navigation.

The gap-closure change in squad.tsx is architecturally correct — the duplicate MemoriesTabContent is gone, the pager geometry has been updated to 3-tab math throughout (indicator width at 33.33%, input ranges for all three tabs), and the decision to use a visible tap target rather than useEffect avoids a known animation race during horizontal pager swipes.

No new critical issues were introduced in squad.tsx. One new warning is added (WR-04: activeTab state can desync from scrollX Animated.Value when goToTab is called programmatically on tab index 1, then the user taps "Open Memories", and immediately swipes back). Existing warnings from pass 1 (WR-01 through WR-03) remain open and apply to files not touched in 23-04.

---

## Warnings

### WR-01: Silent swallowing of plan-title and profile query errors

**File:** `src/hooks/useAllPlanPhotos.ts:79-93`
**Issue:** Steps 3 (plan titles) and 4 (uploader profiles) destructure only `data`, discarding the Supabase error. A network blip or RLS denial on either query silently degrades the UI — all plans show "Unknown Plan" and all uploaders show "Unknown" with no error state set and no user feedback.
**Fix:** Destructure and check errors, mirroring the pattern used for Steps 1 and 2:
```typescript
const { data: planRows, error: planTitleError } = await supabase
  .from('plans').select('id, title').in('id', uniquePlanIds);
if (planTitleError) {
  setError(planTitleError.message);
  setIsLoading(false);
  return;
}

const { data: profiles, error: profileError } = await supabase
  .from('profiles').select('id, display_name, avatar_url').in('id', uploaderIds);
if (profileError) {
  setError(profileError.message);
  setIsLoading(false);
  return;
}
```
The `createSignedUrls` error at line 98 is also discarded and should receive the same treatment.

---

### WR-02: `activePlanId` capture risk in gallery delete handler

**File:** `src/app/memories.tsx:49, 219`
**Issue:** `activePlanId` is captured once when the viewer opens. If `viewerPhotos` ever spans multiple plans (e.g., a "show all" mode), deleting any photo would silently attempt deletion against the wrong `planId`. The delete fails silently with `'Photo not found in local state'` and no user feedback.
**Fix:** Use the photo's own `planId` field rather than the captured state:
```typescript
deletePhoto={(photoId) => {
  const photo = viewerPhotos.find((p) => p.id === photoId);
  return deletePhoto(photoId, photo?.planId ?? activePlanId);
}}
```

---

### WR-03: `section.allPhotos.indexOf(photo)` linear scan may return wrong index after refetch

**File:** `src/app/memories.tsx:192`
**Issue:** `indexOf` uses reference equality. If a background `refetch` fires while the gallery is open, `viewerPhotos` holds old object references while `section.allPhotos` holds newly constructed ones. `indexOf` returns `-1`, and `GalleryViewerModal` initialises `currentIndex` from that value — `photos[-1]` is `undefined`.
**Fix:** Track the flat index during chunking rather than recomputing it via `indexOf`. Store a `startIndex` alongside each row in `MemorySection.data` during `chunkPhotos`, or compute it by summing row lengths before the current row.

---

### WR-04: `goToTab(1)` + "Open Memories" navigation leaves pager on index 1, requiring a re-swipe to reach Activity

**File:** `src/app/(tabs)/squad.tsx:146-149, 418`
**Issue:** When a user taps the "Memories" tab header, `goToTab(1)` scrolls the pager to page 1 and sets `activeTab = 1`. The user then sees the "Open Memories" tap target. If they tap it, `router.push('/memories')` navigates away. On return (back navigation), `activeTab` remains 1 and the pager is still at page 1 — which is correct and expected.

However, if the user taps "Open Memories" and then immediately (before `router.push` completes) swipes the pager back to page 0, `activeTab` can transiently read 0 (set by `onMomentumScrollEnd`) while `scrollX` still reflects an in-flight scroll. This is a very narrow race window and unlikely to produce a visible glitch with `pagingEnabled`, but the `onMomentumScrollEnd` handler derives page index from `contentOffset.x` with `Math.round`, which is correct.

The more actionable issue is UX: a user who swipes to the Memories tab expecting the gallery to open immediately will see a static affordance ("Open Memories") and must take an extra tap. There is no auto-navigation on tab settle. This is an intentional design decision (documented in the comment on line 39) to avoid the animation race, but it means the Memories tab has a different interaction model than the Squad and Activity tabs.

**Fix (if desired):** After the pager settles (`onMomentumScrollEnd`), trigger navigation automatically when landing on page 1:
```typescript
onMomentumScrollEnd={(e) => {
  const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
  setActiveTab(page);
  if (page === 1) {
    router.push('/memories' as never);
  }
}}
```
This fires after the pager animation completes, avoiding the swipe-flash described in the comment. The current tap-target approach is acceptable if the extra tap is intentional UX.

---

## Info

### IN-01: `planTitle` caption always undefined in `RecentMemoriesSection`

**File:** `src/components/home/RecentMemoriesSection.tsx:107-131`
**Issue:** `useAllPlanPhotos` never writes `planTitle` onto photo objects. `RecentMemoriesSection` casts photos to include `planTitle?: string` but the field is always `undefined`. Every thumbnail caption and accessibility label reads `"Photo from "` (empty plan name).
**Fix:** Enrich photos with plan title when slicing `recentPhotos` in the hook:
```typescript
const assembledWithTitle = assembled.map((photo) => ({
  ...photo,
  planTitle: planTitleMap.get(photo.planId) ?? 'Unknown Plan',
}));
setRecentPhotos(assembledWithTitle.slice(0, 6));
```
Update `UseAllPlanPhotosResult` type and the `RecentMemoriesSection` cast accordingly.

---

### IN-02: `CELL_SIZE` computed at module load time in memories.tsx

**File:** `src/app/memories.tsx:23`
**Issue:** `const CELL_SIZE = (Dimensions.get('window').width - ...) / 3` is evaluated once at import time. On foldable devices or after orientation change the cell size is stale.
**Fix:** Use `useWindowDimensions()` inside the component. Low-priority if the app is portrait-locked.

---

### IN-03: `MemoriesRedirect` is an inline component defined outside the render tree — stable but undiscoverable

**File:** `src/app/(tabs)/squad.tsx:36-67`
**Issue:** `MemoriesRedirect` is defined at module scope (not inside `SquadScreen`), which is correct — defining it inside would recreate it on every render and unmount/remount the tap target on every state change. However the `onNavigate` prop is a new arrow function on every render of `SquadScreen` (`() => router.push('/memories' as never)`), which means `MemoriesRedirect` receives a new prop reference every render. Since `MemoriesRedirect` is not memoized with `React.memo`, it re-renders on every parent render. This is harmless (the component is trivial) but inconsistent with the `useMemo` pattern used for `styles`.
**Fix:** No action required — the re-renders are cheap. Optionally wrap in `React.memo` or extract `handleOpenMemories` as a stable `useCallback` if perf becomes a concern:
```typescript
const handleOpenMemories = useCallback(() => {
  router.push('/memories' as never);
}, [router]);
// ...
<MemoriesRedirect onNavigate={handleOpenMemories} />
```

---

_Reviewed: 2026-05-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
