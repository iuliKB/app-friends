# Phase 1: Push Infrastructure & DM Entry Point - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Make push notifications actually reach devices reliably on fresh installs (close the silent plan-invite gap), and turn `HomeFriendCard` into a tappable entry point that opens a DM with that friend.

**In scope:**
- `push_tokens` table evolution (`device_id`, `last_seen_at`, `invalidated_at`)
- Session-ready push registration in `(tabs)/_layout.tsx` + `AppState` foreground re-register
- iOS notification categories registered at module scope before first permission request
- Differentiated Android notification channels (`plan_invites`, `friend_free`, `morning_prompt`, `system`)
- iOS pre-prompt UX before the system permission modal
- `notify-plan-invite` Edge Function update to filter `invalidated_at IS NULL`
- Notifications-off toggle deletes server-side token row
- Tappable `HomeFriendCard` (single tap → DM, long-press → action sheet)
- EAS development build documentation as the FIRST deliverable of this phase

**Out of scope (other phases):**
- Status TTL, `effective_status`, expired banner → Phase 2
- "Friend went Free" trigger / outbox / Edge Function → Phase 3
- Morning prompt scheduling, Squad Goals streak → Phase 4

</domain>

<decisions>
## Implementation Decisions

### iOS Permission Pre-Prompt
- **D-01:** Pre-prompt fires after the user's **first meaningful action** — defined as either (a) setting their own status for the first time, or (b) adding their first friend. Track via a single AsyncStorage key (`campfire:push_prompt_eligible`) that is set when either condition fires; the registration flow checks this key before invoking `requestPermissionsAsync`.
- **D-02:** Pre-prompt copy is **value-led**: "Get a heads up when friends are free — we only push when something matters." Render as a small modal/sheet using existing design tokens (no new component library). Two buttons: "Sounds good" → proceed to native iOS permission; "Not now" → set AsyncStorage flag to skip until next meaningful action.
- **D-03:** If user dismisses the pre-prompt with "Not now", do NOT call `requestPermissionsAsync` — iOS only allows the system prompt to be shown once per install. Defer until a later meaningful action.

### DM Entry Point UX
- **D-04:** **Single tap on a HomeFriendCard opens a DM directly** with that friend. Wrap card in `Pressable` (uses built-in opacity feedback — no new visual affordance, no chat-bubble icon). DM opens via the **existing** flow: `supabase.rpc('get_or_create_dm_channel', { other_user_id: friend.id })` → `router.push('/chat/room?dm_channel_id=…&friend_name=…')`. This matches the working pattern at `src/app/friends/[id].tsx:55-67`.
- **D-05:** **Long-press on a HomeFriendCard opens an action sheet** with two actions: **View profile** (routes to existing `/friends/[id]`) and **Plan with...** (routes to existing `/plan-create` with the friend pre-selected). Standard iOS Cancel row included automatically. Implementation: `onLongPress` on the same `Pressable`, using React Native's `ActionSheetIOS` on iOS and a fallback `Alert`-based or compatible component on Android.
- **D-06:** **"Plan with..." pre-selection requires a small change to `/plan-create`** — the route must accept a `?preselect_friend_id=…` query parameter that pre-populates the friend picker. Plan-phase must verify whether `/plan-create` already supports this; if not, the small addition is in scope for Phase 1.
- **D-07:** **Send DM action is intentionally NOT in the long-press sheet** — single tap already does it. Keeps the sheet uncluttered.
- **D-08:** **Route correction (CRITICAL):** Research SUMMARY.md mentions `/dm/[userId]` but **that route does not exist** in this codebase. The actual DM route is `/chat/room?dm_channel_id=…&friend_name=…` (verified in `src/app/friends/[id].tsx:64-66`). Phase 1 must use the real route — do NOT create a new `/dm/` route.

### EAS Dev Build Setup
- **D-09:** **Document only — Claude does NOT run `eas` commands and does NOT modify `eas.json`.** Claude writes step-by-step instructions, the user runs the build. Lowest blast radius — no changes to EAS account, credentials, or CI configuration.
- **D-10:** **Build instructions and smoke-test checklist live inside the phase plan files** (`.planning/phases/01-push-infrastructure-dm-entry-point/`), not in `docs/` or `README.md`. Keeps the v1.3 push-infra documentation contained until v1.3 ships; can be promoted to permanent docs later if useful.
- **D-11:** **EAS dev build is the FIRST deliverable of Phase 1, not the last.** All subsequent verification steps (notification action buttons, channel correctness, deep links from notifications) require the dev build to exist. Plan-phase must order tasks so the user is told to produce the dev build before any client-side work that needs to be smoke-tested on it.

