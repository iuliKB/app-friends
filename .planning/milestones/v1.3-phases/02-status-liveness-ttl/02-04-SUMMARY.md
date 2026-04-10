---
phase: 02-status-liveness-ttl
plan: 04
subsystem: client-hooks
tags: [hooks, zustand, supabase, heartbeat, ttl, appstate, debounce]

# Dependency graph
requires:
  - phase: 02-status-liveness-ttl
    provides: "Plan 02 applied live schema: statuses.status_expires_at, statuses.last_active_at, public.effective_status view"
  - phase: 02-status-liveness-ttl
    provides: "Plan 03 primitives: useStatusStore, computeHeartbeatState, computeWindowExpiry, WindowId/CurrentStatus/HeartbeatState types"
provides:
  - "useStatus hook with heartbeat-aware shape: currentStatus, loading, saving, heartbeatState, setStatus, touch"
  - "Back-compat shims (status, contextTag, updateStatus, updateContextTag) so HomeScreen + profile keep building until Plan 06"
  - "Module-scope auth-signout listener clearing useStatusStore (T-02-16)"
  - "Module-scope 60s touch debounce (T-02-15, D-34)"
  - "Tabs AppState effect now calls touch() on cold launch + every foreground transition via the single existing listener (HEART-02, OVR-04)"
  - "Database type updates: statuses.status_expires_at, statuses.last_active_at, public.effective_status view"
affects:
  - 02-status-liveness-ttl/02-05 (MoodPicker + ReEngagementBanner now consume real useStatus shape — no more stub error path)
  - 02-status-liveness-ttl/02-06 (call-site rewrite in HomeScreen + profile; will delete back-compat shims)
  - 03-expiry-push (reads effective_status via the same type)
  - 04-morning-spark (reads effective_status via the same type)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-scope ref for debouncing hook-driven side-effects that must outlive renders (lastTouchAt)"
    - "Module-scope useAuthStore.subscribe for session-loss side-effects installed exactly once per JS module load (installAuthListenerOnce)"
    - "Hand-patching src/types/database.ts after migration deployment — standard practice until supabase gen types is re-run"

key-files:
  created:
    - .planning/phases/02-status-liveness-ttl/02-04-SUMMARY.md
  modified:
    - src/hooks/useStatus.ts
    - src/app/(tabs)/_layout.tsx
    - src/types/database.ts

key-decisions:
  - "Used useState (loading, saving) instead of useRef from the plan draft — refs do not trigger re-renders, so consumers watching the back-compat saving flag would never see the disabled state flip. useState preserves the v1.0 UX contract for profile.tsx (handleTagChange passes savingTag state through)."
  - "Hand-patched src/types/database.ts to reflect live migration 0009 (statuses columns + effective_status view) instead of regenerating with `supabase gen types` — kept within the worktree to avoid touching the supabase CLI dependency path, and mirrors the live schema exactly per 02-02-SUMMARY Q1/Q6 attestation."
  - "Back-compat shim for updateContextTag keeps the v1.0 EmojiTag signature so profile.tsx handleTagChange(emoji: EmojiTag) compiles unchanged — type cast currentStatus.context_tag back to EmojiTag for reads."

requirements-completed: [HEART-02]

# Metrics
duration: ~15min
completed: 2026-04-08
status: COMPLETE
---

# Phase 02 Plan 04: Rewrite useStatus Hook + Wire touch() Summary

**Replaces the pre-Phase-2 useStatus hook with a heartbeat-aware implementation that reads the effective_status view, writes the statuses table via window-scoped upserts, debounces touch() to 60s, syncs cross-screen state through useStatusStore, and wires cold-launch + foreground touch() through the single existing tabs-layout AppState listener — lands HEART-02 and unblocks Phase 2 Plans 05/06.**

## Status

**COMPLETE — all 2 tasks executed and verified.**

## Performance

- **Tasks:** 2 of 2
- **Commits:** 2 (one per task)
- **Files modified:** 3 (useStatus.ts, _layout.tsx, database.ts)
- **tsc:** clean project-wide
- **eslint:** clean on all touched files (max-warnings 0)

## Accomplishments

### Task 1 — Rewrite src/hooks/useStatus.ts (commit 59e966a)

