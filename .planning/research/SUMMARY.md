# Project Research Summary

**Project:** Campfire — v1.3 Liveness & Notifications
**Domain:** Social coordination / "friendship OS" — adding push delivery, status freshness, and daily-engagement loop to an existing React Native + Expo + Supabase app
**Researched:** 2026-04-07
**Confidence:** HIGH (architecture grounded in actual repo inspection; product patterns drawn from well-known incumbents; the few MEDIUM/LOW areas are flagged below)

---

## Executive Summary

Campfire v1.3 turns the existing "Free / Busy / Maybe" status into a *live* signal: statuses get a TTL and a clean daily reset, friends get pushed when someone goes Free, users get a once-a-day morning prompt to set their status, and a Squad Goals streak rewards groups that stay active. The four research streams converged on a strikingly clean conclusion — **none of this requires a single new npm dependency**, and the bulk of the server side already exists. The plan-invite push pipeline is fully wired end-to-end (`notify-plan-invite` Edge Function on a `plan_members` INSERT webhook); the only "broken" thing is **client-side registration**, which currently fires only when the user toggles a Profile switch. Fix that one wiring gap and plan invites start working on fresh installs with zero Edge Function changes.

The recommended approach across all four researchers is **opinionated and consistent**: queue-table outbox pattern for "Friend went Free" (NOT direct trigger → Edge Function), view-computed `effective_status` (NOT scheduled UPDATE) as the source of truth for TTL, **on-device** local scheduling for the morning prompt (NOT server cron — eliminates the timezone column entirely), pairwise (recipient × sender) rate limiting for fan-out, EAS development build as the **first** deliverable of the push phase (not the last), and an **anti-Snapchat** squad-level weekly streak with a grace week and positive-only framing. The DM entry-point fix is a literal one-file change: wrap `HomeFriendCard` in a `Pressable` and route to the existing `get_or_create_dm_channel` RPC.

The principal risks are familiar Expo+Supabase patterns rather than unknowns: stale push tokens silently dropping users from the loop (must parse Expo ticket-level errors and re-register on every foreground), notification storms from naïve fan-out (must coalesce + per-pair rate-limit + hard daily cap), iOS notification categories registered too late (must register at module scope before the first permission request), pg_cron silently not running on paused free-tier projects (must heartbeat), and streak anxiety mechanics that turn the feature into a liability (must use celebratory, never-loss-framing copy). All of these have explicit mitigations in PITFALLS.md tied to the specific phase that owns them.

## Key Findings

### Recommended Stack

**Zero new npm dependencies.** Every client package needed (`expo-notifications ~55.0.13`, `expo-device ~55.0.9`, `expo-constants ~55.0.7`, `@react-native-async-storage/async-storage 2.2.0`, `@supabase/supabase-js ^2.99.2`) is already installed at SDK-55-aligned versions. The v1.3 additions are all server-side and ship inside Supabase: two Postgres extensions (`pg_cron`, `pg_net`) enabled via migration, plus 1–2 new Edge Functions (Deno, built-in `fetch`, no Node deps). Client-side work is configuration and new code on existing packages.

**Core technologies (all already present):**
- `expo-notifications` — push registration, local scheduling, iOS categories/Android channels, listeners. Must be configured (not added) — switch the plugin from bare string to tuple form for icon/color, register `morning_prompt` category at module scope, create differentiated Android channels.
- `pg_cron` (Supabase extension) — drives the morning-prompt dispatch tick (only if we go server-driven for offline users) and the optional token-reaping job. **Must verify free-tier availability and project auto-pause behavior in the current dashboard before phase start.**
- `pg_net` (Supabase extension) — used **async only**, called from a pg_cron job (not from inside a business trigger), so user status writes never block on HTTP latency.
- Supabase Edge Functions (Deno) — `notify-friend-free` (new), and the existing `notify-plan-invite` (one-line change to filter `invalidated_at IS NULL` tokens). Morning-prompt Edge Function only if a v1.3 phase decides server-driven dispatch is required.
- Postgres triggers + queue tables — outbox pattern for fan-out.

