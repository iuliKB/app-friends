---
phase: 02-status-liveness-ttl
verified: 2026-04-08T00:00:00Z
status: human_needed
score: 13/13 must-haves verified
human_verification:
  - test: "Set Free + preset + window via MoodPicker on Home, confirm commit + own label shows '{Mood} · {tag} · {window}'"
    expected: "MoodPicker expands on row tap, preset chip toggles, window chip commits; own status label updates instantly on both Home and Profile"
    why_human: "Visual two-stage commit flow + cross-screen Zustand sync (D-22..D-25, OVR-02) — can't verify animation, haptics, or layout via grep"
  - test: "Let status age >4h so heartbeat enters FADING, confirm ReEngagementBanner appears above MoodPicker with amber styling and three buttons"
    expected: "Banner animates in, shows 'Still {Mood}? · active {windowLabel}', three buttons render, auto-dismisses after 8s"
    why_human: "Requires real wall-clock aging or time-injection; animated-height banner + auto-dismiss UX quality"
  - test: "Tap 'Keep it' on ReEngagementBanner, confirm banner dismisses and last_active_at updates"
    expected: "touch() fires, banner hides locally, heartbeat returns to ALIVE on next 60s tick"
    why_human: "End-to-end DB write + state flip + visual dismissal"
  - test: "Tap 'Heads down' on ReEngagementBanner, confirm status commits to Busy/3h"
    expected: "setStatus('busy', null, '3h') commits, MoodPicker shows Busy active, banner hides"
    why_human: "End-to-end DB write + cross-screen reflection"
  - test: "Tap 'Update' on banner, confirm scroll-to-picker behavior"
    expected: "HomeScreen scrolls MoodPicker into view (c9c2b62 integration)"
    why_human: "Scroll animation / layout measurement"
  - test: "Open app cold with expired status (heartbeat === 'dead'), confirm 'What's your status today?' heading renders above MoodPicker"
    expected: "Heading visible on cold open with DEAD state; disappears on first commit; does not reappear in same session"
    why_human: "Cold-launch timing + session-scoped gating via deadOnOpenRef"
  - test: "Confirm friend cards visually dim to 0.6 opacity when friend heartbeat is FADING and show '{Mood} · Xh ago' label"
    expected: "FADING friends rendered dimmed; DEAD friends move to Everyone Else with 'inactive' label"
    why_human: "Visual opacity and sectioning — partition logic verified in code but UX must be seen"
  - test: "Confirm 60-second setInterval re-renders Home so silent expiries update the UI without refetch"
    expected: "Status that expires during foreground session flips friend cards to DEAD within ~60s without user action"
    why_human: "Requires real time aging + observation of re-render"
  - test: "Trigger signout; confirm useStatusStore.clear() wipes cached currentStatus so no bleed on next login"
    expected: "New user on same device sees their own status, not previous user's"
    why_human: "Requires two sessions + observation of cached state"
  - test: "Commit a mood change, then rapidly background/foreground app multiple times in <60s; confirm touch() debounces (single write)"
    expected: "Only one last_active_at write despite multiple foregrounds within debounce window"
    why_human: "Requires network inspection or DB query to count writes"
---

# Phase 2: Status Liveness & TTL Verification Report

**Phase Goal:** A user's status is a live signal with a validity window — friends never see stale data, and the user is gently re-engaged when their status expires.

**Verified:** 2026-04-08
**Status:** human_needed
**Re-verification:** No — initial verification

## Scope Notes (Authoritative Overrides)

