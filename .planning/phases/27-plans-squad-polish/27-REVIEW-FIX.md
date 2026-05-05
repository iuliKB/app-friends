---
phase: 27-plans-squad-polish
fixed_at: 2026-05-06T00:00:00Z
review_path: .planning/phases/27-plans-squad-polish/27-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 27: Code Review Fix Report

**Fixed at:** 2026-05-06
**Source review:** .planning/phases/27-plans-squad-polish/27-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 3
- Skipped: 1

## Fixed Issues

### WR-04: `getDefaultTitle` returns wrong value

**Files modified:** `src/screens/plans/PlanCreateModal.tsx`
**Commit:** 23e47ca
**Applied fix:** Inverted the condition from `hour < 18` to `hour >= 18` so that evening hours (18:00+) correctly return `'Tonight'` and earlier hours return `'Tomorrow'`.

---

### WR-02: `handleDecline` does not call `fetchPlans` — invitation count stays stale after decline

**Files modified:** `src/screens/plans/PlansListScreen.tsx`
**Commit:** 9d1c1ce
**Applied fix:** Added `await fetchPlans()` inside `handleDecline` after a successful decline, mirroring the pattern already used in `handleAccept`. This keeps the plans list in sync with the invitation state after a decline.

---

### WR-03: `useExpenseDetail` — `settle` callback captures stale `detail` ref

**Files modified:** `src/hooks/useExpenseDetail.ts`
**Commit:** d5de0cf
**Applied fix:** Changed the early-exit guard from `if (!userId || !detail) return` to `if (!userId || !expenseId) return` (all in-body state mutations already use functional `setDetail(prev => ...)` so `detail` was only needed for the null guard). Removed `detail` from the `useCallback` dependency array, leaving `[userId, expenseId, refetch]`.

---

## Skipped Issues

### WR-01: `handleCreate` navigates away before cover upload completes

**File:** `src/screens/plans/PlanCreateModal.tsx:148-169`
**Reason:** code context differs from review — the navigation calls (`router.back()` / `router.push()`) are already positioned after the cover upload block in the current source. Lines 168-169 follow the upload block at lines 148-166, so the race condition described by the reviewer does not exist in the current code state. No change needed.
**Original issue:** `router.back()` and `router.push(...)` were called before the cover image upload block resolved, so the loading state never surfaced and the store could be stale.

---

_Fixed: 2026-05-06_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
