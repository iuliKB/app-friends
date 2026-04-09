# Phase 4: Morning Prompt + Squad Goals Streak — Research

**Researched:** 2026-04-09
**Domain:** On-device scheduled local notifications (Expo SDK 55) + PL/pgSQL computed streak function + Profile UI (time picker + toggle) + React Native hero card component
**Confidence:** HIGH

## Summary

Phase 4 is mostly **wiring** on top of already-shipped infrastructure: Phase 1 registered the iOS `morning_prompt` category and Android channel, Phase 2 shipped the heartbeat utility and status store, Phase 3 shipped the single-file notification response dispatcher and the schedule-on-setStatus pattern in `src/lib/expiryScheduler.ts`. Phase 4 adds exactly **one new scheduler module**, **one new response-handler branch**, **one new Profile section**, **one new SQL function**, **one new hero component**, and **one new data hook**.

All five "plan-phase research items" from CONTEXT.md resolved to HIGH confidence:

1. `@react-native-community/datetimepicker@8.6.0` is installed, already registered as a plugin in `app.config.ts`, and already imported/used in `src/screens/plans/PlanCreateModal.tsx` and `src/screens/plans/PlanDashboardScreen.tsx` — the in-repo usage is the authoritative API reference.
2. `scheduleNotificationAsync` accepts an optional `identifier` **inside the request object** (not as a second arg), and it works correctly with `DailyTriggerInput`/`CalendarTriggerInput` in Expo SDK 55 for stable cancel-by-id.
3. `response.notification.date` is a **`number` (Unix milliseconds)** per the Expo SDK 55 typings — D-24's `firedAt = response.notification.date` / `Date.now() - firedAt > 12h` works as-is.
4. The plan-create route is `/plan-create` — a root Stack.Screen registered at `src/app/_layout.tsx:229-231` with `presentation: 'modal'`; the file is `src/app/plan-create.tsx`, which re-exports `PlanCreateModal`. StreakCard tap target = `router.push('/plan-create')`.
5. Sign-out is called **directly as `supabase.auth.signOut()` in `src/app/(tabs)/profile.tsx:115`** (no `useAuthStore` action wrapper). However, the clean hook point is **not** `handleLogout` — it's the existing module-scope `useAuthStore.subscribe` auth listener in `src/hooks/useStatus.ts:24-35` which already cancels `expiryScheduler` on session loss. D-33 should mirror that exact pattern.

**Primary recommendation:** Treat Phase 4 as three parallel workstreams — (A) Morning prompt scheduler + response handler + Profile UI, (B) `get_squad_streak` SQL migration + `useStreakData` hook + StreakCard, (C) Copy review blocking task. A and B have no code-level coupling; the copy review task is the terminal gate before phase completion.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Squad scope**
- **D-01:** "Squad" = the viewer's friend circle. No `squads` table in v1.3.
- **D-02:** Streak scope = plans where viewer is `plans.created_by` OR viewer is in `plan_members` (any rsvp). Voyeur-mode rejected.
- **D-03:** A week is active if ≥1 plan meets: (a) `plans.scheduled_for < now()`, (b) `scheduled_for` falls within Mon 00:00 → Sun 23:59 in viewer tz, (c) ≥2 `plan_members` with `rsvp='going'`, (d) viewer is creator or plan_member. `scheduled_for IS NULL` excluded.
- **D-04:** Viewer counts toward the ≥2 attendee threshold. Solo plans do NOT count.

**Streak SQL shape**
- **D-05:** `get_squad_streak(viewer_id uuid, tz text) RETURNS TABLE(current_weeks int, best_weeks int)`. One PL/pgSQL or SQL function, computed at query time. NOT materialized.
- **D-06:** Timezone source = viewer's device tz at query time via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Does NOT read `profiles.timezone`.
- **D-07:** Best-N is computed, not stored. Function scans all historical weeks from earliest of `plan_members.joined_at` / `plans.created_at`.
- **D-08:** Grace + break = sliding 4-week miss counter. Walk backwards week-by-week; maintain rolling 4-week miss counter; streak continues while misses_in_window ≤ 1; breaks at misses_in_window ≥ 2. Implementation (generate_series vs CTE vs PL/pgSQL loop) is Claude's discretion; semantic rule locked.
- **D-09:** Function is `SECURITY DEFINER` with hardened `search_path = ''`. Callable by any authenticated user for their own `viewer_id` only — enforce `auth.uid() = viewer_id` at top of function.
- **D-10:** No FADING/ALIVE/DEAD filtering on plans. Heartbeat is for status freshness, not plan history.

**StreakCard UI**
- **D-11:** New component `src/components/squad/StreakCard.tsx`. Single-component surface. Consumes `useStreakData` hook.
- **D-12:** Layout = minimal hero card. COLORS.surface.card / RADII.lg / SPACING.xl. Contents top→bottom: large number, "week streak" label, 🔥 emoji, subtle divider, "Best: N weeks" subline. NO countdown, NO dot strip, NO grace counter.
- **D-13:** Zero-state = same card with `0` in muted color; subline = "Start your first week — make a plan with friends." 🔥 replaced by ✨ or omitted.
- **D-14:** Tap StreakCard → `router.push('/plan-create')` (verified below).
- **D-15:** Grace-week tracking NEVER surfaced to user. STREAK-08 positive-only + STRK-01 deferral.
- **D-16:** Loading state = skeleton card matching minimal hero layout.
- **D-17:** Error state = silent fallback to zero-state hero. Console log, no toast.
- **D-18:** Pull-to-refresh enabled on Goals tab.

**Copy review gate**
- **D-19:** All user-facing strings inline in `StreakCard.tsx` for v1.3.
- **D-20:** Copy review = blocking plan task. A dedicated `04-XX-PLAN.md — Copy review` task lists every user-facing string from D-19+D-23+D-24+D-25 and has a "Non-engineer approval" field. Blocks VERIFICATION.

**Morning prompt scheduling**
- **D-21:** New module `src/lib/morningPrompt.ts` mirroring `src/lib/expiryScheduler.ts`. Exports: `scheduleMorningPrompt(hour, minute)`, `cancelMorningPrompt()`, `ensureMorningPromptScheduled()`. All try/catch-swallowed.
- **D-22:** Schedule trigger points: (1) cold launch after auth in existing `(tabs)/_layout.tsx:33-55` useEffect (OVR-04 single-listener), (2) Profile toggle ON, (3) Profile toggle OFF → cancel, (4) time change, (5) sign-out → cancel.
- **D-23:** Notification content: title "☀️ What's your status today?", body "", categoryIdentifier `'morning_prompt'`, channelId `'morning_prompt'`, data `{ kind: 'morning_prompt' }`.
- **D-24:** `valid_until` guard derived at tap time from `response.notification.date + 12h`. Not from payload. Payload only carries `{ kind: 'morning_prompt' }`.

**Morning prompt response handler**
- **D-25:** New branch in `src/app/_layout.tsx` `handleNotificationResponse` after `expiry_warning`. Flow: (1) 12h validity, (2) DEAD heartbeat check via `computeHeartbeatState`, (3) resolve mood from action id ∈ {`free`, `busy`, `maybe`}, (4) commit via same upsert pattern as expiry_warning.
- **D-26:** Tap-commits use `window_id='rest_of_day'`, `context_tag=null`.
- **D-27:** Body tap (DEFAULT_ACTION_IDENTIFIER) on morning_prompt opens Home (`/(tabs)/`) — no auto-commit.
- **D-28:** `useStatusStore` updated optimistically after successful upsert. Failure → silent log, no toast.

**Profile UI**
- **D-29:** New Profile section "Morning prompt" after existing "Settings" section. Two rows: Switch row + Time tap row (disabled when Switch OFF).
- **D-30:** Permission flow: check `getPermissionsAsync` → `granted` → schedule; `undetermined` → mount PrePromptModal → requestPermissionsAsync; `denied` → show inline text, revert Switch to OFF.
- **D-31:** Time picker: iOS `display="spinner"` or `"default"` (planner picks from codebase conventions); Android default native dialog. On change write AsyncStorage then `ensureMorningPromptScheduled`.
- **D-32:** Default time = 9:00 AM local (hour=9, minute=0).
- **D-33:** Sign-out calls `cancelMorningPrompt()` before session clear.

**Storage**
- **D-34:** AsyncStorage keys: `campfire:morning_prompt_enabled` (default 'true'), `campfire:morning_prompt_hour` (default '9'), `campfire:morning_prompt_minute` (default '0').
- **D-35:** NO `profiles.notify_morning_prompt` or `profiles.morning_prompt_time` columns. Device-local only.

