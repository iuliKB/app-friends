---
phase: 33-friend-profile-redesign
fixed_at: 2026-05-13T21:05:00Z
review_path: .planning/phases/33-friend-profile-redesign/33-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 33: Code Review Fix Report

**Fixed at:** 2026-05-13T21:05:00Z
**Source review:** `.planning/phases/33-friend-profile-redesign/33-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01, WR-02, WR-03, WR-04)
- Fixed: 4
- Skipped: 0
- Test status after each fix: `54 suites / 297 tests passing` (no regressions)

The 7 Info findings (IN-01 through IN-07) were out of scope for this run
(`fix_scope: critical_warning`) and remain open in `33-REVIEW.md`.

## Fixed Issues

### WR-04: `BioRow` off-by-one — exactly-3-line bios wrongly marked as overflowing

**Files modified:** `src/components/friends/BioRow.tsx`
**Commit:** `6f8c089`
**Applied fix:** Changed the overflow predicate in `handleTextLayout` from
`>= BIO_COLLAPSED_LINES` to `> BIO_COLLAPSED_LINES`. A bio whose natural line
count equals the collapsed limit (3) fits without truncation and must not
become a no-op `Pressable`. Added a 3-line comment pointing at REVIEW WR-04 so
future readers understand the boundary. Verified with the full jest suite
(297 tests pass).

### WR-01: Mute toggle race — concurrent presses can fire duplicate RPCs

**Files modified:** `src/app/friends/[id].tsx`
**Commit:** `39c4e8f`
**Applied fix:**
- Imported `useRef` alongside `useMemo`/`useState`.
- Added `muteInFlightRef = useRef(false)` next to the existing
  `mutingInFlight` state.
- Extended the early-return guard at the top of `handleToggleMute` to also
  check `muteInFlightRef.current`, so a second tap within the same JS tick
  exits immediately before any RPC fires.
- Flip the ref to `true` synchronously (before `setMutingInFlight`) and reset
  it inside the existing `finally` block so it stays in sync with the
  rendered disabled state.
- Removed the redundant `setMutingInFlight(false)` inside the early-return
  branch (the `finally` block now resets both the ref and the state, so the
  early branch can `return` cleanly without leaking either flag).

The ref provides synchronous re-entry blocking that React state cannot,
because state writes only apply on the next render — exactly the window the
race exploited.

### WR-03: `supabase.from('chat_preferences').upsert(...)` error silently dropped

**Files modified:** `src/app/friends/[id].tsx`
**Commit:** `481269d`
**Applied fix:** Destructured the upsert result and re-threw on error:

```tsx
const { error: upsertError } = await supabase.from('chat_preferences').upsert(
  { /* ... */ },
  { onConflict: 'user_id,chat_type,chat_id' },
);
if (upsertError) throw upsertError;
```

This matches the pattern used by `removeMutation.mutationFn` higher in the
same file. Verified with the full jest suite (297 pass).

### WR-02: Mute optimistic cache flip never rolled back on failure

**Files modified:** `src/app/friends/[id].tsx`
**Commit:** `48ea5c4`
**Applied fix:**
- Extracted `prefsKey = queryKeys.chat.preferences(resolvedChannelId)` into a
  local so the snapshot, optimistic write, rollback, and invalidate all
  reference the same key (avoids drift).
- Snapshot `prevPrefs = queryClient.getQueryData(prefsKey)` **before** the
  optimistic `setQueryData`.
- Wrapped the upsert + error check in an inner `try/catch`. The `catch`
  branch restores `prefsKey` to `prevPrefs`, shows
  `Alert.alert('Error', "Couldn't update mute setting. Try again.")`, and
  returns early so the success-path `invalidateQueries` calls do not run on
  failure.
- The outer `try/finally` continues to reset `muteInFlightRef.current` and
  `mutingInFlight`, so both guards are released whether the upsert succeeds
  or fails.

The result matches the Pattern 5 contract used by `useUpdateMyBio` and the
in-file `removeMutation` (optimistic flip → rollback on error → user-visible
alert → invalidate on settle).

**Reviewer note (carried forward):** REVIEW.md suggested as a follow-up that
the mute toggle be promoted to its own Pattern 5 `useMutation` hook so it
automatically satisfies the `mutationShape` gate. That refactor is left out
of this fix pass because it expands beyond the warning's scope, but it
remains a sensible cleanup for a future phase.

## Skipped Issues

None.

## Verification

After each commit, `npx jest --silent` was run to ensure no regression:

| Step      | Commit    | Suites passing | Tests passing |
|-----------|-----------|----------------|---------------|
| baseline  | -         | 54 / 54        | 297 / 297     |
| WR-04     | `6f8c089` | 54 / 54        | 297 / 297     |
| WR-01     | `39c4e8f` | 54 / 54        | 297 / 297     |
| WR-03     | `481269d` | 54 / 54        | 297 / 297     |
| WR-02     | `48ea5c4` | 54 / 54        | 297 / 297     |

`npx tsc --noEmit` was also run after the final mute-toggle change and
reported no errors on either modified file
(`src/app/friends/[id].tsx`, `src/components/friends/BioRow.tsx`).

WR-01 and WR-02 involve runtime semantics (race window between two taps;
recovery from a failing upsert) that are not exercised by the existing
jest suites. The Info-tier `mutationShape` regression gate already passes
because the change preserves the canonical Pattern 5 shape (snapshot,
optimistic flip, rollback, settle-invalidate). The remaining concurrency
and failure-path verification should be confirmed during the Phase 5
hardware verification gate.

---

_Fixed: 2026-05-13T21:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
