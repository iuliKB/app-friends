---
phase: 05-hardware-verification-gate
version: 1.0
created: 2026-04-10
track_expo_go_total: 11
track_eas_build_total: 22
---

# Phase 5 — Consolidated Smoke-Test Checklist

All v1.3 hardware/device checks in one place, tagged by execution track.

**Tracks:**
- `[EXPO_GO]` — Runnable now on Expo Go (physical device or simulator). No Apple Developer account required.
- `[EAS_BUILD]` — Deferred. Requires EAS dev build on real iPhone (iOS 15+) + Android device/emulator with Play Services + Apple Developer Program account.

---

## Prerequisites (expo_go track)

Before starting the expo_go session, confirm all of the following:

- [ ] Physical device (iPhone or Android) has Expo Go installed and is on the same network as the dev machine
- [ ] Expo dev server is running: `npx expo start`
- [ ] Two test user accounts exist (User A and User B) and are already friends:
  ```sql
  SELECT * FROM public.friendships
  WHERE (user_id_1 = '<user-a-uuid>' OR user_id_2 = '<user-a-uuid>')
    AND status = 'accepted';
  ```
  Expected: at least 1 row.
- [ ] User A is signed in on the primary test device (Home screen visible)
- [ ] Supabase SQL editor is open in a browser tab
- [ ] TypeScript health check passes before starting: `npx tsc --noEmit && npx expo lint`

---

## expo_go Track: 11 Checks

Grouped by device screen to minimise physical navigation.

### Group A — Home Screen Flow (8 checks)

#### UAT-01 — MoodPicker two-stage commit flow `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 1

**Steps:**
1. On User A's device, tap a mood row (e.g., Free) in MoodPicker — the picker should expand showing preset chips and window chips.
2. Tap a preset chip (e.g., "pizza 🍕") — it should toggle selected state.
3. Tap a window chip (e.g., "3h") — picker should collapse and commit.

**Expected:** Home screen own-status label updates instantly to the committed mood + tag. Profile screen also reflects the new status without a full reload.

**Pass criteria:** Status chip on Home and Profile shows the selected mood + tag immediately after window chip tap.

---

#### UAT-06 — Cold launch with DEAD heartbeat shows "What's your status today?" heading `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 6

**Setup (SQL — run before this check):**
```sql
UPDATE public.statuses
SET last_active_at = now() - interval '9 hours'
WHERE user_id = '<user-a-uuid>';
```

**Steps:**
1. Force-kill Expo Go on User A's device.
2. Reopen Expo Go and scan QR to relaunch.
3. Observe the Home screen heading area.

**Expected:** "What's your status today?" heading is visible above MoodPicker. The heading disappears after User A commits any status. It does not reappear during the same session even if heartbeat expires again.

**Pass criteria:** Heading present on cold launch with 9h-old `last_active_at`; hidden after first status set.

---

#### UAT-07 — Friend card FADING opacity + DEAD partition `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 7

**Setup (SQL — run for User B):**
```sql
-- Set User B to FADING (4–8h ago)
UPDATE public.statuses
SET last_active_at = now() - interval '5 hours'
WHERE user_id = '<user-b-uuid>';
```

**Steps:**
1. On User A's device, view the Home screen friend list.
2. Observe User B's friend card.

**Expected:**
- If User B's status is within expiry window and `last_active_at` is 4–8h ago: card renders at ~0.6 opacity with a relative timestamp (e.g., "Free · 5h ago").
- If User B's `last_active_at` is 8h+ ago (DEAD state): User B appears in "Everyone Else" section with "inactive" label.

**Pass criteria:** FADING card opacity is visibly reduced compared to ALIVE friends; DEAD friend moves to correct partition.

---

#### UAT-08 — 60s setInterval re-renders Home on silent expiry `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 8

**Note:** This check requires a real ~60s wall-clock wait. Start it, then run UAT-09/UAT-10 setup during the wait.

**Setup:**
1. Set User B's status with a window that expires in ~90 seconds. In SQL:
   ```sql
   UPDATE public.statuses
   SET status_expires_at = now() + interval '90 seconds',
       last_active_at = now()
   WHERE user_id = '<user-b-uuid>';
   ```
2. Ensure User A's device has Home screen visible and foregrounded.
3. Wait ~90–150 seconds without touching the device.

**Expected:** User B's card flips from ALIVE to DEAD (moves to "Everyone Else" or fades) within ~60s of `status_expires_at` passing — without any user action or app restart.

