---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Squad & Navigation
status: planning
stopped_at: Phase 10 context gathered
last_updated: "2026-04-03T23:01:53.782Z"
last_activity: 2026-04-04 — Roadmap created, 16 requirements mapped across 3 phases
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Phase 10 — Squad Tab

## Current Position

Milestone: v1.2 Squad & Navigation
Phase: 10 of 12 (Squad Tab)
Plan: — (ready to plan)
Status: Ready to plan
Last activity: 2026-04-04 — Roadmap created, 16 requirements mapped across 3 phases

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

- [v1.2 Research]: Use `@react-navigation/material-top-tabs` + `withLayoutContext` for Squad top tabs — custom useState toggle is explicitly wrong for screen-level navigation
- [v1.2 Research]: Install all three packages together: material-top-tabs, react-native-tab-view, react-native-pager-view via `npx expo install`
- [v1.2 Research]: `src/app/friends/` root-level Stack stays in place — only FriendsList view moves into Squad; sub-screens remain at root so tab bar hides during full-screen nav
- [v1.2 Research]: Single `usePendingRequestsCount` hook call stays in `_layout.tsx` — never call twice; pass count via Zustand if needed downstream

### Pending Todos

None.

### Blockers/Concerns

- [Phase 10]: Delete `squad.tsx` in the same commit that creates `squad/_layout.tsx` — Metro bundler ambiguity if both exist simultaneously
- [Phase 10]: FAB must be hidden on Goals sub-tab; use `useSegments` for conditional render — easy to miss
- [Phase 11]: Playwright tests coupled to old tab labels (Plans, Chat, Squad) — update locators and regenerate snapshots in the same phase as renames
- [Phase 11]: Verify `usePendingRequestsCount` has `supabase.removeChannel` cleanup when touching badge hook

## Session Continuity

Last session: 2026-04-03T23:01:53.780Z
Stopped at: Phase 10 context gathered
Resume file: .planning/phases/10-squad-tab/10-CONTEXT.md
