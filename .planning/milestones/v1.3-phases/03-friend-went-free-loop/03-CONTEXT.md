# Phase 3: Friend Went Free Loop - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

When a friend's status flips from non-Free → Free, eligible recipients receive a push notification within ~5 seconds — without becoming spam. Plus EXPIRY-01: 30-min-before-status-expiry warning push to the user themselves with [Keep it]/[Heads down] action buttons.

**In scope:**
- `free_transitions` outbox table + dedicated AFTER UPDATE trigger on `statuses`
- `notify-friend-free` Edge Function (called by Database Webhook on outbox INSERT)
- `friend_free_pushes` log table for rate-limit enforcement (15-min/pair, 5-min/recipient, ~3/day)
- `profiles.timezone` IANA field for quiet-hours computation (22:00–08:00 local)
- New "Friend availability" Profile toggle alongside existing "Plan invites"
- New iOS categories: `friend_free` (body-only) and `expiry_warning` (Keep it / Heads down) added directly to `src/lib/notifications-init.ts`
- EXPIRY-01: client-side local notification scheduled at status_expires_at - 30min, foreground in-app action handler dispatches to `useStatus.setStatus`
- Notification deep-link to DM via existing `/chat/room?dm_channel_id=…&friend_name=…` route (Phase 1 D-08)
- Documented SQL query for stale-outbox monitoring (no auto-alerting)

**Out of scope (other phases / deferred):**
- Configurable quiet hours UI → v1.4 (FREE-06 says hardcoded for v1.3)
- Auto-alerting on stale outbox rows → v1.4 (manual SQL query for v1.3)
- pg_cron extension enablement → continues to be deferred per Phase 2 OVR-05
- Server-side scheduled Edge Functions → not needed (EXPIRY-01 is client-side)
- Morning prompt scheduling → Phase 4
- Phase 1 work (push registration, channels, base categories) → already in progress
</domain>

<decisions>
## Implementation Decisions