**Pass criteria:** Friend card state change observed within 150s of expiry, without navigation or manual refresh.

---

#### UAT-02 — ReEngagementBanner appears when heartbeat enters FADING `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 2

**Setup (SQL — sets User A to FADING):**
```sql
UPDATE public.statuses
SET last_active_at = now() - interval '5 hours'
WHERE user_id = '<user-a-uuid>';
```

**Steps:**
1. Ensure User A has a non-expired status (set one if needed).
2. Run the SQL above to age `last_active_at` to 5 hours ago.
3. Background the app and foreground it (triggers 60s tick + AppState handler).
4. Wait up to 70 seconds.

**Expected:** ReEngagementBanner animates in above the friend list showing "Still {Mood}? · active {windowLabel}" with three buttons: Keep it, Heads down, Update. Banner auto-dismisses after 8 seconds if no action is taken.

**Pass criteria:** Banner is visible within 70s of foreground; shows correct mood; has three buttons; disappears after ~8s.

---

#### UAT-03 — "Keep it" action on ReEngagementBanner `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 3

**Setup:** Reproduce FADING state as in UAT-02, wait for banner to appear.

**Steps:**
1. Tap "Keep it" on the ReEngagementBanner.

**Expected:** `touch()` fires (updates `last_active_at` server-side), banner hides locally. On the next 60s tick, heartbeat returns to ALIVE and the banner does not reappear.

**Pass criteria:** Banner disappears immediately on tap; `last_active_at` in SQL advances to within the last 10 seconds after tap.

```sql
-- Verify touch() fired:
SELECT last_active_at FROM public.statuses WHERE user_id = '<user-a-uuid>';
-- Expected: timestamp within last 10 seconds
```

---

#### UAT-04 — "Heads down" action on ReEngagementBanner `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 4

**Setup:** Reproduce FADING state as in UAT-02, wait for banner to appear.

**Steps:**
1. Tap "Heads down" on the ReEngagementBanner.

**Expected:** `setStatus('busy', null, '3h')` commits. MoodPicker shows Busy as the active status. Banner hides.

**Pass criteria:** Home own-status chip shows Busy; SQL confirms `current_status = 'busy'` for User A.

---

#### UAT-05 — "Update" action scroll-to-picker `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 5

**Setup:** Reproduce FADING state as in UAT-02, wait for banner to appear.

**Steps:**
1. Tap "Update" on the ReEngagementBanner.

**Expected:** HomeScreen scrolls MoodPicker into the viewport.

**Pass criteria:** MoodPicker is visible and in focus after tap; page scrolled to show it if previously off-screen.

---

### Group B — Home Screen → Chat (1 check)

#### DM-01 — HomeFriendCard tappable `[EXPO_GO]`

**Source:** `01-SMOKE-TEST.md` DM-01

**Steps:**
1. Single tap on any friend card on the Home screen.
2. Expected: chat room opens at `/chat/room?dm_channel_id=...&friend_name=...`
3. Navigate back to Home.
4. Long-press on a friend card.
5. Expected: action sheet appears with "View profile" and "Plan with {firstName}…"
6. Tap "View profile" — routes to `/friends/[id]`.
7. Navigate back, long-press again.
8. Tap "Plan with…" — routes to `/plan-create` with that friend pre-selected.
9. Verify only the long-pressed friend is selected in the picker.
10. Scroll the Home friend list — scrolling should remain smooth (no jank from long-press handler).

**Pass criteria:** All 5 navigation outcomes correct; Home list scrolls without stutter after long-press interaction.

---

### Group C — Session Boundary (2 checks)

#### UAT-09 — Signout clears useStatusStore cache `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 9

**Steps:**
1. Log in as User A; note User A's current status displayed.
2. Sign out from Profile.
3. Log in as User B on the same device.

**Expected:** Home screen shows User B's status, not User A's cached status.

**Pass criteria:** After User B login, own-status chip and MoodPicker reflect User B's data, not User A's.

---

#### UAT-10 — touch() 60s debounce on rapid foreground `[EXPO_GO]`

**Source:** `02-HUMAN-UAT.md` test 10

**Steps:**
1. Note current `last_active_at` for the signed-in user (SQL: `SELECT last_active_at FROM public.statuses WHERE user_id = '<uuid>'`).
2. Rapidly background and foreground the app 5 times within 30 seconds.
3. Wait 5 seconds, then re-query `last_active_at`.