**Integration reuse**
- **D-36:** Reuse `computeHeartbeatState` from `src/lib/heartbeat.ts`.
- **D-37:** Reuse `useStatusStore` + `computeWindowExpiry` from Phase 2/3.
- **D-38:** Reuse `PrePromptModal` from Phase 1.
- **D-39:** Reuse existing `morning_prompt` iOS category + Android channel — do NOT touch `notifications-init.ts`.

### Claude's Discretion

- Exact `StreakCard` padding / number font size / emoji size — use design tokens, match Home card aesthetic
- Skeleton card pixel structure — minimal 3-rectangle placeholder is fine
- SQL implementation: `generate_series` + `LATERAL JOIN`, recursive CTE, or PL/pgSQL loop — semantics locked by D-08, form is free
- Time picker row display format (`toLocaleTimeString` vs custom formatter)
- Zero-state copy wording (within STREAK-08 constraints, subject to non-engineer review)
- Memoization of `useStreakData` results vs refetch on focus
- Exact skeleton loading pattern (no prior skeleton primitive exists)

### Deferred Ideas (OUT OF SCOPE)

- `squads` table / shared squad entity → v1.4+
- Grace-week counter surfaced to user (STRK-01) → v1.4
- Background action dispatch (tap notification without launching app, LOCK-01) → v1.4
- Cross-device sync of morning prompt time / toggle → v1.4
- Recent-week strip on StreakCard → rejected (STREAK-08 violation)
- Separate plan-create CTA on zero state → D-14 already makes card tappable
- Streak detail screen → hero card is whole surface
- Snooze / "remind me later" action on morning prompt → v1.4+
- Per-friend attribution in streak → v1.4+
- Pin-important-plans to prevent grace consumption → out of scope
- Automated copy linting for positive-only constraint → manual review only
- Jest unit tests for `morningPrompt.ts` / `get_squad_streak` → rejected project-wide (Phase 2 OVR-10)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MORN-01 | Daily local push at configurable time (default 9:00am). Fires only when heartbeat = DEAD at fire time. | Expo SDK 55 `scheduleNotificationAsync` with `DailyTriggerInput { hour, minute, repeats: true }` — VERIFIED. DEAD-at-fire-time enforced at **tap time** via `computeHeartbeatState` in response handler (notification cannot be prevented from firing in advance; D-25 no-ops the commit if ALIVE/FADING). |
| MORN-02 | Scheduled on-device via `scheduleNotificationAsync({ hour, minute, repeats: true })`, no server cron, no `profiles.timezone`. | iOS `CalendarTriggerInput` + Android `DailyTriggerInput` both accept `{ hour, minute, repeats: true }`. No tz column needed — `repeats: true` uses device-local hour/minute. |
| MORN-03 | Free / Busy / Maybe action buttons. | iOS category registered at `src/lib/notifications-init.ts:23-29` with identifiers `free`/`busy`/`maybe` (lowercase). Android channel `morning_prompt` at DEFAULT importance (line 63-67). No change needed. |
| MORN-04 | Tap opens app and sets status via existing authenticated Supabase session (no public endpoint). | `opensAppToForeground: true` on each action in notifications-init.ts → response dispatcher in `src/app/_layout.tsx:21-125` runs inside authenticated app → writes via `supabase.from('statuses').upsert(...)` (same pattern as expiry_warning branch). |
| MORN-05 | Tap >12h after prompt fired no-ops gracefully via `valid_until` guard. | D-24 refinement: derive `firedAt = response.notification.date` (Unix ms) → `Date.now() - firedAt > 12*3600*1000` → return early. No stale payload. |
| MORN-06 | Skip-if-active (DEAD only). | Enforced at tap time (not schedule time) via `computeHeartbeatState(status_expires_at, last_active_at)` from `src/lib/heartbeat.ts` (Phase 2 OVR-01). ALIVE/FADING → no-op. |
| MORN-07 | Profile toggle to disable. | New Switch row in `src/app/(tabs)/profile.tsx` SETTINGS section after "Friend availability" (pattern: profile.tsx:223-237). AsyncStorage `campfire:morning_prompt_enabled`. |
| MORN-08 | Profile row to pick time (default 9am). | New tap row opens `@react-native-community/datetimepicker@8.6.0` in `mode="time"` — installed, plugged into app.config.ts, used in PlanCreateModal.tsx:15,188. |
| STREAK-01 | Goals tab replaces "Coming soon" stub with StreakCard showing current weekly streak. | Replace `src/app/(tabs)/squad.tsx:37-41` `goalsContent` branch with `<StreakCard />`. |
| STREAK-02 | Week active if ≥1 plan with ≥2 confirmed attendees completed that week. | Schema: `plans.scheduled_for` + `plan_members.rsvp` enum includes `'going'`. SQL JOIN + GROUP BY + HAVING COUNT(*) >= 2 FILTER WHERE rsvp='going'. |
| STREAK-03 | Mon 00:00 → Sun 23:59 week boundaries (viewer tz, not "squad creator"). | `date_trunc('week', scheduled_for AT TIME ZONE $tz)` — Postgres ISO-8601 week start is Monday. Device tz passed from client per D-06. |
| STREAK-04 | Survives 1 grace week per 4-week window. | D-08 sliding counter: misses_in_window ≤ 1 → continue. |
| STREAK-05 | Breaks on 2 consecutive misses within 4-week window. | D-08 sliding counter: misses_in_window ≥ 2 → break (reset current streak count; best is preserved). |
| STREAK-06 | "Best: N weeks" preserved permanently across breaks. | D-07 computed — function scans full history each call; best = max run length ever observed. |
| STREAK-07 | Computed via `get_squad_streak(tz)` SQL function; NOT materialized. | D-05 shape. Migration `0011_squad_streak_v1_3.sql`. Next number after `0010_friend_went_free_v1_3.sql` — verified via glob. |
| STREAK-08 | Positive-only copy, non-engineer reviewed before ship. | D-19 inline strings + D-20 blocking plan task. |
</phase_requirements>

## Project Constraints (from codebase conventions)

No `./CLAUDE.md` exists. Constraints come from accumulated phase CONTEXTs:

- **Zero new npm dependencies.** Every library Phase 4 needs is already installed (verified: `package.json:14-53`).
- **`src/lib/` not `src/utils/`** for new utility files (Phase 2 OVR-01).
- **Single AppState/auth useEffect** in `src/app/(tabs)/_layout.tsx:33-55` — extend, do NOT add a parallel listener (Phase 2 OVR-04).
- **Notification response branching** in `src/app/_layout.tsx:21-125` as `if (category === 'x')` blocks — Phase 4 adds a block, does NOT refactor the dispatcher.
- **Try/catch swallow** on every Expo notification API call for Expo Go tolerance (Phase 1 D-19).
- **AsyncStorage keys prefixed `campfire:`** (Phase 1 D-06).
- **`SECURITY DEFINER` with `search_path = ''`** for all new SQL functions (Phase 2 T-02-09, Phase 3 D-08).
- **No React Query / TanStack Query.** Plain hooks + direct supabase calls; Zustand for cross-screen state only (Phase 2 OVR-02).
- **No Jest / no unit tests.** Verification via `grep`, `tsc --noEmit`, `expo lint`, and manual SQL exec (Phase 2 OVR-10).
- **ESLint `campfire/no-hardcoded-styles`** — all styling via `@/theme` tokens; no raw hex / fontSize / padding.
- **Migration numbering:** next is `0011_squad_streak_v1_3.sql` (verified via glob: last applied is `0010_friend_went_free_v1_3.sql`).

## Standard Stack

### Core (already installed — zero-new-deps rule)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-notifications` | `~55.0.13` | `scheduleNotificationAsync`, `cancelScheduledNotificationAsync`, response listener | Official Expo local/push notification module [VERIFIED: package.json:34] |
| `@react-native-community/datetimepicker` | `8.6.0` | Native iOS + Android time picker | De-facto standard RN date/time picker; already plugged into `app.config.ts:28` and used in two existing modals [VERIFIED: package.json:15, app.config.ts:28, PlanCreateModal.tsx:15] |
| `@react-native-async-storage/async-storage` | `2.2.0` | Persist `campfire:morning_prompt_*` keys | Standard RN persistence for device-local prefs [VERIFIED: package.json:14] |
| `@supabase/supabase-js` | `^2.99.2` | `supabase.rpc('get_squad_streak', { viewer_id, tz })` | Project-wide DB client [VERIFIED: package.json:19] |
| `zustand` | `^5.0.12` | `useStatusStore` writes inside response handler (D-28) | Project standard store [VERIFIED: package.json:53] |

