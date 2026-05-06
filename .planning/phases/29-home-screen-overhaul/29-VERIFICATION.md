---
phase: 29-home-screen-overhaul
verified: 2026-05-06T21:00:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Switch between Radar and Cards view, force-quit the app, re-open it. Confirm the previously selected view (Radar or Cards) is shown — not the default."
    expected: "App reopens to the last-used view mode — preference survives an app kill."
    why_human: "AsyncStorage read on mount is async; unit tests confirm the hook logic is correct but actual app restart persistence requires a device or simulator."
  - test: "Open app with a Supabase account that has no friends. Confirm the EmptyState shows emoji icon, heading 'Invite your crew', and CTA 'Invite friends'. Tap the CTA."
    expected: "Tapping 'Invite friends' navigates to the Add Friend screen (/friends/add), not /(tabs)/squad."
    why_human: "Route navigation and EmptyState rendering require a running app; zero-friends condition depends on live Supabase data."
  - test: "Open the Home screen on a device/simulator while on a slow network (or with Supabase offline). Observe the Upcoming Events section during the loading window."
    expected: "Two shimmer skeleton cards (240x160) appear while plans are loading, then fade out (300ms opacity transition) when plan data arrives."
    why_human: "Animated.timing fade-out and skeleton visibility require a running app with observable loading latency."
  - test: "Open the Home screen. Inspect at least one DEAD friend bubble (status_expires_at far in the past) and compare it visually to a FADING (amber pulse ring, 0.6 opacity) and an ALIVE bubble."
    expected: "DEAD bubble: no pulse ring, greyscale overlay, opacity ~0.38, not tappable. FADING bubble: amber pulse ring, dimmed. ALIVE bubble: colored pulse ring, full opacity, tappable."
    why_human: "Visual opacity and greyscale overlay are not measurable by unit tests; requires visual inspection with real friend data in different heartbeat states. Tap-interactivity for DEAD state is confirmed by tests, but the full visual treatment needs human eyes."
---

# Phase 29: Home Screen Overhaul — Verification Report

**Phase Goal:** Home screen has a ground-up visual redesign — radar bubbles clearly communicate freshness, the view-mode preference persists, and the events section has a polished, consistent layout

**Verified:** 2026-05-06T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ALIVE radar bubbles look distinct from FADING (dimmed) and DEAD (visually distinct treatment) — no tap required | VERIFIED | `RadarBubble.tsx` line 162: `isDead = heartbeatState === 'dead'`; line 165: `baseOpacity = 0.38`; lines 247–298: `isDead ? <View>` (no Pressable) with `StyleSheet.absoluteFillObject` greyscale overlay at opacity 0.55. FADING = 0.6 with amber PulseRing. ALIVE = 1.0 with colored PulseRing and gradient. All 3 RadarBubble unit tests pass. |
| 2 | Switching Radar/Cards view and restarting the app restores last-used mode | VERIFIED (code) / NEEDS HUMAN (device) | `src/hooks/useViewPreference.ts` imported in `HomeScreen.tsx` line 24; `useViewPreference()` used at line 53; hook persists to `campfire:home_view` via AsyncStorage. Unit tests (3/3 GREEN) confirm default='radar', restore='cards', setItem call. Actual app-kill persistence requires human verification. |
| 3 | User with zero friends sees prominent "Invite friends" CTA navigating to Add Friend flow | VERIFIED | `HomeScreen.tsx` lines 211–220: `EmptyState` with `icon="👥"`, `iconType="emoji"`, `heading="Invite your crew"`, `ctaLabel="Invite friends"`, `onCta={() => router.push('/friends/add')}`. Zero `onboarding`/`AsyncStorage`/`handleNavigateToSquad` references remain (grep count = 0). Route `/friends/add` confirmed at `src/app/friends/add.tsx`. |
| 4 | Upcoming events cards have consistent date/time prominence, participant avatars, and visual hierarchy | VERIFIED | `EventCard.tsx`: 240×160 dimensions (lines 144–146), `testID="date-pill"` absolutely positioned top-left (line 91), `isDark` conditional rgba background (lines 96–98), `AvatarStack size={28} maxVisible={5}` (line 129), redundant inline date text removed. `UpcomingEventsSection.tsx`: `CARD_WIDTH=240`, FlatList `height:160`, `placeholderCard` 240×160, all old 200/140 values gone (grep = 0). Loading skeleton: `isLoading` prop, 2x `SkeletonPulse(240,160)`, `Animated.timing` 300ms fade-out. HomeScreen threads `plansLoading` to `isLoading={plansLoading}`. All EventCard.phase29 tests GREEN (3/3). |

