---
phase: 07-birthday-calendar-feature
verified: 2026-04-12T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
re_verification: false
human_verification:
  - test: "Birthday list screen shows friends sorted by days_until"
    expected: "Navigating to /squad/birthdays shows a list of friends with birthdays, ordered by 'Today' first, 'Tomorrow' second, then 'In N days' ascending. Avatar, name, and date label visible per row."
    why_human: "Sort order and rendering correctness require live Supabase data and visual inspection in a running Expo app. Cannot verify row order or data accuracy programmatically."
  - test: "BirthdayCard appears in Goals tab below StreakCard"
    expected: "After tapping 'Goals' in the Squad tab switcher, a card titled 'Birthdays 🎂' is visible below the StreakCard. If friends have birthdays in the next 30 days, the count line and nearest friend row with avatar are visible. If no friends have birthdays, 'No upcoming birthdays' copy is shown."
    why_human: "Tab rendering and card visual layout require a running app and real data. The structural wiring is verified, but the rendered output needs a human eye."
  - test: "Tapping BirthdayCard navigates to birthday list screen with back button"
    expected: "Tapping the Birthdays card navigates to a new screen titled 'Birthdays' with a native back button that returns to the Squad goals tab."
    why_human: "Navigation flow and header presence depend on Expo Router's Stack mounting behaviour, which cannot be asserted from static analysis."
  - test: "Pull-to-refresh works on birthday list screen"
    expected: "Pulling down on the birthday list screen shows a refresh control and re-fetches data without error or crash."
    why_human: "Requires interactive device or Playwright run against live app."
---

# Phase 7: Birthday Calendar Feature — Verification Report

**Phase Goal:** Users can view a sorted list of friends' upcoming birthdays and the Squad dashboard shows a glanceable birthdays card
**Verified:** 2026-04-12
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Birthday list screen shows all friends who have set a birthday, sorted by days until next occurrence, with "Today", "Tomorrow", or "N days" labels | ✓ VERIFIED (code) / ? HUMAN (runtime) | `BirthdaysScreen` calls `useUpcomingBirthdays()` (RPC result is pre-sorted ASC by `days_until`); `BirthdayRow` renders `formatDaysUntil(entry.days_until)` which returns exact "Today"/"Tomorrow"/"In N days" strings. Visual sort order needs human confirmation with live data. |
| 2 | Friends with no birthday set are omitted from the list; an appropriate empty state is shown when no friends have birthdays | ✓ VERIFIED | RPC `get_upcoming_birthdays()` returns only accepted friends with BOTH `birthday_month` AND `birthday_day` set (SQL enforces this). `BirthdaysScreen` renders `EmptyState` with heading "No birthdays yet" and body "Ask your friends to add theirs!" when `entries` is empty. |
| 3 | The Squad dashboard displays an upcoming birthdays card showing the count of birthdays in the next 30 days and the name + days-remaining for the nearest one | ✓ VERIFIED (code) / ? HUMAN (runtime) | `squad.tsx` line 59: `<BirthdayCard birthdays={birthdays} />` appears after `<StreakCard>` in goals tab. `BirthdayCard` computes `countIn30Days = entries.filter(e => e.days_until <= 30).length` and renders `nearest.display_name` + `formatDaysUntil(nearest.days_until)`. Visual output needs human confirmation. |
| 4 | The birthdays card shows an empty state copy when no friends have upcoming birthdays rather than disappearing | ✓ VERIFIED | `BirthdayCard` when `isEmpty`: renders `<Text>No upcoming birthdays</Text>` inside the same `<Pressable>` container — card never conditionally unmounts. |

