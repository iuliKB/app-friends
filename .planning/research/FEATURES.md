# Feature Research

**Domain:** Social coordination app homescreen redesign — friend availability display (Campfire v1.3.5)
**Researched:** 2026-04-10
**Confidence:** MEDIUM — bubble/radar and card-stack patterns are established across apps like Snap Map, Zenly, and Tinder-derivatives; bottom sheet and status pill patterns are HIGH confidence from NN/g and Material Design official docs; specific implementation tradeoffs for Expo managed workflow are MEDIUM (verified via docs, not production data)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist. Missing any of these makes the redesigned homescreen feel broken or half-finished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Own status visible in header without scrolling | Any liveness-aware social app shows your state at a glance (Snapchat Bitmoji ring color, Instagram Active dot, Discord status badge) | LOW | Status pill in header. Text label + color/ring encoding. Must be present on cold open. |
| Header status pill is tappable for quick edit | A visible status element implies editability — users will tap it immediately | LOW | Must navigate to (or open) the status picker. Dead tap = frustrated user. |
| Dismiss bottom sheet by swipe-down | Material Design and iOS HIG both establish this as the standard contract for modal sheets | LOW | Also requires a visible drag handle and a Close/X button per NN/g guidelines — swipe alone is insufficient. |
| Drag handle on bottom sheet | Visual affordance that the sheet is interactive. Omitting it makes dismissal feel broken. | LOW | Standard 32–40px pill handle centered at top of sheet. |
| Avatars in bubble/radar view represent a real person | Circles without avatar content look like placeholders, not people | LOW | Initials fallback required when no avatar photo uploaded. |
| Status label on or near each friend bubble | Encoding status via size alone is inaccessible and ambiguous; a label or color ring is expected | LOW | Small text badge or status color ring below bubble. |
| Card swipe actions are labeled or iconically clear | Unlabeled swipe directions cause ~20–30% action errors (source: usability studies on card UI) | LOW | Nudge (DM icon + label) and Skip (arrow icon + label) must be visible, not hidden behind gesture-discovery. |
| Empty state when no friends have active status | Blank radar/card view with no guidance reads as broken | LOW | Depends on existing empty state components already built. Copy: "No one's active right now." with pull-to-refresh. |
| View toggle preference persists across sessions | Switching to Cards and reopening the app should remember the choice — standard mobile pattern (Airbnb map/list, Spotify grid/list) | LOW | AsyncStorage key for preferred view. |
| ReEngagementBanner removed when status pill replaces it | Two competing "set your status" surfaces on the same screen creates confusion | LOW | ReEngagementBanner (v1.3) must be removed or suppressed when status pill is present. |

### Differentiators (Competitive Advantage)

