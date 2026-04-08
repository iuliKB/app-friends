# Phase 3: Friend Went Free Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 03-friend-went-free-loop
**Areas discussed:** EXPIRY-01 scheduler, EXPIRY-01/friend-free action handlers, Outbox trigger model, Rate-limit storage, Quiet hours timezone source, iOS categories ownership, FREE-11 monitoring

---

## EXPIRY-01 Scheduler

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side local notification | When setStatus commits, schedule local expo-notification at status_expires_at - 30min on the device. No server-side cron. Cancel + reschedule on each setStatus. Doze may delay 10-15min on Android. | ✓ |
| Supabase scheduled Edge Function | New scheduler runs every 5 min, queries statuses for windows expiring in next 30-35min, fan-out via outbox. Server-side truth, but new infra split between scheduler and DB Webhook, cold starts, ongoing invocation cost. | |
| Enable pg_cron + SQL scheduler | Reverse Phase 2 OVR-05 deferral. CREATE EXTENSION pg_cron; cron job scans statuses every 5 min into expiry_outbox, consumed by same Database Webhook → Edge Function plumbing as FREE-10. | |

**User's choice:** Client-side local notification (Recommended)
**Notes:** Driven by the framing that EXPIRY-01 is a self-notification — sender and recipient are the same user. Eliminates server-side scheduler entirely and preserves Phase 2 OVR-05 pg_cron deferral.

---

## EXPIRY-01 / Friend-Free Action Handlers

| Option | Description | Selected |
|--------|-------------|----------|
| Foreground handler in-app | Notification action wakes app, foreground handler in src/lib/notifications-init.ts dispatches setStatus calls via Phase 2 useStatus + existing Supabase session. Same pattern as Phase 1 D-20 morning_prompt category. | ✓ |
| Background action via signed Edge Function | Action runs without launching the app via signed token + public Edge Function. More complex (token signing, public endpoint), but feels instant. | |
| Deep link only (no inline action) | No action buttons, body only. Tap opens MoodPicker. Loses EXPIRY-01's explicit Keep it / Heads down requirement. | |

**User's choice:** Foreground handler in-app (Recommended)
**Notes:** Reuses Phase 2 useStatus + existing Supabase session. Zero new public endpoints. iOS background dispatch deferred to v1.4.

---

## Outbox Trigger Model

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated trigger | New AFTER UPDATE trigger on statuses, fires on NEW.status='free' AND OLD.status IS DISTINCT FROM 'free'. INSERT-only into free_transitions outbox. Single responsibility, doesn't touch Phase 2 trigger. | ✓ |
| Extend Phase 2 on_status_transition trigger | Add INSERT INTO free_transitions branch inside the existing trigger function. One trigger to maintain, but couples history-logging with notification fan-out. | |
| Reuse status_history as the outbox | No new outbox table. Database Webhook fires on every status_history INSERT, Edge Function filters for 'free' rows. Mixes audit log with fan-out queue, makes FREE-11 monitoring harder. | |

**User's choice:** New dedicated trigger (Recommended)
**Notes:** Single-responsibility separation. Reuses Phase 2's IS DISTINCT FROM idiom and SECURITY DEFINER + search_path="" hardening pattern.

---

## Rate-Limit Storage

| Option | Description | Selected |
|--------|-------------|----------|
| friend_free_pushes log table | New table, Edge Function queries with sliding-window predicates before each push, inserts a row whether sent or suppressed. Suppression rows feed debugging and future analytics. | ✓ |
| SQL helper function called by Edge Function | CREATE FUNCTION can_send_friend_free(recipient, sender) RETURNS boolean SECURITY DEFINER. Cleaner SQL boundary, but logic harder to test and harder to log suppressions. | |
| In-memory cache inside Edge Function | Hot cache keyed by (recipient, sender). Edge Functions are stateless across invocations on Supabase — cache resets every cold start, rules itself out. | |

**User's choice:** friend_free_pushes log table (Recommended)
**Notes:** Suppression rows are debugging gold. Enum-style suppression_reason per D-11. Retention deferred to v1.4 mirroring Phase 2 TTL-08.

---

## Quiet Hours Timezone Source

| Option | Description | Selected |
|--------|-------------|----------|
| profiles.timezone IANA field | Add profiles.timezone TEXT (e.g., 'Europe/London'). Client writes Intl.DateTimeFormat().resolvedOptions().timeZone on launch + sign-in. Edge Function uses Postgres AT TIME ZONE for the comparison (no JS tz library required — Supabase tzdata is current). | ✓ |
| Fixed UTC offset stored per user | profiles.tz_offset_minutes INTEGER. Simpler math, but breaks across DST until next launch. | |
| Trust client to suppress on receipt | Server fans out to everyone, client suppresses display in 22-08. Still wakes the device, still costs an Expo push, defeats the spirit of FREE-06. | |

**User's choice:** profiles.timezone IANA field (Recommended)
**Notes:** Fail-open behavior on NULL timezone (Edge Function falls back to UTC and only suppresses if UTC is in 22-08). Logged as suppression_reason='quiet_hours' for observability.

---

## iOS Categories Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 3 modifies notifications-init.ts directly | Phase 3 adds friend_free + expiry_warning categories to the Phase 1 file. Co-locates each category with the phase that needs it. Planner verifies no conflicts with Phase 1's still-open plans (01-04, 01-06). | ✓ |
| Defer to a Phase 1 add-on plan | Phase 3 documents the requirement, opens a small Phase 1 follow-up plan. Cleaner separation but creates a cross-phase dependency that blocks Phase 3 execution. | |

**User's choice:** Phase 3 modifies notifications-init.ts directly (Recommended)
**Notes:** Action button identifiers KEEP_IT and HEADS_DOWN documented in the same file.

---

## FREE-11 Monitoring

| Option | Description | Selected |
|--------|-------------|----------|
| Document the SQL query, no auto-alert | Ship a documented SQL query (`SELECT * FROM free_transitions WHERE sent_at IS NULL AND occurred_at < now() - interval '5 minutes'`) + Studio snippet in CONTEXT.md / a Plan. Operator runs it manually. Auto-alerting deferred to v1.4. | ✓ |
| Scheduled Edge Function that emails operator | New scheduled Edge Function runs every minute, queries the outbox, sends email via Resend/Postmark on stale rows. Real alerting but new dependency + email provider + secrets. | |
| Supabase Database Webhook → Slack/Discord | Outbox INSERT fires a webhook to a channel; operator notices stale rows manually. No auto-stale-detection — still need a periodic check. | |

**User's choice:** Document the SQL query, no auto-alert (Recommended)
**Notes:** Matches v1.3 minimum-infra spirit. Auto-alerting deferred to v1.4 alongside the rest of the monitoring backlog.

---

## Claude's Discretion

- Exact column types, defaults, and index strategy on `free_transitions` and `friend_free_pushes`
- Edge Function file structure and chunking strategy
- Local notification reschedule debounce window
- Profile screen visual layout for the new "Friend availability" toggle
- Fail-open vs fail-closed defaults for minor errors

## Deferred Ideas

- Configurable quiet hours UI → v1.4
- Auto-alerting on stale outbox rows → v1.4
- friend_free_pushes retention rollup → v1.4
- iOS background action dispatch → v1.4
- Rich push body with avatar → not in scope for v1.3
- Analytics events for fan-out rates / suppression patterns → v1.4
- pg_cron enablement → still deferred
