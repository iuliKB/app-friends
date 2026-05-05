---
phase: 26-home-chat-polish
verified: 2026-05-05T15:00:00Z
status: human_needed
score: 8/8
overrides_applied: 0
human_verification:
  - test: "Home screen loading state — launch app and open Home tab before friend data loads"
    expected: "RadarView shows 3 shimmering circular blobs; CardStackView shows 2 shimmering rectangular cards. No white blank space."
    why_human: "SkeletonPulse animation shimmer effect requires live rendering; cannot be verified by static code inspection."
  - test: "Home screen empty state — use a test account with zero friends"
    expected: "Below the status card and widgets, an inline card appears with a flame icon, 'No friends yet' heading, body copy, and 'Add a friend' button. Tapping 'Add a friend' navigates to the Squad tab."
    why_human: "Navigation flow and visual card placement require live device or simulator testing."
  - test: "FADING pulse ring on RadarBubble — set a test friend's heartbeat state to 'fading'"
    expected: "An amber (#F59E0B) animated pulse ring appears around the friend's radar bubble, pulsing at a slower (2000ms) cycle compared to the ALIVE ring (1200ms). ALIVE ring is unchanged."
    why_human: "Animation appearance and timing differentiation from ALIVE ring require visual inspection."
  - test: "Home card press feedback — tap and hold any home card (friend card, IOU widget, birthday widget, status card, event card)"
    expected: "Card compresses smoothly to ~96% scale on press and springs back to 100% on release. No opacity dimming (old behavior must be absent)."
    why_human: "Spring animation feel and absence of opacity double-feedback require tactile/visual testing."
  - test: "Chat list skeleton — navigate to Chat tab before conversations load (or on fresh install)"
    expected: "4 content-shaped skeleton rows appear (72px height each with avatar circle + two text-line pulses). No loading spinner visible."
    why_human: "Timing of loading state and visual appearance of skeleton rows require live rendering."
  - test: "Send haptic — type a message and tap send"
    expected: "Light haptic fires immediately when send is tapped, before the message appears in the list."
    why_human: "Haptic feedback requires physical device; cannot be tested in simulator."
  - test: "Pending + failed message states — simulate a network failure while sending a message"
    expected: "The sent message appears immediately at 0.7 opacity with a clock icon and 'Sending...' label. On failure, it shows a red 2px border and 'Tap to retry' label. Tapping 'Tap to retry' re-sends the message."
    why_human: "Requires network failure simulation (e.g., airplane mode) and visual verification of both pending and failed states."
  - test: "Reaction haptic — long-press a message, then tap a reaction emoji"
    expected: "A selection haptic fires when the reaction emoji is tapped."
    why_human: "Haptic feedback requires physical device."
  - test: "Long-press bubble scale animation — long-press a message bubble"
    expected: "Bubble compresses smoothly to ~96% scale during long-press and holds compressed while the context menu is open. Springs back to 100% when the menu closes. No scale animation fires on pending/deleted messages."
    why_human: "Animation timing, scale hold during menu, and guard conditions require live interaction testing."
---

# Phase 26: Home & Chat Polish Verification Report