### Supporting (reused from prior phases)

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/lib/heartbeat.ts` (`computeHeartbeatState`) | DEAD-check inside response handler | Phase 2 OVR-01 utility — reused per D-36 |
| `src/lib/windows.ts` (`computeWindowExpiry`) | Rest-of-day expiry computation for tap-commit | Phase 2 utility — reused per D-37 |
| `src/stores/useStatusStore.ts` (`getState`, `setCurrentStatus`) | Optimistic status update post-commit | Phase 2 store — reused per D-37 |
| `src/components/notifications/PrePromptModal.tsx` | Permission flow when toggling Morning prompt ON | Phase 1 modal — reused per D-38 (note: current copy in PrePromptModal speaks to friend-free framing; planner should decide whether to reword the modal body for the morning-prompt onboarding path or accept the generic copy for v1.3) |
| `src/lib/notifications-init.ts` | iOS category + Android channel already registered | Phase 1 module — **not touched** by Phase 4 per D-39 |
| `src/lib/expiryScheduler.ts` | Structural template for `morningPrompt.ts` | Mirror its cancel-previous + schedule + try/catch swallow pattern |

### Alternatives Considered (and rejected for v1.3)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| On-device `scheduleNotificationAsync` repeats | Server cron + push | Server cron requires `profiles.timezone` column + Edge Function; rejected by CONTEXT D-02/D-35 and the v1.3 "no new server dep" posture |
| PL/pgSQL loop in SQL | Client-side streak compute | Client compute needs to pull every plan + plan_member row; not RLS-safe and not efficient; SQL function is the right place |
| `profiles.morning_prompt_time` column | AsyncStorage | Migration surface + cross-device sync is not a v1.3 requirement (D-35) |
| Materialized view of weekly streak | Computed function | At 3-15 friend squads and tens-to-hundreds of plans/viewer, function is trivially fast and zero-maintenance; STREAK-07 explicitly forbids materialized |
| Reuse `expiryScheduler.ts` module | New `morningPrompt.ts` | Different semantic (daily repeating vs one-shot-at-date), different stable id, different AsyncStorage lifecycle |

**Verification note:** All version strings above come from `package.json`. Phase 4 introduces zero new packages, so no `npm view` round-trip is required.

## Architecture Patterns

### Recommended File Layout

```
src/
├── lib/
│   └── morningPrompt.ts                    # NEW (mirrors expiryScheduler.ts)
├── components/
│   └── squad/
│       └── StreakCard.tsx                  # NEW (single-file hero card)
├── hooks/
│   └── useStreakData.ts                    # NEW (wraps supabase.rpc)
├── app/
│   ├── _layout.tsx                         # EDIT: add morning_prompt branch in handleNotificationResponse
│   ├── (tabs)/
│   │   ├── _layout.tsx                     # EDIT: extend existing useEffect with ensureMorningPromptScheduled()
│   │   ├── profile.tsx                     # EDIT: add Morning prompt section + cancelMorningPrompt() in handleLogout
│   │   └── squad.tsx                       # EDIT: replace goalsContent branch with <StreakCard />
supabase/
└── migrations/
    └── 0011_squad_streak_v1_3.sql          # NEW
```

### Pattern 1: Scheduler module mirroring `expiryScheduler.ts`

**What:** Stable-identifier cancel-then-reschedule with try/catch swallow and AsyncStorage-backed config read.

**When to use:** Every schedule call.

**Example (derived from `src/lib/expiryScheduler.ts` + Expo SDK 55 docs):**

```typescript
// src/lib/morningPrompt.ts
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SCHEDULE_ID = 'campfire:morning_prompt'; // stable identifier (D-21)
const K_ENABLED = 'campfire:morning_prompt_enabled';
const K_HOUR = 'campfire:morning_prompt_hour';
const K_MINUTE = 'campfire:morning_prompt_minute';

export async function scheduleMorningPrompt(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') return;
  // Cancel previous by stable id (safe if none exists)
  try {
    await Notifications.cancelScheduledNotificationAsync(SCHEDULE_ID);
  } catch {
    // Stale/missing id — ignore
  }
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: SCHEDULE_ID, // NotificationRequestInput.identifier — SDK 55 VERIFIED
      content: {
        title: "☀️ What's your status today?",
        body: '',
        categoryIdentifier: 'morning_prompt',  // Phase 1 iOS category
        data: { kind: 'morning_prompt' },       // No valid_until — derived at tap time (D-24)
      },
      trigger: {
        // SDK 55: DailyTriggerInput (Android) / CalendarTriggerInput (iOS)
        // Both accept { hour, minute, repeats: true }
        hour,
        minute,
        repeats: true,
        channelId: 'morning_prompt',            // Phase 1 Android channel
      },
    });
  } catch {
    // Expo Go may not support scheduled notifications with categories — swallow
  }
}

export async function cancelMorningPrompt(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(SCHEDULE_ID);
  } catch {
    // Not scheduled — ignore
  }
}

export async function ensureMorningPromptScheduled(): Promise<void> {
  if (Platform.OS === 'web') return;
  const enabled = (await AsyncStorage.getItem(K_ENABLED)) ?? 'true'; // default true (D-34)
  if (enabled !== 'true') {
    await cancelMorningPrompt();
    return;
  }
  const hourStr = (await AsyncStorage.getItem(K_HOUR)) ?? '9';
  const minuteStr = (await AsyncStorage.getItem(K_MINUTE)) ?? '0';
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
  await scheduleMorningPrompt(hour, minute);
}
```

**Key properties:**
- Stable `identifier` survives cold launch and makes cancel idempotent.
- `repeats: true` means the OS fires daily at local hour/minute with no timezone parameter — that's the whole reason Phase 4 doesn't need `profiles.timezone`.
- try/catch swallow matches `notifications-init.ts` and `expiryScheduler.ts`.

### Pattern 2: Response handler branch (mirroring expiry_warning)

**What:** After the existing `expiry_warning` branch in `src/app/_layout.tsx:50-124`, add a `morning_prompt` branch that reuses the same upsert pattern.

**Example (derived from existing expiry_warning KEEP_IT branch, lines 68-94):**

```typescript
// After expiry_warning branch (line ~124):
if (category === 'morning_prompt') {
  // D-24: 12h validity from notification fire time (not payload)
  const firedAt = response.notification.date; // number, Unix ms — SDK 55 VERIFIED
  if (Date.now() - firedAt > 12 * 60 * 60 * 1000) return;

  // D-27: body tap opens Home, does NOT auto-commit
  if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    router.push('/(tabs)/' as never);
    return;
  }

  // D-25: resolve mood from lowercase action identifiers (free/busy/maybe)
  const mood = action === 'free' ? 'free'
             : action === 'busy' ? 'busy'
             : action === 'maybe' ? 'maybe'
             : null;
  if (!mood) return;

  // D-25: DEAD-only skip-if-active (MORN-01/06)
  const current = useStatusStore.getState().currentStatus;
  const heartbeat = current
    ? computeHeartbeatState(current.status_expires_at, current.last_active_at)
    : 'dead';
  if (heartbeat !== 'dead') return;

  // D-25: resolve userId from session
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return;

  // D-26: window_id='rest_of_day', context_tag=null
  const now = new Date();
  const expiry = computeWindowExpiry('rest_of_day', now);
  const nowIso = now.toISOString();
  const expiryIso = expiry.toISOString();

  const { error: upsertErr } = await supabase.from('statuses').upsert(
    {
      user_id: userId,
      status: mood,
      context_tag: null,
      status_expires_at: expiryIso,
      last_active_at: nowIso,
    },
    { onConflict: 'user_id' }
  );
  if (!upsertErr) {
    // D-28: optimistic store update
    useStatusStore.getState().setCurrentStatus({
      status: mood,
      context_tag: null,
      status_expires_at: expiryIso,
      last_active_at: nowIso,
      window_id: 'rest_of_day',
    });
  }
  return;
}
```

Note: `computeHeartbeatState` and `computeWindowExpiry` are already imported at the top of `_layout.tsx:13`. `useStatusStore` is already imported at line 12. No new imports needed beyond possibly `computeHeartbeatState` (verify — line 13 only imports `computeWindowExpiry, nextLargerWindow`).

### Pattern 3: Profile Section with Switch + time picker row

**What:** Mirror existing "Friend availability" Switch at `profile.tsx:223-237` + inline DateTimePicker visibility toggle (same pattern as `PlanCreateModal.tsx:187-196`).

**Shape:**

```typescript
// State (add near line 39-40 existing state)
const [morningEnabled, setMorningEnabled] = useState(true);
const [morningHour, setMorningHour] = useState(9);
const [morningMinute, setMorningMinute] = useState(0);
const [showTimePicker, setShowTimePicker] = useState(false);

// Hydrate in loadNotificationsEnabled() — read all three campfire:morning_prompt_* keys
// Default missing keys to 'true' / '9' / '0' (D-34)