### Notifications Toggle Off/On Behavior
- **D-12:** **Toggle OFF deletes the row from `push_tokens` server-side** (not soft-delete, not just AsyncStorage flag). Server-side truth: "no row, no push." The local AsyncStorage `campfire:notifications_enabled` flag is also set to `false` so the next launch's session-ready effect skips re-registration without a network round-trip.
- **D-13:** **Toggle ON re-registers silently** — fetches a fresh Expo push token, upserts to `push_tokens`, no UI prompt. iOS permission was already granted; no re-prompt needed. If iOS permission has been revoked at the OS level since the last registration, the silent re-register will simply fail (status !== 'granted') and the toggle reverts. Plan-phase should decide whether to deep-link the user to Settings on that failure or just show an inline error — Claude's discretion at planning time.

### `push_tokens` Schema Migration
- **D-14:** Add columns: `device_id TEXT NOT NULL` (sourced from `expo-device` `Device.osInternalBuildId` or `Constants.installationId`), `last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `invalidated_at TIMESTAMPTZ NULL`. Drop existing unique on `(user_id, token)`, add unique on `(user_id, device_id)`. Backfill: existing rows get `device_id = 'legacy:' || id` and `last_seen_at = created_at`.
- **D-15:** RLS unchanged in spirit — users can SELECT/INSERT/UPDATE/DELETE only their own rows. Server-side fan-out functions read via SECURITY DEFINER patterns (already established in v1.0 migrations).

### Session-Ready Registration & Foreground Re-Register
- **D-16:** Move `registerForPushNotifications` invocation OUT of the Profile toggle and INTO a session-ready `useEffect` in `src/app/(tabs)/_layout.tsx`. The effect runs once per authenticated session and again on every `AppState` 'active' transition (catches token rotation when app returns from background).
- **D-17:** Profile toggle still works for explicit opt-out — but it is no longer the only registration trigger.

### Android Channels
- **D-18:** Create four new channels at module init: `plan_invites` (MAX importance, vibration), `friend_free` (HIGH importance, default sound), `morning_prompt` (DEFAULT importance, default sound), `system` (LOW importance, no sound). Existing `default` channel is left dormant (Android channel IDs are immutable — cannot be renamed or have importance changed). Existing installs continue to use `default` for plan-invites until reinstall; new installs use `plan_invites` directly.
- **D-19:** `notify-plan-invite` Edge Function updates the push payload to set `channelId: 'plan_invites'` for new installs. Documented as a known migration tail in CONTEXT and the plan.

### iOS Notification Categories
- **D-20:** iOS notification categories registered at **module scope** in `src/app/_layout.tsx` (root layout, NOT a tab layout) — outside any component, runs at JS module load before any `requestPermissionsAsync` call. Single category for v1.3: `morning_prompt` with three actions (Free / Busy / Maybe). Action handlers run inside the authenticated app and use the existing Supabase session — no public Edge Function, no signed payload.

### Notification Handler Placement
- **D-21:** `Notifications.setNotificationHandler({...})` is called at **module scope** in a new file `src/lib/notifications-init.ts`, imported once from root `_layout.tsx`. This file also registers categories. Keeps `_layout.tsx` lean and groups all module-scope notification setup in one auditable place. Use SDK 55's current handler shape (`shouldShowBanner`/`shouldShowList` — plan-phase must verify exact shape for installed SDK version).

### Stale Token Cleanup
- **D-22:** `notify-plan-invite` Edge Function parses Expo push ticket-level errors. On `DeviceNotRegistered` (or equivalent), call `UPDATE push_tokens SET invalidated_at = now() WHERE token = $1`. Future fan-outs filter `invalidated_at IS NULL`.

### Claude's Discretion
- Pre-prompt visual layout (modal vs. bottom sheet vs. inline card) — pick whichever best matches existing design system patterns
- Exact iOS deep-link-to-Settings behavior on toggle-on permission failure
- ActionSheetIOS / Android equivalent component choice for the long-press sheet
- Smoke-test script structure
- Comment density / inline documentation in `notifications-init.ts`
- Migration file naming convention (follows existing `0004_…` numbering)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.3 milestone planning
- `.planning/PROJECT.md` — v1.3 milestone scope and constraints
- `.planning/REQUIREMENTS.md` — Phase 1 maps to PUSH-01..10, DM-01
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria

### v1.3 research outputs
- `.planning/research/SUMMARY.md` — converged research findings (read first)
- `.planning/research/STACK.md` — verified zero new deps, SDK-55 alignment, channels strategy
- `.planning/research/ARCHITECTURE.md` — push_tokens migration shape, integration file paths, EAS-first ordering
- `.planning/research/PITFALLS.md` — 13 critical pitfalls; especially #1 (stale tokens), #4 (categories registered too late), and EAS-Go limitations

### Existing code (must read before planning)
- `src/hooks/usePushNotifications.ts` — current registration hook (10-50 line file; full rewrite expected)
- `src/components/home/HomeFriendCard.tsx` — currently a pure View; wrap in Pressable
- `src/app/friends/[id].tsx` §55-67 — canonical DM-open flow (`get_or_create_dm_channel` → `/chat/room?dm_channel_id=…&friend_name=…`); Phase 1 mirrors this from HomeFriendCard
- `src/app/(tabs)/_layout.tsx` — new home for session-ready registration effect
- `src/app/_layout.tsx` — root layout for module-scope category/handler imports
- `src/app/(tabs)/profile.tsx` — existing notifications toggle; rewire to call new register/unregister
- `src/app/(tabs)/chat/room.tsx` — destination for DM deep links
- `src/app/plan-create.tsx` — verify whether `?preselect_friend_id=…` is supported; small addition if not
- `app.config.ts` — `expo-notifications` plugin already registered as bare string; convert to tuple form for icon/color options
- `supabase/migrations/0003_push_tokens.sql` — current schema; new migration `0008_push_tokens_v1_3.sql` evolves it
- `supabase/migrations/0001_init.sql` §570 — `get_or_create_dm_channel` RPC definition (already exists, no changes)
- `supabase/functions/notify-plan-invite/index.ts` — existing Edge Function; minor update to filter `invalidated_at IS NULL` and parse ticket errors

### Plan-phase research items (verify in current docs)
- Expo SDK 55 `Notifications.setNotificationHandler` return shape (`shouldShowAlert` vs `shouldShowBanner`/`shouldShowList`)
- Expo SDK 55 `Notifications.scheduleNotificationAsync` daily-trigger shape (relevant for Phase 4 but verify here so categories design is consistent)
- `expo-notifications` plugin tuple-form options for SDK 55 (icon, color, sounds)
- Expo push receipts API current schema for ticket-level error parsing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`get_or_create_dm_channel` RPC** — Already in `supabase/migrations/0001_init.sql:570`. Idempotent. Phase 1 reuses as-is.
- **Existing DM-open pattern** at `src/app/friends/[id].tsx:55-67` — proven flow that Phase 1 lifts into HomeFriendCard's tap handler.
- **`expo-notifications`, `expo-device`, `expo-constants`, `@react-native-async-storage/async-storage`** — all installed at SDK-55-aligned versions, no `npm install` needed.
- **`notify-plan-invite` Edge Function** at `supabase/functions/notify-plan-invite/index.ts` — fully wired Database Webhook on `plan_members` INSERT. Only needs minor updates (filter invalidated tokens, parse ticket errors).
- **Existing Profile notifications toggle** at `src/app/(tabs)/profile.tsx:73` — provides the UI surface; only the underlying register/unregister logic changes.
- **AvatarCircle, StatusPill** — already used in HomeFriendCard, no changes needed.

### Established Patterns
- **Hooks per domain** — `src/hooks/usePushNotifications.ts` follows the convention. Rewrite stays in place; do not split into multiple files unless complexity demands it.
- **`router.push` with query string for DM context** — `?dm_channel_id=…&friend_name=…` is the established shape. Phase 1 must match this exactly.
- **Migration numbering** — sequential `0001_…`, `0002_…`, `0003_push_tokens.sql`. New migration is `0008_push_tokens_v1_3.sql`.
- **RLS-first** — every table change ships with policies. `push_tokens` policies stay user-scoped.
- **`as never` cast on router.push paths** — used at `src/app/friends/[id].tsx:65` to satisfy Expo Router's typed routes; same pattern in HomeFriendCard.
- **AsyncStorage prefixed with `campfire:`** — `NOTIFICATIONS_ENABLED_KEY = 'campfire:notifications_enabled'`. New keys follow same prefix.
- **Design tokens via `@/theme`** — pre-prompt UI must use COLORS / SPACING / FONT_SIZE / RADII tokens. ESLint enforces.

### Integration Points
- **`src/app/_layout.tsx`** — module-scope import of `src/lib/notifications-init.ts` (NEW file containing handler + categories registration)
- **`src/app/(tabs)/_layout.tsx`** — session-ready `useEffect` calling `registerForPushNotifications(userId)` + `AppState` listener for foreground re-register
- **`src/components/home/HomeFriendCard.tsx`** — wrap return JSX in `Pressable`, add `onPress` (DM) and `onLongPress` (ActionSheet) handlers
- **`src/app/(tabs)/profile.tsx`** — existing notifications toggle: rewire `setNotificationsEnabled(false)` path to also delete the server-side `push_tokens` row, and `setNotificationsEnabled(true)` path to call `registerForPushNotifications` for silent re-register
- **`supabase/migrations/0008_push_tokens_v1_3.sql`** (NEW) — schema migration for `device_id`, `last_seen_at`, `invalidated_at`, composite unique
- **`supabase/functions/notify-plan-invite/index.ts`** — small update: filter `invalidated_at IS NULL`, parse ticket errors → mark stale tokens

### Notable Findings
- **`/dm/` route does NOT exist** — research SUMMARY.md is incorrect on this point. The real route is `/chat/room?dm_channel_id=…&friend_name=…`. Captured in D-08.
- **Existing `default` Android channel cannot be renamed** — Android channel IDs are immutable. New channels (`plan_invites`, etc.) coexist with the dormant `default` channel; legacy installs use `default` until reinstall. Captured in D-18.
- **`/plan-create` pre-selection support unknown** — Phase 1 plan must verify whether the `?preselect_friend_id=…` query parameter is supported, and add it if not.

</code_context>

<specifics>
## Specific Ideas

- "Get a heads up when friends are free — we only push when something matters" — exact pre-prompt copy decided in D-02
- Pre-prompt must defer until first meaningful action because iOS only allows the native permission modal once per install — premature triggering wastes the only prompt
- Long-press action sheet pattern follows the existing Squad → friend tap → action sheet model the user already taught their users in v1.0
- Plan with... routes to existing `/plan-create` because plan creation flow is established, owned by another phase historically, and Phase 1 should not duplicate it

</specifics>

<deferred>
## Deferred Ideas

- **Compose icon in Chats tab header** — User explicitly chose "tappable HomeFriendCard" as the v1.3 DM entry-point fix. Compose icon was the alternative; not building it. Could be added in v1.4 if HomeFriendCard tap proves insufficient.
- **Visual chat-bubble icon overlay on HomeFriendCard** — Considered as an explicit affordance; rejected to keep card visual density low. If discoverability turns out to be poor in v1.3 dogfooding, revisit in v1.4.
- **Send DM as a long-press action-sheet item** — Intentionally omitted because single tap already does it. Adds clutter without value.
- **Per-friend mute / opt-in for friend availability pushes** — v1.4 (already in REQUIREMENTS.md as NOTIF-03)
- **Configurable quiet hours** — v1.4 (NOTIF-02)
- **Promoting EAS dev build instructions to top-level `docs/` or README** — Defer until v1.3 ships and the workflow is proven; Phase 1 keeps docs scoped to the phase folder.
- **Soft-deletion of `push_tokens` rows for opt-out analytics** — Considered; rejected in favor of hard delete for cleaner server-side truth. Re-add only if analytics need emerges.

### Reviewed Todos (not folded)
None — todo match returned 0 results for Phase 1.

</deferred>

---

*Phase: 01-push-infrastructure-dm-entry-point*
*Context gathered: 2026-04-06*