Features that make Campfire's homescreen notably better than a simple friend list redesign.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Bubble size encodes status tier | Free friends pop visually without reading text — instant hierarchy at a glance. Zenly proved spatial encoding of social presence drives engagement. Meta's Friend Bubbles experiment showed friend-social signals increase session depth. | MEDIUM | Size tiers: Free = large, Maybe = medium, Busy = small. Fixed ratios, not dynamic physics. |
| Pulse ring animation on ALIVE heartbeat | Communicates liveness as motion — an ALIVE Free friend pulses; a FADING one doesn't. Intuitive without reading any copy. | MEDIUM | Reanimated withRepeat loop. Ring fades for FADING, absent for DEAD. Ties directly into existing effective_status view. |
| Cards view as deliberate action queue, not aimless browsing | Framing swipe cards as "who needs a nudge?" gives each interaction semantic purpose, unlike Tinder's binary yes/no discovery. Nudge = DM, Skip = not now, come back. | MEDIUM | Key differentiator from card-stack dark patterns. Skip reorders queue in local Zustand state; does not permanently dismiss. |
| Horizontal scroll overflow at 7+ friends in radar | Keeps radar uncluttered for typical 3–6 person groups while gracefully handling larger squads. Partial card bleed signals scrollability. | MEDIUM | FlatList horizontal, snapToInterval. Top 6 shown by default, sorted Free > Maybe > Busy, then by recent activity. |
| Status bottom sheet with full Mood + Context + Window composition | Full-height sheet gives room for the three-stage composer without collapsing it into a cramped inline row. 25–30% higher engagement than modal overlays (LogRocket/Plotline analysis). | MEDIUM | Replaces inline MoodPicker. Sheet collapses/dismisses after submission. Header pill updates to reflect new status immediately. |
| Edit-hint pulse beacon on first open | Animated pulsing ring around status pill teaches the interaction without a modal walkthrough or tooltip overlay. | LOW | 1.2–1.6s loop per established onboarding beacon pattern (Duolingo, Notion). AsyncStorage completion flag prevents repeat. Dismiss on first tap. |
| Unified friends section (no Free / Everyone Else split) | Removes the cognitive split from v1.3 Home. All friends in one spatial view, sorted by availability. Reduces the "Everyone Else" stigma. | LOW | Sort order: Free (ALIVE) → Free (FADING) → Maybe → Busy → DEAD. Within tier: recency of status set. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Force-directed / physics bubble layout | Organic, alive look. Seen in concept designs and Zenly-inspired mockups. | Computationally expensive on the React Native JS thread; bubbles overlap unpredictably at small counts (3 friends); layout is non-deterministic, which breaks visual regression tests and makes snapshot testing impossible. | Fixed radial/grid of circles with absolute positions. Top N slots assigned by status tier. Simple, testable, performant. |
| Infinite card stack with all friends regardless of status | Feels comprehensive — no one is missed | Swipe fatigue sets in after 5–7 cards. At 12 friends, the stack becomes a chore, not a glance. Card stacks work for discovery (Tinder) not coordination. Forcing DEAD-status friends into the queue adds irrelevant cards. | Show only ALIVE and FADING friends in the card queue. Skip brings them to the bottom of the queue, not permanently dismissed. DEAD friends don't appear until status refreshes. |
| Left/right directional swipe with hidden meaning | Mimics Tinder familiarity | Left = reject, right = like is romantic-context baggage that conflicts with "nudge a friend" framing. Users will hesitate on "what does left mean here?" | Vertical swipe or explicit button row: Nudge (DM icon) and Skip (forward arrow). Make direction semantic or use buttons, not assumed cultural mapping. |
| Stacked bottom sheets (sheet opens another sheet) | Seems like natural drill-down for sub-actions | NN/g explicitly flags this as a navigation anti-pattern that destroys the user's mental model. Android Back button behavior breaks. iOS sheet presentation stacking creates dismissal confusion. | Navigate to a new screen for sub-workflows, or use inline expansion within one sheet. |
| Frequent realtime bubble position redraws | Feels alive and reactive | Layout thrash every time any friend's status changes causes visual jitter and drains battery. Campfire's single Realtime channel (200-connection limit) cannot support per-friend subscriptions driving layout changes. | Batch-refresh on focus: pull-to-refresh and on-foreground using existing architecture. Animate bubble in/out when status tier changes, not continuous repositioning. |
| Animated radar sweep or rotating ring decoration | Looks dynamic in mockups | Constant motion with no informational value is distracting and accessibility-hostile (vestibular disorder trigger). Animated backgrounds are cited as a top mobile UX complaint. | Static radial layout + purposeful pulse ring on ALIVE bubbles only. Motion is earned, not decorative. |
| Auto-send nudge DM on swipe with no confirmation | Streamlines the interaction | Accidental swipes send unexpected DMs to friends. Users learn to fear the card stack and stop using it. This is the card stack's most cited UX frustration in coordination contexts. | Swipe initiates DM thread navigation with nudge text pre-composed; user confirms by sending. Or: Nudge button (not swipe) sends a lightweight ephemeral "thinking of you" ping distinct from a full DM. |
| Status pill that opens a full-screen modal | Familiar from some apps | Full-screen modal loses context of the homescreen. Users can't reference who is free while picking a status. Bottom sheet preserves background context — a key bottom sheet advantage per Material Design rationale. | Bottom sheet that slides up partially; homescreen dimmed but visible behind it. |

---

## Feature Dependencies

