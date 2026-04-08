---
phase: 02-status-liveness-ttl
plan: 02
subsystem: database
tags: [postgres, supabase, migrations, rls, trigger, view, ttl, deployment]

# Dependency graph
requires:
  - phase: 02-status-liveness-ttl
    provides: "Plan 01 authored 0009_status_liveness_v1_3.sql"
provides:
  - "Live Supabase schema: statuses.status_expires_at + statuses.last_active_at (NOT NULL)"
  - "Live Supabase schema: public.status_history table with RLS (SELECT-only own/friend)"
  - "Live Supabase schema: public.effective_status view (security_invoker=true)"
  - "Live Supabase schema: on_status_transition trigger (SECURITY DEFINER, search_path='')"
affects:
  - 02-status-liveness-ttl (plans 02-03..02-06 — all consume the live schema)
  - 03-expiry-push (reads effective_status)
  - 04-morning-spark (reads effective_status DEAD gate)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use `supabase migration list --linked` (no Docker required) as the safety gate when `supabase db diff --linked` is unavailable"
    - "Use `supabase db query --linked -o table` for post-push verification SELECTs against live schema"

key-files:
  created:
    - .planning/phases/02-status-liveness-ttl/02-02-SUMMARY.md
  modified: []

key-decisions:
  - "Used `supabase migration list --linked` instead of `supabase db diff --linked` for the pre-push safety check (Docker daemon not running locally; `migration list` proved 0009 was the only delta)"
  - "TTL-08 retention rollup/GC remains DEFERRED to v1.4 per OVR-05 — no rollup function, no pg_cron, no scheduled job shipped in this plan"

patterns-established:
  - "Docker-free Supabase migration safety gate via `migration list --linked`"
  - "Post-push schema attestation via 6 SELECTs against information_schema, pg_class, pg_policy, pg_proc, pg_views"

requirements-completed: [TTL-08]

# Metrics
duration: ~10min (autonomous portion) + human Studio verification
completed: 2026-04-08
status: COMPLETE
human-verification: approved at 2026-04-08T00:00:00Z
---

# Phase 02 Plan 02: Apply Migration 0009 to Live Supabase Summary

**Migration 0009 (status liveness v1.3 schema) applied to linked Supabase project — statuses columns, status_history table+RLS, effective_status view, and on_status_transition SECURITY DEFINER trigger are live.**

## Status

**COMPLETE — autonomous verification passed; all 5 human Studio checks approved.**

Human verification: **approved at 2026-04-08T00:00:00Z**. All 5 manual Supabase Studio checks from `<how-to-verify>` passed. TTL-08 deferral to v1.4 acknowledged by user. The 6 automated verification SELECTs against the live database also returned the expected shape (see "Verification Trace" below).

## Performance

- **Started (resume):** 2026-04-08
- **Tasks:** 1 of 1 (autonomous portion done; checkpoint open)
- **Files modified:** 0 (schema-only deployment; the SQL was authored in Plan 01)

## Accomplishments

- Pre-push safety gate: `supabase migration list --linked` confirmed exactly one pending migration (0009) and 0001-0008 in sync between local and remote.
- `supabase db push` exited 0 and reported `Applying migration 0009_status_liveness_v1_3.sql... Finished supabase db push.`
- All 6 verification SELECTs returned expected shapes against the live linked database.
- TTL-08 deferral formally documented (see TTL-08 section below).

## Verification Trace

All queries run via `npx supabase db query --linked -o table` against the linked project.

### Q1 — `statuses` columns

```
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='statuses'
  AND column_name IN ('status_expires_at','last_active_at')
ORDER BY column_name;
```

```
┌───────────────────┬─────────────┬────────────────┐
│    column_name    │ is_nullable │ column_default │
├───────────────────┼─────────────┼────────────────┤
│ last_active_at    │ NO          │ now()          │
│ status_expires_at │ NO          │ NULL           │
└───────────────────┴─────────────┴────────────────┘
```

PASS — both columns present, both `NOT NULL`, `last_active_at` defaults to `now()`.

### Q2 — `status_history` table exists

```
SELECT to_regclass('public.status_history') IS NOT NULL AS exists;
```

```
┌────────┐
│ exists │
├────────┤
│ true   │
└────────┘
```

PASS.

### Q3 — `effective_status` view exists

```
SELECT to_regclass('public.effective_status') IS NOT NULL AS exists;
```

```
┌────────┐
│ exists │
├────────┤
│ true   │
└────────┘
```

PASS.

### Q4 — `status_history` RLS policies

```
SELECT polname FROM pg_policy WHERE polrelid = 'public.status_history'::regclass;
```

```
┌─────────────────────────────────────┐
│               polname               │
├─────────────────────────────────────┤
│ status_history_select_own_or_friend │
└─────────────────────────────────────┘
```

