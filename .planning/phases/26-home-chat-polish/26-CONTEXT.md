# Phase 26: Home & Chat Polish - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver polish for the Home screen and Chat screens end-to-end:
- HOME-01: SkeletonPulse placeholders while home data loads
- HOME-02: Zero-friends empty state card with CTA
- HOME-03: Animated FADING pulse ring on radar bubbles
- HOME-04: Spring press feedback (1.0→0.96 scale) on all tappable home cards
- CHAT-01: Skeleton rows while chat list loads
- CHAT-02: Haptics on message send and reaction tap
- CHAT-03: Optimistic message send with "sending" indicator + failure state
- CHAT-04: Scale animation on message bubble long-press before context menu

No new capabilities. No changes to routing, data model, or notification system.

</domain>

<decisions>
## Implementation Decisions

### Home Skeleton (HOME-01)
- **D-01:** Skeletons are **view-aware** — Radar view shows a cluster of circular SkeletonPulse blobs; Card stack view shows 1–2 rectangular card-shaped skeleton placeholders.
- **D-02:** Show **3 skeleton items** while loading — enough to fill visible space without over-scaffolding.
- **D-03:** Skeletons appear on **initial load only** — pull-to-refresh keeps existing content visible with the RefreshControl spinner. Condition: `loading && friends.length === 0`.

### FADING Pulse (HOME-03)
- **D-04:** FADING friends get an **amber/orange pulse ring** — same `Animated.loop` + scale/opacity pattern as the ALIVE `PulseRing`, but border color shifts to a warm amber/orange (caution signal) and cycle duration is slower (~2000ms vs 1200ms for ALIVE).
- **D-05:** FADING pulse is **Radar view only** — `RadarBubble` handles it. `HomeFriendCard` and `FriendSwipeCard` continue using 0.6 opacity for FADING; no ring added there.
- **D-06:** Implement as a second sub-component inside `RadarBubble.tsx` (alongside existing `PulseRing`) or parameterize `PulseRing` with a `variant: 'alive' | 'fading'` prop — Claude's discretion on the cleanest approach.

### Zero-Friends Empty State (HOME-02)
- **D-07:** Render a **styled card within the scroll area** — not a full-screen replacement. The status card and widgets remain visible above it. The empty card sits where the friend content section would be.
- **D-08:** Empty state card contains: campfire/friends icon, heading ("No friends yet"), a single line of copy, and a **"Add a friend" CTA button** that navigates to the Squad tab.
- **D-09:** CTA navigation: switch to Squad tab (index 1 in the bottom nav — the tab that contains the Friends list and Add Friend FAB). Do not open the add-friend flow directly.
- **D-10:** Trigger condition: `!loading && friends.length === 0`. This is separate from the onboarding hint sheet (AUTH-04) which has its own AsyncStorage flag — both can coexist.

### Home Card Press Feedback (HOME-04)
- **D-11:** All tappable home cards use **1.0→0.96 scale spring** on press. This replaces the existing `opacity: 0.7` pressed style in `HomeFriendCard`. Use `Animated.spring` with `ANIMATION.easing.spring` damping/stiffness.
- **D-12:** Cards that get press feedback: `HomeFriendCard`, `OwnStatusCard` (if tappable), `EventCard` in `UpcomingEventsSection`, and the IOU/birthday widget rows in `HomeWidgetRow` — wherever a `Pressable` or `TouchableOpacity` wraps tappable content. Claude audits all tappable home cards and applies consistently.

### Chat List Skeleton (CHAT-01)
- **D-13:** Replace the `LoadingIndicator` spinner in `ChatListScreen` with **skeleton rows** — condition `loading && chatList.length === 0`. Each skeleton row mirrors a `ChatListRow`: avatar circle (SkeletonPulse) + two text-line rectangles (SkeletonPulse). Show 4 skeleton rows.

### Chat Haptics (CHAT-02)
- **D-14:** Sending a message triggers `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`.
- **D-15:** Tapping a reaction emoji triggers `Haptics.selectionAsync()`.

### Optimistic Message Send (CHAT-03)
- **D-16:** Sent messages appear **immediately** in the message list with a "sending" indicator before server confirmation.
- **D-17:** "Sending" visual: bubble renders at **~70% opacity** with a **small clock icon** next to the timestamp. On server confirmation, opacity snaps to 1.0 and the clock icon disappears. No layout shift.
- **D-18:** Failure state: bubble gets a **red border/tint** and "Tap to retry" label. Tapping the bubble re-sends the message. The optimistic bubble stays visible (preserves message content context).
- **D-19:** Optimistic messages are inserted into local state immediately on send, with a `pending: true` flag. On success the flag is cleared (or the real message from the realtime subscription replaces it). On failure the flag becomes `failed: true`.

### Message Bubble Long-Press (CHAT-04)
- **D-20:** Long-pressing a bubble uses **compress-and-hold** behavior: bubble scales down to ~0.96 when the long-press gesture fires and stays compressed while the context menu is visible. Scale restores to 1.0 when the menu closes. Matches native iOS feel.
- **D-21:** Animation: `Animated.spring` to 0.96 on gesture start, spring back to 1.0 on release/menu-close. Use `useNativeDriver: true`.