```
Status pill (header)
    └──displays──> own effective_status (ALIVE/FADING/DEAD) [existing: effective_status view]
    └──taps──> Bottom sheet status picker

Bottom sheet status picker
    └──replaces──> Inline MoodPicker [existing: to be removed]
    └──submits to──> status_history table [existing]
    └──resets──> heartbeat [existing]
    └──updates──> header pill immediately (optimistic local state)

ReEngagementBanner
    └──conflicts with──> Status pill (both prompt status action)
    └──resolution──> Remove ReEngagementBanner from Home when pill is present

Radar view
    └──reads──> friend effective_status [existing: effective_status view via Zustand store]
    └──sizes bubbles by──> status tier (Free = large, Maybe = medium, Busy = small)
    └──animates ring by──> heartbeat liveness (ALIVE = pulsing ring, FADING = static dim ring, DEAD = no ring)
    └──overflow at 7+──> horizontal FlatList with snapToInterval

Card stack view
    └──reads──> same friend effective_status source as Radar (shared Zustand store)
    └──Nudge action──> opens DM thread [existing: HomeFriendCard tap → DM, v1.3]
    └──Skip action──> reorders queue in local Zustand state (no server call)
    └──filters──> only ALIVE/FADING friends shown; DEAD friends excluded from queue

View toggle (Radar ↔ Cards)
    └──persists to──> AsyncStorage preference key
    └──independent of──> data source (both views share same friend list)

Edit-hint pulse (onboarding)
    └──fires when──> user has never tapped status pill (AsyncStorage flag absent)
    └──targets──> Status pill in header
    └──clears after──> first tap on pill
    └──conflicts with──> showing beacon when status is already ALIVE (don't beacon an active user)
```

### Dependency Notes

- **Bottom sheet requires MoodPicker removal:** Both cannot coexist on the same screen. Must ship in the same phase — shipping the sheet without removing MoodPicker doubles the status-setting surface.
- **ReEngagementBanner conflicts with status pill:** Both serve as "set your status" prompts. Remove ReEngagementBanner from Home when the header pill is in place.
- **Radar and Card views share one data source:** Both consume `effective_status` via the existing Zustand store. No new backend work. View toggle is a pure rendering concern.
- **Nudge (card swipe) requires existing DM entry point:** HomeFriendCard tap-to-DM (v1.3) is the dependency. Card stack Nudge navigates to the same DM thread — reuses existing routing.
- **Pulse ring requires Reanimated:** Already in the Expo managed workflow dependency tree (used for existing FAB spring animation). No new native modules.
- **Edit-hint pulse should not fire for returning active users:** Only beacon when the user has no current ALIVE/FADING status set AND has never tapped the pill before. Guard both conditions.

---

## MVP Definition

### Launch With (this milestone — v1.3.5)

- [ ] Status pill in header — tappable, shows own mood + freshness ring — essential for replacing ReEngagementBanner as the primary status CTA
- [ ] Bottom sheet status picker — replaces inline MoodPicker, full Mood + Context + Window composition — highest-impact UX improvement in the milestone
- [ ] ReEngagementBanner removal from Home — required to avoid duplicate prompts
- [ ] Radar view — fixed bubble grid with status-tier sizing and ALIVE pulse rings, top 6 friends, overflow scroll — core visual identity
- [ ] Card stack view — swipeable cards with labeled Nudge / Skip actions, ALIVE/FADING only — provides alternative engagement mode
- [ ] View toggle (Radar ↔ Cards) — persistent to AsyncStorage
- [ ] Horizontal scroll overflow for 7+ friends in radar
- [ ] Edit-hint pulse beacon on first open — one-time, AsyncStorage-gated

### Add After Validation (v1.4+)

- [ ] Bubble tap → mini profile sheet — tap a friend bubble to see full status + DM button inline, without leaving the homescreen. Adds depth once core layout proves out with users.
- [ ] Card queue filtering toggle — show all friends vs ALIVE/FADING only. Add if user feedback surfaces "I want to see my Busy friends too."
- [ ] Haptic feedback on Nudge/Skip — light haptic on Nudge, medium on Skip via Expo Haptics. Add after core interactions stabilize.
- [ ] Animated bubble entrance (BounceIn) when friend status changes while app is foregrounded — adds liveness without continuous repositioning.

### Future Consideration (v2+)