**Expected:** Only ONE `last_active_at` write occurred — the value advanced once, not 5 times. If all 5 foregrounds happened within 60s of the initial write, subsequent calls are debounced.

**Pass criteria:** SQL shows exactly one timestamp change in `last_active_at` during the 30-second window.

---

## Regression Walkthrough (v1.0–v1.2)

**Estimated time:** ~30 min  
**Scope:** 6 core features, 2–3 scenarios each, including edge cases.

| Feature | Scenario 1 | Scenario 2 | Scenario 3 |
|---------|-----------|-----------|-----------|
| Login | Email sign-in (valid credentials → Home) | OAuth sign-in (Google/Apple) | Sign-out + re-sign-in (session fully reset) |
| Status set | Set Free + emoji tag + window → chip updates | Set Busy (no tag) | Set Maybe + no tag (indefinite, no window selector) |
| Plan create + RSVP | Create plan, invite friend, friend RSVPs Going | Create plan, RSVP Not Going | Empty plan list state (no plans created) |
| Chat send | DM message (send + receive visible) | Group chat message (multi-participant room) | Empty chat state (no messages yet) |
| Friend add + accept | Send request, accept on User B's device | Decline a request | View pending request badge |
| Squad view | Friends tab (squad list renders) | Goals tab (StreakCard visible) | Goals tab zero state (new user, no streak history) |

**Pass criteria:** All 18 scenarios complete without crashes, blank screens, or data loss.

---

## STREAK-08 Human Gate Clearance

**Background:** Phase 4 copy review (04-COPY-REVIEW.md) recorded approval as "Approved by project owner" on 2026-04-10. The 04-VERIFICATION.md status is `human_needed` because it could not be confirmed programmatically whether the approver is a non-engineer distinct from the solo developer.

**Required action:** Before marking Phase 5 expo_go track complete, confirm one of:

- [ ] **Option A:** The project owner who approved the copy is a distinct non-engineer person (e.g., a friend, designer, or partner who is not the developer). Record their name/role in the SUMMARY.md.
- [ ] **Option B (solo dev):** The project is a solo-dev project. The "project owner" and "solo developer" are the same person. Document explicitly: "STREAK-08 approved by project owner (solo developer acting as product owner of record). Non-engineer review ideal but not possible in solo context; copy reviewed with anti-anxiety lens per CONTEXT D-09."

Either disposition clears the gate. The goal is an explicit record, not a specific person.

---

## eas_build Track: 22 Checks (DEFERRED)

**Status: DEFERRED — no Apple Developer Program account yet.**

All 22 checks below require an EAS dev build installed on real hardware. Execute this track after the Apple Developer account is acquired and EAS builds are distributed to test devices.

**Prerequisites for eas_build session:**
- EAS dev build installed on real iPhone (iOS 15+): `eas build:list --platform ios --profile development`
- EAS dev build installed on real Android device or emulator with Play Services
- `push_tokens` migration applied (supabase/migrations/0008_push_tokens_v1_3.sql)
- `notify-plan-invite` Edge Function deployed
- `notify-friend-free` Edge Function deployed
- Two test accounts (User A + User B), already friends, signed in on two separate devices
- Supabase SQL editor accessible

### Phase 1 EAS Checks

| ID | Req | Description | Source |
|----|-----|-------------|--------|
| PUSH-01 | PUSH-01 | Token registers on session-ready (within 5s, SQL confirms row with non-null device_id, last_seen_at within 1 min, invalidated_at IS NULL) | `01-SMOKE-TEST.md` PUSH-01 |
| PUSH-02 | PUSH-02 | Foreground re-register on AppState 'active' (last_seen_at advances after background+foreground) | `01-SMOKE-TEST.md` PUSH-02 |
| PUSH-03 | PUSH-03 | Schema columns and composite unique (`\d public.push_tokens` shows device_id, last_seen_at, invalidated_at, idx_push_tokens_user_device UNIQUE) | `01-SMOKE-TEST.md` PUSH-03 |
| PUSH-04 | PUSH-04 | Profile toggle OFF deletes server row; toggle ON re-registers within 5s, no UI prompt | `01-SMOKE-TEST.md` PUSH-04 |
| PUSH-05 | PUSH-05 | Plan invite reaches fresh install without Profile screen visit | `01-SMOKE-TEST.md` PUSH-05 |
| PUSH-06 | PUSH-06 | iOS action buttons on morning_prompt category: lock-screen long-press shows Free / Busy / Maybe | `01-SMOKE-TEST.md` PUSH-06 |
| PUSH-07 | PUSH-07 | Android notification channels: Settings → Apps → Campfire → Notifications shows plan_invites, friend_free, morning_prompt, system | `01-SMOKE-TEST.md` PUSH-07 |
| PUSH-08 | PUSH-08 | iOS pre-prompt timing: no system modal on fresh install; pre-prompt appears on first meaningful action; native modal appears after "Sounds good" | `01-SMOKE-TEST.md` PUSH-08 |
| PUSH-09 | PUSH-09 | DeviceNotRegistered marks invalidated_at (corrupt token → trigger invite → SQL confirms invalidated_at non-null) | `01-SMOKE-TEST.md` PUSH-09 |
| PUSH-10 | PUSH-10 | EAS dev build artifacts exist for both iOS and Android (`eas build:list` confirms successful builds) | `01-SMOKE-TEST.md` PUSH-10 |

