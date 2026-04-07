# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 UI/UX Design System** — Phases 7-9 (shipped 2026-03-25)
- ✅ **v1.2 Squad & Navigation** — Phases 10-12 (shipped 2026-04-04)
- 🚧 **v1.3 Liveness & Notifications** — Phases 1-5 (active, phase numbering reset)

## Current Milestone: v1.3 Liveness & Notifications

**Goal:** Make Campfire worth opening every day. Add status TTL/freshness, real push delivery, the "Friend went Free" loop that drives spontaneous plans, a daily morning prompt, and a Squad Goals streak — all without adding a single new npm dependency.

**Granularity:** standard
**Phase numbering:** Reset to Phase 1 (v1.0–v1.2 phase directories archived under `milestones/`)

## Phases

- [ ] **Phase 1: Push Infrastructure & DM Entry Point** — Token registration, iOS categories, Android channels, EAS dev build, tappable HomeFriendCard
- [ ] **Phase 2: Status Liveness & TTL** — Duration composer, expires_at, view-computed effective_status, status_history, 5am-local reset
- [ ] **Phase 3: Friend Went Free Loop** — Outbox queue, rate-limited Edge Function fan-out, quiet hours, deep-link to DM
- [ ] **Phase 4: Morning Prompt + Squad Goals Streak** — On-device scheduled prompt with action buttons, get_squad_streak SQL, StreakCard
- [ ] **Phase 5: Hardware Verification Gate** — Consolidated manual smoke-test across all v1.3 phases, executed once when Apple Developer account is acquired (deferred per cost constraint)

## Phase Details

### Phase 1: Push Infrastructure & DM Entry Point

**Goal:** Push notifications actually reach the user's device reliably on fresh installs, and users can tap a friend card on Home to DM them.

**Depends on:** Nothing (first phase of v1.3)

**Requirements:** PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05, PUSH-06, PUSH-07, PUSH-08, PUSH-09, PUSH-10, DM-01

**Success Criteria** (what must be TRUE):
1. A brand-new install receives a plan-invite push the first time a friend adds them to a plan, without the user ever opening the Profile notification toggle.
2. Tapping any friend card on the Home screen opens a DM with that friend using the existing `get_or_create_dm_channel` RPC.
3. The user's `push_tokens` row is refreshed automatically on every cold start and every app foreground (catching token rotation); turning the Profile notification toggle off deletes the device's row server-side.
4. The build is an EAS development build (not Expo Go), iOS notification categories appear on prompts that request them, and Android notifications arrive on differentiated channels (`plan_invites` MAX, `friend_free` HIGH, `morning_prompt` DEFAULT, `system` LOW) with correct priority and sound.
5. When Expo returns `DeviceNotRegistered`, the stale token is marked `invalidated_at` and subsequent fan-out skips it; a friendly pre-prompt is shown before the iOS permission modal, deferred until the user's first meaningful action.

**Plans:** 10 plans

Plans:
- [x] 01-01-PLAN.md — EAS dev build instructions + smoke checklist
- [x] 01-02-PLAN.md — push_tokens v1.3 schema migration (device_id, last_seen_at, invalidated_at)
- [x] 01-03-PLAN.md — notifications-init module + iOS categories + Android channels + plugin tuple
- [ ] 01-04-PLAN.md — session-ready registration + AppState foreground re-register
- [x] 01-05-PLAN.md — usePushNotifications rewrite + Profile toggle rewire
- [ ] 01-06-PLAN.md — Pre-prompt modal + meaningful-action eligibility tracking
- [x] 01-07-PLAN.md — notify-plan-invite Edge Function update (invalidated filter + ticket parser + channelId)
- [x] 01-08-PLAN.md — Tappable HomeFriendCard + cross-platform action sheet helper
- [x] 01-09-PLAN.md — plan-create preselect_friend_id query param support
- [x] 01-10-PLAN.md — Manual smoke-test checklist sign-off (Task 1 authored; Task 2 execution deferred to Phase 5 per no-Apple-Dev-account constraint)

---

**Note:** Plan 10 Task 2 (physical smoke-test execution) is deferred to Phase 5 "Hardware Verification Gate". Phase 1 is **code-complete**; the 11 manual checks (PUSH-01..10 + DM-01) will be executed as part of the consolidated hardware gate once the Apple Developer Program account is acquired.

---

### Phase 2: Status Liveness & TTL

**Goal:** A user's status is a live signal with a validity window — friends never see stale data, and the user is gently re-engaged when their status expires.

**Depends on:** Nothing (independent of Phase 1 — can parallelize)

**Requirements:** TTL-01, TTL-02, TTL-03, TTL-04, TTL-05, TTL-06, TTL-07, TTL-08, HEART-01, HEART-02, HEART-03, HEART-04, HEART-05

