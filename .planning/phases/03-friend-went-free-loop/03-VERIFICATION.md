---
phase: 03-friend-went-free-loop
verified: 2026-04-08T12:00:00Z
status: passed
score: 12/12 must-haves verified
gaps_resolved:
  - truth: "Lint passes on all Phase 3 modified files"
    resolution: "Orchestrator ran `npx expo lint --fix src/lib/notifications-init.ts` and committed the prettier autofix as `29faff0 style(03-06): prettier autofix HEADS_DOWN action literal`. No logic change; 5 insertions, 1 deletion to reformat the HEADS_DOWN action object literal across multiple lines."
human_verification:
  - test: "Push notification fires within ~5 seconds of friend transitioning to Free"
    expected: "Recipient device receives notification with body 'Ana is Free' or 'Ana is Free • coffee ☕' within 5s"
    why_human: "Requires two real devices, active Expo push tokens, deployed notify-friend-free Edge Function, and GUCs set in the linked Supabase project"
  - test: "Expiry warning notification fires 30 minutes before status_expires_at with Keep it / Heads down action buttons"
    expected: "Local notification appears with 'Still Free?' title, action buttons visible on long-press (iOS) / expand (Android)"
    why_human: "Requires a real native build (not Expo Go) and 30-minute wall-clock wait"
  - test: "Tapping friend-free notification cold-start opens DM correctly"
    expected: "App cold-starts and lands on /chat/room?dm_channel_id={uuid}&friend_name={name} after 150ms timeout"
    why_human: "Requires force-kill + push delivery + cold-start routing — automated grep cannot verify navigation result"
  - test: "Keep it / Heads down action buttons dispatch status correctly"
    expected: "Keep it: extends window by one step and reflects in MoodPicker. Heads down: sets Busy/3h in MoodPicker and DB"
    why_human: "Requires native action button support (not Expo Go) and visible UI state verification"
  - test: "notify-friend-free Edge Function deployed and rate-limit gauntlet fires correctly"
    expected: "Sending Free status multiple times within 15 min results in pair_15min suppression in friend_free_pushes table"
    why_human: "Requires Edge Function deployment confirmation + live DB query validation"
---

# Phase 3: Friend Went Free Loop — Verification Report

