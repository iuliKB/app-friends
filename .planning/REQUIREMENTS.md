# Requirements: Campfire v1.3 Liveness & Notifications

**Defined:** 2026-04-06
**Core Value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must

## v1.3 Requirements

Requirements for v1.3 milestone. Each maps to exactly one phase.

### Push Infrastructure

- [ ] **PUSH-01**: User's Expo push token registers automatically on every app launch when authenticated (not only when toggling Profile preference)
- [ ] **PUSH-02**: User's push token re-registers when app returns to foreground (catches token rotation)
- [ ] **PUSH-03**: User's `push_tokens` row tracks `device_id`, `last_seen_at`, and `invalidated_at` so stale tokens can be reaped
- [ ] **PUSH-04**: User can disable notifications via existing Profile toggle, which deletes their device's token row server-side
- [ ] **PUSH-05**: User receives plan-invite push reliably on fresh installs without needing to toggle the Profile preference (closes existing wiring gap)
- [ ] **PUSH-06**: User on iOS sees notification action buttons (Free/Busy/Maybe on morning prompt) — requires iOS notification categories registered at module scope before first permission request
- [ ] **PUSH-07**: User on Android receives notifications on differentiated channels (`plan_invites` MAX, `friend_free` HIGH, `morning_prompt` DEFAULT, `system` LOW) so OS-level priority and sound are correct per kind
- [ ] **PUSH-08**: User sees a friendly pre-prompt before the iOS permission modal, deferred until first meaningful action (setting own status or adding first friend)
- [ ] **PUSH-09**: System parses Expo push ticket-level errors (`DeviceNotRegistered`) and marks tokens `invalidated_at` so future fan-out skips them
- [ ] **PUSH-10**: v1.3 ships on an EAS development build (not Expo Go) so action buttons and channels work end-to-end

### DM Entry Point

- [ ] **DM-01**: User can tap any friend card on the Home screen to open a DM with that friend (uses existing `get_or_create_dm_channel` RPC)

### Status Liveness & TTL

- [ ] **TTL-01**: User picks a duration when setting Free or Busy (1h / 3h / Until 6pm / Until 10pm / Rest of day; time-of-day options conditionally hidden when not meaningful)
- [ ] **TTL-02**: User's Maybe status remains indefinite (no expiry)
- [ ] **TTL-03**: User sees their own status with the validity window ("Free until 6pm")
- [ ] **TTL-04**: Friends viewing the Home screen see a user's status as "unknown / muted" once the `expires_at` has passed, even if the cron sweep hasn't run yet (view-computed `effective_status` is the source of truth)
- [ ] **TTL-05**: Statuses auto-clear daily at **5am local** to the user (respects active `expires_at` — does NOT clobber a status the user just set)
- [ ] **TTL-06**: User sees an inline "Your status expired — what's your status now?" banner above the Home Free/Other lists when their own status has expired; banner dismisses on next status set or in-memory dismissal until next foreground
- [ ] **TTL-07**: Every status change is appended to a `status_history` table (RLS: SELECT own/friend; writes via SECURITY DEFINER trigger only) for analytics and the streak feature
- [ ] **TTL-08**: `status_history` retention: log only on transitions, nightly rollup for entries >7 days, raw garbage-collect at 30 days

### Friend Went Free