**Scope redesigned 2026-04-07:** Phase 2 now ships the Mood + Context + Window + Heartbeat model. TTL-05's "5am local clock reset" is replaced by activity-based heartbeat. See `.planning/phases/02-status-liveness-ttl/02-CONTEXT.md` for locked decisions (authoritative over the success criteria below, which are from the original roadmap draft).

**Success Criteria** (what must be TRUE):
1. When the user sets Free or Busy, the composer asks for a duration (1h / 3h / Until 6pm / Until 10pm / Rest of day, with time-of-day options hidden when not meaningful); Maybe stays indefinite; the user sees their own chip as "Free until 6pm".
2. Once `expires_at` passes, friends viewing Home immediately see that user as unknown/muted — even if the cron sweep has not run yet — because reads come from the view-computed `effective_status`.
3. At 5am local to each user, statuses auto-clear; an actively-set Free/Busy with a future `expires_at` is NOT clobbered.
4. When the user's own status has expired, a dismissible "Your status expired — what's your status now?" banner appears above the Home Free/Other lists and goes away on next status set or in-memory dismissal until next foreground.
5. Every status transition is appended to `status_history` via a SECURITY DEFINER trigger, RLS-protected (SELECT own/friend), with a retention strategy that logs on transitions only, rolls up entries older than 7 days, and garbage-collects raw rows at 30 days.

**Plans:** TBD

---

### Phase 3: Friend Went Free Loop

**Goal:** When a friend flips to Free, nearby friends know within seconds — without turning into a notification storm that makes users uninstall.

**Depends on:** Phase 1 (push delivery must work), Phase 2 (clean transition source and `effective_status` view)

**Requirements:** FREE-01, FREE-02, FREE-03, FREE-04, FREE-05, FREE-06, FREE-07, FREE-08, FREE-09, FREE-10, FREE-11, EXPIRY-01

**Success Criteria** (what must be TRUE):
1. Within ~5 seconds of a friend's status transitioning from non-Free → Free, eligible recipients receive a push whose body reads "Ana is Free • pizza 🍕" (display name + emoji context tag when set).
2. A recipient is never notified about themselves, is skipped while currently Busy, is rate-limited to at most one push per (recipient, sender) pair per 15 minutes, at most one friend-free push per 5 minutes total, and at most ~3 per day, with quiet hours 22:00–08:00 local hardcoded for v1.3.
3. User status writes return in under 100ms because fan-out is decoupled via the `free_transitions` outbox queue + Database Webhook → `notify-friend-free` Edge Function (no pg_net inside the business trigger), and ticket-level errors prune invalidated tokens.
4. Tapping a friend-went-Free notification — cold start or warm — opens the DM with that friend, guarded on auth + router ready.
5. The user can disable "Friend availability" pushes via a new Profile toggle alongside the existing "Plan invites" toggle; operators can alert on `free_transitions` rows older than 5 minutes.

**Plans:** TBD

---

### Phase 4: Morning Prompt + Squad Goals Streak

**Goal:** Users get a friendly daily nudge to set their status, and squads see a celebratory weekly streak that rewards showing up together.

**Depends on:** Phase 2 (status pipeline and history table), Phase 1 (iOS categories already registered at module scope)

**Requirements:** MORN-01, MORN-02, MORN-03, MORN-04, MORN-05, MORN-06, MORN-07, MORN-08, STREAK-01, STREAK-02, STREAK-03, STREAK-04, STREAK-05, STREAK-06, STREAK-07, STREAK-08

**Success Criteria** (what must be TRUE):
1. Each morning at the user's configured time (default 9:00am local), a "☀️ What's your status today?" push fires — scheduled on-device via `Notifications.scheduleNotificationAsync({ hour, minute, repeats: true })`, with no server cron and no `profiles.timezone` column — and is skipped if the user's `effective_status` is already active.
2. The morning notification shows Free / Busy / Maybe action buttons; tapping one opens the app and sets the user's status via the existing authenticated Supabase session (no public endpoint, no signed token); a tap more than 12h after the prompt fired no-ops gracefully via a `valid_until` guard in the payload.
3. The user can pick their prompt time from a Profile settings row (default 9am) and disable the morning prompt via a Profile toggle alongside the other notification toggles.
4. The Squad → Goals tab replaces the "Coming soon" stub with a `StreakCard` showing the current weekly streak and "Best: N weeks" record; copy is celebratory and positive-only, with no countdown, hourglass, or "about to lose it" UI, every string vetted by a non-engineer before ship.
5. The streak is computed by a `get_squad_streak(tz)` SQL function (computed view, not materialized) using Mon 00:00 → Sun 23:59 week boundaries, where a week is active if ≥1 plan with ≥2 confirmed attendees completed that week; the streak survives 1 grace week per 4-week window, breaks only on 2 consecutive misses within a 4-week window, and "Best: N" is preserved permanently across breaks.

**Plans:** TBD

---

### Phase 5: Hardware Verification Gate

