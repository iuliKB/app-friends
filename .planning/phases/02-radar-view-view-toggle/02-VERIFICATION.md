---
phase: 02-radar-view-view-toggle
verified: 2026-04-11T07:45:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Toggle switches views with crossfade and haptic feedback"
    expected: "Tapping 'Cards' segment triggers haptic, crossfades to placeholder ('Cards View' + 'Coming in the next update.'). Tapping 'Radar' crossfades back."
    why_human: "Animation smoothness, haptic feel, and visual crossfade cannot be verified programmatically"
  - test: "ALIVE friend bubbles show pulse ring animation"
    expected: "Friends with ALIVE heartbeat state display an expanding ring that grows to 1.7x diameter and fades out in a 1200ms loop with 600ms pause"
    why_human: "Animation playback cannot be verified without running the app"
  - test: "FADING friends render at reduced opacity with no ring"
    expected: "Friends in FADING heartbeat state appear at 60% opacity; no pulse ring is visible"
    why_human: "Requires live friends data with specific heartbeat states to observe"
  - test: "View preference persists across app restart"
    expected: "Switch to Cards view, force-kill app, relaunch — app opens directly in Cards view"
    why_human: "AsyncStorage persistence requires actual app restart cycle to verify"
  - test: "Tap radar bubble opens DM"
    expected: "Tapping any friend bubble navigates to /chat/room with correct dm_channel_id and friend_name params"
    why_human: "Requires live Supabase session and friend data"
  - test: "Long-press radar bubble shows action sheet"
    expected: "Long-pressing a bubble after 400ms delay shows action sheet with 'View profile' and 'Plan with [firstName]...' options"
    why_human: "Requires live interaction with physical or simulated device"
  - test: "Overflow row appears when more than 6 friends exist"
    expected: "When friends.length > 6, a horizontal scroll row of 34px avatar chips appears below the radar container; tapping navigates to DM"
    why_human: "Requires test data with more than 6 friends"
---

# Phase 2: Radar View & View Toggle Verification Report

