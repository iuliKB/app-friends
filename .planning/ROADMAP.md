# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 UI/UX Design System** — Phases 7-9 (shipped 2026-03-25)
- ✅ **v1.2 Squad & Navigation** — Phases 10-12 (shipped 2026-04-04)
- ✅ **v1.3 Liveness & Notifications** — Phases 1-5 (shipped 2026-04-10)
- 🔄 **v1.3.5 Homescreen Redesign** — Phases 1-3 (in progress)

## Archived Milestones

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-24</summary>

- [x] Phase 1: Foundation + Auth (4/4 plans) — completed 2026-03-17
- [x] Phase 2: Friends + Status (3/3 plans) — completed 2026-03-17
- [x] Phase 3: Home Screen (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Plans (3/3 plans) — completed 2026-03-18
- [x] Phase 5: Chat (2/2 plans) — completed 2026-03-18
- [x] Phase 6: Notifications + Polish (3/3 plans) — completed 2026-03-19

</details>

<details>
<summary>✅ v1.1 UI/UX Design System (Phases 7-9) — SHIPPED 2026-03-25</summary>

- [x] Phase 7: Design Tokens (2/2 plans) — completed 2026-03-24
- [x] Phase 8: Shared Components (3/3 plans) — completed 2026-03-24
- [x] Phase 9: Screen Consistency Sweep (6/6 plans) — completed 2026-03-25

</details>

<details>
<summary>✅ v1.2 Squad & Navigation (Phases 10-12) — SHIPPED 2026-04-04</summary>

- [x] Phase 10: Squad Tab (2/2 plans) — completed 2026-04-04
- [x] Phase 11: Navigation Restructure (2/2 plans) — completed 2026-04-04
- [x] Phase 12: Profile Simplification (1/1 plan) — completed 2026-04-04

</details>

<details>
<summary>✅ v1.3 Liveness & Notifications (Phases 1-5) — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Push Infrastructure & DM Entry Point (10/10 plans) — completed 2026-04-07
- [x] Phase 2: Status Liveness & TTL (6/6 plans) — completed 2026-04-08
- [x] Phase 3: Friend Went Free Loop (8/8 plans) — completed 2026-04-09
- [x] Phase 4: Morning Prompt + Squad Goals Streak (6/6 plans) — completed 2026-04-10
- [x] Phase 5: Hardware Verification Gate (2/2 plans) — completed 2026-04-10

</details>

---

## v1.3.5 Homescreen Redesign — Active Phases

- [x] **Phase 1: Status Pill & Bottom Sheet** - Replace inline MoodPicker with header pill + custom bottom sheet picker (completed 2026-04-10)
- [ ] **Phase 2: Radar View & View Toggle** - Spatial bubble layout with segmented Radar/Cards toggle and persistent preference
- [ ] **Phase 3: Card Stack View** - Swipeable friend card deck with Nudge/Skip actions slotting into Phase 2 toggle

## Phase Details

### Phase 1: Status Pill & Bottom Sheet
**Goal**: Users set and view their status exclusively through a header pill and custom bottom sheet — the inline MoodPicker and ReEngagementBanner are gone
**Depends on**: Nothing (first phase)
**Requirements**: PILL-01, PILL-02, PILL-03, PILL-04, PILL-05, PILL-06, PILL-07, HOME-03, HOME-04
**Success Criteria** (what must be TRUE):
  1. User sees a compact pill in the homescreen header at all times, showing mood + context tag + window when a status is active
  2. User taps the pill and a bottom sheet rises containing the full mood/context/window composer; selecting a window commits and dismisses the sheet automatically
  3. User with no active status sees pill text "Tap to set your status" and a first-session pulse animation draws their eye
  4. Pill dot color matches liveness state (green=ALIVE, yellow=FADING, gray=DEAD/none) and an edit icon is always visible as a tap affordance
  5. Inline MoodPicker and ReEngagementBanner are not visible anywhere on the homescreen
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — StatusPickerSheet bottom sheet + MoodPicker onCommit prop
- [x] 01-02-PLAN.md — OwnStatusPill component with pulse animation and session gate
- [x] 01-03-PLAN.md — HomeScreen wiring: remove dead code, add pill + sheet
**UI hint**: yes

### Phase 2: Radar View & View Toggle
**Goal**: Users can switch between Radar and Cards views via a persistent toggle, and Radar correctly renders up to 6 spatial friend bubbles with overflow, adapting to any screen size
**Depends on**: Phase 1
**Requirements**: RADAR-01, RADAR-02, RADAR-03, RADAR-04, RADAR-05, RADAR-06, HOME-01, HOME-02, HOME-05
**Success Criteria** (what must be TRUE):
  1. User sees a segmented toggle on the homescreen and can switch between Radar and Cards views; their last-chosen view survives an app restart
  2. Radar view displays up to 6 friends as avatar bubbles sized by status (Free=large+gradient, Busy/Maybe=smaller, DEAD=smallest+muted); layout adapts to all screen sizes via onLayout dimensions
  3. ALIVE friend bubbles show pulsing concentric ring animations; FADING bubbles render at 60% opacity with no ring
  4. When more than 6 friends exist, overflow friends appear in a horizontal scroll row below the radar with smaller avatar chips
  5. Tapping any radar bubble or overflow chip navigates directly to a DM with that friend; the old Free grid / Everyone Else two-section layout is gone
**Plans**: 4 plans
Plans:
- [ ] 02-01-PLAN.md — RadarViewToggle component + useViewPreference hook
- [ ] 02-02-PLAN.md — RadarBubble (with PulseRing) + OverflowChip components
- [ ] 02-03-PLAN.md — RadarView container with scatter algorithm and overflow row
- [ ] 02-04-PLAN.md — HomeScreen wiring: remove old grid, add toggle + radar + crossfade
**UI hint**: yes

### Phase 3: Card Stack View
**Goal**: Users can swipe through a deck of ALIVE/FADING friends, nudge any of them into a DM, or skip to reveal the next card — the deck slots into the "Cards" branch of Phase 2's toggle
**Depends on**: Phase 2
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05
**Success Criteria** (what must be TRUE):
  1. Switching to Cards view presents a swipeable deck containing only ALIVE and FADING friends (no DEAD friends), showing each friend's avatar, name, mood, context tag, and last-active time
  2. Tapping "Nudge" on any card opens a DM conversation with that friend
  3. Tapping "Skip" animates the card away and immediately reveals the next friend in the deck
  4. A counter ("2 more free") is visible on the card and updates accurately as the user skips through the deck
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Status Pill & Bottom Sheet | 3/3 | Complete   | 2026-04-10 |
| 2. Radar View & View Toggle | 0/4 | Not started | - |
| 3. Card Stack View | 0/? | Not started | - |

---
*Roadmap updated: 2026-04-11 — Phase 2 plans created (4 plans, 3 waves)*
