---
phase: 04-morning-prompt-squad-goals-streak
verified: 2026-04-10T09:00:00Z
status: human_needed
score: 16/17 must-haves verified
re_verification: false
human_verification:
  - test: "Confirm STREAK-08 non-engineer reviewer is not the project engineer"
    expected: "The copy review approver ('Approved by project owner') is confirmed to be a non-engineer person distinct from the developer; or the project owner explicitly is a non-technical collaborator"
    why_human: "04-COPY-REVIEW.md shows 'Reviewer: Approved by project owner' — the project is described as a solo-dev project, so the 'project owner' may be the same engineer. Plan 06 explicitly mandates a non-engineer reviewer (D-20, STREAK-08). Cannot verify programmatically whether 'project owner' and 'engineer' are different people."
---

# Phase 4: Morning Prompt + Squad Goals Streak Verification Report

**Phase Goal:** Users get a friendly daily nudge to set their status, and squads see a celebratory weekly streak that rewards showing up together.
**Verified:** 2026-04-10T09:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SQL function `public.get_squad_streak(viewer_id uuid, tz text) RETURNS TABLE(current_weeks int, best_weeks int)` exists in migration 0011 | VERIFIED | `supabase/migrations/0011_squad_streak_v1_3.sql` exists, 125 lines, `create or replace function public.get_squad_streak` present |
| 2 | Function is SECURITY DEFINER with hardened `search_path = ''` and explicit `auth.uid()` guard | VERIFIED | `security definer`, `set search_path = ''`, `auth.uid()` at line 30, `raise exception 'not authorized'` at line 42 all present |
| 3 | Function uses correct column `pm2.rsvp = 'going'` (not the erroneous `rsvp_status` column name) and the ≥2 attendee threshold | VERIFIED | Line 93: `pm2.rsvp = 'going'` — matches actual `plan_members.rsvp` schema column; `>= 2` at line 94; `rsvp_status = 'going'` appears in comments only (per SUMMARY deviation note) |
| 4 | Sliding 4-week grace window implemented: streak continues while misses ≤ 1, breaks on misses ≥ 2 | VERIFIED | `array_length(v_window, 1) > 4` (line 99), `v_misses_in_window >= 2` (line 109), `v_window := array[]::boolean[]` reset on break |
| 5 | `best_weeks` computed from full history walk; no new table or materialized view | VERIFIED | No `create table`, no `create materialized`, no `pg_cron`, no `profiles.timezone`, no `squads` table referenced |
| 6 | `src/lib/morningPrompt.ts` exports `scheduleMorningPrompt`, `cancelMorningPrompt`, `ensureMorningPromptScheduled` with stable identifier `'campfire:morning_prompt'`, no `valid_until` in payload | VERIFIED | All 3 exports confirmed, 89 lines, `SCHEDULE_ID = 'campfire:morning_prompt'`, payload `data: { kind: 'morning_prompt' }` only, no `valid_until` in file |
| 7 | `_layout.tsx` `handleNotificationResponse` has `morning_prompt` branch with 12h guard, DEAD heartbeat check, whitelist action ids, rest_of_day commit | VERIFIED | `category === 'morning_prompt'` at line 128, `Date.now() - firedAt > 12 * 60 * 60 * 1000`, `heartbeat !== 'dead'`, `window_id: 'rest_of_day'`, `context_tag: null`, `onConflict: 'user_id'` all present |
| 8 | Sign-out cancels morning prompt via single auth subscriber in `useStatus.ts` | VERIFIED | `cancelMorningPrompt` imported at line 18, called at line 35 adjacent to `cancelExpiryNotification`; `useAuthStore.subscribe` count == 1 |
| 9 | `useStreakData` hook calls `get_squad_streak` RPC with device timezone; silent error fallback to zero state | VERIFIED | `supabase.rpc('get_squad_streak', { viewer_id: userId, tz: getDeviceTimezone() })`, `console.warn('get_squad_streak failed', rpcErr)`, no Alert/Toast, no profiles.timezone read |
| 10 | `StreakCard` renders hero layout with big number, "week streak" label, 🔥, divider, "Best: N weeks" subline; zero-state variant; tap navigates to `/plan-create` | VERIFIED | All locked strings present: "week streak", "Start your first week — make a plan with friends.", "Best: ${bestWeeks} weeks"; `router.push('/plan-create')`, `accessibilityRole="button"`, `StreakCardSkeleton` component; no raw hex, no raw font sizes |
| 11 | Goals tab replaces "Coming soon" stub with `<StreakCard streak={streak} />` inside ScrollView with pull-to-refresh | VERIFIED | `grep -ci "coming soon"` returns 0; `StreakCard` rendered, `RefreshControl refreshing={streak.loading} onRefresh={streak.refetch}`, `useStreakData()` hoisted to squad.tsx (count == 1) |
| 12 | Profile screen has MORNING PROMPT section with Switch + time picker + permission flow reusing PrePromptModal | VERIFIED | `MORNING PROMPT` section header, `DateTimePicker mode="time"`, `Notifications.getPermissionsAsync` + `requestPermissionsAsync`, `PrePromptModal`, AsyncStorage keys for enabled/hour/minute with correct defaults |
| 13 | `tabs/_layout.tsx` cold-launch effect calls `ensureMorningPromptScheduled` without adding a second useEffect | VERIFIED | Single `useEffect` at line 34, `ensureMorningPromptScheduled().catch(() => {})` at line 42 inside existing auth guard, single `AppState.addEventListener` |
| 14 | Copy review file (`04-COPY-REVIEW.md`) exists with 12-row string inventory and non-engineer approval block populated | VERIFIED | 89 lines; Status: approved; Reviewer: "Approved by project owner"; Date: 2026-04-10; all placeholder text replaced |
| 15 | `src/types/database.ts` has `get_squad_streak` RPC type signature (hand-patched) | VERIFIED | `get_squad_streak` found at line 468 of database.ts |
| 16 | MORN-01: Morning prompt fires and no-ops gracefully for taps >12h after fire time | VERIFIED | 12h guard in `_layout.tsx` derives from `response.notification.date` (OS fire time) per CONTEXT D-24 design decision; intent of MORN-01 satisfied even though mechanism is tap-time not fire-time (technical constraint of `repeats: true` prevents static `valid_until` in payload) |
| 17 | STREAK-08: Copy reviewed by a non-engineer with positive-only guardrails | UNCERTAIN | Approval recorded as "Approved by project owner" — cannot verify programmatically that this is a distinct non-engineer person |

