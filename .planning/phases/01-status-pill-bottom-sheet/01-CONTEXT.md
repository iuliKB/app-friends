# Phase 1: Status Pill & Bottom Sheet - Context

**Gathered:** 2026-04-11 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Users set and view their status exclusively through a header pill and custom bottom sheet — the inline MoodPicker and ReEngagementBanner are gone. The MoodPicker component itself is preserved (moved into the bottom sheet), not rewritten.

</domain>

<decisions>
## Implementation Decisions

### Bottom Sheet Implementation
- **D-01:** Custom bottom sheet using `Modal` + `Animated.timing(translateY)` from RN's built-in `Animated` API — NOT react-native-reanimated. The codebase has zero Reanimated imports despite it being installed; follow existing `FriendActionSheet` pattern.
- **D-02:** Sheet auto-dismisses on status commit by watching `useStatusStore.currentStatus` changes — same reactive pattern `MoodPicker` already uses to collapse (lines 39-42).
- **D-03:** Sheet has backdrop tap-to-dismiss, swipe-down-to-dismiss via PanResponder, and Android `BackHandler` support — matching `FriendActionSheet` behavior.
- **D-04:** `Animated.loop` for pulse animation must use `isInteraction: false` to avoid blocking FlatList row rendering.

### Status Pill Component
- **D-05:** New `OwnStatusPill` component under `src/components/status/` — separate from existing read-only `StatusPill` in `src/components/friends/`. The existing `StatusPill` has no `onPress`, no animations, no empty state.
- **D-06:** Pill is passed to `ScreenHeader` via its existing `rightAction` prop slot (line 8 of ScreenHeader.tsx). HomeScreen currently uses no rightAction, so the slot is free.
- **D-07:** Pill displays: heartbeat-colored dot (green=ALIVE, yellow=FADING, gray=DEAD/none) + mood label + context tag + window + edit icon (✎).
- **D-08:** When no status is set, pill shows: user's display name + "Tap to set your status".

### Pulse Animation & Session Tracking
- **D-09:** Pulse animation gated by `AsyncStorage` key `campfire:session_count` — integer incremented on app foreground, pulse disabled when count > 3. Follows existing `campfire:` prefixed key pattern from `usePushNotifications.ts`.
- **D-10:** Pulse only fires when user has no active status (DEAD heartbeat or null currentStatus) AND session count ≤ 3.

### Atomic Removal
- **D-11:** MoodPicker and ReEngagementBanner are removed from HomeScreen in the same change. `scrollRef` + `moodPickerYRef` (HomeScreen lines 57-61) wire them together — removing one without the other creates dead refs or stale scroll targets.
- **D-12:** The "Update" action from ReEngagementBanner (scroll to MoodPicker) is replaced by the status pill tap (opens bottom sheet). No scroll-to-ref needed.
- **D-13:** Cold-start heading ("What's your status today?") is also removed — the status pill's "Tap to set your status" empty state replaces it.

### Claude's Discretion
- Sheet height, animation spring/timing curves
- Exact pill layout (horizontal arrangement of dot + text + icon)
- Backdrop opacity and animation timing
- Whether edit icon uses Unicode ✎ or an icon component

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bottom Sheet Pattern
- `src/components/friends/FriendActionSheet.tsx` — Existing Modal + Animated.timing bottom sheet pattern to replicate
- `src/components/status/MoodPicker.tsx` — Full picker component that moves into the sheet (preserve, don't rewrite)

### Status & Heartbeat
- `src/hooks/useStatus.ts` — Provides `currentStatus`, `heartbeatState`, `setStatus`, `touch`
- `src/stores/useStatusStore.ts` — Zustand store for cross-screen status sync
- `src/lib/heartbeat.ts` — `computeHeartbeatState` function (ALIVE/FADING/DEAD)

### HomeScreen (modification target)
- `src/screens/home/HomeScreen.tsx` — Master screen; remove MoodPicker, ReEngagementBanner, cold-start heading, scrollRef/moodPickerYRef wiring
- `src/components/home/ReEngagementBanner.tsx` — Being removed; understand its "Update" action flow

### Header
- `src/components/common/ScreenHeader.tsx` — Has `rightAction` prop slot for pill placement

### Persistence Pattern
- `src/hooks/usePushNotifications.ts` — Existing `AsyncStorage` with `campfire:` prefixed keys pattern

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FriendActionSheet.tsx` — Complete Modal + Animated bottom sheet (~60 lines of sheet logic), reusable as template
- `MoodPicker.tsx` — Moves into sheet as-is; only addition is optional `onCommit?: () => void` prop (3-5 lines)
- `ScreenHeader.tsx` — `rightAction` prop slot ready for pill
- `useStatusStore` — Already provides reactive `currentStatus` for pill display and sheet auto-dismiss
- `computeHeartbeatState` — Already computes ALIVE/FADING/DEAD for dot color

### Established Patterns
- All animations use RN built-in `Animated` API (zero Reanimated imports in codebase)
- AsyncStorage with `campfire:` prefixed keys for persistent flags
- Zustand stores for cross-screen state sync
- Design tokens enforced via ESLint (`COLORS`, `SPACING`, `FONT_SIZE`)
- Haptic feedback on interactive elements (`expo-haptics`)

### Integration Points
- `HomeScreen.tsx` — Remove MoodPicker/ReEngagementBanner/cold-start heading; add StatusPill to ScreenHeader rightAction; render StatusPickerSheet at root level
- `useStatus` hook — Pill reads `currentStatus` and `heartbeatState`; no changes to hook needed
- `MoodPicker` — Add optional `onCommit` prop; otherwise unchanged

</code_context>

<specifics>
## Specific Ideas

- User wants the banner to look like: "Iulian · Free 🍕 / grab a coffee · until 6pm" with edit icon
- No-status state: "Iulian / Tap to set your status"
- From mockup: status pill in top-right of header with a pulsing green dot (similar to `h-status-pill` in Ideas/campfire_pulse_screen_full.html)
- Pulse should be subtle — catches attention without being distracting
- Edit icon (✎) is permanent affordance; pulse is temporary onboarding hint

</specifics>

<deferred>
## Deferred Ideas

- Lightweight nudge ping notification — v1.4 (NUDGE-01, NUDGE-02)
- Stat strip below friend views — v1.4 (STAT-01)
- ReEngagementBanner "Keep it" / "Heads down" quick actions — replaced by pill tap; if users miss these shortcuts, consider adding to bottom sheet in future

</deferred>

---

*Phase: 01-status-pill-bottom-sheet*
*Context gathered: 2026-04-11*