### Claude's Discretion
- Exact amber/orange hex value for FADING pulse ring (should feel "caution" against both light and dark backgrounds — warm yellow-orange range)
- Whether FADING PulseRing is a separate component or a parameterized variant of existing `PulseRing`
- Exact copy for zero-friends empty state card (heading + one-liner)
- Which specific home screen widgets get press feedback (audit all Pressables and apply consistently)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §HOME-01–HOME-04, §CHAT-01–CHAT-04 — The eight requirements this phase covers

### Home Screen (main implementation targets)
- `src/screens/home/HomeScreen.tsx` — Central screen; radar/card view toggle, friend loading state, zero-friends condition
- `src/components/home/RadarBubble.tsx` — PulseRing sub-component lives here; FADING pulse goes here too
- `src/components/home/RadarView.tsx` — Renders RadarBubble instances; skeleton layout for radar view goes here
- `src/components/home/CardStackView.tsx` — Card stack skeleton layout goes here
- `src/components/home/HomeFriendCard.tsx` — Replace `opacity: 0.7` pressed style with scale spring (HOME-04)
- `src/components/home/HomeWidgetRow.tsx` — Check for Pressable wrappers that need scale feedback

### Chat Screens
- `src/screens/chat/ChatListScreen.tsx` — Replace LoadingIndicator with skeleton rows (CHAT-01)
- `src/screens/chat/ChatRoomScreen.tsx` — Optimistic send integration; haptics on send
- `src/components/chat/MessageBubble.tsx` — Long-press scale animation (CHAT-04); "sending"/"failed" visual states (CHAT-03)
- `src/components/chat/SendBar.tsx` — Haptic trigger on message send (CHAT-02)
- `src/components/chat/ChatListRow.tsx` — Reference for skeleton row shape (CHAT-01)
- `src/hooks/useChatRoom.ts` — Where optimistic send state management goes (CHAT-03)

### Shared Primitives (Phase 24 output)
- `src/components/common/SkeletonPulse.tsx` — Use for all skeleton placeholders
- `src/theme/animation.ts` — Use `ANIMATION.slow`, `ANIMATION.verySlow`, `ANIMATION.easing.spring` — no raw numbers
- `src/components/common/EmptyState.tsx` — Reference pattern; zero-friends card may be a custom inline card rather than this component

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SkeletonPulse` (`src/components/common/SkeletonPulse.tsx`): width + height props, always RADII.sm corners, gradient shimmer. Use for all skeleton placeholders.
- `PulseRing` (inside `RadarBubble.tsx`): `Animated.loop` + scale/opacity + `useNativeDriver: true`. FADING pulse extends this pattern.
- `ANIMATION` tokens (`src/theme/animation.ts`): `fast: 200`, `normal: 300`, `slow: 700`, `verySlow: 1200`, `easing.spring: { damping: 15, stiffness: 120 }`.
- `expo-haptics`: Already in project (used by other screens). Import `Haptics` from `expo-haptics`.

### Established Patterns
- All components use `useTheme()` + `useMemo([colors])` — mandatory for new/edited components.
- ESLint `no-hardcoded-styles` at error severity — all colors, sizes, radii must use tokens.
- `Animated` from `react-native` (not Reanimated) is the established animation library for this codebase. `@gorhom/bottom-sheet` is broken on Reanimated v4 — avoid Reanimated.
- `Pressable` with `({ pressed }) => [styles.base, pressed && styles.pressed]` is the current press pattern. HOME-04 replaces the opacity approach with Animated scale.
- Pull-to-refresh uses `refreshing` + `handleRefresh` from hooks — skeletons condition off `loading && data.length === 0` only.

### Integration Points
- `HomeScreen.tsx` → passes `friends` + `loading` down to `RadarView` and `CardStackView` — skeleton condition applies at this level
- `RadarBubble.tsx` → receives `friend` prop with `status_expires_at` and `last_active_at`; `computeHeartbeatState()` returns `'fading'` — wire FADING pulse to this condition
- `ChatRoomScreen.tsx` → sends messages via hook; optimistic state lives in `useChatRoom.ts`
- Squad tab navigation: bottom tab index 1 (verify in `app/(tabs)/_layout.tsx` or equivalent)

</code_context>

<specifics>
## Specific Ideas

- FADING pulse ring should feel "languid" — slower cycle (2000ms vs 1200ms) + warm amber/orange color. The ALIVE ring is crisp and lively; FADING should feel like something winding down.
- Zero-friends card is an inline card in the scroll area (not full-screen replacement) — status card and widgets remain above it. The experience is: you can still set your own status even with no friends.
- Optimistic message: clock icon next to timestamp, ~70% opacity. On success: snaps to full opacity, clock gone. On failure: red border/tint + "Tap to retry".
- Long-press bubble: compresses to 0.96 while menu is open, springs back when menu closes.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-home-chat-polish*
*Context gathered: 2026-05-05*
