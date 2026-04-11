# Phase 3: Card Stack View - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can swipe through a deck of ALIVE/FADING friends, nudge any of them into a DM, or skip to reveal the next card. The deck slots into the "Cards" branch of Phase 2's toggle, replacing the placeholder. DEAD friends are excluded from the deck.

</domain>

<decisions>
## Implementation Decisions

### Card Visual Design
- **D-01:** Compact centered card (~80% screen width), not full-width — breathing room around edges
- **D-02:** Medium avatar (64px) on the left, name + mood + context tag + last-active time stacked to the right
- **D-03:** Last-active time shown as secondary text below mood/context tag (e.g., "2h ago", "just now") for all friends
- **D-04:** Status-colored gradient covering the full card (status color at 15-20% opacity to transparent)
- **D-05:** Extra rounded corners (RADII.xl or 20px) — more playful than the standard RADII.lg
- **D-06:** 1-2 cards visible behind the front card, slightly offset and scaled down (visible stack depth effect)

### Swipe & Animation
- **D-07:** Horizontal swipe only — both left and right swipe dismiss/skip the card. Nudge is button-only
- **D-08:** Uses React Native Gesture Handler + Reanimated for fluid gesture handling (new dependency)
- **D-09:** Card exit animation: fly off screen in swipe direction with slight rotation (Tinder-style)
- **D-10:** Swipe down to undo — brings back the last dismissed card as a safety net for accidental skips

### Deck Behavior
- **D-11:** Deck auto-loops back to the first card when you reach the end — always something to swipe
- **D-12:** Counter displayed above the deck (separate from card content), showing remaining count like "2 more free"
- **D-13:** Only ALIVE and FADING friends in the deck — DEAD friends excluded entirely

### Nudge vs Skip Actions
- **D-14:** Nudge opens DM directly — same `supabase.rpc('get_or_create_dm_channel')` as radar bubbles. No pre-filled message
- **D-15:** Icon + text combo buttons below the card — icon buttons with small labels underneath (X/Skip and chat-bubble/Nudge)
- **D-16:** Swiping in either direction = Skip. Nudge is exclusively via the button — prevents accidental DM opens from swipes

### Claude's Discretion
- Stack card offset and scale values for visible depth effect
- Swipe threshold distance before card dismisses
- Rotation angle during fly-off animation
- Undo animation (how the card returns)
- Button icon choices and exact sizing
- Counter text formatting and position

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 integration
- `.planning/phases/02-radar-view-view-toggle/02-CONTEXT.md` — Toggle, crossfade, and view preference decisions that Phase 3 must integrate with
- `src/screens/home/HomeScreen.tsx` — Current crossfade wiring with placeholder to replace
- `src/components/home/RadarViewToggle.tsx` — Toggle component, ViewPreference type

### Existing patterns
- `src/components/home/HomeFriendCard.tsx` — Friend card data display pattern (mood labels, heartbeat, DM navigation, action sheet)
- `src/components/home/RadarBubble.tsx` — DM navigation via `get_or_create_dm_channel`, status color map
- `src/hooks/useViewPreference.ts` — View preference persistence hook
- `src/lib/heartbeat.ts` — `computeHeartbeatState`, `formatDistanceToNow`
- `src/lib/action-sheet.ts` — `showActionSheet` utility

### Design tokens
- `src/theme/` — COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII tokens

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HomeFriendCard`: mood label formatting, heartbeat computation, DM navigation pattern — reuse the data display logic
- `AvatarCircle`: avatar rendering component used everywhere
- `RadarBubble`: status color map (STATUS_COLORS), gradient colors (GRADIENT_COLORS) — can reuse for card gradients
- `useViewPreference`: hook that manages radar/cards toggle state
- `computeHeartbeatState` + `formatDistanceToNow`: heartbeat and time formatting

### Established Patterns
- DM navigation: `supabase.rpc('get_or_create_dm_channel')` → `router.push(/chat/${channelId})`
- Status colors: `COLORS.status.free/maybe/busy` for status-specific UI
- Animation: `Animated.timing` with `isInteraction: false` on loops (STATE.md locked decision)
- Haptic feedback: `ImpactFeedbackStyle.Light` on interactive elements

### Integration Points
- HomeScreen.tsx line 127-130: Replace `cardsPlaceholder` View with CardStackView component
- The crossfade animation from Phase 2 wraps this — CardStackView just needs to render inside the Animated.View

</code_context>

<specifics>
## Specific Ideas

- Cards should feel like a dating app card stack (Tinder/Bumble mental model) but for friends
- The visible stack behind the front card creates anticipation of who's next
- Auto-loop means you're never "done" — can always cycle back to someone you skipped

</specifics>

<deferred>
## Deferred Ideas

- Send a nudge push notification instead of just opening DM — future enhancement
- Pre-filled nudge message ("Hey, want to hang?") — future enhancement
- End-of-deck summary showing who was nudged vs skipped — future enhancement

</deferred>

---

*Phase: 03-card-stack-view*
*Context gathered: 2026-04-11*
