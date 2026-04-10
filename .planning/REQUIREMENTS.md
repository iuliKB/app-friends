# Requirements: Campfire v1.3.5 Homescreen Redesign

**Defined:** 2026-04-11
**Core Value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must

## v1.3.5 Requirements

Requirements for v1.3.5 milestone. Each maps to exactly one phase.

### Status Pill & Bottom Sheet

- [x] **PILL-01**: User sees a compact status pill in the header showing their current mood + context tag + window (e.g., "Free · grab a coffee · until 6pm")
- [x] **PILL-02**: User can tap the status pill to open a bottom sheet containing the full MoodPicker (mood selection, preset chips, window chips)
- [x] **PILL-03**: Selecting a window in the bottom sheet commits the status and auto-dismisses the sheet
- [x] **PILL-04**: Status pill shows an edit icon (✎) as a permanent visual affordance indicating it's tappable
- [x] **PILL-05**: New users (first 2-3 sessions with no active status) see a subtle pulse animation on the pill to draw attention
- [x] **PILL-06**: Status pill displays a heartbeat-colored dot (green=ALIVE, yellow=FADING, gray=DEAD/no status)
- [x] **PILL-07**: When no status is set, pill shows user's name + "Tap to set your status"

### Radar View

- [ ] **RADAR-01**: User sees a spatial bubble layout with up to 6 friends, sized by status (Free=large with colored gradient, Busy/Maybe=smaller, DEAD=smallest+muted)
- [ ] **RADAR-02**: ALIVE friends display pulsing concentric ring animations around their avatar bubble
- [ ] **RADAR-03**: FADING friends display at reduced opacity (60%) with no ring animation
- [ ] **RADAR-04**: When more than 6 friends exist, overflow friends appear in a horizontal scroll row below the radar with smaller avatar chips
- [ ] **RADAR-05**: Tapping any friend bubble or overflow chip opens a DM with that friend
- [ ] **RADAR-06**: Bubble positions are computed from container onLayout dimensions (not fixed Dimensions.get), adapting to all screen sizes

### Card Stack View

- [ ] **CARD-01**: User sees a swipeable card deck showing friend details (avatar, name, mood, context tag, last active time)
- [ ] **CARD-02**: Each card has a "Nudge" button that opens the DM conversation with that friend
- [ ] **CARD-03**: Each card has a "Skip" button that animates the card away and reveals the next friend
- [ ] **CARD-04**: Card deck only contains ALIVE and FADING friends (DEAD friends are excluded to avoid skip fatigue)
- [ ] **CARD-05**: Card shows remaining count ("2 more free") updating as user skips through

### Homescreen General

- [ ] **HOME-01**: User can switch between Radar and Cards views via a segmented toggle control
- [ ] **HOME-02**: View preference (Radar or Cards) persists across sessions via AsyncStorage
- [x] **HOME-03**: Inline MoodPicker is removed from the homescreen (status setting only via bottom sheet)
- [x] **HOME-04**: ReEngagementBanner is removed (status pill replaces its function)
- [ ] **HOME-05**: Two-section friend split (Free grid + Everyone Else) is replaced by the unified Radar/Cards views

## v1.4 Requirements (Deferred)

Tracked but not in current roadmap.

### Lightweight Nudge

- **NUDGE-01**: User can send a lightweight "ping" notification to a friend without composing a message
- **NUDGE-02**: Nudged friend receives a push notification ("Iulian nudged you!")

### Stat Strip

- **STAT-01**: User sees stat pills below the friend view (Free tonight count, streak, goals progress)

### Status Enhancements

- **LOCK-01**: True lock-screen action buttons that mutate status WITHOUT opening the app (requires HMAC/JWT-signed public Edge Function)

## Out of Scope

Explicitly excluded.

| Feature | Reason |
|---------|--------|
| Force-directed / physics bubble layout | Non-deterministic, breaks visual regression, expensive on JS thread |
| Auto-send DM on swipe | Accidental swipes send unexpected messages — anti-feature |
| DEAD friends in card deck | Skip fatigue; deck should only show actionable friends |
| Stacked bottom sheets | NN/g flags as navigation anti-pattern |
| @gorhom/bottom-sheet | Broken on Reanimated v4 (5+ GitHub issues, no fix timeline) |
| Stat strip widgets | Deferred to v1.4 |
| Habits / IOUs widgets | v2+ features from mockup |
| Navigation tab changes | Keep current 5-tab layout |
| New npm dependencies for bottom sheet | Custom implementation using existing Reanimated + Gesture Handler |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PILL-01 | Phase 1 | Complete |
| PILL-02 | Phase 1 | Complete |
| PILL-03 | Phase 1 | Complete |
| PILL-04 | Phase 1 | Complete |
| PILL-05 | Phase 1 | Complete |
| PILL-06 | Phase 1 | Complete |
| PILL-07 | Phase 1 | Complete |
| HOME-03 | Phase 1 | Complete |
| HOME-04 | Phase 1 | Complete |
| RADAR-01 | Phase 2 | Pending |
| RADAR-02 | Phase 2 | Pending |
| RADAR-03 | Phase 2 | Pending |
| RADAR-04 | Phase 2 | Pending |
| RADAR-05 | Phase 2 | Pending |
| RADAR-06 | Phase 2 | Pending |
| HOME-01 | Phase 2 | Pending |
| HOME-02 | Phase 2 | Pending |
| HOME-05 | Phase 2 | Pending |
| CARD-01 | Phase 3 | Pending |
| CARD-02 | Phase 3 | Pending |
| CARD-03 | Phase 3 | Pending |
| CARD-04 | Phase 3 | Pending |
| CARD-05 | Phase 3 | Pending |

**Coverage:**
- v1.3.5 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-04-11*
*Traceability updated: 2026-04-10*