**Goal:** Execute all accumulated manual hardware/device smoke tests for v1.3 in a single consolidated session, once the Apple Developer Program account is acquired. This phase is the ship gate for v1.3.

**Depends on:** Phase 1, Phase 2, Phase 3, Phase 4 (code-complete for all feature phases)

**Rationale:** This project is developed by a solo dev without an active Apple Developer Program account ($99/yr), which will be acquired only when the app is near publication. iOS-hardware-dependent checks (action button categories, pre-prompt timing, differentiated Android channels verified on real devices, real APNs/FCM token delivery) cannot run without a native EAS dev build on real hardware. Rather than gating every feature phase on hardware that isn't available yet, all such checks accumulate here and run once.

**Requirements:** None new — this phase re-verifies requirements already claimed as "code-complete" by Phases 1-4.

**Success Criteria** (what must be TRUE):
1. A functional EAS dev build of Campfire is installed on a real iPhone (iOS 15+) AND a real Android device or emulator with Play Services.
2. Every per-requirement check from `.planning/phases/01-push-infrastructure-dm-entry-point/SMOKE-TEST.md` (PUSH-01..10 + DM-01) passes.
3. Every per-requirement hardware check appended by Phases 2-4 during their plan-phase passes.
4. No regressions in shipped v1.0–v1.2 features (login, status set, plan create, chat send, friend add, squad view).
5. Phase 5 SUMMARY.md documents any gap-closure plans that were needed and their disposition.

**Plans:** TBD — at least one: `05-01-PLAN.md` consolidating and executing all accumulated smoke-test checklists.

**Inputs to this phase (append as phases are planned):**
- `.planning/phases/01-push-infrastructure-dm-entry-point/SMOKE-TEST.md` (Phase 1, 11 checks)
- Phase 2 hardware checks — to be added during `/gsd-plan-phase 2`
- Phase 3 hardware checks — to be added during `/gsd-plan-phase 3`
- Phase 4 hardware checks — to be added during `/gsd-plan-phase 4`

**Planner rule for Phases 2-4:** Any manual smoke-test check that requires a real device should be authored into the phase's own `SMOKE-TEST.md` but NOT gate phase completion. Instead, append the file path to this phase's "Inputs" list above. Phase 5 will consolidate and execute them all.

---

## Progress (v1.3)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Push Infrastructure & DM Entry Point | 10/10 | Code complete (hardware gate → Phase 5) | 2026-04-07 |
| 2. Status Liveness & TTL | 0/? | Not started | - |
| 3. Friend Went Free Loop | 0/? | Not started | - |
| 4. Morning Prompt + Squad Goals Streak | 0/? | Not started | - |
| 5. Hardware Verification Gate | 0/? | Deferred (awaits Apple Dev account) | - |

## Coverage (v1.3)

**v1.3 requirements:** 44 total
**Mapped to phases:** 44
**Unmapped:** 0
**Double-mapped:** 0

### Coverage Map

| Category | REQ-IDs | Phase |
|----------|---------|-------|
| PUSH (10) | PUSH-01..10 | Phase 1 |
| DM (1) | DM-01 | Phase 1 |
| TTL (8) | TTL-01..08 | Phase 2 |
| HEART (5) | HEART-01..05 | Phase 2 |
| FREE (11) | FREE-01..11 | Phase 3 |
| EXPIRY (1) | EXPIRY-01 | Phase 3 |
| MORN (8) | MORN-01..08 | Phase 4 |
| STREAK (8) | STREAK-01..08 | Phase 4 |

## Notes for Plan-Phase

- **Phase 1:** EAS dev build is the FIRST deliverable of the phase, not the last. iOS notification categories MUST be registered at module scope in root `_layout.tsx` before any permission request. Research flags verification of Expo SDK 55 trigger shape and notification handler return shape (`shouldShowAlert` deprecated → `shouldShowBanner`/`shouldShowList`).
- **Phase 2:** View-computed `effective_status` is the source of truth; pg_cron sweep is optimization only. Retention strategy must be implemented in this phase, not deferred. Verify pg_cron availability on the current Supabase free-tier dashboard during plan research.
- **Phase 3:** Outbox pattern is mandatory (never call pg_net from inside the business trigger). Rate-limit table `free_notifications_sent (recipient_id, sender_id, sent_at)` is the source of truth — no scalars on `profiles`. Research flags verification of Database Webhook payload shape on the queue table.
- **Phase 4:** STREAK-03 references "squad creator's timezone" but there is currently no `squad` entity in v1.3 — only friends. Plan-phase must resolve this ambiguity. Working assumption: `get_squad_streak(tz)` takes tz as a parameter, and the client passes the viewer's current device timezone. Flag this with the user during plan-phase. Copy review (STREAK-08) is a mandatory ship gate.

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

---
*v1.3 roadmap created: 2026-04-07 by gsd-roadmapper*
