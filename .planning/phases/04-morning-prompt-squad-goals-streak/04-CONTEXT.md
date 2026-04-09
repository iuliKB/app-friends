# Phase 4: Morning Prompt + Squad Goals Streak - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Two surfaces in one phase:

1. **Morning Prompt** — On-device scheduled daily local notification (default 9:00am local) with Free / Busy / Maybe action buttons. Tap fires `useStatus.setStatus` via the existing authenticated Supabase session (no public endpoint). Skip-if-active honored via tap-time DEAD-heartbeat check + 12h `valid_until` payload guard.

2. **Squad Goals Streak** — Replaces the "Coming soon" stub on the Goals tab (`src/app/(tabs)/squad.tsx:37-41`) with a `StreakCard` showing current weekly streak + "Best: N weeks". Computed by a new `get_squad_streak(tz)` SQL function (computed view, NOT materialized) — no new `squads` entity, since none exists in schema. "Squad" = the viewer's friend circle.

**In scope:**
- New Profile row "Morning prompt time" opening `@react-native-community/datetimepicker` (already installed) + new Profile "Morning prompt" Switch toggle, alongside existing "Friend availability" and "Plan invites" toggles
- AsyncStorage-backed config: `campfire:morning_prompt_enabled` (bool, default true), `campfire:morning_prompt_hour` (int, default 9), `campfire:morning_prompt_minute` (int, default 0)
- Cold-launch-after-auth schedule path + schedule-on-settings-change path in a new `src/lib/morningPrompt.ts` scheduler module (mirroring `src/lib/expiryScheduler.ts`)
- Response-handler branch in `src/app/_layout.tsx` `handleNotificationResponse` for `categoryIdentifier === 'morning_prompt'` — checks `valid_until`, runs `computeHeartbeatState`, no-ops if ALIVE/FADING, else calls `useStatus.setStatus(mood, null, 'rest_of_day')`
- Migration `0011_squad_streak_v1_3.sql` defining `get_squad_streak(viewer_id uuid, tz text) RETURNS TABLE(current_weeks int, best_weeks int)` — SECURITY DEFINER, RLS-safe, sliding 4-week miss counter
- New `src/components/squad/StreakCard.tsx` — minimal hero card (big number, week streak label, 🔥 emoji, "Best: N weeks" subline)
- Goals tab rework in `src/app/(tabs)/squad.tsx`: replace `goalsContent` branch with `<StreakCard />` + pull-to-refresh + loading skeleton; tap routes to plan-create
- Copy review checklist task in the plan: every user-facing string (prompt title, action button labels, StreakCard copy, zero-state copy) reviewed by a non-engineer and approval pasted into the plan before VERIFICATION unblocks
- Expo Go / EAS guard: try/catch swallow on `scheduleNotificationAsync` calls matching Phase 1 D-19 category-registration pattern
- Re-trigger of Phase 1 `PrePromptModal` + OS permission flow when toggling Morning prompt ON without notification permission; revert toggle to OFF on decline

**Out of scope (other phases / deferred):**
- New `squads` table / squad entity → not needed for v1.3, "squad" = viewer's friend circle
- `profiles.morning_prompt_time` column → AsyncStorage only; device-local per MORN-02 spirit
- `profiles.notify_morning_prompt` column → AsyncStorage only
- Grace-week counter surfaced to the user → v1.4 (STRK-01 already deferred)
- Background action dispatch (tap without launching app) → v1.4 (LOCK-01 spec)
- Streak detail screen → not needed; StreakCard is the whole surface
- Automated copy review tooling → manual review only
- Hardware smoke tests for notification delivery → Phase 5 Hardware Verification Gate
- Test framework (Jest) → still rejected project-wide (Phase 2 OVR-10)

</domain>

<decisions>
## Implementation Decisions

### Squad Scope (the biggest unlock)

- **D-01:** **"Squad" = the viewer's friend circle.** There is no `squads` table in v1.3 (verified: schema only has `plans` + `plan_members` with `rsvp_status` enum `'invited' | 'going' | 'maybe' | 'out'`). The streak is per-viewer, computed from plans the viewer participated in. The roadmap line 204 ambiguity ("squad creator's timezone") is resolved: there is no squad creator.