- Hydrates `currentStatus` from `public.effective_status` view on session change (OVR-03, D-16).
- `setStatus(mood, tag, windowId)` upserts a single row into `public.statuses` with `status`, `context_tag`, `status_expires_at` (via `computeWindowExpiry`), and `last_active_at = now()` (D-33). On success, also calls `markPushPromptEligible` (PUSH-08) and resets the touch debounce.
- `touch()` updates `last_active_at` only, short-circuits if less than 60s since the last successful write via module-scope `lastTouchAt` (D-34, T-02-15 mitigation).
- `heartbeatState` memoized via `computeHeartbeatState` over the store's current expiry + last_active.
- Writes-through Zustand `useStatusStore` so MoodPicker on Profile reflects a commit from Home instantly (OVR-02).
- Module-scope `installAuthListenerOnce` subscribes exactly once per module load to `useAuthStore` and calls `useStatusStore.getState().clear()` when the session transitions to null, mitigating T-02-16 (cached status bleeding across sessions).
- Back-compat shims `status`, `contextTag`, `updateStatus(newStatus)`, `updateContextTag(emoji)` preserved on the return object so `src/screens/home/HomeScreen.tsx` and `src/app/(tabs)/profile.tsx` keep compiling until Plan 06 rewrites those call sites. `updateStatus` delegates to `setStatus(mood, existingTag, '3h')` (temporary 3h default); `updateContextTag` keeps the v1.0 toggle-off-if-same-emoji behavior and writes `last_active_at = now()` on the same update.
- `markPushPromptEligible` wiring preserved in both the new `setStatus` success path and the back-compat `updateContextTag` shim (PUSH-08).
- `src/types/database.ts` updated: added `status_expires_at` and `last_active_at` to `statuses.Row`/`Insert`/`Update`, and registered `public.effective_status` under `Database['public'].Views` with the five columns the view exposes (user_id, effective_status, context_tag, status_expires_at, last_active_at). This matches the live schema attested by 02-02-SUMMARY Q1/Q6.

### Task 2 — Extend tabs AppState effect (commit 3a82425)

- Added `import { useStatus } from '@/hooks/useStatus'` alongside the existing imports.
- Added `const { touch } = useStatus();` inside `TabsLayout()` near the other hook calls.
- Inside the existing `useEffect` (the one that owns the single `AppState.addEventListener`), added `touch().catch(() => {});` in two places:
  1. Immediately after the initial `registerForPushNotifications(userId).then(...)` call (cold-launch touch).
  2. Inside the `if (appState.current.match(/inactive|background/) && next === 'active')` branch, alongside the re-register call (foreground touch).
- Dependency array extended from `[userId]` to `[userId, touch]`.
- Verified file still contains exactly ONE `AppState.addEventListener` call (OVR-04 anti-duplicate rule enforced).
- PrePromptModal wiring and all `registerForPushNotifications` call sites remain unchanged.

## Verification

Automated checks all green:

```
grep -c "AppState.addEventListener" src/app/(tabs)/_layout.tsx  →  1
grep -c "touch().catch" src/app/(tabs)/_layout.tsx              →  2
grep -q "import { useStatus } from '@/hooks/useStatus'"         →  match
grep -q "const { touch } = useStatus()"                         →  match
grep -q "}, \[userId, touch\])"                                 →  match

grep -q "from('effective_status')" src/hooks/useStatus.ts       →  match
grep -q "from('statuses')" src/hooks/useStatus.ts               →  match
grep -q "TOUCH_DEBOUNCE_MS = 60_000" src/hooks/useStatus.ts     →  match
grep -q "installAuthListenerOnce" src/hooks/useStatus.ts        →  match
grep -q "useStatusStore.getState().clear()" src/hooks/useStatus.ts  →  match
grep -q "markPushPromptEligible" src/hooks/useStatus.ts         →  match
grep -q "computeWindowExpiry" src/hooks/useStatus.ts            →  match
grep -q "computeHeartbeatState" src/hooks/useStatus.ts          →  match

npx tsc --noEmit                                                →  clean (zero errors)
npx eslint src/hooks/useStatus.ts \
  "src/app/(tabs)/_layout.tsx" src/types/database.ts \
  --max-warnings 0                                              →  clean
```

Wave 2 consumer compat also verified:

- `src/components/status/MoodPicker.tsx`:33 destructures `{ currentStatus, saving, setStatus }` → all three are on the new shape. Compiles.
- `src/components/home/ReEngagementBanner.tsx`:22 destructures `{ currentStatus, heartbeatState, touch, setStatus }` → all four are on the new shape. Compiles.
- `src/screens/home/HomeScreen.tsx`:29 destructures `{ status, loading, saving, updateStatus }` → served by back-compat shims. Compiles (Plan 06 rewrites).
- `src/app/(tabs)/profile.tsx`:36 destructures `{ status, contextTag, loading, saving, updateStatus, updateContextTag }` → served by back-compat shims. Compiles (Plan 06 rewrites).

## Files Created/Modified

- `src/hooks/useStatus.ts` — complete rewrite (new heartbeat-aware shape + back-compat shims)
- `src/app/(tabs)/_layout.tsx` — AppState effect extended with useStatus.touch()
- `src/types/database.ts` — statuses columns + effective_status view registered
- `.planning/phases/02-status-liveness-ttl/02-04-PLAN.md` — copied into worktree from main
- `.planning/phases/02-status-liveness-ttl/02-04-SUMMARY.md` — this file

## Decisions Made