**Phase Goal:** Users can switch between Radar and Cards views via a persistent toggle, and Radar correctly renders up to 6 spatial friend bubbles with overflow, adapting to any screen size
**Verified:** 2026-04-11T07:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a segmented toggle on the homescreen and can switch between Radar and Cards views; their last-chosen view survives an app restart | ✓ VERIFIED | `RadarViewToggle` renders 'Radar'/'Cards' segments wired via `useViewPreference` in HomeScreen; AsyncStorage key `campfire:home_view` persists selection |
| 2 | Radar view displays up to 6 friends as avatar bubbles sized by status (Free=large+gradient, Busy/Maybe=smaller, DEAD=smallest+muted); layout adapts to all screen sizes via onLayout dimensions | ✓ VERIFIED | `RadarView` uses `onLayout` exclusively (no `Dimensions.get` in code paths), `friends.slice(0, 6)`, adaptive height 160/260px; BubbleSizeMap Free=80, Maybe=64, Busy=48; DEAD=36 via direct check; LinearGradient for ALIVE bubbles |
| 3 | ALIVE friend bubbles show pulsing concentric ring animations; FADING bubbles render at 60% opacity with no ring | ✓ VERIFIED | `PulseRing` sub-component rendered only when `isAlive=true`; FADING sets `baseOpacity=0.6`; `showGradient === isAlive` gates gradient; `isInteraction:false` on all 3 timing calls |
| 4 | When more than 6 friends exist, overflow friends appear in a horizontal scroll row below the radar with smaller avatar chips | ✓ VERIFIED | `overflowFriends = friends.slice(6)` drives a `FlatList horizontal` rendering `OverflowChip` (34px avatar + 8px status dot); only shown when `overflowFriends.length > 0` |
| 5 | Tapping any radar bubble or overflow chip navigates directly to a DM with that friend; the old Free grid / Everyone Else two-section layout is gone | ✓ VERIFIED | Both `RadarBubble` and `OverflowChip` call `supabase.rpc('get_or_create_dm_channel')`; HomeScreen has no `HomeFriendCard`, no `FlatList`, no 'Everyone Else' text, no `countHeading` or `freeFriends` usage |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useViewPreference.ts` | AsyncStorage-backed preference hook | ✓ VERIFIED | Exports `ViewPreference` type and `useViewPreference`; reads/writes `campfire:home_view`; defaults to `'radar'`; loading guard with `.finally(() => setLoading(false))` |
| `src/components/home/RadarViewToggle.tsx` | Segmented toggle for Radar/Cards | ✓ VERIFIED | Exports `RadarViewToggle`; two segments 'Radar'/'Cards'; `ImpactFeedbackStyle.Light` haptic on press; `accessibilityRole="button"` and `accessibilityState` present; height 44, `COLORS.surface.card` bg, `COLORS.surface.overlay` active segment |
| `src/components/home/RadarBubble.tsx` | Positioned bubble with pulse ring | ✓ VERIFIED | Exports `RadarBubble` and `BubbleSizeMap`; `PulseRing` sub-component; `LinearGradient` for ALIVE; FADING at 0.6 opacity; DEAD at 0.5; `get_or_create_dm_channel` tap; `showActionSheet` long-press; hitSlop for small bubbles |
| `src/components/home/OverflowChip.tsx` | 34px avatar chip with status dot | ✓ VERIFIED | Exports `OverflowChip`; `AvatarCircle size={34}`; 8x8 status dot (borderRadius 4); DEAD → `COLORS.text.secondary`; FADING → 0.6 opacity; `get_or_create_dm_channel` tap; `marginRight: SPACING.sm` |
| `src/components/home/RadarView.tsx` | Layout container with scatter algorithm | ✓ VERIFIED | Exports `RadarView`; `computeScatterPositions` pure function; `onLayout` width capture; `slice(0,6)` / `slice(6)` split; depth effect (0.92/0.85 upper half); overflow FlatList; empty state; adaptive height (160/260); no `Dimensions.get` in code paths |
| `src/screens/home/HomeScreen.tsx` | Wired HomeScreen with toggle + crossfade | ✓ VERIFIED | Imports and uses `RadarViewToggle`, `RadarView`, `useViewPreference`; `radarOpacity`/`cardsOpacity` crossfade at 250ms `Easing.inOut`; `prefLoading` guard; cards placeholder; heartbeat tick and StatusPickerSheet preserved; old grid fully removed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RadarViewToggle` | `expo-haptics` | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` | ✓ WIRED | Line 19 of RadarViewToggle.tsx |
| `useViewPreference` | `AsyncStorage` | `getItem/setItem` with key `campfire:home_view` | ✓ WIRED | Lines 6, 14, 28 of useViewPreference.ts |
| `RadarBubble` | `PulseRing` | rendered when `isAlive === true` | ✓ WIRED | Line 233 of RadarBubble.tsx: `{isAlive && <PulseRing size={targetSize} statusColor={statusColor} />}` |
| `RadarBubble` | `LinearGradient` | absolute positioned with center-to-corner gradient | ✓ WIRED | Line 235 of RadarBubble.tsx |
| `OverflowChip` | `AvatarCircle` | `size={34}` with absolute status dot overlay | ✓ WIRED | Line 57 of OverflowChip.tsx |
| `RadarView` | `RadarBubble` | renders up to 6 with computed position + depth props | ✓ WIRED | Lines 124-128 of RadarView.tsx: `depthScale={pos.depthScale}` |
| `RadarView` | `OverflowChip` | FlatList horizontal for friends[6+] | ✓ WIRED | Line 144 of RadarView.tsx |
| `RadarView` | `onLayout` | captures `containerWidth` for scatter algorithm | ✓ WIRED | Line 107 of RadarView.tsx |
| `HomeScreen` | `RadarViewToggle` | `value={view} onValueChange={setView}` | ✓ WIRED | Line 114 of HomeScreen.tsx |
| `HomeScreen` | `RadarView` | `friends={friends}` from `useHomeScreen` | ✓ WIRED | Line 121 of HomeScreen.tsx |
| `HomeScreen` | `useViewPreference` | `[view, setView, prefLoading] = useViewPreference()` | ✓ WIRED | Line 40 of HomeScreen.tsx |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `RadarView` | `friends` prop | `useHomeScreen()` → `useFriends()` hook → Supabase RPC | Yes — real Supabase query; `friends` array passed from HomeScreen line 121 | ✓ FLOWING |
| `RadarBubble` | `friend` prop | Flows from `RadarView` → `friends.slice(0,6)` → individual `FriendWithStatus` | Yes — same data chain | ✓ FLOWING |
| `OverflowChip` | `friend` prop | Flows from `RadarView` → `friends.slice(6)` → FlatList `renderItem` | Yes — same data chain | ✓ FLOWING |
| `useViewPreference` | `view` state | AsyncStorage `campfire:home_view` | Yes — real AsyncStorage read on mount; validation guards against invalid stored values | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: TypeScript compilation is the only safely runnable spot-check for a React Native app without a running server.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All new/modified files compile | `npx tsc --noEmit` | Exit code 0, no errors | ✓ PASS |
| `campfire:home_view` storage key present | grep in useViewPreference.ts | Found on line 6 | ✓ PASS |
| No `Dimensions.get` calls in RadarView code (only comments) | grep for `Dimensions.get` in RadarView.tsx | Only appears in comments, not as calls | ✓ PASS |
| isInteraction:false count >= 2 in HomeScreen crossfade | grep count | 4 occurrences | ✓ PASS |
| isInteraction:false count >= 2 in RadarBubble animations | grep count | 3 occurrences | ✓ PASS |
| Old grid fully removed from HomeScreen | grep HomeFriendCard, FlatList, Everyone Else, countHeading | All return empty | ✓ PASS |
| Claimed commits exist in git history | git log with all commit hashes | All 7 commits found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HOME-01 | 02-01, 02-04 | User can switch between Radar and Cards views via segmented toggle | ✓ SATISFIED | `RadarViewToggle` in HomeScreen, two segments 'Radar'/'Cards', wired to `setView` |
| HOME-02 | 02-01, 02-04 | View preference persists across sessions via AsyncStorage | ✓ SATISFIED | `useViewPreference` reads/writes `campfire:home_view` key; validation accepts only 'radar'/'cards' |
| HOME-05 | 02-04 | Two-section friend split replaced by unified Radar/Cards views | ✓ SATISFIED | HomeScreen has no `HomeFriendCard`, `FlatList`, `freeFriends`, `otherFriends`, 'Everyone Else', or `countHeading` — implementation complete. Note: REQUIREMENTS.md traceability table still shows HOME-05 as "Pending" — this is a documentation discrepancy, not an implementation gap. |
| RADAR-01 | 02-02, 02-03 | Spatial bubble layout with up to 6 friends, sized by status | ✓ SATISFIED | `BubbleSizeMap` (Free=80, Maybe=64, Busy=48, Dead=44/36), `LinearGradient` for ALIVE, `friends.slice(0,6)` in RadarView |
| RADAR-02 | 02-02 | ALIVE friends display pulsing ring animations | ✓ SATISFIED | `PulseRing` sub-component, 1.7x scale loop, 1200ms+600ms, `isInteraction:false`, `useNativeDriver:true` |
| RADAR-03 | 02-02 | FADING friends at 60% opacity with no ring | ✓ SATISFIED | `baseOpacity=0.6` for fading; `showGradient === isAlive` gates both gradient and ring |
| RADAR-04 | 02-03 | Overflow friends in horizontal scroll row below radar | ✓ SATISFIED | `overflowFriends = friends.slice(6)`, `FlatList horizontal` with `OverflowChip` |
| RADAR-05 | 02-02, 02-03 | Tapping friend bubble or chip opens DM | ✓ SATISFIED | Both `RadarBubble` and `OverflowChip` call `supabase.rpc('get_or_create_dm_channel')` → router.push |
| RADAR-06 | 02-03 | Bubble positions from container onLayout, not Dimensions.get | ✓ SATISFIED | `onLayout` captures `containerWidth`; `Dimensions.get` appears only in comments, not as calls |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/home/RadarBubble.tsx` | 125 | `heartbeatState === 'dead' ? 36 : (BubbleSizeMap[friend.status] ?? 36)` while `BubbleSizeMap.dead = 44` | ℹ️ Info | Inconsistency between `BubbleSizeMap.dead` (44) and actual DEAD bubble size (36). Not a blocker — per 02-04 SUMMARY this was an intentional size increase in BubbleSizeMap but the direct-check path for DEAD wasn't updated. Visual effect: DEAD bubbles render at 36px not 44px. |
| `src/screens/home/HomeScreen.tsx` | 160-162 | `paddingBottom: 100` with eslint-disable comment | ℹ️ Info | Hardcoded non-token value with suppress comment. Low impact — ScrollView padding. |
| `src/components/home/RadarView.tsx` | 100 | `// eslint-disable-line react-hooks/exhaustive-deps` | ℹ️ Info | Intentional dep suppression; documented in SUMMARY as stable radarKey approach to prevent infinite re-render. Acceptable workaround. |
| `REQUIREMENTS.md` | 99 | `HOME-05 | Phase 2 | Pending` while implementation is complete | ⚠️ Warning | Documentation stale — REQUIREMENTS.md traceability table not updated after Phase 2 completion. HOME-05 is satisfied in code but still marked Pending. No functional impact. |

