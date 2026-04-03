# Requirements: Campfire

**Defined:** 2026-04-04
**Core Value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must

## v1.2 Requirements

Requirements for v1.2 Squad & Navigation milestone. Each maps to roadmap phases.

### Squad Tab

- [ ] **SQAD-01**: User can see a segmented control (Friends / Goals) at the top of the Squad screen
- [ ] **SQAD-02**: User lands on Friends tab by default when opening Squad
- [ ] **SQAD-03**: User can switch between Friends and Goals tabs via segmented control
- [ ] **SQAD-04**: User sees their friend list with status indicators in the Friends tab
- [ ] **SQAD-05**: User can tap FAB to add a new friend from the Friends tab
- [ ] **SQAD-06**: User sees a "Friend Requests (N)" tappable row when pending requests exist
- [ ] **SQAD-07**: User can tap the requests row to navigate to the Friend Requests screen
- [ ] **SQAD-08**: User sees a "Coming soon" placeholder in the Goals tab
- [ ] **SQAD-09**: User sees pending request count badge on the Squad tab icon in bottom nav

### Navigation

- [ ] **NAV-01**: Bottom nav order is Home | Squad | Explore | Chats | Profile
- [ ] **NAV-02**: Plans tab displays as "Explore" with same functionality
- [ ] **NAV-03**: Chat tab displays as "Chats" with same functionality
- [ ] **NAV-04**: All existing navigation routes (plans, chat) work after rename

### Profile

- [ ] **PROF-01**: Profile tab no longer shows friend list section
- [ ] **PROF-02**: Profile tab no longer shows friend requests row
- [ ] **PROF-03**: Profile tab no longer shows pending request badge on tab icon

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Squad Goals

- **GOAL-01**: User can create a group goal with friends
- **GOAL-02**: User can track progress on group goals
- **GOAL-03**: User can see goal activity feed

### Squad Enhancements

- **SQAD-10**: User can search/filter friends list
- **SQAD-11**: User can access QR code from Squad tab

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Swipe gestures between top tabs | Conflicts with pull-to-refresh; unnecessary complexity for 2 tabs |
| Material Top Tabs library | Custom segmented control matches existing pattern, zero dependencies |
| Animated sliding tab indicator | Over-engineering for 2-tab control |
| Friends list search/filter | Groups of 3-15 don't need search |
| Goals tab real content | Deferred to future milestone |
| Dark mode / theming | v1.2+ (semantic color naming positions for it) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SQAD-01 | — | Pending |
| SQAD-02 | — | Pending |
| SQAD-03 | — | Pending |
| SQAD-04 | — | Pending |
| SQAD-05 | — | Pending |
| SQAD-06 | — | Pending |
| SQAD-07 | — | Pending |
| SQAD-08 | — | Pending |
| SQAD-09 | — | Pending |
| NAV-01 | — | Pending |
| NAV-02 | — | Pending |
| NAV-03 | — | Pending |
| NAV-04 | — | Pending |
| PROF-01 | — | Pending |
| PROF-02 | — | Pending |
| PROF-03 | — | Pending |

**Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after initial definition*