- [ ] Map-based spatial view with real geo-coordinates — explicitly out of scope per PROJECT.md (V2, requires location permissions, high complexity).
- [ ] Status reactions from friends (emoji react to friend's status) — new DB schema, new notification type, new UI.
- [ ] Group-filtered radar (show only friends in a specific plan) — high coordination value, complex data joins with plans table.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Status pill in header | HIGH | LOW | P1 |
| Bottom sheet status picker | HIGH | MEDIUM | P1 |
| ReEngagementBanner removal | HIGH (conflict avoidance) | LOW | P1 |
| Radar view (sizing + pulse ring) | HIGH | MEDIUM | P1 |
| View toggle (Radar ↔ Cards) | MEDIUM | LOW | P1 |
| Card stack view (Nudge / Skip) | MEDIUM | MEDIUM | P1 |
| Horizontal scroll overflow | MEDIUM | LOW | P1 |
| Edit-hint pulse beacon | LOW | LOW | P1 (low cost, good first-run UX) |
| Bubble tap → mini profile sheet | HIGH | MEDIUM | P2 |
| Haptic feedback on swipe | LOW | LOW | P2 |
| Card queue filtering toggle | MEDIUM | LOW | P2 |

**Priority key:** P1 = this milestone, P2 = v1.4 after validation, P3 = v2+

---

## Competitor / Reference App Analysis

| Pattern | Reference App | What They Do | Campfire Approach |
|---------|---------------|--------------|-------------------|
| Spatial friend bubbles | Zenly (shut down 2023), Snap Map | Friend avatars on a geographic map, sized/colored by activity type; carousel swipe between friends on the map | Non-map radial grid; size encodes availability tier not geography; no location permission required |
| Animated social presence bubbles | Meta Friend Bubbles on Reels (2026) | Circular friend avatars surface friend-engaged content; spatial grouping by interaction strength; boosts session depth | Availability-focused bubbles (not content); same spatial logic applied to presence signal instead of content signal |
| Status indicator in header | Instagram (Active Now green dot on avatar), Discord (status badge on avatar, colored by state) | Always-visible own status on avatar in header or nav | Pill in header with mood text + color ring; more expressive than a dot; tappable for full composer |
| Bottom sheet as selection UI | Spotify (queue/playlist picker), Apple Maps (place detail sheet), Instagram (share sheet) | Snap to half/full height; swipeable dismiss; grab handle; preserves background context | Fixed-height sheet for status composition; dismisses after submission; header pill updates immediately |
| Swipeable card stack | Tinder, Hinge, Bumble (dating), Lunchclub (networking) | Left/right swipe = binary decision; game-like velocity; infinite supply of cards | Vertical swipe or button row; semantic actions (Nudge = DM, Skip = later); finite queue of ALIVE/FADING friends only |
| View toggle persistence | Airbnb (map/list toggle), Spotify (grid/list), Google Photos (grid density) | Toggle in header or toolbar; persists to session or AsyncStorage | Header toggle between Radar and Cards; persisted to AsyncStorage |
| Onboarding pulse beacon | Duolingo (new feature spotlight), Notion (tooltip hotspot), Gmail (new feature ring) | Pulsing ring on interactive element; fires once; dismissed by tap or after timeout | Pulse on status pill on first open when user has no active status; AsyncStorage gating so it never repeats |

---

## Sources

- NN/g Bottom Sheet UX Guidelines: https://www.nngroup.com/articles/bottom-sheet/
- LogRocket — Bottom Sheet design best practices: https://blog.logrocket.com/ux-design/bottom-sheets-optimized-ux/
- Plotline — Mobile App Bottom Sheets examples: https://www.plotline.so/blog/mobile-app-bottom-sheets/
- Mobbin Bottom Sheet pattern library: https://mobbin.com/glossary/bottom-sheet
- Material Design — Sheets: bottom: https://m2.material.io/components/sheets-bottom
- Meta Engineering — Friend Bubbles on Reels (2026): https://engineering.fb.com/2026/03/18/ml-applications/friend-bubbles-enhancing-social-discovery-on-facebook-reels/
- TechCrunch — How Zenly made social maps cool again (2022): https://techcrunch.com/2022/04/22/how-zenly-made-social-maps-cool-again-and-whats-next/
- Snap Map Bitmoji / activity indicator patterns: https://9meters.com/entertainment/social-media/snap-map-bitmoji-meanings-icons-and-symbols-explained
- Snapchat UI Design Critique (Shreesa Shrestha, Medium): https://medium.com/@shreesashrestha/snapchat-unfiltered-a-design-critique-of-ux-ui-challenges-65d929ae8bd1
- UX Movement — List vs Grid View on mobile: https://uxmovement.com/mobile/list-vs-grid-view-when-to-use-which-on-mobile/
- Appcues — User Onboarding UX patterns (beacon/hotspot): https://www.appcues.com/blog/user-onboarding-ui-ux-patterns
- React Native Reanimated docs (layout + loop animations): https://docs.swmansion.com/react-native-reanimated/
- Campfire PROJECT.md: /Users/iulian/Develop/campfire/.planning/PROJECT.md

---
*Feature research for: Campfire v1.3.5 homescreen redesign (social coordination, friend availability display)*
*Researched: 2026-04-10*