**Score:** 4/4 truths verified (code-level) — runtime/visual behaviors routed to human verification

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useUpcomingBirthdays.ts` | RPC wrapper returning BirthdayEntry[], loading, error, refetch | ✓ VERIFIED | Exports `useUpcomingBirthdays`, `BirthdayEntry`, `UpcomingBirthdaysData`. Calls `supabase.rpc('get_upcoming_birthdays')`. Guards with `if (!userId)`. 57 lines, substantive implementation. |
| `src/utils/birthdayFormatters.ts` | Pure formatting utilities | ✓ VERIFIED | Exports `formatDaysUntil` (0→"Today", 1→"Tomorrow", N→"In N days") and `formatBirthdayDate` using `Intl.DateTimeFormat` with year-2000 anchor. No React dependency. |
| `tests/visual/birthday-calendar.spec.ts` | Playwright tests covering BDAY-02 and BDAY-03 | ✓ VERIFIED | 5 tests in `describe("Birthday Calendar Feature — BDAY-02, BDAY-03")`. Covers card visibility, empty state, navigation, list screen, and empty list. `login()` helper present. `toHaveScreenshot` calls present. |
| `src/app/squad/_layout.tsx` | Stack navigator with dark header | ✓ VERIFIED | `export default function SquadLayout`. Includes `headerStyle: { backgroundColor: COLORS.surface.base }` and `headerTintColor: COLORS.text.primary`. Matches `friends/_layout.tsx` pattern. |
| `src/components/squad/BirthdayCard.tsx` | Pressable dashboard card | ✓ VERIFIED | Exports `BirthdayCard`. Contains "Birthdays 🎂" title, "No upcoming birthdays" empty state, `days_until <= 30` filter, `router.push('/squad/birthdays')`, `AvatarCircle`, `BirthdayCardSkeleton`. |
| `src/app/squad/birthdays.tsx` | Full birthday list screen | ✓ VERIFIED | Exports `default BirthdaysScreen` and `options = { title: 'Birthdays' }`. Uses `FlatList` (not ScrollView). `EmptyState` with "No birthdays yet". `TODAY_BG` accent highlight. `testID="birthday-row"`. `RefreshControl`. |
| `src/app/(tabs)/squad.tsx` | Goals tab with BirthdayCard wired below StreakCard | ✓ VERIFIED | Lines 12-13: imports `BirthdayCard` and `useUpcomingBirthdays`. Line 21: `const birthdays = useUpcomingBirthdays()`. Line 59: `<BirthdayCard birthdays={birthdays} />` immediately after `<StreakCard streak={streak} />` (line 58). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useUpcomingBirthdays.ts` | `supabase.rpc('get_upcoming_birthdays')` | supabase client call | ✓ WIRED | Line 41: `await supabase.rpc('get_upcoming_birthdays')` — call present, result assigned to `data`, used in `setEntries`. |
| `useUpcomingBirthdays.ts` | `useAuthStore` | userId guard | ✓ WIRED | Line 8: imported. Line 27: `const session = useAuthStore((s) => s.session)`. Line 34: `if (!userId)` guard before RPC. |
| `BirthdayCard.tsx` | `/squad/birthdays` | `router.push('/squad/birthdays')` | ✓ WIRED | Line 34: `onPress={() => router.push('/squad/birthdays' as never)}` on the `Pressable` wrapper. |
| `birthdays.tsx` | `useUpcomingBirthdays.ts` | `useUpcomingBirthdays()` hook call | ✓ WIRED | Line 11: import present. Line 20: `const { entries, loading, refetch } = useUpcomingBirthdays()`. `entries` passed to `FlatList data={}`. |
| `BirthdayCard.tsx` | `birthdayFormatters.ts` | `formatDaysUntil` import | ✓ WIRED | Line 11: imported. Lines 39, 62: used in rendered output. |
| `squad.tsx` | `useUpcomingBirthdays.ts` | `useUpcomingBirthdays()` call in SquadScreen body | ✓ WIRED | Line 13: import. Line 21: `const birthdays = useUpcomingBirthdays()`. Line 59: passed as prop. |
| `squad.tsx` | `BirthdayCard.tsx` | `BirthdayCard` component in goals tab ScrollView | ✓ WIRED | Line 12: import. Line 59: `<BirthdayCard birthdays={birthdays} />` in goals tab ScrollView after StreakCard. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `BirthdayCard.tsx` | `entries` | `UpcomingBirthdaysData` prop from `squad.tsx` | Yes — `useUpcomingBirthdays()` in parent calls `supabase.rpc('get_upcoming_birthdays')` which queries accepted friends with birthday set | ✓ FLOWING |
| `BirthdaysScreen` (birthdays.tsx) | `entries` | `useUpcomingBirthdays()` — own hook instance | Yes — same RPC call, independent instance, mounted only when screen is active | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — this is a React Native / Expo app. No runnable entry points available without a dev server or simulator. Behavioral verification routed to human_verification section.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BDAY-02 | 07-01, 07-02, 07-03 | User can view a list of friends' birthdays sorted by next occurrence | ✓ SATISFIED | `BirthdaysScreen` at `/squad/birthdays` renders `FlatList` with data from `useUpcomingBirthdays()`. RPC returns rows pre-sorted `days_until ASC`. `formatDaysUntil` and `formatBirthdayDate` produce the required display labels. Empty state with "No birthdays yet" covers the no-data case. |
| BDAY-03 | 07-01, 07-02, 07-03 | Squad dashboard shows an upcoming birthdays card with count and nearest birthday | ✓ SATISFIED | `BirthdayCard` wired into goals tab of `squad.tsx` below `StreakCard`. Card renders count line ("N birthdays in the next 30 days"), divider, and nearest friend row with `AvatarCircle` + `formatDaysUntil` label. Empty state ("No upcoming birthdays") preserved per SC 4. |