**Explicit non-additions (recap from STACK.md):** no `expo-localization`, no `expo-task-manager`, no `expo-background-fetch`, no `date-fns`/`dayjs`, no `@notifee/react-native`, no Expo SDK upgrade, no third-party push service. These are deliberate and load-bearing — adding any of them increases scope without proportional benefit.

See: `.planning/research/STACK.md`

### Expected Features

**Must have (table stakes):**
- Status has explicit `expires_at`, stored server-side, computed via a view so reads are always correct regardless of cron timing.
- Home screen treats expired statuses as "unknown / muted," not as still-current.
- User sees how long their own status is valid for ("Free until 6pm").
- Daily reset clears statuses overnight (recommendation: **5am local**, not midnight, so it doesn't strand users mid-night).
- "Expired" banner on own profile prompting re-set, friction by design (in-memory dismissal, reappears on next foreground).
- Push fires when a friend transitions from non-Free → Free, with per-recipient mute toggle, quiet hours, and pairwise rate limiting.
- Daily local push at a user-configurable morning time, with **Free / Busy / Maybe** action buttons that mutate status from the lock screen.
- DM entry point: tappable Home friend cards (zero-friction "Ana is Free → tap → DM her" gesture).
- Squad streak: shared, week-granular, count visible in Goals tab.

**Should have (differentiators):**
- **Duration-first composer** ("Free for 1h / until 6pm / rest of day") — recommended menu: 1h / few hours / Until 6pm / Until 10pm / Rest of day, with time-sensitive options hidden when not meaningful.
- **`status_history` append-only log** — unblocks streaks, recaps, "Free 4 times this week" UI later.
- **Smart muting** — if recipient just marked themselves Busy, suppress inbound friend-free pushes for that window.
- **Context tag in push** ("Ana is Free • pizza 🍕") turns a ping into an immediate CTA.
- **Anti-Snapchat squad streak** — squad-level (not per-person), grace week (1 per 4-week window), broken only after 2 non-active weeks within 4, "best: N weeks" trophy preserved on break, **never** an hourglass / countdown / "you're about to lose it" warning.

**Defer (v2+):**
- Batched "N friends are free now" coalesced push (ship per-pair rate limit only in v1.3, batching in v1.4).
- Weekly recap card (streak count only in v1.3).
- Long-press quick actions on friend cards.
- Per-friend opt-in (global toggle only in v1.3).
- Compose icon in Chats tab header (FAB on Chats + tappable Home cards covers v1.3).
- Lock-screen action buttons that *don't* foreground the app (defer the HMAC-signed public endpoint to v1.4 — see Architecture).

See: `.planning/research/FEATURES.md`

### Architecture Approach

The architecture is grounded in **direct repo inspection** (HIGH confidence — line numbers cited throughout `ARCHITECTURE.md`). Key inventory: `push_tokens` exists but is too thin (`id, user_id, token, platform`); `notify-plan-invite` Edge Function exists and works; `registerForPushNotifications` exists in `src/hooks/usePushNotifications.ts` but is only called from `src/app/(tabs)/profile.tsx:73`; `HomeFriendCard` is a pure View, not tappable; `statuses` table has no TTL columns; `get_or_create_dm_channel` RPC already exists.

**Major components:**
1. **Push Infrastructure (foundational).** Migrate `push_tokens` to add `device_id`, `last_seen_at`, `invalidated_at`. Move `registerForPushNotifications` from the Profile toggle to a session-ready `useEffect` in `src/app/(tabs)/_layout.tsx`. Add `AppState` foreground listener to re-register (catches token rotation). Register iOS notification categories at **module scope** in the root layout, before any permission call. Create four differentiated Android channels (`plan_invites` MAX, `friend_free` HIGH/DEFAULT, `morning_prompt` DEFAULT, `system` LOW). Build EAS dev build as the **first** deliverable (action buttons + channels are unreliable in Expo Go).
2. **Status Liveness pipeline.** New columns on `statuses` (`expires_at`, `set_at`, `set_source`). New `status_history` append-only table (RLS: SELECT own/friend; writes via SECURITY DEFINER trigger only). View-computed `effective_status` is the source of truth — client and server both query the view, so correctness does not depend on the cron job running. pg_cron expire-sweep at `*/15 * * * *` is belt-and-braces only. `ExpiredStatusBanner` rendered above the Home Free/Other lists.
3. **"Friend went Free" outbox.** `capture_free_transition` trigger writes to a `free_transitions` queue table (NOT pg_net from inside the trigger — keeps user write latency at 80ms). Database Webhook on the queue table fires `notify-friend-free` Edge Function. Function reads friends, checks per-pair rate limit in `free_notifications_sent (recipient_id, sender_id, sent_at)` table, fetches non-invalidated tokens, batches to Expo push (≤100 per call), parses ticket-level errors, marks `processed_at`. Self-notify guard. Skip recipients currently `busy`.
4. **Morning prompt (on-device default).** Local `Notifications.scheduleNotificationAsync` with `{ hour, minute, repeats: true }` — fires in device-local time, no server, no timezone column needed. iOS `morning_prompt` category with Free/Busy/Maybe action buttons registered at module scope. Action handler runs **inside the authenticated app** and uses the existing Supabase session for a normal RLS-protected `UPDATE statuses` with `set_source = 'push_action'`. Payload includes `valid_until` so stale taps (notification ignored 11h, then tapped at 8pm) don't blindly mark the user Free into tomorrow. Server-driven cron fallback only if a phase later requires reaching offline users.
5. **DM entry point.** One-file change: `src/components/home/HomeFriendCard.tsx` wrapped in `Pressable` → `router.push('/dm/[userId]')` calling existing `get_or_create_dm_channel`. Optional FAB on Chats tab (reuses v1.1 shared FAB component). Zero schema work.
6. **Squad Goals streak.** New `get_squad_streak(tz)` SQL function (computed view, NOT materialized — at 3-15 person squads the query is trivial). New `useSquadStreak` hook. Replace Goals "Coming soon" stub with `StreakCard`. Streak unit = "active week" (Mon 00:00 → Sun 23:59 in chosen timezone), where active = ≥50% squad members set ≥1 status OR ≥1 plan with ≥2 attendees. Grace week: 1 missed week per 4-week window allowed. Two consecutive misses break it. "Best: N" recorded permanently.

**Reconciliation note on action-button auth:** The architecture researcher and pitfalls researcher both agree on the v1.3 stance — no public Edge Function, the action handler runs inside the authenticated app and uses the existing Supabase session, so RLS protects everything. The HMAC/JWT-signed payload pattern is only required if v1.4 (or later) introduces a *truly* public endpoint that mutates state without launching the app. **Punt that to v1.4.** Ship v1.3 with "tap opens app, app sets status."

See: `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

1. **Stale Expo push tokens silently kill the loop for returning users.** Expo returns ticket-level errors (`DeviceNotRegistered`) inside HTTP 200 responses. Fix: parse every ticket, also poll receipts, re-register on every app foreground via `AppState`, add `last_seen_at` and reap stale rows.
2. **"Friend went Free" notification storm at lunchtime.** 8 friends flip Free in 3 minutes → 8 pushes → user mutes Campfire system-wide. Fix: per-pair (recipient × sender) hard cap (recommendation: 15 min), per-recipient max 1 push / 5 min with collapse to batched, hard daily cap (~3), trigger guard `WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'free'`, never self-notify.
3. **Status TTL race — client and server disagree.** Local timer flips client to "expired" before any server job runs; another friend still sees Free. Fix: **`expires_at` is data, not an event** — view-computed `effective_status` is the source of truth on both sides; cron is optimization only.
4. **iOS notification categories registered too late** (in a feature `useEffect` instead of module scope) → action buttons silently never appear. Fix: register at module scope in root `_layout.tsx`, **before** first `requestPermissionsAsync`. **Action categories do not work in Expo Go** — EAS dev build must be the first deliverable of the Push Infrastructure phase, not the last.
5. **pg_cron may not run on paused free-tier projects.** Phase plan assumes cron, project goes idle for 7 days, every status rots, no alert fires. Fix: verify in **current** Supabase dashboard before phase start; add cron heartbeat table; document failure mode; have GitHub Actions schedule as backup option.
6. **Public "set-status from push" Edge Function = spoofing risk.** Defer the entire concept to v1.4. v1.3 ships with action handlers running in the authenticated app, which means RLS protects everything and no signed payload is needed.
7. **Daily reset clobbers actively-set status.** Set Free at 23:55 with 3h expiry, midnight reset wipes it. Fix: reset job has `WHERE expires_at IS NULL OR expires_at < now()`, runs at **5am local** not midnight.
8. **Streak anxiety mechanics destroy the feature.** Snapchat-style shame copy turns the feature into a reason to disengage. Fix: positive-only framing, "weeks together" not "streak," grace week, "best: N" trophy on break, no countdown / hourglass UI, never gate features on streaks.

See: `.planning/research/PITFALLS.md` (31 pitfalls total — 13 critical, 12 moderate, 6 minor, plus debt patterns and integration gotchas)

## Implications for Roadmap

Based on dependency analysis from ARCHITECTURE.md and FEATURES.md, the critical path is: **Push Infrastructure → (Status TTL ‖ DM Entry) → Friend-went-Free → Morning Prompt + Streak.** Phase numbering RESETS to start at Phase 1 for v1.3.

### Phase 1: Push Infrastructure & DM Entry Point
**Rationale:** Everything else depends on push delivery actually working, and the existing wiring is *almost there* — only client registration is broken. The "highest leverage smallest change" phase. DM entry point is grouped here as a free-rider because it's a one-file change, completely independent, and gives an immediate visible win.
**Delivers:**
- Plan-invite pushes start working on fresh installs (Feature 5 gap closed without touching the Edge Function).
- Migrated `push_tokens` schema (`device_id`, `last_seen_at`, `invalidated_at`).
- Session-ready registration in `_layout.tsx` + `AppState` foreground re-register.
- Four differentiated Android channels created at module init.
- iOS notification categories registered at module scope.
- Notification handler set at module scope (NOT inside a `useEffect`).
- Pre-prompt UX before the iOS permission modal (deferred until first meaningful action).
- Notifications-off toggle deletes the device's token row (server-side truth).
- `notify-plan-invite` filters `invalidated_at IS NULL`.
- Tappable `HomeFriendCard` → existing `get_or_create_dm_channel` RPC.
- **EAS dev build is the FIRST deliverable, not the last.**
**Addresses:** F2 (push infra), F4 (DM entry), F5 (plan invite gap).
**Avoids:** Pitfalls 1, 7, 8, 13, 14, 17, 19, 20, 21, 22, 26, 30 (almost all the push-infra critical pitfalls land here).

### Phase 2: Status Liveness & TTL
**Rationale:** Independent of push (no cross-phase dependency), foundational for both Friend-Went-Free (transition detection) and Morning Prompt (daily-fresh state) and Streaks (history). Big standalone UX win even before any push fires.
**Delivers:**
- `statuses` migration: `expires_at`, `set_at`, `set_source` (TIMESTAMPTZ, never naked TIMESTAMP).
- `status_history` append-only table + RLS + SECURITY DEFINER trigger.
- View-computed `effective_status` — client and server both read the view.
- Duration-first composer with the recommended menu (1h / few hours / Until 6pm / Until 10pm / Rest of day; time-sensitive options conditionally rendered).
- `ExpiredStatusBanner` above Home Free/Other lists.
- Daily reset job (5am local, respects active `expires_at`).
- pg_cron heartbeat table for monitoring.
- `status_history` retention strategy decided **in this phase, not punted** (recommendation: log only on transitions, nightly rollup for >7d, raw GC at 30d).
- `ALTER PUBLICATION supabase_realtime ADD TABLE statuses` already covered (verified existing).
**Addresses:** F1 (TTL).
**Avoids:** Pitfalls 3, 4, 5, 12, 18, 31.

### Phase 3: "Friend Went Free" Loop
**Rationale:** The headline v1.3 feature. Depends on Phase 1 (tokens) and Phase 2 (clean status pipeline). Highest implementation risk in v1.3 — must ship with full anti-storm mitigations from day one or it becomes an uninstall vector.
**Delivers:**
- `capture_free_transition` trigger with `IS DISTINCT FROM` guard, writing to `free_transitions` queue.
- `free_transitions` queue table + Database Webhook → `notify-friend-free` Edge Function (NOT pg_net from inside the trigger).
- `free_notifications_sent (recipient_id, sender_id, sent_at)` pairwise rate-limit table (NOT a scalar on `profiles`).
- Per-pair hard cap (recommendation: 15 min) + per-recipient throttle (recommendation: max 1 / 5 min) + hard daily cap (~3).
- Skip recipients currently `busy`. Self-notify guard.
- Edge Function parses ticket-level errors and prunes invalidated tokens.
- `notification_outbox` pattern observability — alert on unsent rows >5min.
- Notification toggle ("Friend availability") added to Profile under existing "Plan invites" toggle.
- Deep link from notification tap to friend's DM (cold-start safe — guarded on auth + router ready).
- Recursion guard (`pg_trigger_depth() > 0`) belt-and-braces.
**Addresses:** F2 ("Friend went Free").
**Avoids:** Pitfalls 1 (closure), 2, 9, 10, 11, 22, 23, 27, 29.

### Phase 4: Morning Prompt + Squad Goals Streak
**Rationale:** Both are "daily engagement polish" features that close the loop. They share no infrastructure but can ship in the same milestone phase because each is small and independently testable. Both depend on Phase 2 (status pipeline, history table). Streak depends only on history; morning prompt depends on TTL semantics being clean.
**Delivers:**
- Morning prompt scheduled **on-device** via `Notifications.scheduleNotificationAsync({ hour, minute, repeats: true })` — eliminates `profiles.timezone` column entirely and removes pg_cron dispatch from the v1.3 scope.
- `morning_prompt` iOS category with Free / Busy / Maybe actions, registered at module scope (Phase 1 already did this, this phase just wires the handler).
- Action handler dispatches an authenticated `UPDATE statuses` with `set_source = 'push_action'`.
- Payload carries `valid_until` so 11-hour-late taps no-op gracefully.
- Skip-prompt-if-already-set logic.
- User-configurable prompt time (default 9am local).
- Disable toggle in Profile under existing notification toggles.
- `get_squad_streak(tz)` SQL function (computed view, NOT materialized).
- `useSquadStreak` hook + `StreakCard` component replacing Goals "Coming soon" stub.
- "Active week" definition implemented per the recommendation: ≥50% squad members set ≥1 status that week OR ≥1 plan with ≥2 confirmed attendees, Mon 00:00 → Sun 23:59 squad creator's TZ.
- Grace week (1 per 4-week window). Two consecutive misses break it.
- "Best: N weeks" trophy preserved across breaks.
- **Copy review mandatory** before shipping — every string vetted for loss-aversion language.
- No countdown / hourglass UI.
**Addresses:** F3 (morning prompt), F6 (Squad Goals streak).
**Avoids:** Pitfalls 6 (defer to v1.4), 15, 16, 24, 25.

### Phase Ordering Rationale

- **Push Infrastructure first** because every other phase that fires a push depends on tokens being correctly registered, channels existing, and categories registered before APNs registration. Putting it first also closes the silent plan-invite gap immediately, which is a high-leverage user-visible win for ~zero feature work.
- **Status TTL second** because it has no external dependencies, is the foundation for both Friend-Went-Free (transition detection needs the new pipeline) and Streaks (history table), and the duration composer is the biggest standalone UX win independent of push.
- **Friend-Went-Free third** because it requires both Phase 1 (delivery) and Phase 2 (clean transition source). It's also the riskiest phase — concentrating all the storm-prevention mitigations in one place (rate-limit table, outbox, observability) is cleaner than scattering them.
- **Morning Prompt + Streak fourth** because both are pure additions that depend on Phase 2's status pipeline. They share a Profile-toggle UX moment and a "daily engagement polish" theme. Bundling avoids two sub-1-week phases.
- **DM entry point folded into Phase 1** rather than as its own phase: it's a one-file change with zero dependencies, so isolating it as a phase wastes ceremony.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:research-phase`):
- **Phase 1 (Push Infrastructure):** verify current Expo SDK 55 trigger shape, current `expo-notifications` plugin options for icon/color, current Expo push API schema (`channelId`, `categoryIdentifier`, batch size, receipt flow, whether access token is required), and **verify pg_cron availability and project auto-pause behavior in the current Supabase dashboard** (LOW-confidence area). The notification handler return shape has changed across Expo SDKs (`shouldShowAlert` deprecated → `shouldShowBanner`/`shouldShowList`) and must be checked against installed SDK 55 docs.
- **Phase 3 (Friend Went Free):** verify pg_net async semantics on current Supabase, confirm Database Webhook payload shape on the queue table, validate the rate-limit numbers (15 min per-pair, 5 min per-recipient, daily cap 3) against any real usage data we can pull from v1.0–v1.2 logs.