// Toggle handler (mirrors handleToggleFriendFree pattern at profile.tsx:99)
async function handleToggleMorning(value: boolean) {
  setMorningEnabled(value);
  await AsyncStorage.setItem('campfire:morning_prompt_enabled', value ? 'true' : 'false');
  if (value) {
    // D-30 permission flow
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status === 'granted') {
      await ensureMorningPromptScheduled();
    } else if (perms.status === 'undetermined') {
      // Mount PrePromptModal — planner decides whether to gate via local state
      // or re-use the (tabs)/_layout.tsx PrePromptModal mounting
      // ...
    } else {
      // denied — revert
      setMorningEnabled(false);
      await AsyncStorage.setItem('campfire:morning_prompt_enabled', 'false');
      // inline error text
    }
  } else {
    await cancelMorningPrompt();
  }
}

// Time change handler (mirrors PlanCreateModal.tsx:90)
function handleTimeChange(_event: DateTimePickerEvent, selectedDate?: Date) {
  if (Platform.OS === 'android') setShowTimePicker(false);
  if (selectedDate) {
    const h = selectedDate.getHours();
    const m = selectedDate.getMinutes();
    setMorningHour(h);
    setMorningMinute(m);
    AsyncStorage.multiSet([
      ['campfire:morning_prompt_hour', String(h)],
      ['campfire:morning_prompt_minute', String(m)],
    ]).then(() => ensureMorningPromptScheduled());
  }
}

// JSX — after the "Friend availability" row (~line 237):
<View style={styles.row}>
  <Ionicons name="sunny-outline" size={FONT_SIZE.xl} color={COLORS.text.secondary} style={styles.rowIcon} />
  <Text style={styles.rowLabel}>Morning prompt</Text>
  <Switch
    value={morningEnabled}
    onValueChange={handleToggleMorning}
    trackColor={{ false: COLORS.border, true: COLORS.interactive.accent + '40' }}
    thumbColor={morningEnabled ? COLORS.interactive.accent : COLORS.border}
  />
</View>
<TouchableOpacity
  style={[styles.row, !morningEnabled && { opacity: 0.4 }]}
  onPress={() => morningEnabled && setShowTimePicker((v) => !v)}
  disabled={!morningEnabled}
  activeOpacity={0.7}