**Score:** 4/4 truths verified (code-level). Human verification required for device behavior.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/home/RadarBubble.tsx` | DEAD branch, opacity 0.38, greyscale overlay, no Pressable | VERIFIED | `isDead ? <View>` conditional present; `baseOpacity = 0.38`; `StyleSheet.absoluteFillObject` overlay with `pointerEvents="none"` and `borderRadius: targetSize / 2` |
| `src/screens/home/HomeScreen.tsx` | Updated EmptyState, OnboardingHintSheet removed, plansLoading threaded | VERIFIED | Zero onboarding references; EmptyState "Invite your crew" / `/friends/add`; `const { loading: plansLoading } = usePlans()`; `<UpcomingEventsSection isLoading={plansLoading} />` |
| `src/components/home/EventCard.tsx` | 240×160, date pill, AvatarStack size=28/maxVisible=5 | VERIFIED | `width: 240`, `height: 160` in StyleSheet; `testID="date-pill"` with `isDark` rgba background; `size={28} maxVisible={5}` on AvatarStack |
| `src/components/home/UpcomingEventsSection.tsx` | isLoading prop, skeleton, CARD_WIDTH=240, FlatList height=160 | VERIFIED | `CARD_WIDTH = 240`; `isLoading?: boolean` prop; `skeletonOpacity` Animated ref; 2x `SkeletonPulse(240, 160)`; `flatList.height: 160`; `placeholderCard` 240×160; no 200/140 values remain |
| `src/components/home/__tests__/RadarBubble.dead.test.tsx` | RED→GREEN test for HOME-05 | VERIFIED | 3 tests; uses `UNSAFE_queryAllByType(Pressable)`; imports `RadarBubble` from `../RadarBubble` |
| `src/hooks/__tests__/useViewPreference.test.ts` | GREEN tests for HOME-06 | VERIFIED | 3 tests; `campfire:home_view` key; `AsyncStorage.setItem` called |
| `src/components/home/__tests__/EventCard.phase29.test.tsx` | RED→GREEN tests for HOME-08 | VERIFIED | 3 tests; `testID="event-card"` width check; `testID="date-pill"` presence check |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RadarBubble.tsx` | `src/lib/heartbeat.ts` | `computeHeartbeatState()` | WIRED | Line 156: `const heartbeatState = computeHeartbeatState(...)` |
| `RadarBubble.tsx` | `src/theme/` | `colors.surface.base` in overlay | WIRED | Line 261: `backgroundColor: colors.surface.base` inside DEAD branch overlay |
| `HomeScreen.tsx` | `src/app/friends/add.tsx` | `router.push('/friends/add')` | WIRED | Line 218: `onCta={() => router.push('/friends/add')}`. Route file confirmed at `src/app/friends/add.tsx`. |
| `HomeScreen.tsx` | `UpcomingEventsSection.tsx` | `isLoading={plansLoading}` | WIRED | Line 38: `const { loading: plansLoading } = usePlans()`; Line 223: `<UpcomingEventsSection isLoading={plansLoading} />` |
| `HomeScreen.tsx` | `src/hooks/usePlans.ts` | `const { loading: plansLoading } = usePlans()` | WIRED | Line 38 confirmed; fire-and-forget `usePlans();` pattern is gone |
| `EventCard.tsx` | `src/theme/` | `isDark` for date pill background | WIRED | Line 20: `const { colors, isDark } = useTheme()`; Line 96–98: `isDark ? 'rgba(185,255,59,0.15)' : 'rgba(77,124,0,0.12)'` |
| `EventCard.tsx` | `src/components/plans/AvatarStack.tsx` | `AvatarStack size={28} maxVisible={5}` | WIRED | Line 129: `<AvatarStack members={plan.members} size={28} maxVisible={5} />` |
| `UpcomingEventsSection.tsx` | `src/components/common/SkeletonPulse.tsx` | `SkeletonPulse width={240} height={160}` | WIRED | Line 15 import; Lines 131–132: two `<SkeletonPulse width={240} height={160} />` in skeleton branch |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `UpcomingEventsSection.tsx` | `upcomingEvents` | `useUpcomingEvents()` hook | Yes — hook subscribes to Supabase plans store | FLOWING |
| `UpcomingEventsSection.tsx` | `isLoading` | `usePlans()` `loading` flag (via HomeScreen prop) | Yes — real async loading boolean from Supabase | FLOWING |
| `EventCard.tsx` | `plan` (prop) | `FlatList` `renderItem` from `upcomingEvents` array | Yes — real PlanWithMembers data | FLOWING |
| `HomeScreen.tsx` | `friends` | `useHomeScreen()` → Supabase subscription | Yes — live friends data | FLOWING |
| `HomeScreen.tsx` | `plansLoading` | `usePlans()` `loading` field | Yes — real async boolean | FLOWING |