Phases with standard patterns (skip dedicated research):
- **Phase 2 (Status TTL):** standard Postgres schema work; view-computed pattern is well-documented; nothing novel.
- **Phase 4 (Morning Prompt + Streak):** on-device local scheduling via `expo-notifications` is documented and stable in SDK 55; the SQL streak query is straightforward. Copy review is the only "research" needed and it's a UX deliverable, not an API question.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct read of `package.json`, `app.config.ts`, `usePushNotifications.ts`. Zero new deps is a verifiable claim. The few MEDIUM items (exact Expo push schema, exact `expo-notifications` plugin options for SDK 55, pg_cron free-tier rules) are flagged with explicit verification checklists. |
| Features | HIGH | Patterns drawn from well-documented incumbents (Snapchat, BeReal, Slack, Discord, Marco Polo, Houseparty retrospectives, GitHub streak removal). Anti-features grounded in publicly-known failures. The MEDIUM areas are specific numeric thresholds (rate-limit windows, streak grace rules) which are starting points, not industry standards — validate post-launch. |
| Architecture | HIGH | Grounded in actual repo inspection with line-number citations throughout. Existing inventory verified, not assumed. The one MEDIUM area is the exact ergonomics of the squad streak SQL — the *shape* is correct, the *exact "counts as" definition* may need product tuning. |
| Pitfalls | MEDIUM-HIGH | Most pitfalls are grounded in documented Expo + Supabase behavior or codebase audit. The LOW-confidence items are explicitly flagged: pg_cron free-tier availability, Expo push rate limits, Edge Function monthly invocation quota — all "verify in current dashboard" items, not guesses. |

