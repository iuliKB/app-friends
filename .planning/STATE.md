---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Chat & Profile
status: defining_requirements
stopped_at: —
last_updated: "2026-04-20T00:00:00.000Z"
last_activity: 2026-04-20
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Defining requirements for v1.5

## Current Position

Milestone: v1.5 Chat & Profile
Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-20 — Milestone v1.5 started

Progress: [░░░░░░░░░░] 0%

## Phase Structure

(To be created by roadmapper)

## Performance Metrics

Plans executed this milestone: 0
Phases completed: 0/?
Requirements covered: 0/? mapped

## Accumulated Context

### Decisions

- [v1.3.5]: Status setting consolidated to one location — bottom sheet via header status pill (MoodPicker and ReEngagementBanner removed from HomeScreen)
- [v1.3.5]: Bottom sheet must be custom implementation — @gorhom/bottom-sheet is broken on Reanimated v4; use Modal + Animated.timing following FriendActionSheet pattern (D-01)
- [v1.3.5]: Nudge = DM shortcut (opens existing DM conversation); lightweight ping notification deferred to v1.4
- [v1.4]: IOU amounts stored as INTEGER cents — float arithmetic causes phantom debts
- [v1.4]: create_expense() atomic RPC — two chained client inserts risk orphan records
- [v1.4]: Birthday stored as birthday_month + birthday_day + birthday_year smallint columns
- [v1.4]: Squad Dashboard: single outer FlatList with feature cards in ListFooterComponent
- [v1.4]: fetch().arrayBuffer() for Supabase Storage uploads in RN (FormData + file:// URI fails)
- [v1.4]: Group chat participants via tappable header title (Messenger pattern)
- [v1.5]: Status duplication confirmed — status exists on both Home and Profile; user wants to consolidate to Home only

### Roadmap Evolution

- v1.3.5 Phase 4 added: Upcoming Events Section
- v1.4 roadmap created: 7 phases (5-11), 12 requirements + birthday social layer, 100% coverage
- v1.5 roadmap: to be created

### Pending Todos

(none carried forward)

### Blockers/Concerns

(none active)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| Phase 11-birthday-feature | All 8 plans complete | 2026-04-17 | 7bff878 | phases/11-birthday-feature |

## Session Continuity

Last session: 2026-04-20
Stopped at: Starting milestone v1.5 requirements definition
