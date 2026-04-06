---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Liveness & Notifications
status: defining_requirements
stopped_at: Milestone v1.3 started — gathering requirements
last_updated: "2026-04-06T00:00:00.000Z"
last_activity: 2026-04-06 — Milestone v1.3 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** v1.3 Liveness & Notifications — defining requirements

## Current Position

Milestone: v1.3 Liveness & Notifications
Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-06 — Milestone v1.3 started

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

- [v1.2 Research]: Use `@react-navigation/material-top-tabs` + `withLayoutContext` for Squad top tabs — custom useState toggle is explicitly wrong for screen-level navigation
- [v1.2 Research]: Install all three packages together: material-top-tabs, react-native-tab-view, react-native-pager-view via `npx expo install`
- [v1.2 Research]: `src/app/friends/` root-level Stack stays in place — only FriendsList view moves into Squad; sub-screens remain at root so tab bar hides during full-screen nav
- [v1.2 Research]: Single `usePendingRequestsCount` hook call stays in `_layout.tsx` — never call twice; pass count via Zustand if needed downstream
- [Phase 10-squad-tab]: Squad tab uses useState toggle for Friends/Goals (not navigator) — FriendsList only mounted on friends tab so FAB hides automatically
- [Phase 10-squad-tab]: Pending request badge moved from Profile to Squad tab in _layout.tsx
- [Phase Phase 10-squad-tab]: User approved all 5 verification steps for Squad tab — visual and functional correctness confirmed on device
- [Phase 11-navigation-restructure]: Title-only rename: change title/icon props only, no file/directory renames — keeps route segments stable and zero push call site changes
- [Phase 11-navigation-restructure]: Playwright snapshot flakiness fix: increase waitForTimeout to 2000ms on data-heavy screens (Explore/Chats/Squad/Profile) to prevent loading-spinner captures as baselines
- [Phase 11-navigation-restructure]: User approved all 8 device verification steps — Home|Squad|Explore|Chats|Profile tab order, icons, deep nav, and badges all confirmed correct on device
- [Phase 12-profile-simplification]: Profile screen is now purely self-focused — all friend management delegated to Squad tab; app version read from Constants.expoConfig?.version single-sourced in app.config.ts 1.2.0
- [Phase 12-profile-simplification]: User approved device verification — no FRIENDS section, @username visible, QR Code row present, ACCOUNT section shows email + member since, SETTINGS header, version text at bottom

### Pending Todos

None.

### Blockers/Concerns

- [Phase 10]: Delete `squad.tsx` in the same commit that creates `squad/_layout.tsx` — Metro bundler ambiguity if both exist simultaneously
- [Phase 10]: FAB must be hidden on Goals sub-tab; use `useSegments` for conditional render — easy to miss
- [Phase 11 RESOLVED]: Playwright tests updated with new locators and all 7 baselines regenerated — 7/7 passing
- [Phase 11 RESOLVED]: Navigation restructure confirmed on device by user — all 8 verification steps approved

## Session Continuity

Last session: 2026-04-04T15:00:00.000Z
Stopped at: Completed 12-01-PLAN.md — v1.2 milestone capstone delivered