**Phase Goal:** Polish the Home and Chat screens with loading skeletons, empty states, haptic feedback, and animation micro-interactions — HOME-01 through HOME-04 and CHAT-01 through CHAT-04.
**Verified:** 2026-05-05T15:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | RadarView renders 3 circular SkeletonPulse blobs when loading=true and friends=[] | VERIFIED | `SKELETON_BLOBS` constant at lines 25-29, `loading && friends.length === 0` guard at line 174, SkeletonPulse import at line 11 |
| 2 | CardStackView renders 2 stacked rectangular SkeletonPulse cards when loading=true and friends=[] | VERIFIED | `loading && friends.length === 0 && cardWidth > 0` at line 90, two `SkeletonPulse height={80}` calls at lines 94/96, `SPACING.sm` gap at line 95 |
| 3 | HomeScreen passes loading prop to both RadarView and CardStackView | VERIFIED | `loading={loading}` found at lines 224 and 230 of HomeScreen.tsx |
| 4 | Friends with FADING heartbeat status show amber pulse ring at 2000ms cycle | VERIFIED | `FADING_PULSE_COLOR = '#F59E0B'` exported at line 42, `heartbeatState === 'fading'` render condition at line 256, `duration = variant === 'fading' ? 2000 : 1200` at line 59 |
| 5 | User with zero friends sees inline empty state card guiding them to Squad tab | VERIFIED | `!loading && friends.length === 0` at line 235, "No friends yet" heading, `handleNavigateToSquad` calling `router.push('/(tabs)/squad')` at line 41 |
| 6 | All tappable home cards compress to scale 0.96 on press via Animated.spring | VERIFIED | HomeFriendCard: `scaleAnim`, `toValue: 0.96`, ANIMATION tokens. HomeWidgetRow: `iouScaleAnim`, `birthdayScaleAnim`, `makeSpringHandlers`. OwnStatusCard: `cardScaleAnim`, `activeOpacity={1.0}`. EventCard: `cardScaleAnim`, `activeOpacity={1.0}`. Old opacity styles removed from all 4. |
| 7 | Chat list shows 4 content-shaped skeleton rows while loading instead of spinner | VERIFIED | `ChatSkeletonRow` function at line 118, `Array.from({ length: 4 })` at line 65, `height: 72` at line 122, `SkeletonPulse width={44} height={44}` avatar at line 129, `LoadingIndicator` removed |
| 8 | Sending a message triggers impactAsync(Light) haptic before onSend | VERIFIED | `import * as Haptics from 'expo-haptics'` at line 14, `void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` at line 184, fires before `onSend(body)` |
| 9 | sendMessage failure marks message failed: true instead of removing it | VERIFIED | `m.tempId === tempId ? { ...m, pending: false, failed: true } : m` at line 485 of useChatRoom.ts |
| 10 | retryMessage(tempId, body) exported from useChatRoom | VERIFIED | `async function retryMessage` at line 494, in return object at line 791 |
| 11 | Own text messages with pending: true show clock icon + 0.7 opacity | VERIFIED | `pendingBubble: { opacity: 0.7 }` at line 370, `time-outline` Ionicons at line 662, applied via `message.pending && styles.pendingBubble` at line 618 |
| 12 | Own text messages with failed: true show red border + "Tap to retry" | VERIFIED | `failedBubble: { borderWidth: 2, borderColor: colors.interactive.destructive }` at lines 374-375, `message.failed && styles.failedBubble` at line 619, `Tap to retry` touchable at line 672 |
| 13 | Tapping reaction emoji triggers Haptics.selectionAsync() | VERIFIED | `void Haptics.selectionAsync()` in emoji strip onPress at line 527 of MessageBubble.tsx |
| 14 | retryMessage wired from hook through ChatRoomScreen to MessageBubble as onRetry | VERIFIED | `retryMessage` destructured at line 65 of ChatRoomScreen.tsx, `onRetry={(tempId, body) => void retryMessage(tempId, body)}` at line 351 |
| 15 | Long-press bubble compresses to 0.96 after guards, holds, springs back to 1.0 on close | VERIFIED | `bubbleScaleAnim` at line 422, scale fires after all guards at line 462, `closeMenu` restores at line 475, `Animated.View` wrappers at lines 606 and 720, `useNativeDriver: true` on both calls |
| 16 | Message type has failed?: boolean field | VERIFIED | `failed?: boolean` at line 24 of src/types/chat.ts |