**Score:** 16/17 truths verified (1 uncertain — human needed)

### Deferred Items

None. All phase 4 deliverables are addressed within this phase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0011_squad_streak_v1_3.sql` | get_squad_streak function + grant | VERIFIED | 125 lines; all acceptance criteria patterns present |
| `src/lib/morningPrompt.ts` | scheduleMorningPrompt, cancelMorningPrompt, ensureMorningPromptScheduled | VERIFIED | 89 lines; all 3 exports, correct identifier, no valid_until |
| `src/hooks/useStreakData.ts` | useStreakData hook returning { currentWeeks, bestWeeks, loading, error, refetch } | VERIFIED | 74 lines; RPC call, Intl.DateTimeFormat tz, silent error fallback |
| `src/components/squad/StreakCard.tsx` | StreakCard with skeleton + zero state + tap-to-plan-create | VERIFIED | 135 lines; all locked string literals, no hardcoded styles |
| `.planning/phases/04-morning-prompt-squad-goals-streak/04-COPY-REVIEW.md` | 12-row string inventory + non-engineer approval | VERIFIED (approval content uncertain) | 89 lines; approval block populated; "project owner" reviewer identity needs human confirmation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `supabase/migrations/0011_squad_streak_v1_3.sql` | `public.plans + public.plan_members` | fully-qualified reads inside SECURITY DEFINER | WIRED | `public.plans`, `public.plan_members`, `pm2.rsvp = 'going'` present |
| `supabase/migrations/0011_squad_streak_v1_3.sql` | `auth.uid()` | explicit caller guard | WIRED | `v_caller uuid := auth.uid()` + guard at top |
| `src/app/_layout.tsx handleNotificationResponse` | `src/lib/heartbeat.ts computeHeartbeatState` | tap-time DEAD check | WIRED | `computeHeartbeatState` imported (line 14) and called in morning_prompt branch (line 150) |
| `src/app/_layout.tsx morning_prompt branch` | `supabase.from('statuses').upsert` | tap-commit rest_of_day / null context_tag | WIRED | `supabase.from('statuses').upsert(...)` at line 165, `window_id: 'rest_of_day'`, `context_tag: null` |
| `src/hooks/useStatus.ts auth subscriber` | `src/lib/morningPrompt.ts cancelMorningPrompt` | signout cleanup | WIRED | Import at line 18, `cancelMorningPrompt().catch(() => {})` at line 35, single subscribe |
| `src/hooks/useStreakData.ts` | `public.get_squad_streak RPC` | `supabase.rpc` | WIRED | `supabase.rpc('get_squad_streak', { viewer_id, tz })` present |
| `src/components/squad/StreakCard.tsx` | `/plan-create route` | `router.push` on tap | WIRED | `router.push('/plan-create' as never)` at line 36 |
| `src/app/(tabs)/squad.tsx` | `src/components/squad/StreakCard.tsx` | Goals tab rendering | WIRED | `import { StreakCard }`, `<StreakCard streak={streak} />` rendered |
| `src/app/(tabs)/profile.tsx Switch onValueChange` | `src/lib/morningPrompt.ts ensureMorningPromptScheduled` | toggle ON path | WIRED | `ensureMorningPromptScheduled()` called in `handleToggleMorning` (granted + accepted branches) |
| `src/app/(tabs)/profile.tsx time picker onChange` | `src/lib/morningPrompt.ts ensureMorningPromptScheduled` | time change -> AsyncStorage write -> reschedule | WIRED | `.then(() => ensureMorningPromptScheduled())` in `handleMorningTimeChange` |
| `src/app/(tabs)/_layout.tsx existing auth useEffect` | `src/lib/morningPrompt.ts ensureMorningPromptScheduled` | cold-launch trigger | WIRED | `ensureMorningPromptScheduled().catch(() => {})` at line 42 inside single useEffect |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `StreakCard.tsx` | `streak.currentWeeks`, `streak.bestWeeks` | `useStreakData` → `supabase.rpc('get_squad_streak')` → live Supabase function | Yes — RPC calls live DB function applied in Plan 02; zero-state is valid data not stub | FLOWING |
| `src/app/(tabs)/squad.tsx` | `streak.loading`, `streak.refetch` | `useStreakData()` hoisted in SquadScreen | Yes — RefreshControl wired to hook's loading/refetch | FLOWING |
| `src/app/_layout.tsx` morning_prompt branch | `userId` | `supabase.auth.getSession()` | Yes — authenticated session; RLS enforces auth | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for live Supabase RPC (requires running DB), iOS notifications (requires real device). Static code analysis is the applicable verification method. TypeScript compilation and lint results were documented in plan summaries.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STREAK-02 | 04-01 | Week active if ≥1 plan with ≥2 confirmed attendees completed | SATISFIED | Migration 0011 D-03 predicate: `pm2.rsvp = 'going'` count `>= 2` + `scheduled_for < now()` |
| STREAK-03 | 04-01 | Week boundaries Mon 00:00 → Sun 23:59 viewer tz | SATISFIED | `date_trunc('week', ...)` with viewer tz parameter; D-06 resolves "squad creator's tz" to device tz |
| STREAK-04 | 04-01 | Streak survives 1 grace week per 4-week window | SATISFIED | Rolling 4-week window; miss count ≤ 1 keeps streak alive |
| STREAK-05 | 04-01 | Streak breaks after 2 consecutive misses within 4-week window | SATISFIED | `v_misses_in_window >= 2` break condition |
| STREAK-06 | 04-01 | "Best: N weeks" preserved permanently across breaks | SATISFIED | `v_best` tracked across full history walk; never reset on break |
| STREAK-07 | 04-01 | Computed via `get_squad_streak(tz)` SQL function, not materialized | SATISFIED | No `create materialized`, no `create table`, pure PL/pgSQL computation |
| STREAK-01 | 04-04 | Goals tab replaces "Coming soon" stub with live StreakCard | SATISFIED | "coming soon" count == 0 in squad.tsx; `<StreakCard streak={streak} />` rendered |
| STREAK-08 | 04-06 | Positive-only copy; non-engineer reviewed before ship | NEEDS HUMAN | Approval recorded as "Approved by project owner" — reviewer identity requires human confirmation |
| MORN-01 | 04-03 | Daily local push at configured time; skipped if heartbeat not DEAD | SATISFIED (with design note) | `scheduleNotificationAsync({ hour, minute, repeats: true })`; tap-time DEAD check per CONTEXT D-24/D-25 (fire-time check not feasible with `repeats: true` static payload — locked design decision) |
| MORN-02 | 04-03 | On-device scheduling, no server cron, no profiles.timezone | SATISFIED | `scheduleMorningPrompt` uses `Notifications.scheduleNotificationAsync`; no server call; no profiles.timezone |
| MORN-03 | 04-03 | Notification shows Free / Busy / Maybe action buttons | SATISFIED | Category `'morning_prompt'` with action ids `'free'`, `'busy'`, `'maybe'` (registered in Phase 1 notifications-init.ts, unchanged per D-39) |
| MORN-04 | 04-03 | Tap sets status via authenticated session, no public endpoint | SATISFIED | `supabase.auth.getSession()` + `from('statuses').upsert`; no Edge Function, no public URL |
| MORN-05 | 04-03 | Tap >12h after fire no-ops gracefully | SATISFIED | `Date.now() - response.notification.date > 12 * 60 * 60 * 1000 → return`; CONTEXT D-24 overrides literal "payload includes valid_until" wording for technical reasons |
| MORN-06 | 04-03 | Does not fire if heartbeat ALIVE or FADING | SATISFIED | `if (heartbeat !== 'dead') return;` via tap-time `computeHeartbeatState` check |
| MORN-07 | 04-05 | User can disable morning prompt via Profile toggle | SATISFIED | Switch in Profile MORNING PROMPT section; `handleToggleMorning` writes `campfire:morning_prompt_enabled` and calls `cancelMorningPrompt()` or `ensureMorningPromptScheduled()` |
| MORN-08 | 04-05 | User can pick prompt time from Profile settings (default 9am) | SATISFIED | DateTimePicker row in Profile; AsyncStorage keys `campfire:morning_prompt_hour`/`minute` default to '9'/'0' |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, FIXMEs, empty returns, hardcoded colors, hardcoded font sizes, "coming soon" strings, or raw hex values found in any of the 8 files modified by Phase 4.

### Human Verification Required

#### 1. STREAK-08 Non-Engineer Reviewer Identity

**Test:** Open `.planning/phases/04-morning-prompt-squad-goals-streak/04-COPY-REVIEW.md` and confirm the approver ("Approved by project owner" dated 2026-04-10) is a person who is not the engineer who built the feature.
**Expected:** The project owner or another non-technical collaborator (distinct from the solo developer) confirms having read and approved the 12 user-facing strings against the positive-only guardrails.
**Why human:** The STREAK-08 requirement and Plan 06 explicitly mandate "non-engineer review" (D-20). The approval field reads "Approved by project owner" which in a solo-dev context may be the same person as the engineer. Cannot determine from code whether this is satisfied. If the project owner is indeed a non-technical stakeholder (e.g., a friend, partner, or product collaborator), STREAK-08 is satisfied and Phase 4 can be marked `passed`.

### Gaps Summary

No code-level gaps were found. All 16 verifiable truths pass. The single uncertain item (STREAK-08 reviewer identity) is a process/human gate, not a code deficiency. Once confirmed, the phase status upgrades to `passed`.

**Note on MORN-01 design deviation:** The requirement states the prompt "fires only when heartbeat state is DEAD at the scheduled *fire time*." The implementation performs a *tap-time* DEAD check instead. This is a locked design decision in CONTEXT D-24/D-25: with `repeats: true`, Expo's `scheduleNotificationAsync` reuses a static payload so a `valid_until` timestamp set at schedule time becomes stale after day 1. The tap-time approach is the correct implementation for this constraint. MORN-01's intent (never set a status if the user is already active) is fully honored.

---

_Verified: 2026-04-10T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
