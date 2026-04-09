---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Liveness & Notifications
status: executing
stopped_at: Completed 03-03-PLAN.md
last_updated: "2026-04-09T05:02:33.711Z"
last_activity: 2026-04-09
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 24
  completed_plans: 21
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Phase 03 — friend-went-free-loop

## Current Position

Milestone: v1.3 Liveness & Notifications
Phase: 03 (friend-went-free-loop) — EXECUTING
Plan: 3 of 8
Status: Ready to execute
Last activity: 2026-04-09

Progress: [██░░░░░░░░] 20% (1/5 phases complete)

**Hardware-gate deferral:** The user does not have an active Apple Developer Program account yet (will be acquired near publication). All manual iOS-hardware smoke tests are consolidated in Phase 5 "Hardware Verification Gate" and executed once, at milestone end. This applies to Phases 1-4. Feature phases are marked code-complete once their plans land; they do not block on hardware verification.

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases defined | 4 |
| Phases complete | 0 |
| Requirements mapped | 38/38 (100%) |
| Orphaned requirements | 0 |
| Phase 03 P04 | 15 | 2 tasks | 3 files |
| Phase 03 P03 | 8 minutes | 1 tasks | 1 files |

## Accumulated Context

### Decisions

- [v1.3 Research]: Zero new npm dependencies — all required packages (expo-notifications, expo-device, expo-constants, async-storage) already installed at SDK-55-aligned versions
- [v1.3 Research]: Use outbox queue pattern for Friend-Went-Free (`free_transitions` table + Database Webhook → Edge Function) — never call pg_net from inside a business trigger
- [v1.3 Research]: View-computed `effective_status` is the source of truth for TTL — pg_cron sweep is optimization only, correctness does not depend on cron timing
- [v1.3 Research]: Morning prompt uses on-device `scheduleNotificationAsync` with local time + repeats — eliminates `profiles.timezone` column and server cron from v1.3 scope
- [v1.3 Research]: Action handler for morning prompt runs inside the authenticated app using existing Supabase session — no public Edge Function, RLS protects everything, HMAC-signed payload deferred to v1.4
- [v1.3 Research]: EAS dev build is the FIRST deliverable of Phase 1, not the last — action buttons and channels are unreliable in Expo Go
- [v1.3 Research]: Pairwise rate-limit table `free_notifications_sent (recipient_id, sender_id, sent_at)` — no scalars on `profiles`
- [v1.3 Research]: 5am local daily reset (not midnight) — never clobbers actively-set status with future `expires_at`
- [v1.3 Research]: Anti-Snapchat streak mechanics — grace week (1 per 4-week window), breaks on 2 consecutive misses, "Best: N" preserved, positive-only copy, no countdown/hourglass UI
- [v1.3 Roadmap]: Phase numbering RESET to start at Phase 1 — previous milestones (v1.0–v1.2) ended at Phase 12 but directories are archived under `milestones/`
- [v1.3 Roadmap]: DM entry point folded into Phase 1 as a free-rider — one-file change, zero dependencies, immediate visible win
- [v1.3 Roadmap]: Morning prompt + Squad Goals streak bundled into Phase 4 — both are "daily engagement polish," share Profile toggle UX, both depend on Phase 2
- [Phase 03]: window_id made optional in CurrentStatus for backward compat with legacy effective_status rows
- [Phase 03]: expiryScheduler no-ops on web (Platform.OS guard) and when fire time within 1-min safety margin; ReEngagementBanner covers short windows
- [Phase 03]: busy/DEAD conflation logged as 'recipient_busy' — NOTE (CONTEXT D-11) in code documents this; dedicated 'recipient_dead' enum deferred to v1.4
- [Phase 03]: Fail-open quiet hours: local_hour === null skips the quiet-hours gate rather than suppressing — matches CONTEXT D-16

### Pending Todos

- [Phase 1 plan-phase]: Verify Expo SDK 55 trigger shape and notification handler return shape (`shouldShowAlert` deprecated → `shouldShowBanner`/`shouldShowList`)
- [Phase 1 plan-phase]: Confirm `/dm/[id]` route existence in src/app/ for HomeFriendCard deep-link
- [Phase 2 plan-phase]: Verify pg_cron availability on the current Supabase free-tier dashboard; confirm project auto-pause behavior
- [Phase 3 plan-phase]: Verify Database Webhook payload shape on the `free_transitions` queue table
- [Phase 4 plan-phase]: Resolve STREAK-03 ambiguity — there is no `squad` entity in v1.3, only friends. Working assumption: `get_squad_streak(tz)` takes the viewer's device timezone. Confirm with user.
- [Phase 4 plan-phase]: Copy review by a non-engineer is a mandatory ship gate for STREAK-08

### Blockers/Concerns

- [Phase 1]: iOS notification categories MUST be registered at module scope in root `_layout.tsx` BEFORE any permission request — easy to miss, silent failure mode
- [Phase 1]: `setNotificationCategoryAsync` almost certainly does not work for remote push in Expo Go on iOS — EAS dev build is the first deliverable, not the last
- [Phase 2]: Retention strategy for `status_history` must be implemented in this phase, not deferred
- [Phase 3]: Notification storm is the highest product risk in v1.3 — pairwise cap + per-recipient throttle + daily cap + quiet hours must all ship together from day one
- [Phase 4]: Streak anxiety mechanics destroy the feature — every string must be vetted for loss-aversion language

## Session Continuity

Last session: 2026-04-09T05:02:33.708Z
Stopped at: Completed 03-03-PLAN.md