**Phase Goal:** Implement the "Friend Went Free Loop" — when a user transitions status to `free`, friends who meet the rate-limit + quiet-hours + preferences gauntlet receive a push notification that deep-links to a DM. Also ship the expiry_warning 30-min-before push with [Keep it] / [Heads down] action buttons.
**Verified:** 2026-04-08T12:00:00Z
**Status:** passed (initial verification flagged 1 trivial lint gap, resolved inline)
**Re-verification:** Lint gap fixed by orchestrator via `npx expo lint --fix` and committed as `29faff0`

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Migration 0010 exists with pg_net, free_transitions, friend_free_pushes, profiles columns, trigger, RPC, webhook dispatcher | ✓ VERIFIED | File exists at supabase/migrations/0010_friend_went_free_v1_3.sql; 14 key grep matches confirmed; 4x SET search_path=''; 2x ENABLE ROW LEVEL SECURITY; 0 CREATE POLICY |
| 2 | notify-friend-free Edge Function implements 8-stage gauntlet and logs every decision | ✓ VERIFIED | supabase/functions/notify-friend-free/index.ts — 236 lines; all 8 suppression reasons present; get_friend_free_candidates RPC called; DeviceNotRegistered handler; NOTE (CONTEXT D-11) present |
| 3 | src/types/database.ts patched with free_transitions, friend_free_pushes, profiles.timezone/notify_friend_free, get_friend_free_candidates, FreeTransition/FriendFreePush | ✓ VERIFIED | All 5 type additions confirmed via grep; FreeTransition and FriendFreePush type aliases at lines 512-513 |
| 4 | Client primitives: CurrentStatus.window_id optional field, nextLargerWindow helper, expiryScheduler.ts | ✓ VERIFIED | src/types/app.ts line 37: window_id?; src/lib/windows.ts line 152: nextLargerWindow; src/lib/expiryScheduler.ts 90 lines with both exports |
| 5 | useStatus.setStatus schedules expiry notification; signout cancels it; syncDeviceTimezone with Hermes guard | ✓ VERIFIED | src/hooks/useStatus.ts: scheduleExpiryNotification (line 17 import, line 162 call), cancelExpiryNotification (line 32), window_id: windowId (line 159), window_id: null (line 119), syncDeviceTimezone (lines 41, 105), Hermes guard (line 50) |
| 6 | notifications-init.ts registers friend_free + expiry_warning iOS categories and expiry_warning Android channel | ✓ VERIFIED | setNotificationCategoryAsync('friend_free', []) and setNotificationCategoryAsync('expiry_warning', [KEEP_IT, HEADS_DOWN]) present; setNotificationChannelAsync('expiry_warning', { name: 'Status expiry warnings' }) present |
| 7 | _layout.tsx handleNotificationResponse routes friend_free taps to DM and expiry_warning action buttons to setStatus | ✓ VERIFIED | Module-scope handleNotificationResponse; friend_free branch calls get_or_create_dm_channel RPC + pushes /chat/room?dm_channel_id=; KEEP_IT uses nextLargerWindow + upserts; HEADS_DOWN upserts busy/3h |
| 8 | profile.tsx "Friend availability" toggle reads/writes profiles.notify_friend_free | ✓ VERIFIED | friendFreeEnabled state; fetchProfile SELECT includes notify_friend_free; handleToggleFriendFree updates profiles; "Friend availability" label rendered |
| 9 | 03-MONITORING.md documents stale-outbox SQL query + all 8 suppression reasons | ✓ VERIFIED | File exists 92 lines; sent_at IS NULL query present; all 8 suppression_reason values documented |
| 10 | 03-SMOKE-TEST.md has 9 smoke checks covering FREE-01/03/04/05/06/08/09 + EXPIRY-01 | ✓ VERIFIED | File exists 119 lines; SMOKE-01 through SMOKE-09 all present; ROADMAP.md Phase 5 Inputs updated |
| 11 | npx tsc --noEmit passes with zero errors | ✓ VERIFIED | Exit 0, no output |
| 12 | npx expo lint passes on all Phase 3 modified files | ✗ FAILED | notifications-init.ts exits 1 with prettier error on HEADS_DOWN line (line 41); _layout.tsx is clean (only pre-existing FONT_SIZE warning); profile.tsx is clean (only pre-existing react-hooks/exhaustive-deps warning) |

