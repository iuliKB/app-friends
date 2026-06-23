---
phase: 260623-sb3
plan: 01
subsystem: birthdays
tags: [ui, calendar, gestures, list-redesign, quick-task]
dependency-graph:
  requires:
    - "react-native-gesture-handler (Gesture.Pan, GestureDetector) — pattern matches FriendSwipeCard"
    - "@/theme (RADII, SPACING, FONT_SIZE, FONT_FAMILY, colors.interactive.accent)"
  provides:
    - "Rounder, accent-tinted BirthdayCalendar card"
    - "Swipe-left/right month & week navigation, additive to existing chevrons"
    - "Date-badge BirthdayRow layout with single (non-duplicated) days-until pill"
  affects:
    - "src/components/birthdays/BirthdayCalendar.tsx"
    - "src/app/squad/birthdays.tsx"
tech-stack:
  added: []
  patterns:
    - "Gesture.Pan with activeOffsetX/failOffsetY (matches FriendSwipeCard) to avoid fighting vertical FlatList scroll"
key-files:
  modified:
    - "src/components/birthdays/BirthdayCalendar.tsx"
    - "src/app/squad/birthdays.tsx"
decisions:
  - "Card radius: RADII.lg -> RADII.xl"
  - "Calendar container background: colors.surface.base -> 8% opacity accent tint (ACCENT_TINT_BG), mirrors existing TODAY_BG rgba pattern"
  - "Swipe nav implemented with GestureDetector wrapping the grid/week-strip; calls the same onPrevMonth/onNextMonth/onPrevWeek/onNextWeek handlers already wired from BirthdaysScreen. Chevron buttons kept as-is, fully functional fallback"
  - "BirthdayRow redesigned: leading accent-filled date badge (month abbrev + day) replaces avatar-first layout; avatar shrunk 40->36 and wrapped in a View (AvatarCircle has no style prop); trailing plain days-until text replaced with a pill chip, accent-tinted when isToday"
  - "Fixed the duplicate 'In N days' bug: combinedLabel no longer includes daysLabel — it now appears exactly once, in the trailing pill"
metrics:
  duration_minutes: ~12
  completed_at: "2026-06-23T17:35:11Z"
---

# Quick Task 260623-sb3: Improve birthday screen UI — Summary

**One-liner:** Rounded and accent-tinted the calendar card, added swipe-gesture month/week navigation alongside the existing chevrons, fixed the duplicated "in X days" text, and redesigned `BirthdayRow` to lead with a date badge instead of the avatar.

## What was built

1. **Rounder + accent-tinted calendar card** (`BirthdayCalendar.tsx`) — `card.borderRadius` bumped from `RADII.lg` (12) to `RADII.xl` (16); `container.backgroundColor` changed from `colors.surface.base` to a new `ACCENT_TINT_BG` constant (8% opacity accent), following the same hardcoded-rgba convention as the existing `TODAY_BG` in `birthdays.tsx`.

2. **Swipe gesture navigation** (`BirthdayCalendar.tsx`) — Wrapped the month grid / week strip in a `GestureDetector` using `Gesture.Pan()` with `activeOffsetX`/`failOffsetY` tuned to match `FriendSwipeCard`'s existing pattern, so horizontal swipes don't fight the screen's vertical `FlatList` scroll. Swipe left → next month/week, swipe right → previous, calling the same `onPrevMonth`/`onNextMonth`/`onPrevWeek`/`onNextWeek` handlers already passed down from `BirthdaysScreen`. The chevron buttons are unchanged and remain fully functional as a fallback/accessible affordance.

3. **Fixed duplicate "in X days" bug + date-badge row redesign** (`birthdays.tsx`) — `combinedLabel` no longer includes `daysLabel` (previously duplicated: once in the middle subtitle, once trailing). `BirthdayRow` now leads with an accent-filled date badge (month abbreviation + day number) instead of the avatar; the avatar shrank from 40px to 36px and is wrapped in a `View` (since `AvatarCircle` has no `style` prop to size/position it directly). The trailing plain days-until `Text` was replaced with a `daysPill` chip, accent-tinted when `isToday`. `BirthdayRowStyles` interface updated accordingly (removed `rowDays`/`rowDaysToday`, added `dateBadge`/`daysPill` fields).

4. **Lint follow-up fix** — removed a stale `eslint-disable` comment that was no longer needed on `dateBadge`'s width/height, and added a needed one on the new `daysPillToday` rgba accent tint (no theme token exists for it, matching the project's existing convention for ad-hoc tint colors).

## Commits

| Task | Commit  | Subject                                                                          | Files |
| ---- | ------- | --------------------------------------------------------------------------------- | ----- |
| 1    | 7f770e2 | `feat(quick-260623-sb3): round calendar card and add accent-tinted background`    | 1     |
| 2    | 3a0de62 | `feat(quick-260623-sb3): add swipe gesture navigation to birthday calendar`       | 1     |
| 3    | 629bca8 | `fix(quick-260623-sb3): fix duplicate days-until and redesign BirthdayRow with date badge` | 1     |
| —    | a104970 | `fix(quick-260623-sb3): fix lint violations in new BirthdayRow styles`            | 1     |

## Verification

- `npx tsc --noEmit` — clean on both modified files.
- `npx expo lint` — clean on both modified files (after the follow-up lint commit).
- All plan-specified grep checks (card radius, swipe gesture wiring, single days-until occurrence, date badge presence) passed per executor report.

## Deviations from Plan

**1. [Rule 3 — Blocking] `AvatarCircle` has no `style` prop**

- **Found during:** Task 3 (BirthdayRow redesign)
- **Issue:** Plan described passing a `style` prop to `AvatarCircle` to shrink/position it; the component doesn't accept one.
- **Fix:** Wrapped `AvatarCircle` in a `View` with `marginLeft` instead.
- **Files modified:** `src/app/squad/birthdays.tsx`
- **Commit:** Folded into `629bca8`.

**2. [Rule 1 — Bug] Lint violations in new styles**

- **Found during:** Post-Task-3 lint pass
- **Issue:** An `eslint-disable-line` left over on `dateBadge`'s width/height was no longer triggering (not flagged), and the new `daysPillToday` rgba accent tint was an unflagged hardcoded-style violation.
- **Fix:** Removed the stale disable comment; added a new one on `daysPillToday` matching the project's existing convention for untokenized tint colors.
- **Files modified:** `src/app/squad/birthdays.tsx`
- **Commit:** `a104970` (separate follow-up commit).

## Note on reconstruction

This SUMMARY.md was reconstructed by the orchestrator after the original (uncommitted, worktree-local) copy was lost during worktree cleanup (`git worktree remove --force` ran before the file's contents were checked). Content here is derived from the 4 commits now on `main` and the executor agent's final report — accurate as to what was built, but not a byte-for-byte copy of the original.