### EXPIRY-01 Scheduler
- **D-01:** EXPIRY-01 is a **self-notification** (the user's own status expiring), not a fan-out. Schedule lives **client-side as a local expo-notification** at `status_expires_at - 30min`. No server-side cron, no pg_cron, no scheduled Edge Function. This preserves the Phase 2 OVR-05 deferral of pg_cron and avoids introducing a parallel scheduling mechanism.
- **D-02:** Every `useStatus.setStatus` call must (a) cancel any previously-scheduled expiry notification for this user via `Notifications.cancelScheduledNotificationAsync`, then (b) schedule a fresh one if `status_expires_at - now > 30min`. No schedule if the window is already shorter than 30 min — banner UX (Phase 2's ReEngagementBanner) already covers that case.
- **D-03:** "Keep it" action from EXPIRY-01 calls `setStatus(currentMood, currentTag, nextWindowId)` where `nextWindowId` is the next-larger window from `windows.ts` (e.g., "1h" → "3h", "until_1800" → "until_2200", "rest_of_day" → re-anchor as 3h). Reuses the existing windows utility — no new logic.
- **D-04:** Doze mode trade-off accepted: Android may delay the local notification by up to ~15 min in deep doze. Acceptable for a 30-min-before-expiry warning. iOS local notifications fire reliably.

### EXPIRY-01 / FRIEND-FREE Action Handlers
- **D-05:** Notification action buttons are handled by the **foreground in-app handler** in `src/lib/notifications-init.ts`. The handler dispatches: `[Keep it]` → `useStatus.setStatus(currentMood, currentTag, nextWindowId)`, `[Heads down]` → `useStatus.setStatus('busy', null, '3h')`. Reuses Phase 2 useStatus and the existing Supabase session. Zero new public Edge Functions, no signed payloads. Same architectural pattern as Phase 1 D-20 morning_prompt category.
- **D-06:** iOS background-action mode is NOT used for v1.3 — tapping an action button wakes the app to foreground. This gives the user immediate visual confirmation that the action took effect. v1.4 may revisit for instant background dispatch.

### Outbox Trigger Model
- **D-07:** Create a **dedicated** AFTER UPDATE trigger on `public.statuses` (separate from Phase 2's `on_status_transition`), guarded by `NEW.status = 'free' AND OLD.status IS DISTINCT FROM 'free'`. The trigger function inserts one row into `free_transitions(sender_id, occurred_at, context_tag)`. Single-responsibility — does not touch the Phase 2 history-logging trigger. INSERT-only path keeps the <100ms write SLO trivial.
- **D-08:** Trigger function is `SECURITY DEFINER` with hardened `search_path = ""` (matches Phase 2 hardening pattern T-02-09).
- **D-09:** `free_transitions` schema (planner finalizes column types and indexes):
  - `id BIGSERIAL PRIMARY KEY`
  - `sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
  - `occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `context_tag TEXT NULL` — denormalized snapshot of statuses.context_tag at transition time
  - `sent_at TIMESTAMPTZ NULL` — null until the Edge Function consumes the row
  - `attempts SMALLINT NOT NULL DEFAULT 0`
  - `last_error TEXT NULL`
  - Index on `(sent_at) WHERE sent_at IS NULL` for outbox sweeps
  - RLS: SELECT denied to all clients; service-role / SECURITY DEFINER only

### Rate-Limit Storage
- **D-10:** Create `friend_free_pushes(recipient_id, sender_id, sent_at, suppressed BOOLEAN, suppression_reason TEXT NULL)` log table. Edge Function queries this table with sliding-window predicates BEFORE each push, then inserts a row regardless of outcome (sent or suppressed). Pros: testable, easy to extend, suppression rows are debugging gold ("why didn't I get notified?"), feeds future analytics.
- **D-11:** Suppression reasons are an enum-style string set: `'pair_15min' | 'recipient_5min' | 'daily_cap' | 'quiet_hours' | 'recipient_busy' | 'recipient_disabled_pref' | 'recipient_invalidated_token' | 'self'`. Single source of truth in the Edge Function.
- **D-12:** Sliding window queries use `sent_at > now() - interval '15 minutes'` style predicates against the log table. Daily cap window is `now() - interval '24 hours'` (rolling, not calendar-day, to avoid clock-edge spikes).
- **D-13:** Retention: planner adds a v1.4 backlog item to roll up `friend_free_pushes` rows older than 14 days (mirror of Phase 2 TTL-08 rollup deferral). v1.3 ships with no rollup — at v1.3 scale (3-15 friend squads, ~3 sends/recipient/day worst case) the table will not need active management before v1.4.

### Quiet Hours Timezone Source
- **D-14:** Add `profiles.timezone TEXT NULL` (IANA name like `'Europe/London'`) in this phase's migration. Default NULL until first write.
- **D-15:** Client writes `Intl.DateTimeFormat().resolvedOptions().timeZone` on every app launch + sign-in if the field is null OR differs from device-reported value (catches user travel). Single upsert path through a helper in `src/hooks/useProfile.ts` or equivalent.
- **D-16:** Edge Function reads `recipient.timezone`, computes the recipient's local hour at fan-out time using `AT TIME ZONE recipient.timezone` in SQL (no JS tz library required — Postgres handles IANA names natively when system tzdata is current, which Supabase guarantees). If `timezone IS NULL` for a recipient, fall back to UTC for the comparison and log a warning row in `friend_free_pushes` with `suppression_reason='quiet_hours'` only if the UTC hour is in 22-08; otherwise allow the push (fail-open, not fail-closed).

### iOS Categories — Phase 3 Modifies notifications-init.ts Directly
- **D-17:** Phase 3's plans add the new categories `friend_free` (no actions, body-only) and `expiry_warning` (two actions: `KEEP_IT`, `HEADS_DOWN`) directly to `src/lib/notifications-init.ts`. Co-locates each category with the phase that needs it. Phase 1 only ships `morning_prompt` per D-20; Phase 3 owns its own categories. Planner verifies no conflicts with Phase 1's still-open plans (01-04, 01-06).
- **D-18:** Action button identifiers are stable strings: `KEEP_IT` and `HEADS_DOWN`. Documented in the same file. The `expiry_warning` category is registered alongside the existing `morning_prompt` category at module scope.

### Monitoring (FREE-11)
- **D-19:** No automated alerting in v1.3. Phase 3 ships a **documented SQL query** in CONTEXT.md / a Plan that the operator runs manually or pins in Supabase Studio:
  ```sql
  SELECT id, sender_id, occurred_at, attempts, last_error
  FROM public.free_transitions
  WHERE sent_at IS NULL AND occurred_at < now() - interval '5 minutes'
  ORDER BY occurred_at;
  ```
  Auto-alerting (scheduled Edge Function → email/Slack) deferred to v1.4. Matches v1.3 minimum-infra spirit.

### Profile Toggle (FREE-07)
- **D-20:** New "Friend availability" toggle added to existing Profile notifications section, alongside "Plan invites". When OFF, the recipient is excluded from `notify-friend-free` fan-out by an early check in the Edge Function (queries the user's preference field). Storage: a new boolean column on `profiles` (e.g., `notify_friend_free`) defaulting to `true`. RLS: user reads/writes their own row only.
- **D-21:** Existing "Plan invites" toggle continues to control plan-invite delivery exclusively. The two toggles are independent — Phase 1's notifications-off mechanism (delete push_tokens row) is the global kill switch; this toggle is a per-channel preference.

### Claude's Discretion
- Exact column types, defaults, and index strategy on `free_transitions` and `friend_free_pushes` (planner decides)
- Edge Function file structure under `supabase/functions/notify-friend-free/`
- How the Edge Function batches sends to Expo (chunk size, parallelism)
- Fail-open vs fail-closed behavior on minor errors (planner picks defensible default)
- Whether suppression-reason logging is structured (enum) or free-text (planner picks)
- Local notification reschedule debounce window (e.g., don't reschedule if next fire time is within 30s of currently-scheduled)
- Profile screen visual layout for the new toggle
- Analytics events (if any) — out of scope for v1.3 unless infra exists

### Folded Todos
None — `gsd-tools todo match-phase 3` returned 0 matches.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 source-of-truth
- `.planning/REQUIREMENTS.md` (lines 48-58 + 59 EXPIRY-01) — FREE-01..11, EXPIRY-01 acceptance criteria
- `.planning/ROADMAP.md` Phase 3 section — Goal + Success Criteria (read goal, treat ROADMAP success criteria as advisory; this CONTEXT.md and REQUIREMENTS.md are authoritative for v1.3)

### Cross-phase dependencies
- `.planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md` — D-08 (DM route is `/chat/room?dm_channel_id=…&friend_name=…` — NOT `/dm/[userId]`), D-18 (Android channels including `friend_free` HIGH already created), D-20 (iOS category registration pattern at module scope), D-22 (DeviceNotRegistered → invalidated_at filtering pattern to copy into notify-friend-free)
- `.planning/phases/02-status-liveness-ttl/02-CONTEXT.md` — D-31..D-34 (status model), OVR-05 (pg_cron NOT enabled — relevant for the EXPIRY-01 scheduler decision), D-09 (window utility used by [Keep it] action handler)
- `.planning/phases/02-status-liveness-ttl/02-02-SUMMARY.md` — Live schema snapshot (effective_status view, status_history, last_active_at) confirmed pushed to project `zqmaauaopyolutfoizgq`

### Code references
- `supabase/functions/notify-plan-invite/` — Reference implementation for Edge Function fan-out pattern (queue read, push send, ticket parse, invalidated_at marking). Phase 3's `notify-friend-free` should mirror this structure.
- `src/lib/notifications-init.ts` (Phase 1, in progress) — Module-scope iOS category registration; Phase 3 adds `friend_free` + `expiry_warning` categories here directly per D-17
- `src/hooks/useStatus.ts` — `setStatus` and `touch` exports used by EXPIRY-01 action handlers
- `src/lib/windows.ts` — `WindowId` enum + `computeWindowExpiry` consumed by [Keep it] action handler
- `src/app/(tabs)/profile.tsx` — Existing notifications toggle pattern to copy for the new "Friend availability" toggle
- `supabase/migrations/0009_status_liveness_v1_3.sql` — Last applied migration; Phase 3 migration is `0010_friend_went_free_v1_3.sql` per existing numbering
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notify-plan-invite` Edge Function — full reference implementation for the fan-out pattern (Phase 3 copies its structure for `notify-friend-free`)
- `expo-notifications` — already a project dependency; supports both local and remote notifications with the same handler API
- `useStatus.setStatus` (Phase 2) — single entry point for committing a status; reused by both EXPIRY-01 action buttons
- `windows.computeWindowExpiry` + `WindowId` enum (Phase 2) — used by [Keep it] action to derive the next window
- Phase 1's `friend_free` Android channel (HIGH importance) — already provisioned
- Phase 1's DeviceNotRegistered → invalidated_at pattern — copy into notify-friend-free
- Existing Profile notifications toggle pattern — copy for the new "Friend availability" toggle

### Established Patterns
- SECURITY DEFINER triggers with `search_path = ""` hardening (Phase 2 T-02-09)
- Outbox migrations use 3-step add-nullable → backfill → SET NOT NULL (Phase 1 0008 + Phase 2 0009 pattern)
- iOS categories registered at module scope BEFORE first `requestPermissionsAsync` call (Phase 1 D-20)
- DM route is `/chat/room?dm_channel_id=…&friend_name=…` (Phase 1 D-08 — corrected from earlier `/dm/[userId]` mistake)
- Edge Functions live under `supabase/functions/<name>/index.ts`

### Integration Points
- New trigger on `statuses` table — coexists with Phase 2's `on_status_transition`
- New `notify-friend-free` Edge Function fired by a Database Webhook on `free_transitions` INSERT
- `src/lib/notifications-init.ts` — Phase 3 adds two categories (Phase 1 still owns the file structure and the morning_prompt category)
- `src/hooks/useStatus.ts` — Phase 3 adds the local-notification cancel+reschedule side effect on each `setStatus` call
- `profiles` table — Phase 3 migration adds `timezone TEXT NULL` and `notify_friend_free BOOLEAN NOT NULL DEFAULT true`
</code_context>

<specifics>
## Specific Ideas

- "EXPIRY-01 is a self-notification" — the framing that flipped the scheduler decision from server-side cron to client-side local notification (sender = recipient = user themselves)
- "Suppression rows are debugging gold" — log every push attempt with suppression_reason so users can later answer "why didn't I get notified?"
- "Defer pg_cron one more milestone" — Phase 2 OVR-05 deferred TTL-08 partly because pg_cron is not enabled; Phase 3's client-side scheduler choice keeps that deferral intact
</specifics>

<deferred>
## Deferred Ideas

- **Configurable quiet hours UI** → v1.4 (FREE-06 explicit deferral)
- **Auto-alerting on stale free_transitions rows** → v1.4 (FREE-11 ships as documented manual query in v1.3)
- **friend_free_pushes retention rollup** → v1.4 (parallel to Phase 2 TTL-08 deferral)
- **iOS background action dispatch** for [Keep it] / [Heads down] (notification action runs without launching the app) → v1.4
- **Rich push body** with avatar / context image → not in scope for v1.3, body-only per FREE-08
- **Analytics events** for fan-out rates / suppression patterns → v1.4 (no analytics infra exists yet)
- **pg_cron enablement** → still deferred (no v1.3 phase needs it after the Phase 3 client-side scheduler decision)

### Reviewed Todos (not folded)
None — match-phase returned 0 todos.
</deferred>

---

*Phase: 03-friend-went-free-loop*
*Context gathered: 2026-04-08*