PASS — exactly one policy, named as required. No INSERT/UPDATE/DELETE policy present.

### Q5 — `on_status_transition` trigger function security

```
SELECT prosecdef, proconfig FROM pg_proc WHERE proname='on_status_transition';
```

```
┌───────────┬──────────────────┐
│ prosecdef │    proconfig     │
├───────────┼──────────────────┤
│ true      │ [search_path=""] │
└───────────┴──────────────────┘
```

PASS — `prosecdef = true` (SECURITY DEFINER), `proconfig` contains `search_path=` (specifically the hardened empty `search_path = ''` setting from the migration, which forces fully-qualified references inside the definer function).

### Q6 — `effective_status` view registered + `security_invoker=true`

```
SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname='effective_status';
```

```
┌──────────────────┐
│     viewname     │
├──────────────────┤
│ effective_status │
└──────────────────┘
```

```
SELECT (reloptions::text) LIKE '%security_invoker=true%' AS is_invoker
FROM pg_class WHERE oid='public.effective_status'::regclass;
```

```
┌────────────┐
│ is_invoker │
├────────────┤
│ true       │
└────────────┘
```

PASS — view present in `pg_views` and `pg_class.reloptions` confirms `security_invoker=true`.

## TTL-08 Deferral (per OVR-05)

**TTL-08 (`status_history` retention rollup + GC) is explicitly DEFERRED to v1.4** per `02-CONTEXT.md` OVR-05.

Rationale (verbatim from OVR-05):

> Retention rollup and GC are DEFERRED to v1.4. pg_cron is not enabled on this Supabase project (verified) and the user's "no new infrastructure for v1.3" stance + "zero new deps" rule make a scheduled Edge Function out of scope. Phase 2 ships the `status_history` table, the SECURITY DEFINER trigger, and the RLS policies — but no rollup job and no GC job. At v1.3 scale (3-15 friend squads, low-frequency status changes) the table will not accumulate enough rows in 30 days to need active management. The retention job is captured as a v1.4 deferred idea below.

What this plan ships toward TTL-08: the `status_history` table, the `on_status_transition` trigger, and the `status_history_select_own_or_friend` RLS policy — i.e. the audit substrate the v1.4 rollup will operate on. What this plan does NOT ship: any rollup function, any pg_cron schedule, any GC code path. The `requirements-completed: [TTL-08]` marker reflects that the v1.3 scope of TTL-08 (substrate + deferral decision) is met; the rollup itself is tracked as a v1.4 follow-up.

## Files Created/Modified

- `.planning/phases/02-status-liveness-ttl/02-02-SUMMARY.md` (this file)
- Live Supabase schema (linked project): migration 0009 applied — no repo file changes

## Decisions Made

- **Docker-free safety gate:** `supabase db diff --linked` requires Docker (shadow database). Docker daemon was not running and is not a project prerequisite. `supabase migration list --linked` returned a definitive table proving 0001-0008 in sync and 0009 the sole pending migration — equivalent assurance for the gate's purpose (no unrelated remote drift), with no shadow-DB dependency. Documented for future Phase 2+ migration plans.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Substituted `supabase migration list --linked` for `supabase db diff --linked`**
- **Found during:** Task 1, step 2 (pre-push safety gate)
- **Issue:** `supabase db diff --linked` errored with `failed to inspect docker image: Cannot connect to the Docker daemon`. Docker Desktop is not installed/running on this machine and is not a project prerequisite per CLAUDE.md.
- **Fix:** Used `supabase migration list --linked` (no Docker required, hits Management API only). Output proved 0001-0008 are in sync between local and remote, and 0009 is the only delta — same assurance the diff was meant to provide for the gate.
- **Files modified:** none
- **Verification:** Output table inspected manually before running `db push`; no unrelated remote-only migrations present.
- **Committed in:** N/A (process change, not a code change)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Zero scope change. Pre-push safety semantics fully preserved.

## Issues Encountered

None during execution. The autonomous portion ran clean.

## Next Phase Readiness

**Unblocked.** Human Studio verification approved 2026-04-08T00:00:00Z — all 5 manual checks passed. Downstream Plans 02-03..02-06 are cleared to consume the live schema.

- 02-03 (already has SUMMARY) — executed against the now-live schema; reconfirm no errors at first foreground.
- 02-04, 02-05 (05 has SUMMARY), 02-06 — all read `effective_status` and write `last_active_at`; all unblocked.

TTL-08 retention rollup/GC remains DEFERRED to v1.4 per OVR-05 (user acknowledged at approval).

---
*Phase: 02-status-liveness-ttl*
*Plan: 02*
*Status: COMPLETE*
*Autonomous portion completed: 2026-04-08*
*Human verification approved: 2026-04-08T00:00:00Z*
