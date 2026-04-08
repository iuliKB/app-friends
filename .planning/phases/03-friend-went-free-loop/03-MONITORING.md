# Phase 3 — Monitoring & Observability

**Purpose:** Manual monitoring for the Friend-Went-Free fan-out pipeline. v1.3 ships
documented SQL queries (no auto-alerting — deferred to v1.4 per CONTEXT D-19). Run these
from Supabase Studio → SQL Editor or via `SUPABASE_ACCESS_TOKEN=… npx supabase db query --linked`.

---

## FREE-11 — Stale outbox rows (canonical query)

Rows in `public.free_transitions` that the `dispatch_free_transition` webhook trigger
tried to deliver but that have not yet been marked `sent_at` by the Edge Function.
A row older than 5 minutes with `sent_at IS NULL` indicates a fan-out failure:
webhook couldn't reach the Edge Function, Edge Function threw and retried, or the
service-role GUC (`app.service_role_key`) is missing/wrong.

```sql
SELECT id, sender_id, occurred_at, attempts, last_error
FROM public.free_transitions
WHERE sent_at IS NULL
  AND occurred_at < now() - interval '5 minutes'
ORDER BY occurred_at;
```

**Expected result in healthy state:** zero rows.

**If rows appear:**
1. Inspect `last_error` on the oldest row — that's the first failure signal.
2. Check Edge Function logs: `SUPABASE_ACCESS_TOKEN=… npx supabase functions logs notify-friend-free --linked --tail`.
3. Verify GUCs are set: `SELECT current_setting('app.edge_functions_url', true), current_setting('app.service_role_key', true) IS NOT NULL`.
4. Re-trigger dispatch manually by touching the outbox row:
   `UPDATE public.free_transitions SET attempts = attempts WHERE id = <id>;` — the
   `dispatch_free_transition` trigger is AFTER INSERT, not AFTER UPDATE, so this will
   NOT re-fire. Use `DELETE + INSERT` via a transaction if re-fire is needed, or
   `SELECT extensions.http_post(...)` manually with the same payload.

---

## Suppression diagnostics — why didn't I get notified?

Every fan-out decision is logged to `public.friend_free_pushes`, including suppressions.
To answer "why didn't user X get notified when friend Y went Free?" run:

```sql
SELECT sent_at, suppressed, suppression_reason
FROM public.friend_free_pushes
WHERE recipient_id = '<recipient_uuid>'
  AND sender_id = '<sender_uuid>'
ORDER BY sent_at DESC
LIMIT 20;
```

Suppression reasons (from CONTEXT D-11, enforced in notify-friend-free Edge Function):

| Reason | Meaning |
|--------|---------|
| `self` | Recipient is the sender (defensive — RPC already filters) |
| `recipient_disabled_pref` | Recipient has `profiles.notify_friend_free = false` (FREE-07 toggle off) |
| `recipient_busy` | Recipient's effective_status is 'busy' or null (DEAD heartbeat) |
| `quiet_hours` | Recipient's local hour is in [22, 08) per their `profiles.timezone` |
| `pair_15min` | Same (recipient, sender) pair received a push in the last 15 min |
| `recipient_5min` | Recipient received any friend-free push in the last 5 min |
| `daily_cap` | Recipient has ≥3 suppressed=false pushes in the last 24h |
| `recipient_invalidated_token` | Recipient has no valid push_tokens (all invalidated per PUSH-09) |

---

## Rolling totals — daily fan-out volume

```sql
SELECT
  date_trunc('day', sent_at) AS day,
  count(*) FILTER (WHERE NOT suppressed) AS sent,
  count(*) FILTER (WHERE suppressed) AS suppressed,
  count(*) AS total
FROM public.friend_free_pushes
WHERE sent_at > now() - interval '7 days'
GROUP BY 1
ORDER BY 1 DESC;
```

Watch for suppressed >> sent — indicates rate limits are firing too aggressively or
users are silently opting out.

---

## v1.4 backlog

- Auto-alerting on stale outbox rows (scheduled Edge Function → email/Slack)
- `friend_free_pushes` retention rollup (14-day fresh / >14-day aggregated)
- Per-recipient configurable quiet hours
- Per-friend mute