- **D-02:** **Streak scope = plans where viewer is `plans.created_by` OR viewer is in `plan_members` with any rsvp.** This captures "plans the viewer was part of" (creator or invitee), filtering out plans between friends the viewer wasn't included in. Voyeur-mode (counting plans you weren't invited to) is explicitly rejected.

- **D-03:** **A week is active if ≥1 plan meets all of:** (a) `plans.scheduled_for < now()` at query time (the plan has "happened"), (b) `plans.scheduled_for` falls within the week's Mon 00:00 → Sun 23:59 window in the viewer's tz, (c) the plan has ≥2 `plan_members` with `rsvp = 'going'`, (d) per D-02, viewer is creator or a plan_member (any rsvp). Plans with `scheduled_for IS NULL` are excluded (no way to place them in a week).

- **D-04:** **The viewer counts toward the ≥2 attendee threshold.** A plan with viewer + 1 friend both `rsvp='going'` is a valid week. Matches the literal "≥2 confirmed attendees" reading and makes friend-pair hangs count. Solo plans (only viewer going) do NOT count.

### Streak SQL Shape

- **D-05:** **`get_squad_streak(viewer_id uuid, tz text) RETURNS TABLE(current_weeks int, best_weeks int)`** — one PL/pgSQL (or SQL) function, computed at query time. NOT materialized (per STREAK-07). No supporting tables. Caller passes `viewer_id` (for RLS alignment) + IANA tz string (for week boundary math via `AT TIME ZONE`).

- **D-06:** **Timezone source = viewer's device timezone at query time**, read via `Intl.DateTimeFormat().resolvedOptions().timeZone` on the client and passed to the function. Does NOT read `profiles.timezone` (Phase 3 column) — that column may be NULL for legacy users and is coupled to notify-friend-free quiet-hours semantics. Device tz at query time keeps the streak display consistent with "what week it is" from the viewer's perspective even while traveling.