1. **useState vs useRef for loading/saving.** The plan draft used `useRef(true)` for `loading` and `useRef(false)` for `saving`. Refs do not trigger re-renders, so any consumer watching `saving` (e.g., profile.tsx's `handleTagChange` disables interaction while `savingTag` state is set) would never see the transition. Switched to `useState` — identical semantics for the consumer contract, and the plan's own `acceptance_criteria` only requires the property to exist on the return object.

2. **Hand-patch database.ts instead of `supabase gen types`.** Migration 0009 is live on the linked Supabase project (per 02-02-SUMMARY Q1 + Q6 attestation) but `src/types/database.ts` was last generated against migration 0001. Rather than run `supabase gen types` (which would require the supabase CLI to re-introspect the remote schema and touch unrelated generated artifacts), I added exactly the three new columns + one view the plan needs: `statuses.status_expires_at`, `statuses.last_active_at`, and `public.effective_status`. The shape matches the migration SQL exactly.

3. **updateContextTag back-compat signature.** Plan draft used `emoji: unknown`. Kept `emoji: EmojiTag` instead so the profile.tsx call site (which passes a concrete `EmojiTag`) continues to type-check cleanly without coercion. The plan's shim requirement is about runtime behavior, not the argument type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/types/database.ts` out of sync with live schema**
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** `supabase.from('effective_status')` returned `never` because the `Views` slot in `Database['public']` was typed as `Record<string, never>`. Additionally `upsert({ last_active_at: ... })` on `statuses` rejected the field because `statuses.Row/Insert/Update` did not include `status_expires_at` or `last_active_at`. Six tsc errors total.
- **Fix:** Added `status_expires_at` and `last_active_at` to `statuses.Row/Insert/Update` and registered a new `effective_status` entry under `Views`. Mirrors the migration 0009 SQL exactly. Matches the live schema per 02-02-SUMMARY Q1/Q6 attestation.
- **Files modified:** `src/types/database.ts`
- **Commit:** 59e966a (bundled with the Task 1 useStatus rewrite since the type fix is the only way Task 1 can compile)

**2. [Rule 1 - Bug] useRef for loading/saving would break consumer UX**
- **Found during:** Task 1 drafting
- **Issue:** Plan draft used `useRef` for `loading` and `saving`. Refs do not trigger re-renders — `profile.tsx` reads `saving` through a derived state (`savingTag`) in a way that expects re-renders on the saving flag flip. Would have caused silent UX regression (tag-picker not disabling while write in flight).
- **Fix:** Used `useState<boolean>` for both. No other contract change; return shape identical.
- **Files modified:** `src/hooks/useStatus.ts`
- **Commit:** 59e966a

**3. [Rule 3 - Blocking] 02-04-PLAN.md missing from worktree**
- **Found during:** Initial read-before-execute
- **Issue:** The `.planning/phases/02-status-liveness-ttl/02-04-PLAN.md` file was present in the main workdir but not in this git worktree (newly untracked file in main was not carried by `git reset --hard` to the expected base).
- **Fix:** Copied the plan file from the main working directory into the worktree before execution. No source changes.
- **Files modified:** None (planning-file copy only)

---

**Total deviations:** 3 auto-fixed (2 blocking + 1 bug-class)
**Impact on plan:** Zero scope change. All three are purely enabling fixes; the plan's acceptance criteria and success criteria are met as-written.

## Issues Encountered

None during execution after the three auto-fixes above.

## Next Phase Readiness

- **02-05 (MoodPicker + ReEngagementBanner):** Already shipped (Wave 2). Consumers now get the real hook shape instead of stubs — `setStatus` actually writes, `touch` actually debounces, `heartbeatState` actually computes, `currentStatus` actually hydrates. Ready for Plan 06 integration.
- **02-06 (call-site rewrite):** Unblocked. When that plan rewrites HomeScreen + profile to consume `currentStatus`/`setStatus` directly, it MUST delete the back-compat shims (`status`, `contextTag`, `updateStatus`, `updateContextTag`) from `useStatus.ts` and the `UseStatusResult` interface to prevent the old shape from lingering. Grep markers to locate the shim block: `"Back-compat shims"` (2 occurrences in useStatus.ts).
- **Phase 3+ (expiry push, morning spark):** Can now import `useStatus().currentStatus` directly or read `effective_status` through the newly-typed `supabase.from('effective_status')` path.

## Self-Check: PASSED

- `src/hooks/useStatus.ts` — FOUND
- `src/app/(tabs)/_layout.tsx` — FOUND
- `src/types/database.ts` — FOUND
- `.planning/phases/02-status-liveness-ttl/02-04-SUMMARY.md` — FOUND (written)
- Commit 59e966a (feat(02-04): rewrite useStatus ...) — FOUND in `git log`
- Commit 3a82425 (feat(02-04): extend tabs AppState ...) — FOUND in `git log`
- `npx tsc --noEmit` — clean
- `npx eslint` touched files `--max-warnings 0` — clean
- Single `AppState.addEventListener` in `_layout.tsx` — verified (count = 1)
- Two `touch().catch` calls in `_layout.tsx` — verified (count = 2)

---
*Phase: 02-status-liveness-ttl*
*Plan: 04*
*Status: COMPLETE*
*Completed: 2026-04-08*
