---
phase: 13-profile-rework-friend-profile
fixed_at: 2026-04-21T00:00:00Z
review_path: .planning/phases/13-profile-rework-friend-profile/13-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-04-21
**Source review:** .planning/phases/13-profile-rework-friend-profile/13-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Silent failure when avatar upload succeeds but profile DB update is never written

**Files modified:** `src/app/(tabs)/profile.tsx`
**Commit:** e3bc3a4
**Applied fix:** After obtaining `publicUrl` from storage, added a `supabase.from('profiles').update({ avatar_url: publicUrl })` call inside `uploadAvatar`. If the DB update fails, an Alert is shown to the user. The cache-busted URL (`?t=...`) is still used for the local state so the image refreshes immediately.

### WR-02: `handleAddWishItem` is not guarded against concurrent calls — double-tap submits twice

**Files modified:** `src/app/profile/wish-list.tsx`
**Commit:** a1607be
**Applied fix:** Added `addingWishItem` to the early-return guard: `if (!trimmedTitle || addingWishItem) return;`. This makes the function self-contained against concurrent invocations regardless of render timing.

### WR-03: `toggleClaim` errors are silently discarded in `useFriendWishList`

**Files modified:** `src/hooks/useFriendWishList.ts`
**Commit:** 98f0933
**Applied fix:** Destructured the `error` field from both the `.delete()` and `.insert()` Supabase calls into `opError`. Added a `console.warn('toggleClaim failed', opError)` guard so failures are surfaced rather than silently swallowed. `refetch()` still runs afterward to keep UI in sync with actual DB state.

### WR-04: `useLocalSearchParams` can return `string | string[]` — unguarded array crashes `supabase` query

**Files modified:** `src/app/friends/[id].tsx`
**Commit:** 5259115
**Applied fix:** Changed the destructure to `const params = useLocalSearchParams<{ id: string | string[] }>()` and derived `id` with `const id = Array.isArray(params.id) ? params.id[0] : params.id;`. This safely normalises the param to a string before it reaches `.eq()` or the RPC call.

---

_Fixed: 2026-04-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