Phase 2 was redesigned 2026-04-07 to ship the Mood + Context + Window + Heartbeat model. Per `02-CONTEXT.md`:
- **TTL-05** "5am local clock reset" was REPLACED by activity-based heartbeat (HEART-01..HEART-05). The ROADMAP Success Criterion #3 (auto-clear at 5am) is explicitly superseded — NOT a gap.
- **TTL-08** (retention rollup/GC) is explicitly DEFERRED to v1.4 per OVR-05. ROADMAP SC #5 retention clause is marked deferred-per-context, not a gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Migration 0009 applied to live DB (columns + status_history + view + trigger) | VERIFIED | 02-02-SUMMARY confirms `supabase db push` exited 0; 6 verification SELECTs + 5 Studio checks approved by user 2026-04-08 |
| 2 | `statuses` table has `status_expires_at NOT NULL` and `last_active_at NOT NULL DEFAULT now()` | VERIFIED | `supabase/migrations/0009_status_liveness_v1_3.sql` lines 13-34; Plan 02 Q1 verification SELECT confirmed live |
| 3 | `status_history` table + RLS + SECURITY DEFINER trigger with `IS DISTINCT FROM` guard | VERIFIED | 0009.sql lines 39-88; trigger guards with `NEW.status IS DISTINCT FROM OLD.status`; policy `status_history_select_own_or_friend` present |
| 4 | `effective_status` view with `security_invoker=true`, encodes DEAD via NULL | VERIFIED | 0009.sql lines 96-111; `WITH (security_invoker = true)` + 8h `last_active_at` threshold |
| 5 | Client heartbeat utility matches SQL view (4h FADING / 8h DEAD) | VERIFIED | `src/lib/heartbeat.ts`: `HEARTBEAT_DEAD_MS = 8 * 60 * 60 * 1000` mirrors SQL `interval '8 hours'` |
| 6 | Window utility with 5 fixed windows + hide rules + reverse-label formatter | VERIFIED | `src/lib/windows.ts`: `getWindowOptions`, `computeWindowExpiry`, `formatWindowLabel`; all 5 WindowId literals + past1730/past2130 guards |
| 7 | 15 mood preset chips (5 per mood) with no emoji, ≤20 chars | VERIFIED | `src/components/status/moodPresets.ts`: Record<StatusValue, MoodPreset[]> with canonical D-06 strings |
| 8 | `useStatus` exposes currentStatus, setStatus, touch, heartbeatState; reads from `effective_status`, writes to `statuses`; 60s debounced touch; auth-signout clear | VERIFIED | `src/hooks/useStatus.ts`: `from('effective_status')`, `from('statuses').upsert`, `TOUCH_DEBOUNCE_MS = 60_000`, `installAuthListenerOnce` → `useStatusStore.getState().clear()`, back-compat shims removed per Plan 06 |
| 9 | `(tabs)/_layout.tsx` extends SINGLE existing AppState effect to call `touch()` on cold-launch + foreground (OVR-04) | VERIFIED | Single `AppState.addEventListener` (grep count=1), exactly 2 `touch().catch` calls, `useStatus` imported |
| 10 | `MoodPicker` renders three full-width rows, two-stage commit flow, collapse-on-second-tap, LayoutAnimation | VERIFIED | `src/components/status/MoodPicker.tsx`: MOOD_ROWS Free→Maybe→Busy, `expandedMood === mood` collapse, `setStatus(mood, selectedTag, windowId)` on window tap |
| 11 | `ReEngagementBanner` animates amber banner with Keep it/Update/Heads down actions, 8s auto-dismiss, FADING visibility guard | VERIFIED | `src/components/home/ReEngagementBanner.tsx`: `AUTO_DISMISS_MS = 8000`, `setStatus('busy', null, '3h')`, `await touch()`, `heartbeatState === 'fading'` guard, `COLORS.offline.bg` amber palette |
| 12 | HomeScreen mounts MoodPicker + ReEngagementBanner + DEAD heading + 60s setInterval tick | VERIFIED | `src/screens/home/HomeScreen.tsx`: imports both components, `setInterval(..., 60_000)`, `deadOnOpenRef`, `"What's your status today?"` heading, `handleUpdatePressed` scroll integration |
| 13 | useHomeScreen + useFriends read from `effective_status` view and sort free friends by `last_active_at DESC` (OVR-07); STATUS_SORT_ORDER consolidated | VERIFIED | `useHomeScreen.ts`: `from('effective_status')` + `computeHeartbeatState` partition + exported `STATUS_SORT_ORDER`; `useFriends.ts` imports the same constant |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0009_status_liveness_v1_3.sql` | Full schema migration | VERIFIED | All grep assertions pass (columns, backfill, NOT NULL, status_history, RLS, trigger, IS DISTINCT FROM, security_invoker, 8h threshold); live-applied per 02-02 |
| `src/lib/heartbeat.ts` | computeHeartbeatState + formatDistanceToNow + thresholds | VERIFIED | All exports present; 8h DEAD constant matches SQL |
| `src/lib/windows.ts` | getWindowOptions + computeWindowExpiry + formatWindowLabel | VERIFIED | 5 WindowId values, hide rules, LayoutAnimation-ready ownLabel |
| `src/components/status/moodPresets.ts` | 15 chips, 5 per mood, no emoji | VERIFIED | Canonical D-06 strings |
| `src/stores/useStatusStore.ts` | Zustand store with currentStatus/set/updateLastActive/clear | VERIFIED | Mirrors useHomeStore pattern |
| `src/types/app.ts` | WindowId, HeartbeatState, CurrentStatus, MoodPreset | VERIFIED | Confirmed via import chain in heartbeat.ts + useStatus.ts |
| `src/hooks/useStatus.ts` | D-33 canonical shape (shims removed) | VERIFIED | Plan 06 commit `139aa01` removed shims; only canonical fields exported |
| `src/app/(tabs)/_layout.tsx` | Extended AppState effect with touch() | VERIFIED | Single listener, 2 touch calls |
| `src/components/status/MoodPicker.tsx` | Two-stage composer | VERIFIED | Full implementation present |
| `src/components/home/ReEngagementBanner.tsx` | Animated amber banner + 3 actions | VERIFIED | All action labels and logic present |
| `src/screens/home/HomeScreen.tsx` | MoodPicker + ReEngagementBanner + DEAD heading + 60s tick | VERIFIED | All integrations present |
| `src/app/(tabs)/profile.tsx` | MoodPicker replacing SegmentedControl | VERIFIED | MoodPicker mounted line 133 |
| `src/components/home/HomeFriendCard.tsx` | Heartbeat-aware label + opacity + inactive | VERIFIED | computeHeartbeatState + formatDistanceToNow imports; fadingCard style; 'inactive' label for DEAD |
| `src/components/friends/StatusPill.tsx` | D-31 heartbeat-aware format (Option B) | VERIFIED | computeHeartbeatState import + optional timestamp props + legacy fallback |
| `src/hooks/useHomeScreen.ts` | effective_status reads + last_active_at sort + heartbeat partition | VERIFIED | from('effective_status'), STATUS_SORT_ORDER export, partition via computeHeartbeatState |
| `src/hooks/useFriends.ts` | effective_status reads + imports consolidated STATUS_SORT_ORDER | VERIFIED | Imports from @/hooks/useHomeScreen; from('effective_status') |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| Migration 0009 | Live Supabase schema | supabase db push | WIRED (02-02 approved by user) |
| useStatus.setStatus | public.statuses | supabase.from('statuses').upsert + computeWindowExpiry | WIRED |
| useStatus hydrate | public.effective_status | supabase.from('effective_status').select | WIRED |
| (tabs)/_layout.tsx | useStatus.touch | AppState 'active' + cold-launch | WIRED (single listener, 2 touch calls) |
| MoodPicker | useStatus.setStatus | setStatus(mood, selectedTag, windowId) on window chip tap | WIRED |
| MoodPicker | getWindowOptions + MOOD_PRESETS | render-time call | WIRED |
| ReEngagementBanner | useStatus.touch + setStatus | Keep it → touch(), Heads down → setStatus('busy', null, '3h') | WIRED |
| HomeFriendCard | computeHeartbeatState + formatDistanceToNow | per-render compute + label/opacity branches | WIRED |
| useHomeScreen | effective_status view | from('effective_status').select(user_id, effective_status, context_tag, status_expires_at, last_active_at) | WIRED |
| useStatusStore | useStatus (setCurrentStatus + updateLastActive + clear) | Zustand subscribe + module-scope auth listener | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| HomeScreen.MoodPicker | currentStatus | useStatus hydrate from effective_status view | Yes (live DB) | FLOWING |
| HomeScreen.ReEngagementBanner | heartbeatState | computeHeartbeatState over currentStatus + 60s tick | Yes | FLOWING |
| HomeFriendCard | friend.status_expires_at + last_active_at | useHomeScreen select from effective_status view | Yes | FLOWING |
| Profile.MoodPicker | currentStatus | useStatus (same Zustand store — OVR-02 sync) | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compilation | `npx tsc --noEmit` | No errors | PASS |
| Single AppState listener in _layout | `grep -c "AppState.addEventListener"` | 1 | PASS |
| Two touch() calls in _layout | `grep -c "touch().catch"` | 2 | PASS |
| Migration file contains all structural pieces | 18 grep assertions from Plan 01 | all match | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TTL-01 | 02-03, 02-05 | Window composer (5 options, hide rules) + non-null status_expires_at | SATISFIED | `src/lib/windows.ts` + MoodPicker + migration NOT NULL constraint |
| TTL-02 | 02-03, 02-05 | Preset context chips (5 per mood) in statuses.context_tag | SATISFIED | `moodPresets.ts` + MoodPicker preset row + setStatus writes context_tag |
| TTL-03 | 02-06 | Own status display "{Mood} · {tag} · {window}" | SATISFIED | HomeFriendCard + StatusPill heartbeat-aware label format |
| TTL-04 | 02-01 | Friends see unknown when expired via effective_status view | SATISFIED | View returns NULL effective_status when expired; reads via effective_status |
| TTL-05 | — | Heartbeat replaces 5am reset (per 02-CONTEXT authoritative override) | SATISFIED | HEART-01..05 implement activity-based staleness; REQUIREMENTS.md line 33 confirms replacement |
| TTL-06 | 02-05, 02-06 | ReEngagementBanner on FADING | SATISFIED | Banner component + HomeScreen mount + visibility guard |
| TTL-07 | 02-01 | status_history append on transitions via SECURITY DEFINER trigger | SATISFIED | Trigger + IS DISTINCT FROM guard + RLS policy in 0009.sql |
| TTL-08 | 02-02 | Retention rollup/GC | DEFERRED-PER-CONTEXT | Explicit deferral to v1.4 per OVR-05; 02-02-SUMMARY documents and user approved; pg_cron not enabled on project |
| HEART-01 | 02-01 | last_active_at column on statuses | SATISFIED | 0009.sql ADD COLUMN last_active_at TIMESTAMPTZ NOT NULL DEFAULT now() |
| HEART-02 | 02-04 | Client touches last_active_at on cold launch + AppState 'active' | SATISFIED | _layout.tsx extended effect + useStatus.touch() with 60s debounce |
| HEART-03 | 02-03 | Client-side computeHeartbeatState with 4h/8h thresholds | SATISFIED | `src/lib/heartbeat.ts` exact thresholds + null handling |
| HEART-04 | 02-06 | FADING dimmed 0.6 + "Xh ago"; DEAD inactive to Everyone Else | SATISFIED | HomeFriendCard fadingCard style + useHomeScreen partition |
| HEART-05 | 02-05, 02-06 | ReEngagementBanner Keep it / Update / Heads down + 8s auto-dismiss | SATISFIED | Banner component wires all three actions and auto-dismiss |

**All 13 declared requirement IDs accounted for. No orphaned IDs (REQUIREMENTS.md table lines 144-156 match PLAN frontmatter IDs exactly).**

### ROADMAP Success Criteria (original draft) vs CONTEXT authoritative

| SC # | Original text | Disposition |
|------|---------------|-------------|
| 1 | Composer asks for duration; Maybe indefinite | SATISFIED BUT MODIFIED per D-10: every mood (including Maybe) now has non-null status_expires_at. MoodPicker shows window chips for all three moods. The "Maybe indefinite" clause was explicitly overridden by D-10 in 02-CONTEXT.md. |
| 2 | View-computed effective_status returns unknown on expiry | SATISFIED (TTL-04) |
| 3 | 5am local auto-clear | REPLACED by heartbeat per scope note + REQUIREMENTS.md TTL-05 — NOT A GAP |
| 4 | Dismissible expired banner | SATISFIED (ReEngagementBanner covers FADING; DEAD-on-open heading covers expired cold open; auto-dismiss in-memory) |
| 5 | status_history trigger + retention | PARTIAL: trigger + RLS shipped; retention rollup/GC deferred per OVR-05 — NOT A GAP |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments introduced in Phase 2 surface. All hooks/components compile clean (`npx tsc --noEmit` passes). Back-compat shims added in 02-04 were correctly removed in 02-06 commit `139aa01`.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|--------------|----------|
| 1 | TTL-08 retention rollup + GC for status_history | v1.4 (future milestone) | 02-CONTEXT.md OVR-05 explicit defer; 02-02-SUMMARY documents user approval; REQUIREMENTS.md lists as Phase 2 but CONTEXT authoritative override applies |
| 2 | Morning spark push when DEAD | Phase 4 (MORN-01..08 updated) | CONTEXT.md "Out of scope" section + D-37 |
| 3 | Window-expiry 30-min-before push | Phase 3 EXPIRY-01 | CONTEXT.md "Out of scope" + D-36 |
| 4 | Friend-went-Free push updates (skip DEAD) | Phase 3 FREE-02 | D-35 |

### Human Verification Required

See frontmatter `human_verification` section. 10 items need physical device verification for:
- Two-stage MoodPicker commit flow + animation + haptics
- ReEngagementBanner visibility, animation, auto-dismiss, three actions
- DEAD-on-open heading session-scoped gating
- Friend card FADING dim + DEAD partition
- 60s screen tick re-renders on silent expiry
- Signout clear + rapid foreground debounce

### Gaps Summary

No code-level gaps found. All 13 declared requirement IDs are either SATISFIED in code (12) or DEFERRED-PER-CONTEXT with explicit authoritative override (1: TTL-08). Every must-have truth from all 6 plan frontmatters maps to concrete verified code. The only outstanding work is human behavioral verification on device — there is no runnable non-UI spot-check that can exercise the Mood + Context + Window + Heartbeat flow end-to-end without a device or simulator.

---

*Verified: 2026-04-08*
*Verifier: Claude (gsd-verifier)*