No blocker anti-patterns found.

### Human Verification Required

#### 1. Toggle Crossfade and Haptics

**Test:** Open the HomeScreen. Tap 'Cards' in the RadarViewToggle.
**Expected:** Haptic feedback fires immediately; RadarView crossfades out over 250ms as Cards placeholder crossfades in. Tap 'Radar' — crossfade back.
**Why human:** Animation smoothness and haptic registration cannot be verified programmatically.

#### 2. Pulse Ring Animation

**Test:** With at least one ALIVE friend visible in radar, observe their bubble.
**Expected:** An expanding ring grows from the bubble diameter to ~1.7x, fades to transparent, pauses 600ms, then repeats.
**Why human:** Animation playback requires a running device/simulator.

#### 3. FADING Friend Rendering

**Test:** Observe a friend whose status has recently expired (FADING heartbeat state).
**Expected:** Bubble appears at ~60% opacity; no pulse ring; name label uses secondary color. No status gradient.
**Why human:** Requires live data with specific heartbeat state timing.

#### 4. View Preference Persistence

**Test:** Switch to Cards view. Force-kill the app. Relaunch.
**Expected:** App opens directly in Cards view (not defaulting back to Radar).
**Why human:** Requires actual app restart cycle.

#### 5. DM Navigation

**Test:** Tap any friend bubble in radar.
**Expected:** Navigates to `/chat/room` screen for that friend; back button returns to HomeScreen.
**Why human:** Requires live Supabase session and authenticated user with friends.