- [ ] **FREE-01**: When a friend's status transitions from non-Free → Free, recipients receive a push within ~5 seconds
- [ ] **FREE-02**: Recipients currently `busy` are skipped; users never get notified about themselves
- [ ] **FREE-03**: Pairwise rate limit: at most one "friend went Free" push per (recipient, sender) pair per 15 minutes
- [ ] **FREE-04**: Per-recipient throttle: at most one friend-went-Free push per recipient per 5 minutes
- [ ] **FREE-05**: Daily hard cap: at most ~3 friend-went-Free pushes per recipient per day
- [ ] **FREE-06**: Quiet hours: friend-went-Free pushes are suppressed between 22:00 and 08:00 local (hardcoded for v1.3; configurable deferred to v1.4)
- [ ] **FREE-07**: User can disable "Friend availability" pushes via a new Profile toggle alongside the existing "Plan invites" toggle
- [ ] **FREE-08**: Push body shows the friend's display name and emoji context tag if set ("Ana is Free • pizza 🍕")
- [ ] **FREE-09**: Tapping a friend-went-Free notification opens the DM with that friend (cold-start safe — guarded on auth + router ready)
- [ ] **FREE-10**: Fan-out uses an outbox queue pattern: trigger writes a row to `free_transitions`, Database Webhook fires `notify-friend-free` Edge Function asynchronously (user write latency stays <100ms)
- [ ] **FREE-11**: Operators can monitor unsent rows in the outbox (alert on rows older than 5 minutes)

### Morning Status Prompt

- [ ] **MORN-01**: User receives a daily local push at user-configurable time (default 9:00am local) prompting "☀️ What's your status today?"
- [ ] **MORN-02**: Morning prompt is scheduled **on-device** via `Notifications.scheduleNotificationAsync({ hour, minute, repeats: true })` — no server cron, no `profiles.timezone` column
- [ ] **MORN-03**: Notification shows three action buttons: Free / Busy / Maybe
- [ ] **MORN-04**: Tapping an action opens the app and sets the user's status via the existing authenticated Supabase session (RLS protects — no public endpoint, no signed token)
- [ ] **MORN-05**: Action button payload includes `valid_until` so a tap >12h after the prompt fired no-ops gracefully (does not retroactively set status)
- [ ] **MORN-06**: Morning prompt does not fire if user's `effective_status` is still active (skip-if-set logic)
- [ ] **MORN-07**: User can disable morning prompt via a Profile toggle alongside the other notification toggles
- [ ] **MORN-08**: User can pick the prompt time from a settings row (default 9am)

### Squad Goals (Streak)

