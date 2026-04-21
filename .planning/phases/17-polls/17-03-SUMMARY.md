---
phase: 17-polls
plan: "03"
subsystem: ui
tags: [react-native, animated, polls, progress-bar, typescript]

# Dependency graph
requires:
  - phase: 17-polls
    plan: "01"
    provides: usePoll hook (PollState, PollOption types, vote/unVote mutations, lastPollVoteEvent bridge)
provides:
  - PollCard component: full-width poll card with unvoted/voted states and animated progress bars
affects: [17-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OptionRow declared before PollCard in file — avoids Animated.Value recreation on each render (no nested function component)"
    - "widthAnim.setValue(0) instant reset on un-vote; Animated.timing 300ms animate-in on vote (useNativeDriver:false required for width)"
    - "eslint-disable-next-line suppressions removed by --fix: minHeight/width/height/borderRadius/borderWidth numeric values not flagged by campfire/no-hardcoded-styles"

key-files:
  created:
    - src/components/chat/PollCard.tsx
  modified: []

key-decisions:
  - "OptionRow declared as named function component before PollCard — safe Animated.Value per instance, no re-creation on parent re-render"
  - "eslint-disable suppressions only needed in OptionRow effect dep-array (react-hooks/exhaustive-deps) — all numeric style values are not flagged by campfire/no-hardcoded-styles (same finding as Plan 02)"
  - "hasVoted derived from myVotedOptionId !== null passed as prop to OptionRow — single source of truth controls both bar visibility and instant setValue(0) reset"

# Metrics
duration: 10min
completed: 2026-04-21
---

# Phase 17 Plan 03: PollCard Component Summary

**Full-width poll card with unvoted/voted display states, Animated.timing progress bars per option, footer vote count, and null/pending guard**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-21T20:37:00Z
- **Completed:** 2026-04-21T20:47:00Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- Created `PollCard.tsx` with `OptionRow` declared before `PollCard` in file to prevent Animated.Value recreation on re-render
- Unvoted state: only radio circles (○) and option labels visible — no bars, no counts (D-07 enforced by `hasVoted` gate)
- Voted state: Animated.timing bars appear over 300ms per option, vote counts shown as integers, selected option uses COLORS.interactive.accent (D-08)
- Un-vote: `widthAnim.setValue(0)` instant reset when `hasVoted` flips back to false; card returns to unvoted display (D-13)
- Footer: "1 vote" / "N votes" plural/singular per UI-SPEC copywriting (D-09)
- Null/pending guard: `ActivityIndicator` shown when `message.poll_id` is null or `message.pending` is true (Pitfall 5)
- Loading guard: `ActivityIndicator` shown while `usePoll` loading state is true
- Accessibility: `accessibilityLabel` with vote count + selected/unselected on every option row; `accessibilityRole="button"`

## Task Commits

1. **Task 1: Build PollCard component** - `f8167e5` (feat)

## Files Created/Modified

- `src/components/chat/PollCard.tsx` — New component: PollCard with OptionRow sub-component, unvoted/voted states, animated progress bars

## Decisions Made

- `OptionRow` declared as a named function component before `PollCard` in the same file — prevents Animated.Value from being recreated on each PollCard render (each row gets a stable ref)
- `hasVoted` prop (`myVotedOptionId !== null`) passed to OptionRow as boolean — single source of truth driving both bar visibility and the `setValue(0)` instant reset
- eslint-disable suppressions for numeric style values (minHeight: 44, width/height: 20, borderRadius: 10, borderWidth: 2, height: 4) were added then removed by `npx expo lint --fix` — confirmed these are not flagged by `campfire/no-hardcoded-styles` rule (same finding as Plan 02)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused eslint-disable directives removed by linter**
- **Found during:** Task 1 lint verification
- **Issue:** Seven `eslint-disable-next-line campfire/no-hardcoded-styles` directives in StyleSheet were not needed — the rule does not flag minHeight, width, height, borderRadius, or borderWidth numeric values
- **Fix:** `npx expo lint --fix` removed all seven unused suppressions in one pass; left blank lines which are cosmetic only (no logic change); re-lint confirmed 0 errors 0 warnings
- **Files modified:** `src/components/chat/PollCard.tsx`
- **Commit:** `f8167e5` (included in task commit after fix)

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. PollCard is a pure display component — all data access is via the `usePoll` hook established in Plan 01. Vote mutations delegate to `vote()`/`unVote()` which have their own RLS enforcement at the DB layer (T-17-10, T-17-11 mitigations from Plan 01).

T-17-11 information disclosure (showing counts before vote) is enforced by `hasVoted` boolean gate in OptionRow — bars and counts only render when `myVotedOptionId !== null`, satisfying D-07.

## Known Stubs

None — PollCard is fully wired to `usePoll` and renders real poll data from Supabase. The `currentUserId` prop is accepted but not used directly (auth is handled inside `usePoll` via `useAuthStore`); this is intentional as the hook owns the auth context.

## Self-Check: PASSED

- `src/components/chat/PollCard.tsx` — FOUND
- Commit `f8167e5` — FOUND
- `npx expo lint src/components/chat/PollCard.tsx` exits 0 — CONFIRMED