**Overall confidence:** HIGH. The four researchers converged on the same architecture without needing to negotiate, which is a strong signal that the design is over-determined by the existing codebase plus well-known patterns.

### Gaps to Address

Surface during the requirements step (the requirements writer should call these out explicitly):

- **Status duration option set** — researcher recommends: 1h / 3h ("a few hours") / Until 6pm / Until 10pm / Rest of day, with time-sensitive options conditionally hidden. Confirm with user in requirements.
- **Daily reset time** — researcher recommends 5am local. Confirm.
- **Rate-limit window for Friend-Went-Free** — researcher recommends per-pair 15 min hard, per-recipient max 1/5min, ≥3 friends in 5 min collapses to a batched "N friends free now" notification (where batching itself may defer to v1.4 — confirm whether v1.3 ships individual + cap, or individual + cap + batching). Daily hard cap ~3 per recipient.
- **Streak "active week" definition** — researcher recommends ≥50% squad members set ≥1 status OR ≥1 plan with ≥2 attendees, Mon-Sun in squad creator's TZ, grace week 1 per 4-week window, two consecutive misses break it. Confirm each parameter.
- **Quiet hours for Friend-Went-Free** — defaults to 22:00–08:00 local. Configurable in v1.3 or hardcoded? Researcher leans hardcoded for v1.3, configurable in v1.4.
- **Action button auth mechanism** — RECONCILED: v1.3 ships with action handler running inside the authenticated app (uses existing Supabase session, RLS protects everything). HMAC/JWT signed payload is **deferred to v1.4** and only required if a future phase introduces a public endpoint that mutates state without launching the app. The two researchers agree.
- **Grace week counter visibility** — show users "1 grace week available" or hide it? Visible is more honest; hidden avoids gamification feel. Product call.
- **Morning prompt skip-if-set logic** — should it also skip when user manually set status yesterday with "rest of day"? Product call.
- **DM route existence** — `/dm/[id]` is used from `useChatList` so the screen exists, but the route path should be confirmed in `src/app/` during Phase 1 planning.
- **Notification permission onboarding moment** — when does the pre-prompt fire? Researcher recommends: defer until user (a) sets their own Free status for the first time, or (b) adds their first friend. Confirm.

