# Phase 2: Status Liveness & TTL - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Redesign note:** This CONTEXT.md supersedes the original TTL-only design. The user pivoted mid-discussion to a 3-layer Mood + Context + Window + Heartbeat model (see `02-DISCUSSION-LOG.md` for the full history).

<domain>
## Phase Boundary

Turn the user's status into a **living signal** with three layers:

1. **Mood** — Free / Busy / Maybe (existing enum, existing labels, unchanged)
2. **Context tag** (optional) — a preset chip per mood describing what for (e.g., Free + "grab a coffee")
3. **Window** — forward duration from: 1h / 3h / Until 6pm / Until 10pm / Rest of day

On top of those, a silent **Heartbeat** layer tracks app activity (`last_active_at`) and computes one of three states client-side: ALIVE (fresh), FADING (4–8h since activity), DEAD (expired OR >8h since activity). Heartbeat drives visual dimming on friend cards, the ReEngagementBanner for the user's own stale status, and eligibility filters for downstream push flows.

**In scope:**
- `statuses` table migration: add `status_expires_at TIMESTAMPTZ NOT NULL` (with safe backfill) and `last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `status_history` table + SECURITY DEFINER trigger + RLS + retention (nightly rollup, 30d GC)
- `effective_status` view — factors `status_expires_at` AND `last_active_at` — source of truth for friend-facing reads
- `MoodPicker` component (replaces `SegmentedControl` on Home + Profile) with preset context chips and window chips
- Preset chips per mood (5 each — see `<decisions>` §Context Chips)
- `getWindowOptions(now): WindowOption[]` utility — hides impossible time-of-day options
- `computeHeartbeatState(expires_at, last_active_at): 'alive' | 'fading' | 'dead'` utility in `src/utils/heartbeat.ts`
- `ReEngagementBanner` component — shows when own heartbeat is FADING
- `HomeFriendCard` updates — dim FADING, move DEAD to Everyone Else
- `useStatus` hook rewrite — commits mood + tag + window as one transaction, updates `last_active_at` on foreground
- Own-status display format: "{Mood} · {tag if set} · {window}"
- "What's your status today?" prominent picker heading when user's own heartbeat is DEAD on app open
- Minor label/string updates in Phase 1 deliverables (`StatusPill`, `HomeFriendCard`) to match new display format

**Out of scope (other phases):**
- Window-expiry push (30min before) → Phase 3 as **EXPIRY-01**
- Morning spark push at 9am when DEAD → Phase 4, folds into MORN-01..08 with updated DEAD-trigger gate
- Friend-went-🟢 push → Phase 3 as FREE-01..11 (eligibility now also filters DEAD heartbeats)
- `get_squad_streak` SQL and StreakCard → Phase 4

</domain>

<decisions>
## Implementation Decisions

### Mood Layer (labels)

- **D-01:** Mood labels in the UI stay **Free / Busy / Maybe** — exact words, no emoji/copy redesign. DB enum unchanged (`public.availability_status` with values `'free'`, `'busy'`, `'maybe'`). User explicitly rejected the "Down to hang / Reach out first / Heads down" relabel after initial interest.
- **D-02:** `StatusPill` in `src/components/home/HomeFriendCard.tsx` (via `src/components/`) renders the mood label + optional context tag + window string. Existing color tokens stay (green/amber/red). No new emoji.

### Context Tag Layer

- **D-03:** **Preset chips only** — no freeform text input. Typed text is out of scope for v1.3. Each mood has exactly **5 preset chips**; the user taps one (or taps none) and commits.
- **D-04:** Context tag is **optional**. Committing mood + window with no tag is valid — the displayed status is just "{Mood} · {window}".
- **D-05:** Tag is stored in the existing `statuses.context_tag TEXT` column (already present, no migration). Length capped at 20 chars, lowercase, no emoji.
- **D-06:** **Preset chips per mood** (Claude's initial set — may be tuned in planning or after dogfooding):
  - **Free:** `down to hang` · `grab a coffee` · `get food` · `see a movie` · `chill`
  - **Maybe:** `reach out first` · `text me` · `depends` · `later tonight` · `maybe tomorrow`
  - **Busy:** `in meetings` · `deep work` · `at the gym` · `running errands` · `sleeping`
- **D-07:** Presets are defined in a single flat export in `src/components/status/moodPresets.ts` so they can be edited without touching component code.

### Window Layer

- **D-08:** **Fixed duration set** (rejecting the time-adaptive "This afternoon / Tonight / Late night" alternative): `1h` · `3h` · `Until 6pm` · `Until 10pm` · `Rest of day`. Same five options across all three moods.
- **D-09:** **Time-of-day options are hidden when not meaningful**:
  - `Until 6pm` is hidden if current local time is ≥17:30 (less than 30min until target)
  - `Until 10pm` is hidden if current local time is ≥21:30
  - `Rest of day` is always shown (computed as 23:59 local)
  - `1h` and `3h` are always shown
- **D-10:** **Every active status has a non-null `status_expires_at`** — including Maybe. This replaces the original TTL-02 "Maybe is indefinite" decision. Backfill strategy for legacy rows defined in D-17.
- **D-11:** Window computation lives in `src/utils/windows.ts` as `getWindowOptions(now: Date): WindowOption[]` returning `{ id: string, label: string, expiresAt: Date }[]`. Also exports `computeWindowExpiry(windowId, now)` for the commit path. All "local time" math uses the device's local timezone via native `Date` — no timezone column on the server.
- **D-12:** Window display format on own status: `1h` → "for 1h", `3h` → "for 3h", `Until 6pm` → "until 6pm", `Until 10pm` → "until 10pm", `Rest of day` → "rest of day". Pre-translated in the window util so components don't re-derive.

### Heartbeat Layer

- **D-13:** New column `last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()` on `statuses` table (migration 0009). Indexed if query patterns need it — planner decides.
- **D-14:** Client updates `last_active_at = now()` via `useStatus.markActive()` on (a) cold launch after auth is confirmed, and (b) every AppState 'active' transition. Debounced to at most once per 60 seconds to avoid thrash.
- **D-15:** **Heartbeat is computed client-side**, not stored. Utility `computeHeartbeatState(expires_at, last_active_at)` in `src/utils/heartbeat.ts` returns `'alive' | 'fading' | 'dead'`:
  - `ALIVE` — `expires_at > now AND last_active_at > now - 4h`
  - `FADING` — `expires_at > now AND last_active_at ∈ [now - 8h, now - 4h]`
  - `DEAD` — `expires_at < now OR last_active_at < now - 8h`
- **D-16:** The server-side `effective_status` view reproduces the same logic in SQL (for downstream Phase 3 push filters and for any future analytics). Schema: `SELECT user_id, CASE WHEN status_expires_at < now() OR last_active_at < now() - interval '8 hours' THEN NULL ELSE status END AS effective_status, status_expires_at, last_active_at, context_tag, updated_at FROM statuses`. Note: "FADING" is not encoded server-side — only ALIVE vs DEAD. The FADING state is purely a client-side UX thing.

### Migration & Backfill

- **D-17:** Migration `0009_status_liveness_v1_3.sql` does:
  1. `ALTER TABLE statuses ADD COLUMN status_expires_at TIMESTAMPTZ` (nullable in this step)
  2. Backfill: `UPDATE statuses SET status_expires_at = updated_at + interval '24 hours' WHERE status_expires_at IS NULL` — legacy rows get a generous 24h expiry from their last update so no one loses a mid-week status on deploy
  3. `ALTER TABLE statuses ALTER COLUMN status_expires_at SET NOT NULL`
  4. `ALTER TABLE statuses ADD COLUMN last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  5. Create `status_history` table with schema from TTL-07/08
  6. Create SECURITY DEFINER trigger `on_status_transition` that appends to `status_history` on mood transitions only (skip context_tag-only and window-only updates — see D-21)
  7. Create `effective_status` view per D-16
  8. RLS policies: users SELECT own + friend's status_history; trigger runs as SECURITY DEFINER and bypasses RLS on the insert