- **D-07:** **Best-N is computed, not stored.** The function scans all historical weeks (from the viewer's oldest `plan_members.joined_at` or `plans.created_at`, whichever is earlier), evaluates each for "active" per D-03, and returns both the current run length and the all-time max. No new column, no new table, no trigger-maintained counter. At v1.3 scale (3–15 friend squads, tens to low-hundreds of plans per viewer) this is trivially fast.

- **D-08:** **Grace + break rule = sliding 4-week miss counter.** Walk backwards week-by-week from the current week. For each week, check active (per D-03). Maintain a rolling 4-week miss counter (misses in the last 4 weeks including current). Streak continues as long as misses_in_window ≤ 1. Streak breaks (counter reset) at the week where `misses_in_window >= 2` (two consecutive misses within a 4-week window). Planner may pick between `generate_series` + `LATERAL JOIN`, a recursive CTE, or a PL/pgSQL loop — whichever is clearest — but the semantic rule is locked.

- **D-09:** **Function is `SECURITY DEFINER` with hardened `search_path = ""`** matching the Phase 2 trigger hardening pattern. RLS: callable by any authenticated user for their own `viewer_id` only (enforce via `auth.uid() = viewer_id` check at the top of the function). No RLS on the underlying read because SECURITY DEFINER runs as function-owner; the auth guard inside prevents abuse.

- **D-10:** **No FADING/ALIVE/DEAD filtering on plans.** Heartbeat is for status freshness, not plan history. Streak counts completed plans regardless of the attendees' current heartbeat state.

### StreakCard UI

- **D-11:** **New component `src/components/squad/StreakCard.tsx`.** Single-component surface — no sub-components needed. Consumes `useStreakData` hook (new) that wraps the RPC call.

- **D-12:** **Layout = minimal hero card.** One centered card using existing `COLORS.surface.card`, `RADII.lg`, `SPACING.xl` tokens. Contents (top to bottom):
  - Large number (fontSize: existing display token, bold) — `{current_weeks}`
  - Label "week streak" (smaller, muted)
  - 🔥 emoji (large, decorative only, accessible label "on fire")
  - Subtle divider
  - "Best: N weeks" subline (muted, smaller)
  - No "weeks until break", no grace counter, no recent-week dot strip, no countdown.

- **D-13:** **Zero-state (streak = 0, or no plans yet)** shows the same card layout with `0` rendered in muted color and the subline replaced by: **"Start your first week — make a plan with friends."** The 🔥 emoji is replaced by a neutral ✨ or simply omitted (planner's discretion). Goals tab is never empty.

- **D-14:** **Tapping the StreakCard opens plan-create.** Routes to the Explore tab's plan creation flow (existing route). Captures the "streak is a call to action" framing. Implementation: `onPress` on the card wrapper → `router.push('/(tabs)/explore/plan-create')` or whatever the established plan-create route is (planner verifies).

- **D-15:** **Grace-week tracking is never surfaced to the user.** STREAK-08 positive-only + STRK-01 deferral stand. Streak simply doesn't break when a grace is used; the user sees continuous count. No "1 grace available" text, no countdown indicator, no warning.

- **D-16:** **Loading state = skeleton card matching the minimal hero layout** (muted rectangles where the number / label / subline go). Reuses whatever skeleton pattern exists in the codebase; planner creates a minimal inline skeleton if none exists.

- **D-17:** **Error state = silent fallback to zero-state hero.** If `get_squad_streak` errors, log to console and render the zero-state card. Do not surface a "failed to load" toast — feels punishing for a celebration surface.

- **D-18:** **Pull-to-refresh enabled on the Goals tab.** Reuses the app-wide pull-to-refresh pattern from v1.1. Refresh re-runs the RPC. Matches STREAK-01's "shows the current weekly streak count" — users expect freshness.

### StreakCard Copy (TBD-review gate)

- **D-19:** **All user-facing strings in one place.** Defined inline in `StreakCard.tsx` for v1.3 (don't create a new file for six strings). Strings subject to non-engineer review:
  - `"{N} week streak"` — main label
  - `"Best: {N} weeks"` — subline
  - `"Start your first week — make a plan with friends."` — zero-state subline
  - Any pull-to-refresh spinner label (usually none)
  - Goals tab empty state if it ever renders during loading

- **D-20:** **Copy review gate = blocking plan task.** Phase 4 plans include a dedicated task (`04-XX-PLAN.md — Copy review`) that blocks VERIFICATION. The task body lists every user-facing string from D-19 + D-23 + D-24 + D-25 and has an explicit "Non-engineer approval" field that must be filled in (either pasted approval text or a name + date) before the plan can be marked complete. No external tooling.

### Morning Prompt Scheduling

- **D-21:** **New module `src/lib/morningPrompt.ts`** mirroring `src/lib/expiryScheduler.ts` structure. Exports:
  - `scheduleMorningPrompt(hour: number, minute: number): Promise<void>` — cancels previous via stable identifier, then `scheduleNotificationAsync({ content: {...}, trigger: { hour, minute, repeats: true } })` with `identifier: 'campfire:morning_prompt'`
  - `cancelMorningPrompt(): Promise<void>` — cancels the stable identifier
  - `ensureMorningPromptScheduled(): Promise<void>` — reads AsyncStorage, if enabled then schedules with stored hour/minute, else cancels. Called on cold launch after auth + on every settings change.
  - All functions wrapped in try/catch that swallows Expo Go errors (matches `notifications-init.ts` pattern)

- **D-22:** **Schedule trigger points** (per D-21's `ensureMorningPromptScheduled`):
  1. Cold launch after auth confirmed — inside the existing `useEffect` in `src/app/(tabs)/_layout.tsx:28-50` (per Phase 2 OVR-04 single-listener rule — extend, don't add)
  2. Profile toggle flip (ON) — also triggers PrePromptModal flow if permission not granted (D-30)
  3. Profile toggle flip (OFF) — calls `cancelMorningPrompt`
  4. Profile morning-prompt-time change — calls `ensureMorningPromptScheduled` after writing new hour/minute to AsyncStorage
  5. Sign-out — calls `cancelMorningPrompt` before session clear (prevents ghost notifications after logout on shared devices)

- **D-23:** **Notification content payload**:
  - `title`: "☀️ What's your status today?"
  - `body`: "" (empty — title is enough)
  - `categoryIdentifier`: `'morning_prompt'` (already registered in `src/lib/notifications-init.ts`)
  - `channelId`: `'morning_prompt'` (already registered Android channel)
  - `data`: `{ kind: 'morning_prompt', valid_until: <ISO string, schedule_time + 12h> }`
  - Note: `valid_until` is set **per-fire** at schedule time, but since the notification repeats daily, this needs rework. See D-24.

- **D-24:** **`valid_until` guard implementation — refined.** Because `scheduleNotificationAsync` with `repeats: true` reuses the same static payload, a `valid_until` field set at schedule time would become stale after day 1. Instead:
  - At tap time, the response handler computes `valid_until = notification.date + 12h` from the notification's delivery timestamp (`response.notification.date`), not from the payload
  - If `now > valid_until`, silently no-op
  - Payload still carries `{ kind: 'morning_prompt' }` for routing, but no `valid_until` string (derived at handler time)
  - MORN-05 is satisfied: "a tap more than 12h after the prompt fired no-ops gracefully"

### Morning Prompt Response Handler

- **D-25:** **New branch in `src/app/_layout.tsx` `handleNotificationResponse`** (lines 21-125), after the existing `expiry_warning` branch:
  ```typescript
  if (category === 'morning_prompt') {
    // 1. 12h validity check (D-24)
    const firedAt = response.notification.date; // Unix ms
    if (Date.now() - firedAt > 12 * 60 * 60 * 1000) return;
    // 2. DEAD heartbeat check (MORN-01/06)
    const current = useStatusStore.getState().currentStatus;
    const heartbeat = current
      ? computeHeartbeatState(current.status_expires_at, current.last_active_at)
      : 'dead';
    if (heartbeat !== 'dead') return; // already active — no-op
    // 3. Resolve mood from action id
    const mood = action === 'free' ? 'free' : action === 'busy' ? 'busy' : action === 'maybe' ? 'maybe' : null;
    if (!mood) return; // body-tap — just open app, no status change
    // 4. Commit via existing authenticated session
    const now = new Date();
    const expiry = computeWindowExpiry('rest_of_day', now);
    // upsert statuses row (same pattern as expiry_warning handler)
    // update useStatusStore on success
  }
  ```
  Planner refines the exact code; the flow is locked.

- **D-26:** **Tap-commits use `window_id='rest_of_day'`, `context_tag=null`.** Matches the "morning = set the day's status" intent. User can refine window/tag via MoodPicker once the app opens. Three taps to set a nuanced status defeats the one-tap push point.

- **D-27:** **Body tap (no action button) on morning_prompt opens Home.** Does NOT auto-commit anything. User sees MoodPicker ready to go. Matches the expiry_warning body-tap handling (D-05/line 59-66 of _layout.tsx).

- **D-28:** **`useStatusStore` is updated optimistically after successful upsert** (same pattern as expiry_warning KEEP_IT/HEADS_DOWN branches). Failure → silent log, no toast (user will discover via Home when they open the app).

### Profile UI — Time Picker + Toggle

- **D-29:** **New Profile section "Morning prompt"** added after the existing "Notifications" section (which currently holds "Plan invites" and "Friend availability" toggles). Two rows:
  1. Switch row "Morning prompt" — same visual pattern as `notify_friend_free` Switch (src/app/(tabs)/profile.tsx:54, 105)
  2. Tap row "Time" showing the current time (e.g., "9:00 AM") with chevron → opens `@react-native-community/datetimepicker` in time mode
  - Second row is disabled/muted when the Switch is OFF

- **D-30:** **Permission flow when toggling ON without notification permission:**
  1. User flips Switch ON
  2. Check `Notifications.getPermissionsAsync()`
  3. If `granted`: proceed to `ensureMorningPromptScheduled`
  4. If `undetermined`: mount Phase 1's `PrePromptModal` (from `src/components/notifications/PrePromptModal.tsx`); on confirm → `requestPermissionsAsync`; on grant → schedule; on deny → revert Switch to OFF, show brief inline text "Enable notifications in Settings to receive morning prompts."
  5. If `denied`: show the same inline text, revert Switch to OFF (don't try to re-prompt — iOS won't show the modal again anyway)

- **D-31:** **Time picker modal behavior:**
  - iOS: use `display="spinner"` inside a modal (existing pattern for iOS time pickers) or `display="default"` which shows inline — planner picks based on current codebase conventions
  - Android: use default which fires the native dialog
  - On change → write `campfire:morning_prompt_hour` + `campfire:morning_prompt_minute` to AsyncStorage, then call `ensureMorningPromptScheduled`
  - Display format in the row label: locale-aware (`toLocaleTimeString` with hour/minute only)

- **D-32:** **Default time = 9:00 AM local.** Hour = 9, minute = 0. Written to AsyncStorage lazily on first successful schedule (or on first Profile-row render, whichever is easier — planner picks).

- **D-33:** **Sign-out behavior:** on sign-out, call `cancelMorningPrompt()` before clearing the session. Prevents ghost notifications on shared/family devices after logout. Matches the spirit of Phase 1 D-23 token deletion on disable.

### Storage

- **D-34:** **AsyncStorage keys** (new, all prefixed `campfire:` per convention):
  - `campfire:morning_prompt_enabled` — `'true' | 'false'` string (default: `'true'` on first load, matching v1.3's opt-out-default posture for notification features)
  - `campfire:morning_prompt_hour` — `'0'`..`'23'` string (default: `'9'`)
  - `campfire:morning_prompt_minute` — `'0'`..`'59'` string (default: `'0'`)
- **D-35:** **No server-side `profiles.notify_morning_prompt` column, no `profiles.morning_prompt_time` column.** Device-local per MORN-02 spirit. Cross-device sync is not a v1.3 requirement and adds migration surface.

### Integration with Phase 2 Heartbeat + Phase 3 Infra

- **D-36:** **Reuse `computeHeartbeatState` from `src/lib/heartbeat.ts`** (Phase 2, OVR-01) in the response handler DEAD check. No new heartbeat logic.
- **D-37:** **Reuse `useStatusStore` + `computeWindowExpiry`** from Phase 2/3 for the commit path. Do not create a parallel status-write path.
- **D-38:** **Reuse `PrePromptModal` from Phase 1** for the permission flow. Do not create a new modal.
- **D-39:** **Reuse the existing `morning_prompt` iOS category + Android channel** (Phase 1, `src/lib/notifications-init.ts` lines 23-29, 63-67). Phase 4 only wires the handler and the scheduler; it does NOT touch notifications-init.ts.

### Claude's Discretion

- Exact `StreakCard` padding, number font size, emoji size — use design tokens, match Home card aesthetic
- Skeleton card pixel structure — minimal 3-rectangle placeholder is fine
- Whether the SQL function uses `generate_series`, a recursive CTE, or a PL/pgSQL loop for the sliding window — D-08 locks semantics, not implementation
- Whether the time picker row shows the time via `toLocaleTimeString` or a custom formatter
- Specific copy wording for the zero state (within STREAK-08 constraints) — non-engineer review is the final gate
- Whether to memoize `useStreakData` results or refetch on every focus
- Plan-create route name (`router.push` target for StreakCard tap) — planner verifies from `src/app/(tabs)/explore/` structure
- Sign-out call-site — wherever the session is currently cleared (planner finds)

### Folded Todos

None — `gsd-tools todo match-phase 4` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 source-of-truth
- `.planning/REQUIREMENTS.md` §Morning Status Prompt (MORN-01..08) + §Squad Goals (STREAK-01..08) — authoritative acceptance criteria
- `.planning/ROADMAP.md` §Phase 4 — goal + success criteria + the line-204 planner note flagging the "squad creator's timezone" ambiguity resolved in D-06
- `.planning/PROJECT.md` — v1.3 milestone constraints (zero new deps, Expo Go / EAS, no backend server, Supabase RLS)

### Cross-phase dependencies (MUST read)
- `.planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md` — D-19 (notifications-init.ts swallow pattern for Expo Go), D-20 (iOS `morning_prompt` category registered at module scope), D-23 (toggle-off cancels), PrePromptModal pattern (`src/components/notifications/PrePromptModal.tsx`)
- `.planning/phases/02-status-liveness-ttl/02-CONTEXT.md` — OVR-01 (`src/lib/` not `src/utils/`), OVR-04 (extend single AppState/auth useEffect in `(tabs)/_layout.tsx`, do NOT add a second listener), D-13..D-15 (heartbeat logic), D-37 (Phase 4 imports `computeHeartbeatState`)
- `.planning/phases/03-friend-went-free-loop/03-CONTEXT.md` — D-01..D-06 (self-notification + foreground handler pattern, reference for morning_prompt handler), D-20 (Profile toggle pattern using `notify_friend_free` boolean — Phase 4 uses AsyncStorage instead per D-35 but the UI row pattern is identical)

### Code references (MUST read before implementing)
- `src/lib/notifications-init.ts` lines 23-29 — existing `morning_prompt` iOS category (Free/Busy/Maybe action identifiers)
- `src/lib/notifications-init.ts` lines 63-67 — existing `morning_prompt` Android channel
- `src/lib/expiryScheduler.ts` — reference pattern for `src/lib/morningPrompt.ts` (cancel + reschedule + try/catch swallow)
- `src/lib/heartbeat.ts` — `computeHeartbeatState(expires_at, last_active_at)` — reused in D-25
- `src/lib/windows.ts` — `computeWindowExpiry('rest_of_day', now)` — reused in D-25
- `src/app/_layout.tsx` lines 21-125 — `handleNotificationResponse` — Phase 4 adds a `morning_prompt` branch after the existing `expiry_warning` branch
- `src/app/(tabs)/_layout.tsx` lines 28-50 — existing auth + AppState useEffect; Phase 4 extends for cold-launch schedule (OVR-04 single-listener rule)
- `src/app/(tabs)/profile.tsx` lines 39-135 — existing toggle + Switch pattern; Phase 4 adds Morning prompt section after Notifications section
- `src/app/(tabs)/squad.tsx` lines 37-41 — existing "Coming soon" Goals content to replace with `<StreakCard />`
- `src/components/notifications/PrePromptModal.tsx` — Phase 1 pre-prompt reused in D-30
- `src/stores/useStatusStore.ts` — `currentStatus` read + `setCurrentStatus` write — used in D-25 response handler
- `src/hooks/useStatus.ts` (Phase 2) — `setStatus` path for commits
- `supabase/migrations/0001_init.sql` lines 17, 77-102 — `plans` + `plan_members` + `rsvp_status` enum definitions used by D-02/D-03
- `supabase/migrations/0010_friend_went_free_v1_3.sql` — last applied migration; Phase 4 migration is `0011_squad_streak_v1_3.sql`

### Plan-phase research items
- Verify `@react-native-community/datetimepicker` is installed and its API shape for time-mode on iOS + Android (mentioned in Phase 2 scout notes)
- Confirm plan-create route path for StreakCard tap target (under `src/app/(tabs)/explore/` or `src/app/plans/`)
- Verify whether `Notifications.scheduleNotificationAsync` `identifier` parameter works with `repeats:true` in Expo SDK 55 (needed for stable cancel path in D-21)
- Verify `response.notification.date` shape (Unix ms? ISO string? Date object?) for D-24 valid_until derivation
- Confirm the current sign-out call-site (useAuthStore action? direct supabase.auth.signOut call?) so D-33 can hook in cleanly

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/notifications-init.ts`** — iOS `morning_prompt` category (Free/Busy/Maybe action identifiers `free`/`busy`/`maybe`) and Android `morning_prompt` channel already registered at module scope (Phase 1). Phase 4 does not touch this file — only consumes the category/channel.
- **`src/lib/expiryScheduler.ts`** — structural reference for the new `src/lib/morningPrompt.ts` (cancel-then-reschedule pattern with stable identifier + try/catch swallow).
- **`src/lib/heartbeat.ts`** (`computeHeartbeatState`) — Phase 2 utility, reused for DEAD check in response handler.
- **`src/lib/windows.ts`** (`computeWindowExpiry`) — Phase 2 utility, reused for rest-of-day expiry at tap time.
- **`src/stores/useStatusStore.ts`** — Zustand status store, single source of truth for `currentStatus` reads/writes during tap handling.
- **`src/components/notifications/PrePromptModal.tsx`** — Phase 1 pre-prompt pattern, reused when toggling morning prompt ON without notification permission.
- **Existing Profile toggle pattern** — `notify_friend_free` Switch at `src/app/(tabs)/profile.tsx:54, 105` is the visual + wiring template for the new Morning prompt Switch (though storage is AsyncStorage, not profiles column).
- **`@react-native-community/datetimepicker`** — already installed per Phase 2 scout; v1.3 compliant (zero new deps).
- **`plans` + `plan_members` + `rsvp_status` enum** — all pre-existing from v1.0; no schema changes needed to count weeks.
- **Pull-to-refresh pattern** — standardized across list views in v1.1; reusable for Goals tab.

### Established Patterns
- **`src/lib/` convention** (Phase 2 OVR-01) — new utility files land here, not `src/utils/`.
- **Single-effect rule** (Phase 2 OVR-04) — cold-launch schedule extends the existing auth+AppState `useEffect` in `src/app/(tabs)/_layout.tsx`; do NOT add a parallel listener.
- **Notification response handler dispatch** (`src/app/_layout.tsx` lines 21-125) — all categories handled in one function with `if (category === 'x')` branches; Phase 4 adds a `morning_prompt` branch after `expiry_warning`.
- **Try/catch swallow on notification API calls** (Phase 1 D-19) — `setNotificationCategoryAsync`, `scheduleNotificationAsync` etc. wrapped in try/catch to tolerate Expo Go limitations.
- **AsyncStorage keys prefixed `campfire:`** (Phase 1 D-06) — e.g., `campfire:notifications_enabled`; Phase 4 adds `campfire:morning_prompt_*`.
- **SECURITY DEFINER functions with `search_path = ''`** (Phase 2 T-02-09 + Phase 3 D-08) — hardening pattern for the new `get_squad_streak` function.
- **Zustand stores for cross-screen state** (Phase 2 OVR-02) — no React Query anywhere; `useStreakData` should be a plain hook + Supabase call, not a TanStack Query.
- **Migration numbering** — next is `0011_squad_streak_v1_3.sql`.
- **Zero new npm deps** — project-wide rule; every library Phase 4 needs is already installed.
- **ESLint `campfire/no-hardcoded-styles`** — all StreakCard styling via `@/theme` tokens; no raw hex / fontSize / padding.
- **FlatList rule** — not applicable here (StreakCard is a single card, not a list), but keep in mind if the card ever grows a list of recent weeks in v1.4.

### Integration Points
- **`src/app/_layout.tsx`** — add `morning_prompt` branch to `handleNotificationResponse` after `expiry_warning` (line ~124)
- **`src/app/(tabs)/_layout.tsx`** — extend existing auth/AppState `useEffect` to call `ensureMorningPromptScheduled()` (Phase 2 OVR-04 single-listener)
- **`src/app/(tabs)/profile.tsx`** — add new Morning prompt Section (Switch + time picker row) after the existing Notifications section
- **`src/app/(tabs)/squad.tsx`** — replace the "Coming soon" `goalsContent` branch (lines 37-41) with `<StreakCard />` + pull-to-refresh
- **`src/lib/morningPrompt.ts`** — NEW (scheduler module)
- **`src/components/squad/StreakCard.tsx`** — NEW (hero card component)
- **`src/hooks/useStreakData.ts`** — NEW (wraps the `get_squad_streak` RPC, returns `{ current_weeks, best_weeks, loading, error, refetch }`)
- **`supabase/migrations/0011_squad_streak_v1_3.sql`** — NEW (`get_squad_streak` function + grant execute to authenticated)
- **`src/stores/useAuthStore.ts`** (or wherever sign-out lives) — add `cancelMorningPrompt()` call before session clear per D-33

### Notable Findings
- **No `squads` table exists.** Schema only has `profiles`, `friendships`, `plans`, `plan_members`, `statuses`, `status_history`, `free_transitions`, `friend_free_pushes`, `dm_channels`, `messages`, `push_tokens`. Phase 4 does NOT create a `squads` table.
- **`morning_prompt` iOS category already wired** (Phase 1) — action identifiers are `free`, `busy`, `maybe` (lowercase). The response handler must use these exact strings.
- **`morning_prompt` Android channel exists at DEFAULT importance** — no Phase 4 channel work needed.
- **No existing time-picker UI in the codebase** — Profile only has Switch rows. Phase 4 introduces the first time-picker row; `@react-native-community/datetimepicker` is installed but unused.
- **No existing `useStreakData` / `useSquadStreak` hook** — this is net-new.
- **No existing `/plans/create` or plan-create route discovered during scout** — planner must verify the actual route path before wiring D-14 tap action.
- **Phase 2 + 3 infrastructure is strong** — heartbeat utility, status store, window utility, notification category registration, response dispatcher pattern, Profile toggle pattern all already exist. Phase 4 is mostly wiring + one new SQL function + two new UI components.

</code_context>

<specifics>
## Specific Ideas

- **"The squad is the viewer's friend circle"** — the framing that dissolved the "no squad entity" ambiguity. Per-viewer streak, computed on demand, no new entities.
- **"Best-N is computed, not stored"** — D-07 — avoids any write path, trigger, or reconciliation logic. At v1.3 scale the function walks at most a few hundred weeks per call.
- **"Grace is silent"** — D-15 — the streak simply doesn't break on a grace week. The user never sees a "1 grace left" counter. Positive-only copy (STREAK-08) is the overriding principle.
- **"Tap the card → plan-create"** — D-14 — turns the celebration surface into a soft CTA without any countdown UI.
- **"Morning prompt = rest-of-day + no tag"** — D-26 — preserves one-tap ergonomics. Nuance happens in MoodPicker when the app opens.
- **"Tap handler computes valid_until from `response.notification.date`, not the payload"** — D-24 — the crucial insight that lets `repeats: true` work while honoring MORN-05's 12h graceful no-op rule without stale payload data.
- **"Sign-out cancels the schedule"** — D-33 — belt-and-suspenders against ghost notifications on shared devices, matching the spirit of Phase 1 D-23 token deletion.
- **"Copy review is a blocking plan task"** — D-20 — STREAK-08's non-engineer review mandate is enforced by a literal plan task that blocks VERIFICATION, not by tooling or process.

</specifics>

<deferred>
## Deferred Ideas

- **`squads` table / shared squad entity** — not needed for v1.3 streak. If v1.4 introduces group chats or shared goals, the streak can be re-scoped at that time.
- **Grace-week counter surfaced to user** (STRK-01) — already deferred to v1.4 in REQUIREMENTS.md. Phase 4 hides grace entirely.
- **Background action dispatch** (tap notification action without launching app) — v1.4 (LOCK-01). Requires signed Edge Function payloads. v1.3 keeps the authenticated-foreground pattern.
- **Cross-device sync of morning prompt time / toggle** (`profiles.notify_morning_prompt`, `profiles.morning_prompt_time`) — AsyncStorage-only for v1.3. Revisit if multi-device becomes a reported pain point.
- **Recent-week strip visualization on StreakCard** — considered, rejected for violating STREAK-08 "no countdown / no about-to-lose-it UI".
- **Plan-create CTA button on zero state** — considered. D-14 already makes the card tappable to plan-create; a second CTA is redundant.
- **Streak detail screen** — not needed; hero card is the whole surface.
- **Snooze / "remind me later" action on morning prompt** — not in requirements; v1.4+.
- **Per-friend attribution in streak** ("streak with Ana = 5 weeks") — out of scope; v1.4+.
- **Pinning important plans to prevent grace-consumption** — out of scope.
- **Automated copy linting for positive-only constraint** — out of scope; non-engineer manual review only.
- **Jest unit tests for `morningPrompt.ts` / `get_squad_streak` SQL** — still rejected project-wide per Phase 2 OVR-10. Verification via grep + tsc + eslint + manual SQL exec.

### Reviewed Todos (not folded)

None — `todo match-phase 4` returned 0 results.

</deferred>

---

*Phase: 04-morning-prompt-squad-goals-streak*
*Context gathered: 2026-04-09*
