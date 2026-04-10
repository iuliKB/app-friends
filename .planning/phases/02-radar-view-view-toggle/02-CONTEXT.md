# Phase 2: Radar View & View Toggle - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can switch between Radar and Cards views via a persistent toggle, and Radar correctly renders up to 6 spatial friend bubbles with overflow, adapting to any screen size. The Cards view itself is Phase 3 — this phase builds the toggle infrastructure and the Radar view.

</domain>

<decisions>
## Implementation Decisions

### Bubble Layout
- **D-01:** Organic scatter layout — bubbles placed in semi-random, non-overlapping positions (not a ring or grid pattern)
- **D-02:** 3-tier sizing: Free = large (64px), Maybe = medium (48px), Busy/DEAD = smallest (36px)
- **D-03:** Positions randomized on each HomeScreen mount (no deterministic seeding from friend_id)
- **D-04:** No self-avatar in the radar center — just friends. User's own status is shown in the OwnStatusCard above
- **D-05:** Animated resize when a friend's status changes (smooth scale transition, not snap)
- **D-06:** Grid-cells + offset algorithm for non-overlapping placement: divide container into grid (e.g., 3x2 for 6 slots), offset each bubble randomly within its cell. Uses onLayout dimensions (RADAR-06)
- **D-07:** Subtle depth effect — bubbles higher in container appear slightly smaller/more muted, giving a sense of distance

### Radar Visual Style
- **D-08:** Plain dark background (COLORS.surface.base) — no concentric rings or gradient glow
- **D-09:** ALIVE friends show a single pulse ring expanding outward from the bubble and fading (like a heartbeat ping)
- **D-10:** Pulse ring color matches status: green (Free), yellow (Maybe), red (Busy) — consistent with heartbeat dot colors
- **D-11:** Free bubbles have a subtle status-colored gradient background behind the avatar (green-to-transparent). Eye-catching indicator of who's free
- **D-12:** Always show friend's display name below each bubble (small text)
- **D-13:** FADING friends at 60% opacity, no pulse ring (per RADAR-03)

### Toggle & Transition
- **D-14:** Radar/Cards segmented toggle placed below OwnStatusCard, above the friend view. Reading order: header → status card → toggle → friends
- **D-15:** View switch uses crossfade animation (200-300ms). Old view fades out, new view fades in
- **D-16:** Toggle matches existing SegmentedControl style (dark card background, rounded segments, colored active state — COLORS.surface.card, RADII.md)
- **D-17:** View preference persisted via AsyncStorage with `campfire:` prefix key (HOME-02)

### Bubble Interactions
- **D-18:** Tap any bubble → open DM with that friend (same supabase.rpc('get_or_create_dm_channel') pattern as HomeFriendCard)
- **D-19:** Long-press shows same action sheet as HomeFriendCard: "View profile" + "Plan with [name]..."
- **D-20:** Overflow row (7+ friends) shows small avatars with a tiny colored status dot. Horizontal scroll.
- **D-21:** Tapping an overflow chip opens DM (same as bubble tap). Consistent across all friend representations.
- **D-22:** Radar container has fixed height (~300-350px). Overflow row always visible below. Scrolls with content.

### Claude's Discretion
- Exact grid cell dimensions and offset ranges for scatter algorithm
- Pulse ring animation timing (duration, opacity curve, ring expansion size)
- Gradient background opacity and falloff for Free bubbles
- Depth effect scaling factor (how much smaller/muted higher bubbles get)
- Crossfade easing curve
- Overflow chip size (32-36px range)
- Exact container height within 300-350px range

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Friend Display Pattern
- `src/components/home/HomeFriendCard.tsx` — Current friend card with tap-to-DM, long-press action sheet, heartbeat computation, status label formatting
- `src/components/common/AvatarCircle.tsx` — Reusable avatar with size prop, image/initials fallback, optional onPress
- `src/lib/action-sheet.ts` — `showActionSheet` utility for long-press menus

### Status & Heartbeat
- `src/hooks/useStatus.ts` — Provides `currentStatus`, `heartbeatState`
- `src/stores/useStatusStore.ts` — Zustand store for cross-screen status sync
- `src/lib/heartbeat.ts` — `computeHeartbeatState` (ALIVE/FADING/DEAD), `formatDistanceToNow`
- `src/hooks/useFriends.ts` — `FriendWithStatus` type, friend data with status fields

### HomeScreen (modification target)
- `src/screens/home/HomeScreen.tsx` — Master screen; current FlatList grid layout to be replaced by toggle + radar/cards view
- `src/components/status/OwnStatusCard.tsx` — Status card above the toggle

### Existing Toggle
- `src/components/status/SegmentedControl.tsx` — Existing segmented control pattern to replicate for Radar/Cards toggle (styling, haptics)

### Persistence
- `src/hooks/usePushNotifications.ts` — AsyncStorage `campfire:` prefix key pattern

### Theme
- `src/theme/colors.ts` — Status colors (free=#22c55e, maybe=#eab308, busy=#ef4444)
- `src/theme/radii.ts` — RADII.full for circular avatars

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AvatarCircle` — Takes size, imageUri, displayName, onPress. Directly usable for radar bubbles at different sizes
- `HomeFriendCard` — Tap-to-DM and long-press action sheet logic to extract/reuse
- `SegmentedControl` — Style pattern (container, segments, active state) to replicate for Radar/Cards toggle
- `computeHeartbeatState` — Already determines ALIVE/FADING/DEAD from status timestamps
- `showActionSheet` — Existing action sheet utility for long-press menus
- `formatWindowLabel` — Time formatting for status display

### Established Patterns
- All animations use RN built-in `Animated` API (zero Reanimated imports)
- Design tokens enforced via ESLint (COLORS, SPACING, FONT_SIZE, RADII)
- Haptic feedback on interactive elements (expo-haptics) — used in SegmentedControl
- Zustand stores for cross-screen state sync
- AsyncStorage with `campfire:` prefix for persistent flags

### Integration Points
- HomeScreen ScrollView — Replace current FlatList grid (freeFriends + otherFriends sections) with toggle + RadarView/CardsView
- `useHomeScreen` hook — Already provides `friends`, `freeFriends`, `otherFriends` data
- Navigation — `router.push` for DM and profile navigation (same as HomeFriendCard)

</code_context>

<specifics>
## Specific Ideas

- Organic scatter should feel alive and casual — not rigid or grid-like
- Depth effect gives a "radar" feeling without needing concentric circles
- Plain dark background lets the colored gradients and pulse rings pop
- The toggle should feel like a natural extension of the existing SegmentedControl design language
- Overflow row is secondary — main radar is the hero element

</specifics>

<deferred>
## Deferred Ideas

- Cards view implementation — Phase 3 (this phase creates the toggle and Radar only; Cards shows a placeholder or "Coming soon")
- Nudge button on bubbles — v1.4 (NUDGE-01, NUDGE-02)
- Stat strip below radar — v1.4 (STAT-01)

</deferred>

---

*Phase: 02-radar-view-view-toggle*
*Context gathered: 2026-04-11*