### `status_history` Scope & Retention

- **D-18:** `status_history` schema: `(id BIGSERIAL PK, user_id UUID, status availability_status, context_tag TEXT, status_expires_at TIMESTAMPTZ, occurred_at TIMESTAMPTZ DEFAULT now())`. No `last_active_at` column — heartbeat doesn't transition, only status does.
- **D-19:** RLS — SELECT on `status_history` allowed for the row's `user_id` OR any friend of that user (via existing friend lookup). No INSERT/UPDATE/DELETE from clients; trigger writes only.
- **D-20:** Retention — nightly job (Claude's choice at plan time: pg_cron if enabled by then, otherwise an Edge Function on a scheduled webhook) rolls up entries older than 7 days into one "daily summary" row per user per day, then hard-deletes any raw rows older than 30 days. Rollup approach: keep the FIRST status transition of each day; discard the rest (simpler than min/max/most-common).
- **D-21:** **Trigger fires only on mood transitions** — e.g., `free → busy`. Context-tag-only updates and window-only updates do NOT log to `status_history`. Rationale: `status_history` feeds the streak feature which cares about "did they set Free this week", not tag changes.

### MoodPicker Component

- **D-22:** New component `src/components/status/MoodPicker.tsx` replaces the existing `SegmentedControl` usage **only on Home and Profile** (`SegmentedControl` stays as a reusable primitive for any other 3-segment UI). Layout:
  - **Three full-width tappable rows** (not segments, not pills) — vertical stack:
    - `Free` (green, left-aligned, large label)
    - `Maybe` (amber)
    - `Busy` (red)
  - Selected state: filled background with the mood's brand color token, bold label
  - Unselected state: muted/transparent background, standard label weight
- **D-23:** **Two-stage commit flow**:
  1. Tap a mood row → row highlights, presets appear below as a horizontal scrollable chip row, window chips appear below presets
  2. Optionally tap a preset chip (highlights), tap a window chip → commits immediately on window selection
  3. Subtle spinner overlay during the save using existing pattern
  4. If user taps a different mood mid-flow, reset the preset + window selection
- **D-24:** **Cancel behavior**: tapping the currently-selected mood row a second time collapses the picker without committing. No explicit cancel button.
- **D-25:** **Sync between Home and Profile**: both mount `MoodPicker` bound to the same `useStatus` hook; any commit from one surface updates the other instantly via React Query cache (existing pattern from v1.0 chat/status).

### Home Screen Updates

- **D-26:** **ReEngagementBanner** — new component `src/components/home/ReEngagementBanner.tsx`:
  - Shown above the `MoodPicker` on Home only (not Profile) when `computeHeartbeatState(ownStatus.expires_at, ownStatus.last_active_at) === 'fading'`
  - Copy: `Still {Mood}? · active until {window label}` (e.g., `Still Free? · active until 6pm`)
  - Three action buttons: **Keep it** / **Update** / **Heads down**
    - **Keep it** → calls `useStatus.touch()` which does `UPDATE statuses SET last_active_at = now() WHERE user_id = $me`. Banner dismisses on next render.
    - **Update** → scrolls focus to the `MoodPicker` and expands whatever mood is currently active (jumpscroll, not smooth — feels snappy)
    - **Heads down** → one-tap: sets mood=busy with 3h window (no context tag). Commits immediately.
  - **Auto-dismiss** after 8s of being rendered, with no status change. Dismissal is in-memory only — re-appears next foreground if still FADING.
  - Visual: reuse the `OfflineBanner` animated-height pattern from `src/components/common/OfflineBanner.tsx`, recolored to amber (neutral warning tone).
- **D-27:** **"What's your status today?" heading** — when user opens the app and own heartbeat is DEAD, the Home screen shows this string as a prominent heading directly above the `MoodPicker`. The heading is NOT a banner — no dismiss, no actions, just a title. It goes away the moment the user commits a status (render condition: `if deadOnOpen && !hasCommittedThisSession`).
- **D-28:** **Friend card rendering via heartbeat state** in `HomeFriendCard`:
  - **ALIVE** friend: full color, 1.0 opacity, label "{Mood} · {tag} · {window}" or "{Mood} · {window}"
  - **FADING** friend: 0.6 opacity, label "{Mood} · {Xh ago}" (where Xh = `formatDistanceToNow(last_active_at)` using a minimal formatter — see D-29)
  - **DEAD** friend: no mood rendered; label "inactive"; card moves from its current section to "Everyone Else" regardless of stored mood
- **D-29:** **Distance-to-now formatter** — inline utility in `src/utils/heartbeat.ts` alongside `computeHeartbeatState`. Returns `"5h ago"`, `"2h ago"`, etc. (whole-hour precision is sufficient). Avoids pulling in `date-fns` (zero-new-deps rule).

### Phase 1 Ripple — String Updates

- **D-30:** `HomeFriendCard` status label string rendering is updated from the current "{Mood}" only to the new "{Mood} · {tag} · {window}" format. Tag and window segments are omitted when the respective field is empty. No emoji, no color changes.
- **D-31:** `StatusPill` (if it exists as a separate component — planner should verify during plan-phase) is updated in the same way.
- **D-32:** **Phase 5 SMOKE-TEST.md ripple** — Phase 1's smoke test currently references "Free/Busy/Maybe" bare labels in some checks. Since the labels themselves are unchanged, no smoke-test edits are needed. Phase 2 will append its own `SMOKE-TEST.md` to the phase folder and add it to Phase 5's input list per the `.planning/ROADMAP.md` planner rule.

### `useStatus` Hook Rewrite

- **D-33:** Rewrite `src/hooks/useStatus.ts` to expose:
  - `currentStatus: { status, context_tag, status_expires_at, last_active_at } | null`
  - `setStatus(mood, tag, windowId)` — computes expiry from windowId via `computeWindowExpiry`, upserts `statuses` row (all three fields + `last_active_at = now()`), handles optimistic UI with rollback on failure
  - `touch()` — updates `last_active_at = now()` only; used by "Keep it" button and the cold-launch / AppState effect
  - `heartbeatState: 'alive' | 'fading' | 'dead'` — memoized from currentStatus
  - Rest-of-hook behavior (subscription to realtime, cache invalidation) preserved from current implementation
- **D-34:** The `markActive`/`touch` path is debounced to once per 60s to prevent thrashing during rapid foreground/background cycles.

### Scope Boundaries with Adjacent Phases

- **D-35:** **Phase 3 FREE-02 update:** eligibility filter for "friend went Free" pushes must now also skip friends whose heartbeat is DEAD (not just currently Busy). Phase 3's plan-phase will pick this up from the updated REQUIREMENTS.md and CONTEXT.md; Phase 2 is not responsible for the Edge Function change.
- **D-36:** **Phase 3 EXPIRY-01** (new requirement) handles the 30-min-before-expiry push. Phase 2 writes the data that Phase 3 reads; Phase 2 does NOT ship any scheduled-push infrastructure. If pg_cron or scheduled Edge Functions need enabling, that happens in Phase 3.
- **D-37:** **Phase 4 MORN-01/MORN-06 updates** — morning prompt now gated on DEAD heartbeat. Phase 2 exposes `computeHeartbeatState` as the shared utility. Phase 4 will import it.

### Claude's Discretion

- Exact visual styling of `MoodPicker` rows (padding, row height, corner radius) — use existing design tokens
- Animation easing/duration for the picker expansion — use existing patterns
- Whether to use `LayoutAnimation` or `Reanimated 2` for the picker expand/collapse (check existing codebase — probably `LayoutAnimation` since it's already imported elsewhere)
- Whether to add a subtle pulse animation on the "Update" button in ReEngagementBanner to draw the eye
- `getWindowOptions` boundary math — I've specified ≥17:30 / ≥21:30 but planner can tune if dogfooding suggests different thresholds
- Whether the nightly rollup runs as pg_cron (if available) or Edge Function webhook — decide at plan time based on what's already enabled
- Rollup algorithm: I've suggested "first transition of day" but planner can pick a different summary if it serves the streak feature better

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.3 milestone planning
- `.planning/PROJECT.md` — v1.3 milestone scope and constraints
- `.planning/REQUIREMENTS.md` — Phase 2 maps to TTL-01..08 + HEART-01..05 (updated 2026-04-07)
- `.planning/ROADMAP.md` §Phase 2 — goal and redesign note
- `.planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md` — prior phase decisions (AsyncStorage prefix, design tokens, no-new-deps rule)

### v1.3 research outputs (may reference old "5am reset" strategy — verify against D-15/D-16 before following)
- `.planning/research/SUMMARY.md` — converged research findings
- `.planning/research/STACK.md` — zero-deps verification
- `.planning/research/ARCHITECTURE.md` — outbox pattern, view-computed effective_status, pg_cron availability notes
- `.planning/research/PITFALLS.md` — retention, timezone, RLS pitfalls

### Existing code (must read before planning)
- `src/hooks/useStatus.ts` — current hook, will be rewritten per D-33
- `src/components/status/SegmentedControl.tsx` — current composer; MoodPicker partially replaces
- `src/hooks/useFriends.ts` — current friend list fetch; will filter via effective_status view
- `src/components/home/HomeFriendCard.tsx` — rendering updates per D-28/D-30
- `src/components/common/OfflineBanner.tsx` — pattern reference for ReEngagementBanner
- `src/app/(tabs)/index.tsx` — Home screen, mounts MoodPicker + ReEngagementBanner + "What's your status today?" heading
- `src/app/(tabs)/profile.tsx` — Profile screen, mounts MoodPicker (bound to same useStatus hook)
- `src/lib/action-sheet.ts` — pattern reference for any bottom-sheet interactions if picker ever grows
- `src/theme/colors.ts`, `src/theme/spacing.ts`, `src/theme/radii.ts`, `src/theme/typography.ts` — design tokens (mandatory per ESLint rule `campfire/no-hardcoded-styles`)
- `supabase/migrations/0001_init.sql` §43-50 — current `statuses` table definition
- `supabase/migrations/0008_push_tokens_v1_3.sql` — most recent migration; new migration is `0009_status_liveness_v1_3.sql`

### Plan-phase research items (verify in current docs before committing)
- Supabase pg_cron availability on the current project tier (for retention rollup — see D-20)
- Whether `LayoutAnimation` or `Reanimated 2` is the established pattern for expand/collapse in this codebase
- Current shape of the realtime subscription in `useStatus` (don't break existing subscribe pattern in the rewrite)
- Whether any existing code reads `statuses.updated_at` for staleness logic (if yes, that code must be updated to read `last_active_at` or go through `effective_status` view)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`statuses.context_tag`** already exists on the table — no migration needed for the tag layer. Just use it.
- **`SegmentedControl`** at `src/components/status/SegmentedControl.tsx` — kept as-is for any other 3-segment use; not deleted. `MoodPicker` is a new component.
- **`OfflineBanner`** at `src/components/common/OfflineBanner.tsx` — animated-height banner pattern to copy for `ReEngagementBanner`.
- **`useStatus` hook** at `src/hooks/useStatus.ts` — keep subscription + cache-invalidation structure, rewrite only the write path and add `touch()` / `heartbeatState`.
- **`PrePromptModal`** at `src/components/notifications/PrePromptModal.tsx` — pattern reference for any modal that Phase 2 adds (unlikely to need one, but the token usage is the reference).
- **Design tokens** at `src/theme/` — COLORS, SPACING, RADII, TYPOGRAPHY, SHADOWS. Mandatory per ESLint rule `campfire/no-hardcoded-styles`.
- **`@react-native-community/datetimepicker`** already installed — not needed for Phase 2's fixed window options, but flag for later if time-picking ever becomes freeform.

### Established Patterns
- **Hooks per domain** — `useStatus`, `useFriends`, `usePushNotifications`. Rewrite stays in place; don't split into multiple files.
- **Migration numbering** — next migration is `0009_status_liveness_v1_3.sql`.
- **RLS-first** — every table change ships with policies. `statuses` policies stay user-scoped for writes. `status_history` gets user+friend SELECT via the same friend-lookup pattern established in v1.0.
- **AsyncStorage prefixed with `campfire:`** — if Phase 2 needs any local flags (e.g., "has committed status this session"), use `campfire:` prefix per D-06 convention from Phase 1.
- **Zero new npm deps** — project-wide rule. `date-fns` and friends are explicitly forbidden; use native `Date` math.

### Integration Points
- **`src/hooks/useStatus.ts`** — rewrite write path + add `touch()` / `heartbeatState` / debounced cold-launch + AppState effect (D-33, D-34, D-14)
- **`src/app/(tabs)/index.tsx` (Home)** — mount `ReEngagementBanner` (conditional) + "What's your status today?" heading (conditional) + replace SegmentedControl with `MoodPicker`
- **`src/app/(tabs)/profile.tsx` (Profile)** — replace SegmentedControl with `MoodPicker`
- **`src/components/home/HomeFriendCard.tsx`** — render heartbeat state per D-28 (opacity, label, section placement)
- **`src/components/status/MoodPicker.tsx`** — NEW
- **`src/components/status/moodPresets.ts`** — NEW (15 preset chips per D-06)
- **`src/components/home/ReEngagementBanner.tsx`** — NEW
- **`src/utils/heartbeat.ts`** — NEW (`computeHeartbeatState` + distance formatter)
- **`src/utils/windows.ts`** — NEW (`getWindowOptions` + `computeWindowExpiry`)
- **`supabase/migrations/0009_status_liveness_v1_3.sql`** — NEW (schema + trigger + view + RLS)

### Notable Findings
- **No existing `src/utils/` directory referenced** — scout did not find `src/utils/date.ts` or similar. Planner should verify and create `src/utils/` if missing (or prefer `src/lib/` if that's the established convention in the codebase — check first).
- **No existing `effective_status` view** — this is brand new in 0009.
- **pg_cron not yet enabled** — Phase 2 might not need it if retention runs as an Edge Function instead. Planner decides at plan time.
- **No date/time utility library** — native `Date` math only, per zero-deps rule.

</code_context>

<specifics>
## Specific Ideas

- "bussy till night" / "bussy for 4h" — user's example wording when describing the window concept. Pins the display format to "until X" for time-of-day and "for X" for durations (captured in D-12).
- "Free · grab a coffee · until 6pm" — canonical display string for own status. Used as the golden example throughout.
- "What's your status today?" — the DEAD-on-open heading. Friendly, not error-toned. Captured in D-27.
- "Still Free? · active until 6pm" — ReEngagementBanner copy template. Captured in D-26.
- User cares strongly about the status feeling **alive** — heartbeat is the defining feature of Phase 2, not a nice-to-have. "Your status stays alive as long as you are" is the user's articulated philosophy.
- User explicitly flipped the "Down to hang / Reach out first / Heads down" relabel back to Free/Busy/Maybe mid-discussion. Do NOT reintroduce the relabel without an explicit new decision.

</specifics>

<deferred>
## Deferred Ideas

- **Freeform text input for context tag** — rejected for v1.3 per D-03. Revisit in v1.4 if preset chips feel too rigid after dogfooding.
- **Mood relabel to "Down to hang / Reach out first / Heads down"** — rejected mid-discussion. Could be revisited as a v1.4 brand/copy polish pass, but not this milestone.
- **Time-adaptive window options** ("This afternoon / Tonight / Late night / Until morning") — rejected per D-08 in favor of fixed durations. Revisit post-dogfooding if users find 1h/3h/Until-6pm too rigid.
- **Freeform custom window** ("pick a time") — out of scope. Would require a time picker and more complex UX. v1.4+.
- **Server-side heartbeat enum ('alive' | 'fading' | 'dead')** — rejected per D-16. View returns only ALIVE/DEAD (via NULL effective_status); FADING is purely client UX. Revisit only if server-side analytics need three-state fidelity.
- **pg_cron 5am clock reset** — explicitly replaced by heartbeat. Do not reintroduce.
- **Storing `tz_offset_minutes` on `statuses`** — rejected because heartbeat eliminates the need for server-side local-time math. REQUIREMENTS.md still forbids `profiles.timezone`.
- **Per-friend mute for ReEngagementBanner** — out of scope.
- **Snooze on ReEngagementBanner** ("remind me in 1h") — considered; rejected for v1.3. Auto-dismiss after 8s is the only escape hatch.
- **Sound effect on mood commit** — no. Project has no sound effects anywhere.
- **Pulse animation on "Update" button** — Claude's discretion (D-32 footnote); default no unless dogfooding suggests discoverability issue.

### Reviewed Todos (not folded)
None — `todo match-phase 2` returned 0 results.

</deferred>

<post_research_overrides>
## Post-Research Overrides (added 2026-04-07 after gsd-phase-researcher)

These corrections OVERRIDE the matching decisions above. The researcher verified these against the live codebase; the original decisions were written before the scout finished. Downstream agents (planner, executor) should treat the overrides as authoritative.

- **OVR-01 → overrides D-11, D-15, D-29:** Utility files live in **`src/lib/`**, not `src/utils/`. The codebase has no `src/utils/` directory; established convention is `src/lib/` (`action-sheet.ts`, `notifications-init.ts`, `supabase.ts`, `username.ts`). Phase 2 creates `src/lib/heartbeat.ts` and `src/lib/windows.ts`.

- **OVR-02 → overrides D-25:** Cross-screen sync between Home and Profile MoodPickers happens via the **existing Zustand store pattern** (`src/stores/useHomeStore.ts`, `src/stores/useAuthStore.ts`), NOT React Query. The codebase has zero React Query (`@tanstack/react-query` is not installed). Either extend `useHomeStore` to hold `currentStatus` or create a new `src/stores/useStatusStore.ts` matching the existing store pattern. Planner picks at plan time; recommend `useStatusStore.ts` to avoid bloating `useHomeStore`.

- **OVR-03 → overrides D-33 trailing clause:** `useStatus` has **no realtime subscription** today. The friend-status realtime listener lives in `src/hooks/useHomeScreen.ts:22-46` and subscribes to the `statuses` table directly. Phase 2 keeps that arrangement: `useStatus` is plain state + Supabase calls + the new Zustand sync (OVR-02), and `useHomeScreen`'s realtime subscription stays pointed at the **`statuses` table** (Supabase Realtime cannot publish views — see PITFALLS Pitfall 12). Read queries against `effective_status` view; subscription stays on the table.

- **OVR-04 → overrides D-14 implementation:** The cold-launch + AppState 'active' effect for heartbeat `touch()` MUST extend the existing `useEffect` in `src/app/(tabs)/_layout.tsx:28-50` (Phase 1 wired this for push re-registration). Do NOT add a second `AppState` listener — double-fires + debounce complexity. Add the `touch()` call inside the existing branch.

- **OVR-05 → overrides D-20 + adds new deferred idea:** **Retention rollup and GC are DEFERRED to v1.4.** pg_cron is not enabled on this Supabase project (verified) and the user's "no new infrastructure for v1.3" stance + "zero new deps" rule make a scheduled Edge Function out of scope. Phase 2 ships the `status_history` table, the SECURITY DEFINER trigger, and the RLS policies — but **no rollup job and no GC job**. At v1.3 scale (3-15 friend squads, low-frequency status changes) the table will not accumulate enough rows in 30 days to need active management. The retention job is captured as a v1.4 deferred idea below.

- **OVR-06 → overrides D-15/D-16 silent-expiry behavior:** Because expiries are silent (no DB write happens when `status_expires_at` passes), the realtime subscription cannot push the transition. The Home screen needs a **60-second `setInterval` re-render trigger** to re-evaluate `computeHeartbeatState` for own + friend statuses without re-fetching. Single interval at the screen level, not per-card. Cancel on screen unmount.

- **OVR-07 → overrides D-28 sort behavior:** `useHomeScreen.ts:81-138` currently sorts free friends by `updated_at DESC`. Phase 2 must switch this to `last_active_at DESC` (freshness, not last-write). Same applies to any divergent `STATUS_SORT_ORDER` constant — researcher noted `useFriends.ts:28` and `useHomeScreen.ts:8` have a divergent constant; consolidate to a single source while we're touching the file.

- **OVR-08 → adds to D-17:** Migration 0009 must use `WITH (security_invoker = true)` on the `effective_status` view (Postgres 15+ feature) so view reads inherit the caller's RLS context. Verify Postgres 15+ before finalizing the migration. Without `security_invoker`, friends would bypass RLS through the view.

- **OVR-09 → adds to D-17 trigger:** The `on_status_transition` trigger MUST use `IS DISTINCT FROM` (not `<>`) to handle NULL→value mood transitions correctly, and MUST guard with `OLD.status IS DISTINCT FROM NEW.status` so context-tag-only and window-only updates do NOT log. Per D-21 + PITFALLS Pitfall 11.

- **OVR-10 → adds to deferred ideas:** **Jest dev-dep for unit tests on `heartbeat.ts` and `windows.ts`** — explicitly REJECTED. Phase 1 verified everything via grep + tsc + eslint + assertion scripts in plan acceptance criteria. Phase 2 follows the same pattern. Add a Jest dev-dep would violate the "no test framework in v1.3" decision Phase 1 made.

</post_research_overrides>

---

*Phase: 02-status-liveness-ttl*
*Context gathered: 2026-04-07*
*Post-research overrides: 2026-04-07 (after gsd-phase-researcher findings)*