>
  <Ionicons name="time-outline" size={FONT_SIZE.xl} color={COLORS.text.secondary} style={styles.rowIcon} />
  <Text style={styles.rowLabel}>Time</Text>
  <Text style={{ color: COLORS.text.secondary }}>
    {new Date(2000, 0, 1, morningHour, morningMinute).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
  </Text>
</TouchableOpacity>
{showTimePicker && (
  <DateTimePicker
    value={new Date(2000, 0, 1, morningHour, morningMinute)}
    mode="time"
    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
    onChange={handleTimeChange}
    themeVariant="dark"
  />
)}
```

### Pattern 4: `get_squad_streak` SQL function

**What:** `SECURITY DEFINER` PL/pgSQL function returning `(current_weeks int, best_weeks int)` with sliding 4-week miss window.

**Semantic invariants (D-08):**
- Walk weeks backwards from current week.
- For each week, evaluate "active" per D-03.
- Maintain rolling 4-week miss count (last 4 weeks including current).
- Current streak continues while `misses_in_window <= 1`.
- Breaks at first week where `misses_in_window >= 2`.
- Best-N = max run length ever observed while walking ALL history from earliest plan involvement.

**Recommended implementation (PL/pgSQL loop — clearest for this semantic, best fits D-08 wording):**

```sql
-- supabase/migrations/0011_squad_streak_v1_3.sql
-- Phase 4 v1.3 STREAK-01..08 — computed weekly streak per viewer's friend circle.
-- D-01: no squads entity — viewer's friend circle.
-- D-02: plans where viewer is creator OR plan_member (any rsvp).
-- D-03: active week = ≥1 completed plan with ≥2 'going' attendees in Mon-Sun window (viewer tz).
-- D-05: SECURITY DEFINER, computed not materialized.
-- D-06: tz passed from client.
-- D-07: best_weeks scans full history.
-- D-08: sliding 4-week miss counter; breaks at misses_in_window >= 2.

create or replace function public.get_squad_streak(
  viewer_id uuid,
  tz        text
)
returns table (
  current_weeks int,
  best_weeks    int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_week_start_utc timestamptz;
  v_oldest_week_start timestamptz;
  v_this_week_start timestamptz;
  v_active boolean;
  v_misses_in_window int := 0;
  v_current int := 0;
  v_best int := 0;
  v_run int := 0;
  v_broken boolean := false;
  r record;
  -- rolling window: array of booleans (true=active, false=miss) oldest-first, length ≤ 4
  v_window boolean[] := array[]::boolean[];
begin
  -- D-09 auth guard
  if v_caller is null or v_caller <> viewer_id then
    raise exception 'not authorized';
  end if;

  -- Current week start (Monday 00:00 in viewer tz), expressed as UTC timestamptz
  v_this_week_start := date_trunc('week', (now() at time zone tz))::timestamp at time zone tz;

  -- Earliest week start from viewer's involvement (plans they created or joined)
  select min(
    date_trunc('week', (least(p.created_at, pm.joined_at) at time zone tz))::timestamp at time zone tz
  )
  into v_oldest_week_start
  from public.plans p
  left join public.plan_members pm
    on pm.plan_id = p.id and pm.user_id = viewer_id
  where p.created_by = viewer_id or pm.user_id = viewer_id;

  if v_oldest_week_start is null then
    -- No plans ever — zero streak
    current_weeks := 0;
    best_weeks := 0;
    return next;
    return;
  end if;

  -- Walk FORWARD from oldest to current to compute best, then derive current from tail
  v_week_start_utc := v_oldest_week_start;
  while v_week_start_utc <= v_this_week_start loop
    -- Is this week active? (D-03)
    select exists (
      select 1
      from public.plans p
      where p.scheduled_for is not null
        and p.scheduled_for < now()
        and p.scheduled_for >= v_week_start_utc
        and p.scheduled_for <  v_week_start_utc + interval '7 days'
        and (
          p.created_by = viewer_id
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id and pm.user_id = viewer_id
          )
        )
        and (
          select count(*) from public.plan_members pm2
          where pm2.plan_id = p.id and pm2.rsvp_status = 'going'
        ) >= 2
    ) into v_active;

    -- Maintain 4-week sliding window
    v_window := array_append(v_window, v_active);
    if array_length(v_window, 1) > 4 then
      v_window := v_window[2:];
    end if;

    -- misses_in_window = count of FALSE in v_window
    select count(*) into v_misses_in_window
    from unnest(v_window) as w where w = false;

    if v_active then
      v_run := v_run + 1;
    elsif v_misses_in_window >= 2 then
      -- Streak breaks (D-08 break condition)
      if v_run > v_best then v_best := v_run; end if;
      v_run := 0;
      -- Reset window after break to avoid sticky misses
      v_window := array[]::boolean[];
    end if;
    -- else: miss but within grace → do nothing, v_run stays

    v_week_start_utc := v_week_start_utc + interval '7 days';
  end loop;

  -- Final best check
  if v_run > v_best then v_best := v_run; end if;

  current_weeks := v_run;
  best_weeks := v_best;
  return next;
end;
$$;

grant execute on function public.get_squad_streak(uuid, text) to authenticated;
```

**Edge cases covered:**
- No plans ever → returns (0, 0).
- Plan with `scheduled_for IS NULL` → excluded (D-03 clause a+b).
- Plan that hasn't happened yet (`scheduled_for > now()`) → excluded.
- Plans with only 1 `going` → not active.
- Viewer is creator but not a `plan_member` → counts (D-02).
- Week starts on Monday per `date_trunc('week', ...)` which Postgres defines as ISO-8601 Monday 00:00.
- `AT TIME ZONE tz` / `AT TIME ZONE tz` round-trip converts viewer-local week boundaries back to UTC timestamptz for the comparison.

**Planner discretion:** May choose `generate_series` + `LATERAL JOIN` instead — semantics locked, form free. The loop above is written for clarity and for easy debugging against a known squad history.

### Pattern 5: `useStreakData` hook (plain, no React Query)

```typescript
// src/hooks/useStreakData.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface StreakData {
  currentWeeks: number;
  bestWeeks: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Hermes iOS guard (same pattern as src/hooks/useStatus.ts:50)
    if (tz === 'UTC' && new Date().getTimezoneOffset() !== 0) return 'UTC';
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function useStreakData(): StreakData {
  const session = useAuthStore((s) => s.session);
  const [currentWeeks, setCurrentWeeks] = useState(0);
  const [bestWeeks, setBestWeeks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_squad_streak', {
      viewer_id: session.user.id,
      tz: getDeviceTimezone(),
    });
    if (rpcErr) {
      // D-17: silent error → zero-state fallback
      console.warn('get_squad_streak failed', rpcErr);
      setError(rpcErr.message);
      setCurrentWeeks(0);
      setBestWeeks(0);
    } else if (data && data.length > 0) {
      setCurrentWeeks(data[0].current_weeks ?? 0);
      setBestWeeks(data[0].best_weeks ?? 0);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { currentWeeks, bestWeeks, loading, error, refetch };
}
```

### Anti-Patterns to Avoid

- **Adding a second AppState listener.** Phase 2 OVR-04 explicitly forbids this — extend the existing effect at `src/app/(tabs)/_layout.tsx:33-55`.
- **Reading `profiles.timezone` for the streak tz.** D-06 locks device-at-query-time tz. The `profiles.timezone` column is a Phase 3 artifact coupled to friend-free quiet hours.
- **Putting `valid_until` in the notification payload.** D-24 — payload is static with `repeats:true` so a date set at schedule time becomes stale. Derive from `response.notification.date + 12h` at tap.
- **Stashing the morning prompt schedule id in AsyncStorage.** Unlike `expiryScheduler.ts` (which generates a fresh id per schedule), the morning prompt uses a **stable literal** `'campfire:morning_prompt'` as identifier — cancel-by-id is idempotent so no persistence needed.
- **Surfacing grace-week state.** D-15 — the streak simply doesn't break on a grace week. No "1 grace available" text anywhere.
- **Putting `setNotificationCategoryAsync` inside Phase 4 code.** D-39 — Phase 1 already registered the category at module scope. Phase 4 MUST NOT touch `notifications-init.ts`.
- **Hand-rolling a date math library.** Postgres `date_trunc('week', ...)` + `AT TIME ZONE` is sufficient; the JS side only needs `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Creating a `squads` table.** D-01 — there is no squad entity in v1.3.
- **Wiring `/plans/create` or `/(tabs)/explore/plan-create` as StreakCard target.** The actual route is `/plan-create` (root stack modal) — verified below.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Daily repeating notification scheduling | Custom `setInterval`/AppState wakeup scheduler | `Notifications.scheduleNotificationAsync({ trigger: { hour, minute, repeats: true } })` | OS-backed scheduling survives app kill, background OS, device reboot (iOS preserves scheduled local notifications across reboot). JS setInterval does not exist when app is killed. |
| Time picker UI | Custom modal with two FlatLists for hours/minutes | `@react-native-community/datetimepicker` | Native iOS/Android picker, accessibility, locale-aware, handles 12/24h switch per device settings, already used twice in repo |
| Week-start-of-Mon date math in JS | Manual `getDay()` offset + new Date math | Postgres `date_trunc('week', ts AT TIME ZONE tz)` | ISO-8601 Monday-start built-in; avoids DST edge cases; keeps computation server-side |
| Streak caching / invalidation | Materialized view + trigger-maintained rollup | Computed `get_squad_streak(tz)` function | STREAK-07 explicitly forbids materialized; at v1.3 scale the query is trivially fast; zero maintenance surface |
| Notification permission flow | Hand-rolled modal + permission state machine | Reuse `PrePromptModal` + `Notifications.getPermissionsAsync`/`requestPermissionsAsync` | Phase 1 already shipped this; D-38 mandates reuse |
| Heartbeat computation | Re-implement DEAD/FADING/ALIVE thresholds | `computeHeartbeatState` from `src/lib/heartbeat.ts` | Phase 2 OVR-01; D-36 |
| Status upsert | New Supabase write path | `supabase.from('statuses').upsert({...}, { onConflict: 'user_id' })` + `useStatusStore.getState().setCurrentStatus` — same pattern as `_layout.tsx:75-93` | D-37; one upsert shape across all mutation sites |
| Sign-out cleanup hook | New useEffect in profile.tsx | Extend the existing module-scope `useAuthStore.subscribe` in `src/hooks/useStatus.ts:24-35` (or add a parallel one-liner subscriber) | Pattern already used for `cancelExpiryNotification`; D-33 — add a `cancelMorningPrompt()` call in the same `if (prev?.session && !state.session)` branch |

**Key insight:** Phase 4 is almost entirely a **composition** of Phase 1/2/3 primitives. The only genuinely new code is the PL/pgSQL function and the hero card component.

## Runtime State Inventory

Phase 4 is partially a migration phase (adds a new SQL function + AsyncStorage keys). Audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — streak is computed at query time; no streak table, no `squads` table, no `profiles` columns added (D-35) | None |
| Live service config | None — no Edge Function, no webhook, no pg_cron job. Migration 0011 only creates a function | None — apply migration via `supabase db push` |
| OS-registered state | iOS `morning_prompt` category (already registered by Phase 1, D-39). Android `morning_prompt` channel (already registered by Phase 1). Scheduled local notification with identifier `'campfire:morning_prompt'` registers into the iOS/Android OS notification scheduler at first `scheduleMorningPrompt` call | On upgrade from v1.2 → v1.3 (existing users who never had this feature): cold launch after auth calls `ensureMorningPromptScheduled()` which defaults `campfire:morning_prompt_enabled` to `'true'` and schedules at 9:00am. This is correct per D-32 + D-34 (opt-out default). |
| Secrets/env vars | None — uses existing Supabase session | None |
| Build artifacts / installed packages | None — zero new npm deps. `@react-native-community/datetimepicker` already in plugins array per `app.config.ts:28` | None |

**Migration note:** Because the default is opt-in (`campfire:morning_prompt_enabled = 'true'` on first read), existing users on their first v1.3 launch after Phase 4 ships will **automatically start receiving morning prompts at 9:00am local**. This is explicit per D-34 and matches v1.3's "opt-out-default notification posture" but should be called out in the phase SUMMARY as a behavior change for the Hardware Verification Gate.

## Common Pitfalls

### Pitfall 1: Stale `valid_until` in repeating notification payload

**What goes wrong:** Developer sets `data: { valid_until: '2026-04-10T09:00Z' }` at schedule time. The next day, the repeating notification fires with the same payload from yesterday — so every subsequent day's prompt has an already-expired `valid_until`.

**Why it happens:** `scheduleNotificationAsync({ trigger: { repeats: true } })` reuses the exact same `content` object for every fire — the payload is not re-evaluated per fire.

**How to avoid:** D-24 — derive the 12h window from `response.notification.date` at tap time instead. Payload carries only `{ kind: 'morning_prompt' }`.

**Warning signs:** First-day QA passes, subsequent-day QA fails silently because the handler no-ops every time.

### Pitfall 2: Body-tap silently mutating status

**What goes wrong:** User taps the notification body (not an action button) to open the app, and the handler defaults to committing some status.

**Why it happens:** `action === Notifications.DEFAULT_ACTION_IDENTIFIER` is fired on body-tap; a loose handler that branches only on action ∈ {free, busy, maybe} may fall through to a default branch.

**How to avoid:** D-27 — explicit early-return for DEFAULT_ACTION_IDENTIFIER that navigates to Home without mutation. Same as the expiry_warning body-tap handling at `_layout.tsx:63-66`.

**Warning signs:** User reports "my status flipped to Free when I just wanted to open the app."

### Pitfall 3: Double-scheduled notifications

**What goes wrong:** User changes the morning prompt time from 9:00am to 8:00am. Both fire the next day because the 9:00am one was never canceled.

**Why it happens:** `scheduleNotificationAsync` without an `identifier` returns a fresh random id each call, and cancel-by-id is impossible without persisting that id.

**How to avoid:** Use a stable literal identifier (`'campfire:morning_prompt'`) via the `NotificationRequestInput.identifier` field. Call `cancelScheduledNotificationAsync(SCHEDULE_ID)` before every schedule, and always catch (it throws if none exists).

**Warning signs:** Two morning prompts firing back-to-back after a time change.

### Pitfall 4: Heartbeat check at schedule time (not tap time)

**What goes wrong:** Developer tries to "not schedule the notification if user is currently ALIVE" — but the notification is scheduled for tomorrow morning, and the user's heartbeat state tomorrow is unknowable today.

**Why it happens:** Misreading MORN-06 as "don't fire if ALIVE" when it should be "don't commit status if ALIVE".

**How to avoid:** D-25 locks the check at **tap time**: `if (heartbeat !== 'dead') return;`. The notification always fires; the handler no-ops when the user is already active.

**Warning signs:** Morning prompt never appears for anyone.

### Pitfall 5: Week boundary drift across DST

**What goes wrong:** `date_trunc('week', scheduled_for)` without `AT TIME ZONE` uses UTC week boundaries, not viewer-local. A plan at 11pm Sunday in EST lands in the wrong week.

**Why it happens:** Postgres `timestamptz` values are stored as UTC; naive `date_trunc` treats them as UTC unless you cast.

**How to avoid:** `date_trunc('week', (scheduled_for AT TIME ZONE tz))::timestamp AT TIME ZONE tz`. The double cast converts UTC→local→truncate→local→UTC for the comparison. D-06 passes the device tz.

**Warning signs:** Streak count is correct most of the time but is off-by-one during the week containing the DST transition.

### Pitfall 6: Expo Go silently swallowing local notifications

**What goes wrong:** QA in Expo Go sees no morning prompt appear, concludes the feature is broken.

**Why it happens:** Expo Go has limited notification support on iOS since SDK 53; `scheduleNotificationAsync` with action categories is one of the things that may silently fail. EAS dev build is the only reliable test surface.

**How to avoid:** Phase 1 D-19 mandates try/catch swallow on all schedule calls. Hardware Verification Gate (Phase 5) is where real notification delivery is validated. Flag in SUMMARY that Expo Go testing of Phase 4 is non-authoritative.

**Warning signs:** Feature "works" in dev but Phase 5 finds it broken.

### Pitfall 7: PrePromptModal copy mismatch

**What goes wrong:** Toggling Morning prompt ON shows the existing PrePromptModal ("Get a heads up when friends are free...") which is Phase 1 friend-free framing — unrelated to morning prompt.

**Why it happens:** D-38 mandates reuse of the same modal component.

**How to avoid:** Planner choice — either (a) accept the generic copy for v1.3 and note in SUMMARY that the modal copy could be more context-aware in v1.4, or (b) parameterize `PrePromptModal` to accept a `body` prop and pass morning-prompt-specific copy from the Profile toggle call site. Option (b) is cleaner but is a minor Phase 1 refactor. Recommend (a) for v1.3 ship velocity — call out in copy review.

**Warning signs:** Non-engineer copy reviewer flags the modal body as "doesn't fit the action I just took."

## Code Examples

### Extending the existing (tabs)/_layout.tsx useEffect (D-22)

```typescript
// src/app/(tabs)/_layout.tsx — extend the existing useEffect at lines 33-55
// DO NOT add a second useEffect (OVR-04 single-listener rule)

import { ensureMorningPromptScheduled } from '@/lib/morningPrompt'; // NEW import

useEffect(() => {
  if (!userId) return;

  registerForPushNotifications(userId)
    .then((result) => setRegisterState(result))
    .catch(() => {});
  touch().catch(() => {});
  ensureMorningPromptScheduled().catch(() => {}); // NEW — D-22 trigger point (1)

  const sub = AppState.addEventListener('change', (next) => {
    if (appState.current.match(/inactive|background/) && next === 'active') {
      registerForPushNotifications(userId)
        .then((result) => setRegisterState(result))
        .catch(() => {});
      touch().catch(() => {});
      // Note: morning prompt does NOT need to reschedule on foreground — the
      // OS-backed repeating trigger is persistent across background/foreground cycles.
      // Only time-change + toggle-flip + sign-out rescheduling is required.
    }
    appState.current = next;
  });

  return () => sub.remove();
}, [userId, touch]);
```

### Extending useStatus.ts sign-out cleanup (D-33)

```typescript
// src/hooks/useStatus.ts — lines 24-35
// Add cancelMorningPrompt to the existing auth subscriber

import { cancelExpiryNotification, scheduleExpiryNotification } from '@/lib/expiryScheduler';
import { cancelMorningPrompt } from '@/lib/morningPrompt'; // NEW

let authListenerInstalled = false;
function installAuthListenerOnce() {
  if (authListenerInstalled) return;
  authListenerInstalled = true;
  useAuthStore.subscribe((state, prev) => {
    if (prev?.session && !state.session) {
      useStatusStore.getState().clear();
      cancelExpiryNotification().catch(() => {});
      cancelMorningPrompt().catch(() => {}); // NEW — D-33
    }
  });
}
```

This is the cleanest sign-out hook point: it fires from the auth state transition itself, not from `handleLogout`, so it covers the `SIGNED_OUT` path from any call-site (direct `supabase.auth.signOut()` in profile.tsx, OR future programmatic sign-outs, OR server-side session revocation).

### StreakCard component (skeleton)

```typescript
// src/components/squad/StreakCard.tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { useStreakData } from '@/hooks/useStreakData';

export function StreakCard() {
  const router = useRouter();
  const { currentWeeks, bestWeeks, loading } = useStreakData();

  if (loading) {
    return <StreakCardSkeleton />;
  }

  const isZero = currentWeeks === 0;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push('/plan-create' as never)} // D-14 — VERIFIED route
      accessibilityRole="button"
      accessibilityLabel={isZero ? 'Start your first week streak' : `${currentWeeks} week streak. Best ${bestWeeks} weeks`}
    >
      <Text style={[styles.bigNumber, isZero && styles.bigNumberMuted]}>{currentWeeks}</Text>
      <Text style={styles.label}>week streak</Text>
      <Text style={styles.emoji} accessibilityLabel={isZero ? undefined : 'on fire'}>
        {isZero ? '' : '🔥'}
      </Text>
      <View style={styles.divider} />
      <Text style={styles.subline}>
        {isZero
          ? 'Start your first week — make a plan with friends.'
          : `Best: ${bestWeeks} weeks`}
      </Text>
    </Pressable>
  );
}

function StreakCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonBig} />
      <View style={styles.skeletonLabel} />
      <View style={styles.divider} />
      <View style={styles.skeletonSubline} />
    </View>
  );
}

// styles use COLORS.surface.card / RADII.lg / SPACING.xl per D-12
```

### Goals-tab rework with pull-to-refresh (D-18)

```typescript
// src/app/(tabs)/squad.tsx — replace goalsContent branch at lines 37-41
import { RefreshControl, ScrollView } from 'react-native';
import { StreakCard } from '@/components/squad/StreakCard';
import { useStreakData } from '@/hooks/useStreakData';

// Inside SquadScreen — hoist the hook or let StreakCard own it and expose refetch
// Planner decision: simplest is to duplicate the hook call here for refetch access, OR
// pass refetch down via a ref from StreakCard. For simplicity I'd recommend hoisting
// the hook to squad.tsx and passing data down as props.

{activeTab === 'goals' && (
  <ScrollView
    contentContainerStyle={styles.goalsContent}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.interactive.accent} />}
  >
    <StreakCard {...streakData} />
  </ScrollView>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `shouldShowAlert: true` in foreground handler | `shouldShowBanner: true, shouldShowList: true` | Expo SDK 53 | `notifications-init.ts:12-17` already uses new shape — Phase 4 has no reason to revisit |
| Server cron + server-stored timezone for daily prompts | On-device `scheduleNotificationAsync({ repeats: true })` | Locked by v1.3 CONTEXT (MORN-02) | No `profiles.timezone` column needed for morning prompt |
| `Notifications.addListener` (v0.27) | `Notifications.addNotificationResponseReceivedListener` | Long-established in SDK | Already used in `_layout.tsx:186` |
| Materialized streak view + trigger rollup | Computed PL/pgSQL function | Locked by STREAK-07 + v1.3 scale | Zero maintenance surface |

**Deprecated/outdated:**
- Nothing from Phases 1-3 is deprecated; Phase 4 builds on the current patterns.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None** — Jest rejected project-wide per Phase 2 OVR-10 |
| Config file | none |
| Quick run command | `npx tsc --noEmit && npx expo lint` |
| Full suite command | `npx tsc --noEmit && npx expo lint && grep/find-based invariant checks listed below` |

Because the project has no test runner, Nyquist validation uses **deterministic invariant checks via grep, tsc, SQL exec, and manual review** rather than test code. Every phase requirement maps to one or more mechanical checks.

### Phase Requirements → Test Map

| Req ID | Behavior | Check Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MORN-01 | scheduleNotificationAsync with daily trigger | static grep | `grep -n "scheduleNotificationAsync" src/lib/morningPrompt.ts && grep -n "repeats: true" src/lib/morningPrompt.ts` | ❌ Wave 0 |
| MORN-01 | DEAD-at-tap-time enforcement | static grep | `grep -n "computeHeartbeatState" src/app/_layout.tsx` (verify inside morning_prompt branch) | ⚠️ file exists, branch new |
| MORN-02 | on-device, no server cron | negative grep | `! grep -rn "pg_cron.*morning_prompt" supabase/migrations/` + `! grep -rn "profiles.*morning_prompt" supabase/migrations/` | N/A |
| MORN-03 | Free/Busy/Maybe action ids | static grep | `grep -n "identifier: 'free'" src/lib/notifications-init.ts` (Phase 1 existing) + new handler branches on all three | ✅ Phase 1 |
| MORN-04 | Authenticated Supabase upsert in handler | static grep | `grep -n "supabase.from('statuses').upsert" src/app/_layout.tsx` within morning_prompt branch | ⚠️ exists for expiry |
| MORN-05 | 12h valid_until check from notification.date | static grep | `grep -n "response.notification.date" src/app/_layout.tsx` + `grep -n "12 \\* 60 \\* 60 \\* 1000" src/app/_layout.tsx` | ❌ new branch |
| MORN-06 | Skip-if-active (heartbeat !== 'dead' early return) | static grep | `grep -n "heartbeat !== 'dead'" src/app/_layout.tsx` | ❌ new branch |
| MORN-07 | Profile toggle AsyncStorage read/write | static grep | `grep -n "campfire:morning_prompt_enabled" src/app/(tabs)/profile.tsx` | ❌ Wave 0 |
| MORN-08 | DateTimePicker time-mode row | static grep | `grep -n "mode=\"time\"" src/app/(tabs)/profile.tsx` | ❌ Wave 0 |
| STREAK-01 | StreakCard replaces "Coming soon" | static grep | `grep -n "StreakCard" src/app/(tabs)/squad.tsx` + `! grep -n "Coming soon" src/app/(tabs)/squad.tsx` | ❌ Wave 0 |
| STREAK-02..06 | SQL function correctness | manual SQL exec | Seed test squad with known history → run `select * from get_squad_streak(uid, 'America/New_York')` → assert expected (current_weeks, best_weeks) | ❌ Wave 0 |
| STREAK-07 | Function exists, NOT materialized | SQL introspection | `select proname, prokind from pg_proc where proname='get_squad_streak'` returns `f` (function), not `m` (mat view) | ❌ Wave 0 |
| STREAK-08 | Copy review signed off | manual | Plan task body has non-engineer name + date filled in before VERIFICATION | ❌ Wave 0 |
| D-09 | SECURITY DEFINER + search_path hardening | SQL grep | `grep -n "security definer" supabase/migrations/0011_squad_streak_v1_3.sql` + `grep -n "set search_path = ''" ...` | ❌ Wave 0 |
| D-09 | Auth guard inside function | SQL grep | `grep -n "auth.uid() <> viewer_id" supabase/migrations/0011_squad_streak_v1_3.sql` | ❌ Wave 0 |
| D-24 | No stale valid_until in payload | negative grep | `! grep -n "valid_until" src/lib/morningPrompt.ts` | ❌ Wave 0 |
| D-33 | Sign-out cancels morning prompt | static grep | `grep -n "cancelMorningPrompt" src/hooks/useStatus.ts` (or wherever the auth subscriber lives) | ⚠️ exists for expiry |
| D-39 | notifications-init.ts not touched | git diff | `git diff main -- src/lib/notifications-init.ts` returns empty | ✅ Phase 1 |

### Phase 4 Testable Invariants (for Nyquist strategy)

These are the behavioral invariants the planner should turn into explicit VERIFICATION checks:

1. **12h guard semantic:** `(Date.now() - response.notification.date > 12*3600*1000) ⇒ no mutation`. Verified via code path: assert early return in the morning_prompt branch when `firedAt` is >12h ago. Manual QA: force-set system clock forward 13h and tap action button — should no-op.
2. **DEAD heartbeat no-op:** `computeHeartbeatState(...) !== 'dead' ⇒ no mutation`. Verified via grep: early return exists. Manual QA: set status to Free with 2h window, immediately fire morning_prompt action — status should NOT change.
3. **Week boundary math:** Plan scheduled for Sun 11:45pm viewer-local should be in week N; plan at Mon 12:15am should be in week N+1. Verified via SQL seed test with two known plans straddling midnight.
4. **Sliding 4-week miss counter:** Seed 12 weeks: [active, active, miss, active, active, miss, active, miss, miss, active, active, active]. Expected current_weeks walking backwards from end — at week 12, window = [miss, act, act, act], misses=1, streak OK, run counted. Planner should pick 3-4 fixture scenarios and document expected outputs.
5. **Grace semantics:** One isolated miss inside a 4-active-week window does NOT break the streak. Two consecutive misses DO break. Best is preserved across break.
6. **Best-N preservation:** Seed history with a 10-week run that breaks, then a 3-week run. Expected: `current_weeks=3, best_weeks=10`.

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit && npx expo lint` (< 30s)
- **Per wave merge:** All grep-based invariant checks above + `supabase db diff` (if available) for SQL migration integrity
- **Phase gate:** Full grep suite + SQL function seed-test output pasted into VERIFICATION.md + non-engineer copy approval pasted into the copy-review plan task

### Wave 0 Gaps

- [ ] No test framework install — **do not add one** (Phase 2 OVR-10). Validation is mechanical, not test-driven.
- [ ] Planner should author a minimal SQL seed fixture script for manual streak validation: `supabase/scripts/seed_streak_fixtures.sql` (optional) OR document the seed steps inline in the PLAN.md. This is the only Wave 0 artifact Phase 4 needs beyond the migration itself.
- [ ] Copy review task file (`04-XX-PLAN.md — Copy review`) must be authored as a BLOCKING plan task per D-20.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `expo-notifications` | morningPrompt scheduler + response handler | ✓ | ~55.0.13 | — |
| `@react-native-community/datetimepicker` | Profile time picker row | ✓ | 8.6.0 | — |
| `@react-native-async-storage/async-storage` | config keys | ✓ | 2.2.0 | — |
| `@supabase/supabase-js` | `supabase.rpc('get_squad_streak')` + upsert in handler | ✓ | ^2.99.2 | — |
| `zustand` | `useStatusStore.getState()` in handler | ✓ | ^5.0.12 | — |
| Supabase CLI (`supabase db push`) | Apply migration 0011 | Assume ✓ (used in Phases 2-3) | ^2.81.1 (devDep) | Manual SQL paste into Studio |
| Postgres `auth.uid()` | D-09 guard | ✓ | Supabase default | — |
| Postgres `date_trunc` + `AT TIME ZONE` | Week boundary math | ✓ | Postgres 15+ | — |
| Postgres `plan_members.rsvp_status = 'going'` enum | D-03 attendee count | ✓ | Schema `0001_init.sql:77-102` | — |
| EAS dev build on real iOS hardware | MORN-01..06 end-to-end validation | ✗ (no Apple Dev account) | — | Deferred to Phase 5 Hardware Verification Gate (documented project-wide deferral) |
| Expo Go | Local-only smoke of Profile UI | ✓ | — | Category actions / scheduled notifications may silently no-op — expected |

**Missing dependencies with no fallback:** None for code-complete. iOS hardware verification is the known deferred gate.

**Missing dependencies with fallback:** EAS dev build on real hardware — Phase 5 gate handles this per project-wide deferral policy in STATE.md.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth session — already in place; no changes |
| V3 Session Management | yes | Existing session; sign-out hook via `cancelMorningPrompt()` prevents ghost notifications on shared devices (D-33) |
| V4 Access Control | yes | `get_squad_streak` must guard on `auth.uid() = viewer_id` inside SECURITY DEFINER body (D-09) — this is the critical authz check; without it, any authenticated user could read any other user's streak |
| V5 Input Validation | partial | `tz` parameter is a free-form text — Postgres `AT TIME ZONE` raises an exception on invalid tz names. Accept the exception (function fails → client silently falls back to zero-state per D-17). No sanitization needed; Postgres handles it. |
| V6 Cryptography | no | No new crypto surface |
| V7 Error Handling & Logging | yes | All notification API calls try/catch-swallowed (Phase 1 D-19); streak hook logs warnings but never surfaces errors to user (D-17) |
| V9 Communication | no | No new network surface beyond existing Supabase client |
| V11 Business Logic | yes | Morning prompt tap-commit uses `rest_of_day` window + `null` context_tag per D-26 — same trust boundary as MoodPicker |

### Known Threat Patterns for Phase 4 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `tz` parameter | Tampering | Parameter is passed as typed text via `supabase.rpc(...)`; Postgres `AT TIME ZONE` validates. No string concatenation. |
| Cross-user streak read (IDOR) | Information Disclosure | D-09 explicit `auth.uid() <> viewer_id → raise` guard inside SECURITY DEFINER function |
| Ghost notifications on shared device after sign-out | Repudiation / Information Disclosure | D-33 `cancelMorningPrompt()` on sign-out |
| Silent notification-action spoofing (tap → mutate without user intent) | Tampering | MORN-04 runs inside authenticated app; iOS action identifiers come from OS, not network; no public Edge Function |
| Stale 12h action commits | Business Logic | D-24 tap-time guard |
| Notification permission downgrade surprise | Information Disclosure | D-30 revert-toggle-to-OFF on permission denial |
| RLS bypass via SECURITY DEFINER misuse | Elevation of Privilege | `search_path = ''` + fully-qualified table refs (`public.plans`, `public.plan_members`) + `auth.uid()` guard |
| `profiles.timezone` NULL → tz injection via client | Tampering | Not applicable — D-06 reads tz from device at query time, not from DB |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The plan-create modal at `src/app/plan-create.tsx` is the right tap target for D-14. | Pattern 5 / StreakCard | Low — visible via code grep; worst case `router.push('/plan-create')` raises, which is recoverable. **MITIGATION: verified via _layout.tsx:229-231 — no ambiguity.** |
| A2 | `iOS CalendarTriggerInput { hour, minute, repeats: true }` is the SDK 55 shape for daily repeating. | Pattern 1 | Low — [VERIFIED: docs.expo.dev/versions/v55.0.0/sdk/notifications via WebFetch]. If wrong, fallback is to use `DailyTriggerInput` or both. |
| A3 | `NotificationResponse.notification.date` is a `number` (Unix ms). | Pattern 2 / D-24 | Low — [VERIFIED: Expo SDK 55 type definitions via WebFetch quoted "number"]. If wrong, wrap in `new Date(...).getTime()` defensively. |
| A4 | `NotificationRequestInput.identifier` is honored by Expo SDK 55 for stable cancel-by-id with `repeats: true`. | Pattern 1 | Low — [VERIFIED: docs.expo.dev typings say "identifier(optional) string" on NotificationRequestInput; WebSearch confirmed community usage with daily repeats]. Fallback: persist the returned id to AsyncStorage like expiryScheduler does. |
| A5 | `Intl.DateTimeFormat().resolvedOptions().timeZone` works on Hermes iOS + Android with the existing UTC-fallback guard. | Pattern 5 | Low — [VERIFIED: src/hooks/useStatus.ts:44-52 already uses this exact pattern, shipped in Phase 3]. |
| A6 | Postgres `date_trunc('week', ts)` returns Monday 00:00 (ISO-8601). | Pattern 4 | Low — [CITED: PostgreSQL docs — `date_trunc` treats week as ISO-8601, Monday-start]. This is stable Postgres behavior. |
| A7 | `auth.uid()` is accessible inside a SECURITY DEFINER function with `search_path = ''` if the `auth` schema is explicitly qualified. | Pattern 4 | Medium — Supabase default is that `auth.uid()` resolves inside SECURITY DEFINER. Phase 2/3 triggers use this pattern. **If wrong, accept `viewer_id uuid` at the RPC boundary and trust the supabase RLS envelope — however D-09 explicitly wants the in-function guard.** Planner should verify during Wave 1 by querying `select auth.uid()` inside the function on first migration. |
| A8 | Mounting `PrePromptModal` from Profile screen with existing friend-free copy is acceptable for v1.3. | Pattern 3 / Pitfall 7 | Low — reuse mandate from D-38 + copy review gate catches any mismatch. |
| A9 | Opt-out default (`campfire:morning_prompt_enabled='true'` on first read) for existing v1.2→v1.3 upgrade users is intended behavior. | Runtime State Inventory | Low — [CITED: CONTEXT D-34 explicitly says "default: 'true' on first load, matching v1.3's opt-out-default posture for notification features"]. Surface in SUMMARY as behavior change. |
| A10 | The sliding-window implementation above (PL/pgSQL loop walking forward from oldest week) is correct for D-08 semantics. | Pattern 4 | Medium — this is my best reading of D-08. The spec is clear on rules but multiple valid algorithms exist. **Planner should add seed fixture tests verifying at least scenarios (4): all-active, single-grace-preserved, two-consecutive-break, isolated-break-then-restart.** |

## Open Questions

1. **PrePromptModal body copy for morning-prompt-ON path**
   - What we know: PrePromptModal is reused per D-38; current body is friend-free framed.
   - What's unclear: Whether to parameterize for context-specific copy (refactor) or accept for v1.3 (ship).
   - Recommendation: Accept for v1.3; add to copy review task as a noted mismatch; parameterization is a trivial follow-up for v1.4.

2. **Seed fixture format for SQL function testing**
   - What we know: No test framework; manual SQL exec is the validation path.
   - What's unclear: Whether to author a `supabase/scripts/seed_streak_fixtures.sql` file or inline the seed steps in PLAN.md.
   - Recommendation: Inline in PLAN.md — the validation is one-shot during VERIFICATION, not repeated.

3. **Pull-to-refresh vs focus-refetch for StreakCard**
   - What we know: D-18 requires pull-to-refresh; `useFocusEffect` vs `useEffect` is Claude's discretion.
   - What's unclear: Whether first-render refetch + pull-to-refresh is enough, or whether focus-refetch should fire every time the Goals tab is selected.
   - Recommendation: First-render + pull-to-refresh for v1.3 (matches minimalism); focus-refetch if the non-engineer reviewer complains about stale numbers.

4. **StreakCardSkeleton dimensions**
   - What we know: D-16 — minimal placeholder.
   - What's unclear: Exact skeleton pattern (no prior skeleton primitive exists in the repo).
   - Recommendation: Three grey rectangles (big number box, label box, subline box) with `COLORS.surface.card` background — match StreakCard layout with opacity 0.3.

## Sources

### Primary (HIGH confidence)
- `package.json` — verified all dep versions and that zero new deps are needed [VERIFIED]
- `src/app/_layout.tsx` — verified response dispatcher shape, import list, existing expiry_warning branch as template [VERIFIED]
- `src/app/(tabs)/_layout.tsx` — verified existing useEffect location for OVR-04 extension [VERIFIED]
- `src/app/(tabs)/profile.tsx` — verified Switch pattern at lines 223-237 and sign-out call-site at line 115 [VERIFIED]
- `src/app/(tabs)/squad.tsx` — verified goalsContent branch at lines 37-41 for replacement [VERIFIED]
- `src/app/plan-create.tsx` + `src/app/_layout.tsx:229-231` — verified plan-create route exists at root `/plan-create` [VERIFIED]
- `src/lib/expiryScheduler.ts` — structural template for morningPrompt.ts [VERIFIED]
- `src/lib/notifications-init.ts:23-29, 63-67` — verified Phase 1 category + channel registration [VERIFIED]
- `src/hooks/useStatus.ts:24-35, 44-52` — verified auth subscriber pattern for D-33 hook + Hermes UTC fallback for D-06 [VERIFIED]
- `src/screens/plans/PlanCreateModal.tsx:15, 90, 187-196` — verified in-repo DateTimePicker usage pattern [VERIFIED]
- `supabase/migrations/0001_init.sql` + glob output — verified schema (plans, plan_members, rsvp_status enum) and that migration 0011 is next [VERIFIED]
- `docs.expo.dev/versions/v55.0.0/sdk/notifications/` — verified `NotificationRequestInput.identifier`, `DailyTriggerInput`/`CalendarTriggerInput` shape, `NotificationResponse.notification.date: number` [CITED: https://docs.expo.dev/versions/v55.0.0/sdk/notifications/]

### Secondary (MEDIUM confidence)
- WebSearch: Expo SDK 55 daily trigger + identifier usage confirmed via community + GitHub issue references [CITED: github.com/expo/expo issues #30577, #34782]

### Tertiary (LOW confidence)
- None — every claim in this research has either codebase or docs.expo.dev grounding.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already installed and already used elsewhere in the repo
- Architecture: HIGH — Phase 4 is a composition of existing Phase 1/2/3 patterns, each with an in-repo template
- Pitfalls: HIGH — five of seven are empirically observed from Phase 2/3 CONTEXT learnings
- SQL function shape: MEDIUM — D-08 is a spec, the implementation above is one valid interpretation; seed fixture tests during VERIFICATION are mandatory
- Expo SDK 55 notification API details: HIGH — verified via docs.expo.dev
- DateTimePicker shape: HIGH — already used in-repo at `src/screens/plans/PlanCreateModal.tsx`
- Plan-create route: HIGH — verified via grep + `_layout.tsx:229-231`
- Sign-out call-site: HIGH — verified via grep (single hit in src/app/(tabs)/profile.tsx:115; the useStatus.ts module-scope auth subscriber is the cleanest hook point)
- Streak copy: N/A — D-20 non-engineer review is the final gate; research cannot pre-validate

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — Expo SDK 55 API surface is stable; codebase refs will age only if Phase 1-3 files are refactored)