## Sources

### Primary (HIGH confidence)
- `/Users/iulian/Develop/campfire/package.json`, `/Users/iulian/Develop/campfire/app.config.ts` — direct read for stack inventory
- `/Users/iulian/Develop/campfire/supabase/migrations/0001_init.sql`, `0003_push_tokens.sql` — schema, RLS patterns, helper functions
- `/Users/iulian/Develop/campfire/supabase/functions/notify-plan-invite/index.ts` — existing Edge Function pattern
- `/Users/iulian/Develop/campfire/src/hooks/usePushNotifications.ts`, `useStatus.ts`, `useHomeScreen.ts`, `usePlans.ts` — current hook shapes
- `/Users/iulian/Develop/campfire/src/app/(tabs)/_layout.tsx`, `(tabs)/profile.tsx`, `src/components/home/HomeFriendCard.tsx`, `src/screens/home/HomeScreen.tsx`
- `/Users/iulian/Develop/campfire/.planning/PROJECT.md` — v1.3 scope and constraints

### Secondary (MEDIUM confidence)
- Supabase docs (training data): pg_cron, pg_net, Edge Functions on Deno, Database Webhooks, RLS with SECURITY DEFINER, Realtime publications
- Expo docs (training data): `expo-notifications` SDK 55 categories, channels, daily trigger shape, plugin options; Expo push API schema, batch limits, receipt flow
- Pattern knowledge from documented UX of Snapchat, BeReal, Marco Polo, Houseparty (retrospectives), Locket, WhatsApp, Slack, Discord, Life360, Find My, Strava, Duolingo, GitHub (streak removal), Apple Fitness, iMessage, Telegram, Signal, Instagram DMs

### Tertiary (LOW confidence — MUST verify before phase start)
- pg_cron availability on current Supabase free tier; project auto-pause behavior
- Expo push service per-account rate limits and Edge Function monthly invocation quota
- Exact `expo-notifications` SDK 55 trigger API shape and notification handler return shape (field names have changed across SDKs)
- Whether `setNotificationCategoryAsync` works for remote push in Expo Go on iOS (almost certainly not — assume EAS dev build required)

Detailed research files (read these before phase planning):
- `.planning/research/STACK.md` — full stack inventory with installation summary and verification checklist
- `.planning/research/FEATURES.md` — full feature landscape with cross-feature dependency graph and MVP recommendation
- `.planning/research/ARCHITECTURE.md` — full architecture with migration SQL, RLS policies, integration points by file path, and dependency-aware build order
- `.planning/research/PITFALLS.md` — 31 pitfalls (13 critical, 12 moderate, 6 minor) plus tech debt patterns, integration gotchas, performance traps, and a phase-by-phase mitigation map

---
*Research completed: 2026-04-07*
*Ready for roadmap: yes*