- [ ] **STREAK-01**: Squad → Goals tab replaces the "Coming soon" stub with a `StreakCard` showing the squad's current weekly streak count
- [ ] **STREAK-02**: A week is **active** if ≥1 plan with ≥2 confirmed attendees was completed in that week
- [ ] **STREAK-03**: Week boundaries are Mon 00:00 → Sun 23:59 (squad creator's timezone)
- [ ] **STREAK-04**: Streak survives 1 grace week per 4-week window (one missed week is allowed; visibility of remaining grace TBD in implementation)
- [ ] **STREAK-05**: Streak breaks only after 2 consecutive missed weeks within a 4-week window
- [ ] **STREAK-06**: "Best: N weeks" record is preserved permanently across breaks
- [ ] **STREAK-07**: Streak data is computed via `get_squad_streak(tz)` SQL function (computed view, NOT materialized — at 3-15 person squads the query is trivial)
- [ ] **STREAK-08**: Copy is positive-only — celebratory framing, no countdown / hourglass / "you're about to lose it" UI; copy reviewed by a non-engineer before ship

## v1.4 Requirements (Deferred)

Tracked but not in current roadmap.

### Notification UX

- **NOTIF-01**: Batched "N friends are free now" push when ≥3 friends transition to Free within a 5-minute window (v1.3 ships individual pushes + caps only)
- **NOTIF-02**: User can configure quiet hours (start/end times) — v1.3 hardcodes 22:00–08:00
- **NOTIF-03**: Per-friend mute / opt-out for friend-went-Free notifications

### Status & Streaks

- **EXPL-01**: Friend-of-friend plan discovery + ask-to-join (real "Explore" feature)
- **EXPN-01**: Splitwise-style expense tracking
- **GOAL-01**: Group challenges beyond the simple weekly streak
- **STRK-01**: Show grace-week counter to users explicitly ("1 grace week available this month")

### Lock-Screen Set Status

- **LOCK-01**: True lock-screen action buttons that mutate status WITHOUT opening the app (requires HMAC/JWT-signed public Edge Function — defer entire concept to v1.4)

## Out of Scope

Explicitly excluded.

| Feature | Reason |
|---------|--------|
| Interactive social map | V2, high complexity (carried from v1.0) |
| Calendar sync | V2, requires native calendar APIs (carried) |
| OCR receipt scanning | V2, needs camera + ML (carried) |
| Venue booking / B2B | V3 (carried) |
| AI social suggestions | V3 (carried) |
| Media/image sharing in chat | V2 (carried) |
| Read receipts, message reactions | V2 (carried) |
| Public profiles or discoverability | Friends-only by design (carried) |
| Web app / PWA | Mobile only (carried) |
| Dark mode / theming | v1.4+ (carried) |
| Notification preferences UI beyond on/off | v1.4 (this milestone) |
| Public set-status-from-push Edge Function | v1.4 — spoofing risk; v1.3 handler runs inside authenticated app instead |
| `expo-localization` / `profiles.timezone` column | Not needed — on-device local notification scheduling eliminates timezone storage |
| Server-cron morning prompt dispatch | On-device scheduleNotificationAsync replaces it |
| New npm dependencies | All required packages already installed |
| `expo-task-manager` / `expo-background-fetch` | Not needed for v1.3 features |
| Compose icon in Chats tab header | Tappable HomeFriendCard covers the v1.3 DM entry-point gap |
| Per-friend notification opt-in | v1.4 (global toggle only in v1.3) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PUSH-01 | Phase 1 | Pending |
| PUSH-02 | Phase 1 | Pending |
| PUSH-03 | Phase 1 | Pending |
| PUSH-04 | Phase 1 | Pending |
| PUSH-05 | Phase 1 | Pending |
| PUSH-06 | Phase 1 | Pending |
| PUSH-07 | Phase 1 | Pending |
| PUSH-08 | Phase 1 | Pending |
| PUSH-09 | Phase 1 | Pending |
| PUSH-10 | Phase 1 | Pending |
| DM-01 | Phase 1 | Pending |
| TTL-01 | Phase 2 | Pending |
| TTL-02 | Phase 2 | Pending |
| TTL-03 | Phase 2 | Pending |
| TTL-04 | Phase 2 | Pending |
| TTL-05 | Phase 2 | Pending |
| TTL-06 | Phase 2 | Pending |
| TTL-07 | Phase 2 | Pending |
| TTL-08 | Phase 2 | Pending |
| FREE-01 | Phase 3 | Pending |
| FREE-02 | Phase 3 | Pending |
| FREE-03 | Phase 3 | Pending |
| FREE-04 | Phase 3 | Pending |
| FREE-05 | Phase 3 | Pending |
| FREE-06 | Phase 3 | Pending |
| FREE-07 | Phase 3 | Pending |
| FREE-08 | Phase 3 | Pending |
| FREE-09 | Phase 3 | Pending |
| FREE-10 | Phase 3 | Pending |
| FREE-11 | Phase 3 | Pending |
| MORN-01 | Phase 4 | Pending |
| MORN-02 | Phase 4 | Pending |
| MORN-03 | Phase 4 | Pending |
| MORN-04 | Phase 4 | Pending |
| MORN-05 | Phase 4 | Pending |
| MORN-06 | Phase 4 | Pending |
| MORN-07 | Phase 4 | Pending |
| MORN-08 | Phase 4 | Pending |
| STREAK-01 | Phase 4 | Pending |
| STREAK-02 | Phase 4 | Pending |
| STREAK-03 | Phase 4 | Pending |
| STREAK-04 | Phase 4 | Pending |
| STREAK-05 | Phase 4 | Pending |
| STREAK-06 | Phase 4 | Pending |
| STREAK-07 | Phase 4 | Pending |
| STREAK-08 | Phase 4 | Pending |

**Coverage:**
- v1.3 requirements: 38 total
- Mapped to phases: 38 (100%)
- Unmapped: 0
- Double-mapped: 0

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-07 after v1.3 roadmap creation (traceability table filled)*
