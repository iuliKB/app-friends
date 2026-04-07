---
phase: 02
slug: status-liveness-ttl
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. v1.3 has **no JS test framework** (zero-deps rule, ratified in Phase 1). Verification is grep + tsc + eslint + assertion scripts in plan acceptance criteria, plus a deferred manual smoke gate that lands in Phase 5 (Hardware Verification Gate).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (zero-deps rule from Phase 1; Jest dev-dep explicitly rejected per 02-CONTEXT.md OVR-10) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit && npx eslint src/ --max-warnings 0` |
| **Full suite command** | `npx tsc --noEmit && npx eslint src/ --max-warnings 0` (same as quick — there is no test runner) |
| **Estimated runtime** | ~15-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command on touched files only (`npx tsc --noEmit && npx eslint <touched files> --max-warnings 0`)
- **After every plan wave:** Run the full quick command across `src/` + the migration apply check (`supabase db diff` if available, otherwise visual review)
- **Before phase wrap:** Full quick command green + every plan's `<automated>` assertion grep passes
- **Manual hardware verification:** Deferred to Phase 5 Hardware Verification Gate (per project pattern, see `.planning/ROADMAP.md` Phase 5 inputs list)
- **Max feedback latency:** ~30 seconds (tsc + eslint dominates)

---

## Per-Task Verification Map

The detailed task-level verification map will be filled in by the planner during step 8. Every task in every PLAN.md MUST include an `<automated>` block with grep-verifiable acceptance criteria. The map below is the high-level requirement-to-verification routing the planner should honor.

| Requirement | Verification Type | How to verify automatically |
|-------------|-------------------|------------------------------|
| **TTL-01** (window picker, 5 options, time-of-day hide rule) | unit (manual grep) | grep `getWindowOptions` in `src/lib/windows.ts`; assertion script that calls `getWindowOptions(new Date('...T17:30:00'))` and confirms `Until 6pm` is absent |
| **TTL-02** (preset chip per mood) | unit + content grep | grep `src/components/status/moodPresets.ts` for exactly 5 entries per mood key; tsc passes |
| **TTL-03** (display format "{Mood} · {tag} · {window}") | render grep | grep `HomeFriendCard.tsx` for the format string; visual verification deferred to Phase 5 |
| **TTL-04** (effective_status view, friends see expired as null) | SQL apply check | `supabase db reset` (if local) or migration review; manual SELECT against the view post-deploy in Phase 5 |
| **TTL-05** (heartbeat replaces hard reset) | absence check | grep `pg_cron`, `cron.schedule`, `5am` across `supabase/migrations/0009*.sql` → must return ZERO matches |
| **TTL-06** (ReEngagementBanner on FADING) | render grep | grep `ReEngagementBanner` import in `src/screens/home/HomeScreen.tsx` (or wherever home renders); component exists at `src/components/home/ReEngagementBanner.tsx` |
| **TTL-07** (status_history append on transitions) | SQL apply + trigger grep | migration 0009 contains `CREATE TRIGGER on_status_transition`, `LANGUAGE plpgsql SECURITY DEFINER`, `IS DISTINCT FROM` guard |
| **TTL-08** (retention) | DEFERRED to v1.4 per OVR-05 | grep migration 0009 confirms NO rollup function and NO GC function; deferred-ideas note in CONTEXT.md is captured |
| **HEART-01** (last_active_at column) | SQL apply | migration 0009 contains `ADD COLUMN last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()` |
| **HEART-02** (client touch on cold launch + AppState active) | code grep | `src/app/(tabs)/_layout.tsx` contains `touch()` call inside the existing AppState effect; debounce constant 60_000 ms present |
| **HEART-03** (computeHeartbeatState utility) | unit (assertion script) | `src/lib/heartbeat.ts` exports `computeHeartbeatState`; assertion script calls it with 3 fixture inputs and confirms each returns the expected enum value |
| **HEART-04** (FADING dim, DEAD section move) | render grep | `HomeFriendCard.tsx` references `heartbeatState`, `0.6` opacity, `'inactive'` label string |
| **HEART-05** (ReEngagementBanner copy + 3 actions + auto-dismiss 8s) | render grep | `ReEngagementBanner.tsx` contains `Keep it`, `Update`, `Heads down` button labels, `8000` ms timeout |

---

## Wave 0 Requirements

There is no Wave 0 in the traditional sense (no test framework to install). The closest equivalent is the **migration apply gate**: every plan that depends on schema work must wait for migration 0009 to be authored (in an earlier wave) before its tasks run. This is captured in plan dependencies, not a separate "Wave 0" plan.

- [ ] Confirm `npx tsc --noEmit` is green at the start of execution (no pre-existing errors)
- [ ] Confirm `npx eslint src/ --max-warnings 0` is green at the start of execution
- [ ] Confirm `supabase db reset` (or equivalent) is available locally for migration apply verification

---

## Manual-Only Verifications

These verifications cannot be automated in v1.3 (no test framework, no E2E runtime). They are appended to Phase 5 Hardware Verification Gate's input list and executed once on hardware.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MoodPicker visual layout (3 stacked rows, presets row, windows row, two-stage commit) | TTL-01, TTL-02 | UI behavior, no E2E runtime | Open Home, tap Free → presets row appears, tap "grab a coffee" → window chips appear, tap "1h" → status commits, label reads "Free · grab a coffee · for 1h" |
| Time-of-day hide rule | TTL-01 | Requires real device clock | Set device time to 5:45pm local, open MoodPicker, confirm "Until 6pm" chip is hidden but "Until 10pm" is visible |
| Maybe gets a window (not indefinite) | TTL-01 | UI flow check | Tap Maybe → confirm window chips appear (was indefinite in v1.0) |
| Friend cards dim when FADING | HEART-04 | Requires aged `last_active_at` | Use Supabase SQL editor to manually set a friend's `last_active_at` to `now() - interval '5 hours'`; refresh Home; confirm card opacity is ~0.6 and label reads "{Mood} · 5h ago" |
| Friend moves to Everyone Else when DEAD | HEART-04 | Requires aged data | Set a friend's `last_active_at` to `now() - interval '9 hours'`; refresh Home; confirm card moves out of Free section into Everyone Else with "inactive" label |
| ReEngagementBanner appears when own state is FADING | HEART-05, TTL-06 | Requires aged `last_active_at` on own row | Set own `last_active_at` to `now() - interval '5 hours'`; foreground app; confirm banner appears with "Keep it / Update / Heads down" actions; tap Keep it → banner disappears, `last_active_at` advances |
| ReEngagementBanner auto-dismiss after 8s | HEART-05 | Timing-dependent | Trigger banner, do nothing, count to 8 — banner disappears, status unchanged |
| "What's your status today?" heading on DEAD open | HEART-04 | Requires DEAD state | Set own `last_active_at` to `now() - interval '9 hours'`; cold-launch app; confirm heading appears above MoodPicker |
| Two-screen sync (commit on Profile updates Home) | D-25 / OVR-02 | Multi-screen flow | Open Profile, set status; switch to Home; confirm own status row reflects the new mood + tag + window without manual refresh |
| Migration 0009 applies cleanly + RLS policies enforce "user OR friend" SELECT | TTL-04, TTL-07 | DB-level | After deploy, run `supabase db reset` (local) OR test query as anonymous user (Studio); confirm friend can SELECT another friend's `status_history` row but a stranger cannot |
| `effective_status` view returns NULL for expired/DEAD users | TTL-04, HEART-03 | DB-level | Insert test status row with `status_expires_at = now() - 1 second`; SELECT from `effective_status` view; confirm `effective_status` is NULL |
| Trigger fires only on mood transition (not tag-only updates) | TTL-07, OVR-09 | DB-level | UPDATE statuses SET context_tag = 'foo' WHERE user_id = X (no mood change); confirm 0 new rows in `status_history` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (grep + tsc + eslint) or are explicitly listed in Manual-Only above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers tsc/eslint baseline check
- [ ] No watch-mode flags (`--watch`, `--ui` forbidden)
- [ ] Feedback latency < 30s
- [ ] All Manual-Only items appended to Phase 5 Hardware Verification Gate input list

**Approval:** pending (will be approved by gsd-plan-checker after planner authors all PLAN.md files)