#### 6. Long-Press Action Sheet

**Test:** Long-press a friend bubble and hold for ~400ms.
**Expected:** Action sheet appears with 'View profile' and 'Plan with [firstName]...' options. Each navigates correctly.
**Why human:** Requires live interaction and friend data.

#### 7. Overflow Row

**Test:** With more than 6 friends added, scroll to the bottom of radar area.
**Expected:** A horizontal row of small avatar chips (34px) appears below the radar container. Each chip has a colored status dot. Tapping navigates to DM.
**Why human:** Requires test account with 7+ friends.

### Notable Deviations from Plan Spec

These are documented intentional changes (not gaps) that occurred during visual verification:

1. **BubbleSizeMap values increased**: Plan specified Free=64, Maybe=48, Busy=36, Dead=36. Implementation uses Free=80, Maybe=64, Busy=48, Dead=44 in the map (but the dead-path check still uses 36 directly — see Anti-Patterns). Changed per user feedback for better visibility.

2. **RadarView height changed to adaptive**: Plan specified fixed 320px height. Implementation uses 160px for 1-3 friends, 260px for 4-6. Changed for compact feel.

3. **Scatter algorithm uses centered jitter**: Plan specified full-cell randomization within safety margins. Implementation uses centered jitter (40% of cell space) for tighter grouping. Same 8px safety margin is still applied via `Math.max(margin, ...)` clamps.

4. **useEffect dependency uses radarKey string**: Plan specified `[containerWidth, radarFriends]` deps. Implementation uses `[containerWidth, radarKey]` where `radarKey` is a derived string of friend IDs. Fixes infinite re-render loop (committed in 8adb401).

---

_Verified: 2026-04-11T07:45:00Z_
_Verifier: Claude (gsd-verifier)_