**Score:** 16/16 observable truths verified (8 requirements covered)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/unit/fadingPulse.test.ts` | Test scaffold for FADING_PULSE_COLOR | VERIFIED | Exists, contains FADING_PULSE_COLOR assertions, 3/3 tests pass GREEN |
| `tests/unit/useChatRoom.send.test.ts` | Test scaffold for sendMessage failure path | VERIFIED | Exists, contains applyFailure + failed: true logic, 6/6 tests pass GREEN |
| `src/components/home/RadarView.tsx` | Radar skeleton with 3 SkeletonPulse circles | VERIFIED | loading prop, SKELETON_BLOBS (80/64/48), absolute positioning |
| `src/components/home/CardStackView.tsx` | Card stack skeleton with 2 SkeletonPulse rectangles | VERIFIED | loading prop, 2×SkeletonPulse height=80, SPACING.sm gap |
| `src/screens/home/HomeScreen.tsx` | loading prop wiring + empty state card | VERIFIED | loading={loading} on both views, handleNavigateToSquad, EmptyState |
| `src/components/home/HomeFriendCard.tsx` | Scale spring press feedback | VERIFIED | scaleAnim, Animated.spring 0.96/1.0, ANIMATION tokens, opacity:0.7 removed |
| `src/components/home/HomeWidgetRow.tsx` | Scale spring press feedback on both tiles | VERIFIED | iouScaleAnim, birthdayScaleAnim, makeSpringHandlers, opacity:0.75 removed |
| `src/components/status/OwnStatusCard.tsx` | Scale spring press feedback | VERIFIED | cardScaleAnim, activeOpacity={1.0}, ANIMATION tokens |
| `src/components/home/EventCard.tsx` | Scale spring press feedback | VERIFIED | cardScaleAnim, activeOpacity={1.0}, ANIMATION tokens |
| `src/screens/chat/ChatListScreen.tsx` | ChatSkeletonRow + 4-row skeleton | VERIFIED | ChatSkeletonRow at line 118, Array.from length:4, height:72, avatar 44x44, LoadingIndicator removed |
| `src/components/chat/SendBar.tsx` | Send haptic on message send | VERIFIED | impactAsync(Light) at line 184, before onSend, void prefix |
| `src/types/chat.ts` | failed?: boolean field on Message | VERIFIED | Line 24, with Phase 26 CHAT-03 comment |
| `src/hooks/useChatRoom.ts` | failed: true mutation + retryMessage export | VERIFIED | Map mutation at line 485, retryMessage at line 494 and return at 791 |
| `src/components/chat/MessageBubble.tsx` | pending/failed visual states + reaction haptic + long-press scale | VERIFIED | pendingBubble/failedBubble styles, selectionAsync, bubbleScaleAnim, onRetry prop |
| `src/screens/chat/ChatRoomScreen.tsx` | retryMessage passed to MessageBubble as onRetry | VERIFIED | Destructured at line 65, passed at line 351 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| HomeScreen.tsx | RadarView.tsx | loading prop | WIRED | `<RadarView friends={friends} loading={loading} />` at line 224 |
| HomeScreen.tsx | CardStackView.tsx | loading prop | WIRED | `<CardStackView friends={friends} loading={loading} />` at line 230 |
| HomeScreen.tsx | Squad tab | router.push('/(tabs)/squad') | WIRED | handleNavigateToSquad at line 41 |
| RadarBubble.tsx | PulseRing | variant="fading" | WIRED | `heartbeatState === 'fading'` render condition at line 256, passes `variant="fading"` |
| HomeFriendCard.tsx | scaleAnim | onPressIn/onPressOut Animated.spring | WIRED | `toValue: 0.96` and `toValue: 1.0` spring calls at lines 76/86 |
| ChatListScreen.tsx | SkeletonPulse | ChatSkeletonRow component | WIRED | ChatSkeletonRow uses SkeletonPulse for avatar + 2 text lines |
| SendBar.tsx | expo-haptics | handleSend impactAsync | WIRED | `void Haptics.impactAsync(Light)` at line 184, before onSend |
| useChatRoom.ts | MessageBubble.tsx | retryMessage → ChatRoomScreen → onRetry | WIRED | retryMessage exported, destructured in ChatRoomScreen, passed as onRetry prop |
| src/types/chat.ts | useChatRoom.ts | Message.failed field | WIRED | failed?: boolean at type line 24; used in useChatRoom mutation at line 485 |
| MessageBubble.tsx | bubbleScaleAnim | handleLongPress → closeMenu | WIRED | Spring to 0.96 after guards, spring to 1.0 in closeMenu, Animated.View wrappers at lines 606/720 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| fadingPulse unit tests pass | `npx tsx tests/unit/fadingPulse.test.ts` | Results: 3 passed, 0 failed | PASS |
| useChatRoom.send unit tests pass | `npx tsx tests/unit/useChatRoom.send.test.ts` | Results: 6 passed, 0 failed | PASS |
| handleLongPress scale fires after guards | Line inspection at lines 455-470 | Guards at 456-459, spring at 461-469 — correct order | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| HOME-01 | 26-01 | Home screen shows SkeletonPulse placeholders while friend status data loads | SATISFIED | RadarView 3 blobs, CardStackView 2 cards, condition loading && friends.length === 0 |
| HOME-02 | 26-03 | New user with zero friends sees actionable empty state guiding them to add a friend | SATISFIED | EmptyState card with "No friends yet", CTA navigates to Squad tab |
| HOME-03 | 26-02 | Friends with FADING heartbeat status show subtle animated pulse on radar bubble | SATISFIED | FADING_PULSE_COLOR=#F59E0B, 2000ms cycle, PulseRing variant="fading", fadingPulse.test.ts passes |
| HOME-04 | 26-03 | All tappable cards on home screen have spring press feedback (scale 1.0→0.96) | SATISFIED | HomeFriendCard, HomeWidgetRow (both tiles), OwnStatusCard, EventCard all use Animated.spring + ANIMATION tokens |
| CHAT-01 | 26-04 | Chat list screen shows skeleton rows while conversations load | SATISFIED | 4 ChatSkeletonRow instances, LoadingIndicator removed from loading guard |
| CHAT-02 | 26-04, 26-05 | Sending a message triggers impactAsync(Light); tapping a reaction triggers selectionAsync() | SATISFIED | SendBar line 184: impactAsync(Light); MessageBubble line 527: selectionAsync() |
| CHAT-03 | 26-05 | Sent messages appear immediately with "sending" indicator before server confirmation | SATISFIED | pending: 0.7 opacity + clock icon; failed: red border + retry tap; retryMessage hook |
| CHAT-04 | 26-06 | Long-pressing a message bubble shows subtle scale press animation before context menu | SATISFIED | bubbleScaleAnim springs to 0.96 after guards, holds while menu open, 1.0 on closeMenu |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| MessageBubble.tsx | 662 | `rgba(245,245,245,0.5)` hardcoded color for clock icon | INFO | ESLint disable comment present; transparency overlay not in token set — accepted per plan |
| RadarBubble.tsx | 58-62 | Raw numbers 2000, 800 for animation timing | INFO | ESLint disable comments present; no ANIMATION token for 2000ms — accepted per plan |

No blockers or warnings found.

### Human Verification Required

**9 items need human testing (visual/tactile behaviors that cannot be verified programmatically):**

#### 1. Home skeleton loading state

**Test:** Launch the app and quickly navigate to the Home tab before friend data loads (or test on a slow network / add artificial delay).
**Expected:** RadarView shows 3 shimmering circular skeleton blobs; CardStackView shows 2 shimmering rectangular skeleton cards. No white blank space visible during load.
**Why human:** SkeletonPulse shimmer animation requires live rendering.

#### 2. Home empty state (zero friends)

**Test:** Sign in with a test account that has zero friends and navigate to Home.
**Expected:** Below the status card and widget row, an inline card appears with a people icon, "No friends yet" heading, "Add a friend to see where they're at and make plans." body, and "Add a friend" button. Tapping the button navigates to the Squad tab.
**Why human:** Navigation flow and visual placement in the ScrollView require live device/simulator.

#### 3. FADING pulse ring on RadarBubble

**Test:** Use a test account where a friend's heartbeat state is 'fading'.
**Expected:** The friend's radar bubble shows an amber (#F59E0B) animated ring pulsing at a distinctly slower rhythm than an ALIVE friend's ring (2000ms vs 1200ms). ALIVE ring on other friends is visually unchanged.
**Why human:** Animation timing differentiation and color appearance require visual inspection.

#### 4. Home card spring press feedback

**Test:** Press and hold each of the 5 tappable home elements: a friend card, IOU widget, birthday widget, own status card, event card.
**Expected:** Each card compresses smoothly to approximately 96% scale on press and springs back on release. No opacity dimming (old behavior should be completely absent).
**Why human:** Spring animation feel and absence of opacity double-feedback require tactile/visual testing.

#### 5. Chat list skeleton loading state

**Test:** Navigate to the Chat tab before conversations load (fresh install, or on a slow network).
**Expected:** 4 skeleton rows appear matching ChatListRow shape (72px height, avatar circle, two text-line pulses). The old loading spinner should be completely absent.
**Why human:** Loading state timing and skeleton visual shape require live rendering.

#### 6. Send haptic feedback

**Test:** On a physical device, type a message in any chat room and tap Send.
**Expected:** A light haptic pulse fires immediately when Send is tapped, before the message appears in the conversation list.
**Why human:** Haptic feedback requires a physical device (simulators do not trigger haptics).

#### 7. Pending and failed message states

**Test:** Enable airplane mode after typing a message, then tap Send. Wait for failure.
**Expected:** (a) Message appears immediately with 0.7 opacity and a clock icon ("Sending…"). (b) After failure, the message shows a 2px red border and "Tap to retry" label. (c) Tapping "Tap to retry" re-sends the message.
**Why human:** Requires controlled network failure simulation and visual verification of both state transitions.

#### 8. Reaction haptic feedback

**Test:** On a physical device, long-press any message to open the context menu, then tap a reaction emoji.
**Expected:** A selection haptic fires when the reaction emoji is tapped.
**Why human:** Haptic feedback requires a physical device.

#### 9. Long-press bubble scale animation

**Test:** Long-press any message bubble in a chat room.
**Expected:** The bubble smoothly compresses to ~96% scale during the long-press gesture and holds at that scale while the context menu is open. When the menu closes (tap away or select action), the bubble springs back to 100% scale. Long-pressing a pending message (sending state) should produce no scale animation.
**Why human:** Animation timing, compress-and-hold visual behavior, and guard condition behavior require live interaction testing.

### Gaps Summary

No gaps found. All 8 requirements (HOME-01 through HOME-04, CHAT-01 through CHAT-04) are implemented and the code artifacts pass all automated checks. All 16 observable truths are VERIFIED. All unit tests pass (3/3 fadingPulse, 6/6 useChatRoom.send).

The `human_needed` status reflects 9 visual/tactile behaviors that require live device or simulator testing. These are standard acceptance tests for animation and haptic features — they cannot be verified by static code inspection or unit tests.

---

_Verified: 2026-05-05T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