---

### Behavioral Spot-Checks

Step 7b skipped — this phase produces React Native UI code. No runnable entry points without a simulator/device.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HOME-05 | 29-01, 29-02 | Radar ALIVE/FADING/DEAD visual distinction | SATISFIED | DEAD branch in `RadarBubble.tsx`: no Pressable, opacity 0.38, greyscale overlay. RadarBubble unit tests 3/3 GREEN. |
| HOME-06 | 29-01 | View mode persistence (AsyncStorage) | SATISFIED | `useViewPreference` hook imported and used in `HomeScreen.tsx`. Unit tests 3/3 GREEN confirming AsyncStorage read/write. |
| HOME-07 | 29-03 | Zero-friends "Invite friends" CTA | SATISFIED | `EmptyState` with "Invite your crew" / "Invite friends" / `/friends/add` in `HomeScreen.tsx`. All onboarding code removed. |
| HOME-08 | 29-01, 29-04, 29-05 | Events section card polish | SATISFIED | EventCard 240×160, date pill, AvatarStack updated. UpcomingEventsSection skeleton, CARD_WIDTH=240, FlatList height=160. All EventCard.phase29 tests GREEN. |

No orphaned requirements. All four HOME phase 29 requirements claimed and satisfied.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `UpcomingEventsSection.tsx` (lines 71, 87, 93, 110, 135, 138, 145, 146) | "placeholder" string occurrences | Info | These are StyleSheet key names (`placeholderCard`, `placeholderHeading`, `placeholderBody`) and a comment for the "No plans yet" empty state UI component — intentional design, not stubs. No data path issues. |

No blockers. No warnings. The "placeholder" matches are false positives from an intentional empty-state UI component.

---

### Human Verification Required

#### 1. View Preference Persistence (HOME-06)

**Test:** Switch between Radar and Cards view using the toggle, force-quit the app, re-open it.
**Expected:** App reopens to the last-used view mode — not the 'radar' default.
**Why human:** AsyncStorage persistence across an app kill requires a running device or simulator. Unit tests confirm the hook logic but cannot simulate a process restart.

#### 2. Zero-Friends EmptyState Navigation (HOME-07)

**Test:** Open the app with a Supabase account that has zero friends. Observe the EmptyState. Tap "Invite friends".
**Expected:** EmptyState shows emoji icon, "Invite your crew" heading, "Invite friends" CTA. Tapping routes to the Add Friend screen.
**Why human:** EmptyState conditional rendering (`!loading && friends.length === 0`) and route navigation require a running app with real Supabase data.

#### 3. Skeleton Loading Transition (HOME-08)

**Test:** Open the Home screen on a slow network or with artificial Supabase latency. Watch the Upcoming Events section.
**Expected:** Two shimmer skeleton cards appear while plans load, then fade out (300ms opacity) when data arrives. No layout jump.
**Why human:** The Animated.timing fade-out and skeleton visibility during real loading latency cannot be observed in unit tests.

#### 4. DEAD Bubble Visual Treatment (HOME-05)

**Test:** Open the Home screen with at least one DEAD friend (last_active_at more than 8h ago). Compare DEAD vs FADING vs ALIVE bubbles visually.
**Expected:** DEAD bubble: greyscale overlay, opacity ~0.38, not tappable (no press feedback). FADING bubble: amber pulse ring, 0.6 opacity, tappable. ALIVE bubble: colored pulse ring, full opacity, tappable.
**Why human:** Greyscale visual quality, opacity perceptibility, and press response require visual inspection on a device or simulator with real friend data.

---

### Gaps Summary

No gaps. All code-level must-haves are verified. The four human verification items are standard UI/device behaviors that cannot be confirmed programmatically.

---

_Verified: 2026-05-06T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