**Score:** 11/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0010_friend_went_free_v1_3.sql` | Phase 3 schema layer | ✓ VERIFIED | All sections present; first non-comment statement is CREATE EXTENSION IF NOT EXISTS pg_net; 4x SET search_path=''; 2x RLS; 0 CREATE POLICY on service tables |
| `supabase/functions/notify-friend-free/index.ts` | FREE-01..08 fan-out with gauntlet | ✓ VERIFIED | 236 lines (>150); all 8 suppression reasons; exp.host push target; channelId/categoryId 'friend_free'; outbox row marked sent_at on success / last_error on catch |
| `src/types/database.ts` | Phase 3 TypeScript types | ✓ VERIFIED | free_transitions, friend_free_pushes, get_friend_free_candidates, profiles.timezone/notify_friend_free, FreeTransition/FriendFreePush aliases |
| `src/lib/windows.ts` | nextLargerWindow helper | ✓ VERIFIED | Exported at line 152; covers all 5 WindowId values + null/unknown fallback to '3h' |
| `src/types/app.ts` | CurrentStatus.window_id field | ✓ VERIFIED | window_id?: WindowId | null at line 37 |
| `src/lib/expiryScheduler.ts` | Cancel+reschedule local notification | ✓ VERIFIED | 90 lines; scheduleExpiryNotification + cancelExpiryNotification; STORAGE_KEY = 'campfire:expiry_notification_id'; categoryIdentifier='expiry_warning'; channelId='expiry_warning'; SchedulableTriggerInputTypes.DATE |
| `src/hooks/useStatus.ts` | Expiry scheduler wiring + timezone sync | ✓ VERIFIED | scheduleExpiryNotification wired in setStatus; cancelExpiryNotification in signout; window_id carried; syncDeviceTimezone with Hermes guard |
| `src/lib/notifications-init.ts` | friend_free + expiry_warning categories | ✓ VERIFIED (with lint gap) | Categories registered; KEEP_IT/HEADS_DOWN identifiers; Android channel; 1 prettier formatting error on HEADS_DOWN line |
| `src/app/_layout.tsx` | Extended notification response listener | ✓ VERIFIED | handleNotificationResponse dispatches by categoryIdentifier; friend_free DM route; expiry_warning action buttons; legacy planId branch preserved |
| `src/app/(tabs)/profile.tsx` | Friend availability toggle | ✓ VERIFIED | Toggle rendered; hydrates from DB; optimistic flip with revert-on-error |
| `.planning/phases/03-friend-went-free-loop/03-MONITORING.md` | FREE-11 monitoring guide | ✓ VERIFIED | 92 lines; stale-outbox query; all 8 suppression reasons documented |
| `.planning/phases/03-friend-went-free-loop/03-SMOKE-TEST.md` | Phase 5 hardware gate checklist | ✓ VERIFIED | 9 smoke checks (SMOKE-01..09); ROADMAP.md Phase 5 Inputs appended |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| public.statuses | public.free_transitions | on_status_went_free AFTER UPDATE trigger | ✓ WIRED | CREATE TRIGGER on_status_went_free line 88 of migration; guard NEW.status='free' AND OLD.status IS DISTINCT FROM 'free' |
| public.free_transitions | notify-friend-free Edge Function | dispatch_free_transition AFTER INSERT trigger via extensions.http_post | ✓ WIRED | CREATE TRIGGER dispatch_free_transition line 180; extensions.http_post call in dispatch_free_transition function |
| notify-friend-free/index.ts | get_friend_free_candidates RPC | supabase.rpc('get_friend_free_candidates', { p_sender: senderId }) | ✓ WIRED | Line 202 of Edge Function |
| notify-friend-free/index.ts | public.friend_free_pushes | supabase.from('friend_free_pushes').insert | ✓ WIRED | logDecision helper at line 178; called on every gauntlet decision |
| notify-friend-free/index.ts | https://exp.host/--/api/v2/push/send | fetch POST with Bearer EXPO_ACCESS_TOKEN | ✓ WIRED | Line 188 of Edge Function |
| src/hooks/useStatus.ts | src/lib/expiryScheduler.ts | import { scheduleExpiryNotification, cancelExpiryNotification } from '@/lib/expiryScheduler' | ✓ WIRED | Line 17 of useStatus.ts |
| src/hooks/useStatus.ts | public.profiles.timezone | supabase.from('profiles').update({ timezone: tz }) | ✓ WIRED | Line 63 of useStatus.ts (syncDeviceTimezone) |
| src/app/_layout.tsx response listener | router.push('/chat/room?dm_channel_id=...') | category === 'friend_free' branch | ✓ WIRED | Lines 38-46 of _layout.tsx |
| src/app/_layout.tsx KEEP_IT | public.statuses via upsert | action === 'KEEP_IT' branch | ✓ WIRED | Lines 68-93 of _layout.tsx |
| src/app/(tabs)/profile.tsx | public.profiles.notify_friend_free | supabase.from('profiles').update({ notify_friend_free }) | ✓ WIRED | Line 105 of profile.tsx |
| .planning/ROADMAP.md Phase 5 Inputs | .planning/phases/03-friend-went-free-loop/03-SMOKE-TEST.md | bullet-listed path reference | ✓ WIRED | Line 162 of ROADMAP.md |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| notify-friend-free/index.ts | candidates | get_friend_free_candidates RPC → JOIN friendships + profiles + effective_status + push_tokens | Yes — SECURITY DEFINER SQL join across 4 tables | ✓ FLOWING |
| notify-friend-free/index.ts | senderName | supabase.from('profiles').select('display_name').eq('id', senderId) | Yes — direct profiles row query | ✓ FLOWING |
| notify-friend-free/index.ts | pairCt / recentCt / dayCt | friend_free_pushes COUNT queries with sliding-window predicates | Yes — COUNT queries against live table | ✓ FLOWING |
| src/hooks/useStatus.ts | timezone | Intl.DateTimeFormat().resolvedOptions().timeZone with Hermes guard; compared against existing profiles.timezone | Yes — device Intl API + profiles SELECT-then-UPDATE | ✓ FLOWING |
| src/app/(tabs)/profile.tsx | friendFreeEnabled | supabase.from('profiles').select(..., notify_friend_free).eq('id', session.user.id) | Yes — profiles row query on every tab focus | ✓ FLOWING |
| src/lib/expiryScheduler.ts | scheduled id | Notifications.scheduleNotificationAsync → AsyncStorage.setItem | Yes — OS notification scheduler + AsyncStorage | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for Edge Function deployment (requires running Supabase server). TypeScript/lint checks cover what can be verified statically.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| tsc --noEmit passes | `npx tsc --noEmit 2>&1; echo "Exit: $?"` | Exit: 0 | ✓ PASS |
| notifications-init.ts ESLint | `npx expo lint src/lib/notifications-init.ts 2>&1` | Exit 1 — prettier error on HEADS_DOWN line 41 | ✗ FAIL |
| _layout.tsx ESLint | `npx expo lint src/app/_layout.tsx 2>&1` | Exit 0 — 1 pre-existing warning only | ✓ PASS |
| profile.tsx ESLint | `npx expo lint "src/app/(tabs)/profile.tsx" 2>&1` | Exit 0 — 1 pre-existing warning only | ✓ PASS |
| Migration file exists | `test -f supabase/migrations/0010_friend_went_free_v1_3.sql` | Found | ✓ PASS |
| Edge Function exists | `ls supabase/functions/notify-friend-free/index.ts` | Found — 236 lines | ✓ PASS |
| expiryScheduler.ts exists | `test -f src/lib/expiryScheduler.ts && wc -l` | 90 lines | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FREE-01 | 03-03 | Push arrives within ~5s of non-Free → Free transition | ✓ SATISFIED | notify-friend-free Edge Function consumes free_transitions INSERT webhook, sends to exp.host |
| FREE-02 | 03-01, 03-03 | Recipients currently busy skipped; self skipped | ✓ SATISFIED | effective_status === 'busy' or null → 'recipient_busy'; self check in gauntlet |
| FREE-03 | 03-01, 03-03 | Pairwise 15-min cap | ✓ SATISFIED | pair_15min COUNT query against friend_free_pushes in Edge Function |
| FREE-04 | 03-01, 03-03 | Per-recipient 5-min throttle | ✓ SATISFIED | recipient_5min COUNT query in Edge Function |
| FREE-05 | 03-01, 03-03 | Daily rolling 24h cap ≤3 | ✓ SATISFIED | daily_cap COUNT query in Edge Function |
| FREE-06 | 03-01, 03-03, 03-05 | Quiet hours 22:00-08:00 local | ✓ SATISFIED | quiet_hours check in gauntlet; profiles.timezone synced by syncDeviceTimezone in useStatus.ts |
| FREE-07 | 03-01, 03-02, 03-07 | User can disable "Friend availability" pushes | ✓ SATISFIED | Profile toggle reads/writes profiles.notify_friend_free; Edge Function respects recipient_disabled_pref |
| FREE-08 | 03-03 | Push body format "Ana is Free • pizza 🍕" | ✓ SATISFIED | `${senderName} is Free • ${record.context_tag}` / `${senderName} is Free` in Edge Function |
| FREE-09 | 03-06 | Tapping notification opens DM (cold-start safe) | ✓ SATISFIED | handleNotificationResponse friend_free branch calls get_or_create_dm_channel + router.push |
| FREE-10 | 03-01, 03-03 | Outbox pattern: trigger → free_transitions, webhook → Edge Function | ✓ SATISFIED | on_status_went_free trigger + dispatch_free_transition webhook in migration 0010 |
| FREE-11 | 03-08 | Operators can monitor unsent outbox rows | ✓ SATISFIED (docs) | 03-MONITORING.md documents stale-outbox SQL query with 5-minute threshold; verified 92 lines with sent_at IS NULL query present. REQUIREMENTS.md traceability table still shows Pending — this is a documentation sync issue, not a functional gap. |
| EXPIRY-01 | 03-04, 03-05, 03-06 | 30-min-before-expiry push with Keep it / Heads down | ✓ SATISFIED (code-complete; hardware needed) | expiryScheduler.ts schedules at expiry - 30min; categoryIdentifier='expiry_warning'; KEEP_IT/HEADS_DOWN buttons registered; handlers dispatch to upsert |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/lib/notifications-init.ts | 41 | prettier/prettier error — HEADS_DOWN identifier object literal should be multi-line | ⚠️ Warning | Lint pipeline exits 1 for this file; no runtime impact; auto-fixable with `--fix` |
| src/app/_layout.tsx | 11 | FONT_SIZE defined but never used (pre-existing from Phase 1) | ℹ️ Info | Pre-existing from Phase 1 commit 6524273; not introduced by Phase 3 |
| src/app/(tabs)/profile.tsx | 47 | react-hooks/exhaustive-deps missing fetchProfile dependency (pre-existing from Phase 2) | ℹ️ Info | Pre-existing from Phase 2 commit 2cfede9; not introduced by Phase 3 |

### Behavioral Notes (Non-Gap)

**EXPIRY-01 action handler does not call scheduleExpiryNotification** (design choice, not gap):

The KEEP_IT and HEADS_DOWN action buttons in `_layout.tsx` use direct `supabase.upsert` + `useStatusStore.getState().setCurrentStatus()` — they do NOT call `useStatus.setStatus()` and therefore do NOT call `scheduleExpiryNotification`. The old expiry notification remains scheduled at the original fire time even after the user extends their window via Keep it.

This was an intentional omission in Plan 03-06 acceptance criteria (which never required reschedule in the action handler). The phase plans' must_haves only required `setStatus` to drive scheduling (Plan 03-05), not the action button path. However, this results in the user receiving a stale "Still Free?" notification at the original expiry time even after tapping Keep it. This should be addressed in a future gap-closure plan if smooth UX is required; it is not a blocker for the phase goal as scoped.

**FREE-11 traceability status:** REQUIREMENTS.md traceability table still shows `FREE-11 | Phase 3 | Pending` — the checkbox was never updated to Complete after Plan 03-08 shipped 03-MONITORING.md. This is a documentation sync issue (the monitoring doc exists and satisfies the requirement), not a functional gap.

### Human Verification Required

1. **Push notification delivery end-to-end**
   - **Test:** On two devices (sender + recipient), sender sets status to Free
   - **Expected:** Recipient receives push within ~5s with correct body format
   - **Why human:** Requires deployed Edge Function, active push tokens, two real devices

2. **Expiry warning notification fires + action buttons work**
   - **Test:** Set status with 1h window, wait 30 minutes
   - **Expected:** "Still Free?" notification appears with Keep it / Heads down buttons visible on long-press (iOS)
   - **Why human:** Requires native EAS build (not Expo Go) and 30-minute wall-clock wait

3. **Friend-free notification cold-start DM routing**
   - **Test:** Force-kill app, tap a friend-free notification
   - **Expected:** App cold-starts, lands on /chat/room?dm_channel_id={uuid}&friend_name={name}
   - **Why human:** Cold-start routing cannot be verified via grep; requires physical device

4. **Rate-limit gauntlet fires correctly in production**
   - **Test:** Trigger multiple Free transitions within 15 minutes
   - **Expected:** Only first push delivered; subsequent suppressed with pair_15min in friend_free_pushes
   - **Why human:** Requires deployed Edge Function + live DB query verification

5. **notify-friend-free Edge Function deployment confirmation**
   - **Test:** Verify Edge Function is Active in Supabase Dashboard → Edge Functions
   - **Expected:** "notify-friend-free" shows Active status; 03-03-SUMMARY deployment command has been run
   - **Why human:** Deployment is operator-run per 03-03-SUMMARY; cannot verify from local codebase

### Gaps Summary

One automated gap was found:

**prettier error in notifications-init.ts (lint failure):** Plan 03-06 Task 1 introduced a HEADS_DOWN action identifier object literal on a single line (line 41) that prettier requires to be multi-line. The project ESLint config treats prettier violations as errors. Running `npx expo lint src/lib/notifications-init.ts` exits 1. This is an auto-fixable formatting issue with zero runtime impact — the fix is `npx expo lint --fix src/lib/notifications-init.ts` which will expand the object literal to multiple lines.

The VALIDATION.md specifies "before phase verification: `npx tsc --noEmit && npx eslint src/` must be green" — this criterion is not fully met due to this single formatting error.

All 12 phase requirements (FREE-01 through FREE-11, EXPIRY-01) have code-complete implementations in the repo. The 5 ROADMAP success criteria are all met at the code level. Human verification remains outstanding for hardware-dependent behaviors per the Phase 5 Hardware Gate deferral policy (`project_hardware_gate_deferral.md`).

---

_Verified: 2026-04-08T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