### Phase 3 EAS Checks

| ID | Req | Description | Source |
|----|-----|-------------|--------|
| SMOKE-01 | FREE-01 | Push arrives on recipient within ~5s of sender's Free transition | `03-SMOKE-TEST.md` SMOKE-01 |
| SMOKE-02 | FREE-08 | Push body format: `<display_name> is Free • <tag>` (with tag) or `<display_name> is Free` (no tag) | `03-SMOKE-TEST.md` SMOKE-02 |
| SMOKE-03 | FREE-09 | Warm start: tap notification opens DM at `/chat/room?dm_channel_id=<uuid>&friend_name=<name>` | `03-SMOKE-TEST.md` SMOKE-03 |
| SMOKE-04 | FREE-09 | Cold start: force-kill, tap notification, app cold-starts and lands on correct DM after 150ms | `03-SMOKE-TEST.md` SMOKE-04 |
| SMOKE-05 | FREE-03/04/05 | Rate limits: 4 flips within 10 min → exactly 1 push to recipient; SQL shows 3 suppressed rows with 'pair_15min' | `03-SMOKE-TEST.md` SMOKE-05 |
| SMOKE-06 | FREE-06 | Quiet hours: set recipient timezone to local 22:00–08:00 → no push; SQL shows 'quiet_hours' suppression row | `03-SMOKE-TEST.md` SMOKE-06 |
| SMOKE-07 | EXPIRY-01 | Local notification fires ~30min before 1h window expiry showing Keep it / Heads down action buttons | `03-SMOKE-TEST.md` SMOKE-07 |
| SMOKE-08 | EXPIRY-01 | [Keep it] extends window to next-larger size (1h → 3h); SQL confirms new status_expires_at | `03-SMOKE-TEST.md` SMOKE-08 |
| SMOKE-09 | EXPIRY-01 | [Heads down] flips mood to Busy with 3h window | `03-SMOKE-TEST.md` SMOKE-09 |

### Phase 4 EAS Checks

| ID | Req | Description | Source |
|----|-----|-------------|--------|
| MORN-01 | MORN-01/02 | Daily notification fires at configured local time on real device (not just scheduled, actually delivered by OS) | `04-VALIDATION.md` manual row 1 |
| MORN-02 | MORN-03/04 | Action button taps from lock screen (cold start): Free → sets Free, Busy → sets Busy, Maybe → sets Maybe; response dispatcher runs | `04-VALIDATION.md` manual row 2 |
| MORN-03 | MORN-05 | 12h valid_until guard: advance device clock >12h past fire time, tap action button → no-op (no status mutation) | `04-VALIDATION.md` manual row 3 |

---

## Session Sign-Off

### expo_go Track
- [ ] All 11 expo_go checks passed (UAT-01..10 + DM-01)
- [ ] Regression walkthrough: all 18 scenarios passed (6 features × 3 scenarios)
- [ ] STREAK-08 human gate cleared (Option A or Option B documented in SUMMARY.md)
- [ ] Any inline fixes noted in SUMMARY.md with commit SHA
- [ ] `npx tsc --noEmit && npx expo lint` passes after any inline fixes

### eas_build Track
- [ ] DEFERRED — to be executed when Apple Developer account is acquired
- [ ] Track formally deferred and documented in SUMMARY.md

---

*Phase: 05-hardware-verification-gate*
*Checklist authored: 2026-04-10*
*Total checks: 33 (11 expo_go + 22 eas_build)*