No orphaned BDAY-phase requirements — BDAY-01 is assigned to Phase 6 (Birthday Profile Field), not this phase. Traceability table in REQUIREMENTS.md maps BDAY-02 and BDAY-03 to Phase 7 only.

### Anti-Patterns Found

No anti-patterns detected in phase 07 files:
- No TODO/FIXME/HACK/PLACEHOLDER comments
- No empty return stubs (`return null`, `return {}`, `return []`)
- All `eslint-disable-next-line campfire/no-hardcoded-styles` comments are intentional and scoped to fixed pixel values (skeleton dimensions, `minHeight: 64`, `TODAY_BG`) — not rendering stubs

### Commit Verification

All 5 commits documented in SUMMARYs confirmed present in git log:

| Commit | Message |
|--------|---------|
| `dd5ae3d` | feat(07-01): add useUpcomingBirthdays hook and birthday formatter utilities |
| `f757f8c` | test(07-01): add Playwright test scaffold for birthday calendar (BDAY-02, BDAY-03) |
| `e0e75ba` | feat(07-02): squad layout and BirthdayCard dashboard component |
| `f05de25` | feat(07-02): BirthdaysScreen list at /squad/birthdays |
| `de8d2ef` | feat(07-03): wire BirthdayCard into squad.tsx goals tab |

TypeScript: `npx tsc --noEmit` exits 0 — confirmed.

### Human Verification Required

#### 1. Birthday list screen — sort order and row rendering

**Test:** Run the app, navigate to Squad tab → tap "Goals" → tap "Birthdays 🎂" card.
**Expected:** A screen titled "Birthdays" opens. If any friends have birthdays set: rows appear in ascending days-until order. Each row shows an avatar, the friend's name, the date in "Jan 15" format, and a label ("Today" / "Tomorrow" / "In N days"). A friend whose birthday is today has an accent-orange background tint on their row.
**Why human:** Sort order and visual row layout require live Supabase data and a running Expo app.

#### 2. BirthdayCard in Goals tab — visual appearance

**Test:** Run the app, navigate to Squad tab → tap "Goals".
**Expected:** A card titled "Birthdays 🎂" is visible below the StreakCard. If friends have upcoming birthdays: count line ("N birthdays in the next 30 days"), a divider, and the nearest friend's avatar + name + days label. If no friends have birthdays: "No upcoming birthdays" text.
**Why human:** Card visual appearance and data rendering require a running app and real friend data.

#### 3. Navigation flow — card tap and back button

**Test:** Tap the Birthdays card from the Goals tab.
**Expected:** Navigates to a new screen with "Birthdays" in the navigation header and a back button. Pressing back returns to the Goals tab.
**Why human:** Expo Router Stack navigation and header rendering cannot be asserted statically.

#### 4. Pull-to-refresh on birthday list screen

**Test:** On the birthday list screen, pull down.
**Expected:** A native refresh control appears and the list re-fetches without error.
**Why human:** Requires interactive device or Playwright run against live app.

---

### Gaps Summary

No gaps. All code-level truths are verified:
- All 7 required artifacts exist, are substantive (no stubs), and are wired with real data flow
- All 7 key links confirmed present and connected
- Both requirement IDs (BDAY-02, BDAY-03) are fully satisfied by the implementation
- All 5 phase commits are confirmed in git history
- TypeScript compiles clean
- No anti-patterns in any phase file

Status is `human_needed` because the visual/interactive behaviors (sort order rendering, navigation flow, refresh control, and card appearance with real data) require a running Expo app to confirm. The automated code checks all pass.

---

_Verified: 2026-04-12_
_Verifier: Claude (gsd-verifier)_
