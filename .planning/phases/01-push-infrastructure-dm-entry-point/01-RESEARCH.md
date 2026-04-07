# Phase 1: Push Infrastructure & DM Entry Point — Research

**Researched:** 2026-04-06
**Domain:** Expo SDK 55 push notifications, Supabase Edge Function fan-out, Expo Router gesture handling
**Confidence:** HIGH

## Summary

Phase 1 is overwhelmingly an *integration* phase, not an exploration: every package is already installed at SDK-55-aligned versions, the plan-invite Edge Function already works end-to-end, the DM RPC and route already exist, and `Notifications.setNotificationHandler` is already correctly set with the SDK-55 shape (`shouldShowBanner` / `shouldShowList`) at module scope in `src/app/_layout.tsx`. The work is concentrated in four moves:

1. **Schema migration** — evolve `push_tokens` to add `device_id`, `last_seen_at`, `invalidated_at`, swap the unique constraint, backfill legacy rows.
2. **Wiring relocation** — move `registerForPushNotifications` out of the Profile toggle and into a session-ready `useEffect` in `src/app/(tabs)/_layout.tsx` plus an `AppState` foreground listener; create `src/lib/notifications-init.ts` for module-scope categories registration; convert `expo-notifications` plugin to tuple form in `app.config.ts`.
3. **Edge Function hardening** — `notify-plan-invite` filters `invalidated_at IS NULL`, parses ticket-level `DeviceNotRegistered` errors, marks tokens stale.
4. **Tappable HomeFriendCard** — wrap in `Pressable`, single tap mirrors the proven flow at `src/app/friends/[id].tsx:55-67`, long-press opens an `ActionSheetIOS`/`Alert` cross-platform sheet.

The four CONTEXT.md verification items resolved cleanly:
- `setNotificationHandler` shape: `{ shouldShowBanner, shouldShowList, shouldPlaySound, shouldSetBadge }` (already in use, no change needed).
- `expo-notifications` plugin tuple keys for SDK 55: `icon` (Android), `color` (Android), `sounds` (array), `mode` (`'production'`/`'development'`).
- Expo push ticket-error schema: HTTP 200, body has per-ticket `{ status: 'error', message: 'DeviceNotRegistered', details: { error: 'DeviceNotRegistered' } }`.
- `/plan-create` pre-selection: **NOT supported** today — `PlanCreateModal` hard-codes "Free friends pre-selected"; needs a small additive change to read `useLocalSearchParams` and seed `selectedFriendIds`.

**Primary recommendation:** Order the plan strictly: (a) EAS dev build doc & user runs it, (b) schema migration, (c) `notifications-init.ts` + `app.config.ts` plugin tuple, (d) `usePushNotifications.ts` rewrite + session-ready effect + `AppState` listener, (e) Profile toggle rewire, (f) `notify-plan-invite` ticket-error parsing + invalidated filter, (g) iOS pre-prompt UI, (h) HomeFriendCard `Pressable` + ActionSheet, (i) `plan-create` `preselect_friend_id` param. Smoke-test on the dev build between (d) and (h).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pre-prompt:**
- **D-01:** Pre-prompt fires after the user's **first meaningful action** — (a) setting their own status for the first time, OR (b) adding their first friend. Track via single AsyncStorage key `campfire:push_prompt_eligible`. Registration flow checks this key before invoking `requestPermissionsAsync`.
- **D-02:** Copy is value-led: *"Get a heads up when friends are free — we only push when something matters."* Two buttons: "Sounds good" → native iOS prompt; "Not now" → set AsyncStorage flag, defer.
- **D-03:** "Not now" must NOT call `requestPermissionsAsync` — iOS allows the system prompt only once per install.

**DM entry point:**
- **D-04:** Single tap on `HomeFriendCard` opens DM directly via `supabase.rpc('get_or_create_dm_channel', { other_user_id: friend.id })` → `router.push('/chat/room?dm_channel_id=…&friend_name=…')`. Mirrors `src/app/friends/[id].tsx:55-67`. No new visual affordance, no chat-bubble icon.
- **D-05:** Long-press opens an action sheet with **two** actions: "View profile" → `/friends/[id]`, "Plan with..." → `/plan-create?preselect_friend_id=…`. Standard Cancel row included. iOS: `ActionSheetIOS`. Android: fallback (Alert-based or compatible).
- **D-06:** "Plan with..." pre-selection requires a small change to `/plan-create` (verify support; add if missing — IT IS MISSING, see Code Insights below).
- **D-07:** "Send DM" is intentionally NOT in the long-press sheet (single tap already does it).
- **D-08:** **CRITICAL ROUTE CORRECTION:** `/dm/[userId]` does NOT exist. The actual DM route is `/chat/room?dm_channel_id=…&friend_name=…` (verified at `src/app/(tabs)/chat/room.tsx`). Phase 1 must use the real route. Do NOT create a new `/dm/` route.

**EAS dev build:**
- **D-09:** Claude does NOT run `eas` commands and does NOT modify `eas.json`. Claude writes step-by-step instructions, the user runs the build.
- **D-10:** Build instructions and smoke-test checklist live inside `.planning/phases/01-push-infrastructure-dm-entry-point/`, not `docs/` or `README.md`.
- **D-11:** EAS dev build is the **FIRST** deliverable of Phase 1, not the last. All client-side smoke-tests depend on it existing first.

**Notifications toggle:**
- **D-12:** Toggle OFF deletes the row from `push_tokens` server-side (hard delete, not soft-delete). AsyncStorage `campfire:notifications_enabled` is also set to `false` to skip re-registration on next launch.
- **D-13:** Toggle ON re-registers silently — no UI prompt. If iOS permission has been revoked at OS level, silent re-register fails (status !== 'granted') and the toggle reverts. Plan-phase decides UX of failure (Settings deep-link vs inline error).

**Schema:**
- **D-14:** Add `device_id TEXT NOT NULL` (from `expo-device` `Device.osInternalBuildId` or `Constants.installationId`), `last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `invalidated_at TIMESTAMPTZ NULL`. Drop existing unique on `(user_id, token)`, add unique on `(user_id, device_id)`. Backfill: `device_id = 'legacy:' || id`, `last_seen_at = created_at`.
- **D-15:** RLS unchanged in spirit — users SELECT/INSERT/UPDATE/DELETE only their own rows. Server-side fan-out reads via SECURITY DEFINER patterns already established.

**Registration:**
- **D-16:** Move `registerForPushNotifications` invocation OUT of the Profile toggle and INTO a session-ready `useEffect` in `src/app/(tabs)/_layout.tsx`. Effect runs once per authenticated session AND on every `AppState` 'active' transition.
- **D-17:** Profile toggle still works for explicit opt-out — but it is no longer the only registration trigger.

**Channels:**
- **D-18:** Create four new channels at module init: `plan_invites` (MAX, vibration), `friend_free` (HIGH, default sound), `morning_prompt` (DEFAULT, default sound), `system` (LOW, no sound). Existing `default` channel remains dormant (Android channel IDs are immutable). Legacy installs use `default` for plan-invites until reinstall.
- **D-19:** `notify-plan-invite` updates push payload to `channelId: 'plan_invites'`. Documented as known migration tail.

**iOS categories:**
- **D-20:** iOS notification categories registered at **module scope** in `src/app/_layout.tsx` (root), outside any component, BEFORE any `requestPermissionsAsync` call. Single category for v1.3: `morning_prompt` with three actions (Free / Busy / Maybe). Action handlers run inside the authenticated app using existing Supabase session — no public Edge Function, no signed payload.

**Handler placement:**
- **D-21:** `Notifications.setNotificationHandler({...})` called at **module scope** in NEW file `src/lib/notifications-init.ts`, imported once from root `_layout.tsx`. This file also registers categories. Use SDK 55 handler shape (`shouldShowBanner`/`shouldShowList`).

**Stale token cleanup:**
- **D-22:** `notify-plan-invite` parses Expo push ticket-level errors. On `DeviceNotRegistered`: `UPDATE push_tokens SET invalidated_at = now() WHERE token = $1`. Future fan-outs filter `invalidated_at IS NULL`.

### Claude's Discretion
- Pre-prompt visual layout (modal vs bottom sheet vs inline card) — pick whichever best matches existing design patterns. **Recommendation in this research: React Native `Modal` with a centered card** (matches existing `Alert.alert` patterns and StyleSheet-only constraint; no new dep).
- iOS deep-link-to-Settings on toggle-on permission failure — **Recommendation: inline error toast first, optional `Linking.openSettings()` link** (no new dep, lowest blast radius).
- ActionSheetIOS / Android equivalent — **Recommendation: React Native `ActionSheetIOS` on iOS, `Alert.alert` with cancellable buttons on Android.** No new dep. Encapsulated in a tiny `src/lib/action-sheet.ts` helper.
- Smoke-test script structure — Recommendation: markdown checklist in the phase folder.
- Comment density in `notifications-init.ts` — keep brief, link to D-20/D-21 in CONTEXT.md.
- Migration file naming — `0004_push_tokens_v1_3.sql` (matches existing sequential pattern).

### Deferred Ideas (OUT OF SCOPE for Phase 1)
- Compose icon in Chats tab header.
- Visual chat-bubble icon overlay on HomeFriendCard.
- "Send DM" as a long-press action-sheet item.
- Per-friend mute / opt-in for friend availability pushes (v1.4 NOTIF-03).
- Configurable quiet hours (v1.4 NOTIF-02).
- Promoting EAS dev build instructions to top-level `docs/` or README.
- Soft-deletion of `push_tokens` rows for opt-out analytics.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUSH-01 | Token registers automatically on every authenticated launch (not only on toggle) | Session-ready `useEffect` in `(tabs)/_layout.tsx` (D-16); Code Example "Session-Ready Registration" |
| PUSH-02 | Token re-registers when app returns to foreground (catches rotation) | `AppState.addEventListener('change', ...)` pattern in same effect (D-16); Code Example "AppState Foreground Re-register" |
| PUSH-03 | `push_tokens` row tracks `device_id`, `last_seen_at`, `invalidated_at` | Migration in Code Example "0004 push_tokens migration" (D-14, D-15) |
| PUSH-04 | Profile toggle deletes server-side token row | D-12; Code Example "Toggle Off — Hard Delete by device_id" |
| PUSH-05 | Plan-invite push reliably reaches fresh installs | Closed by PUSH-01 (registration moves to session-ready). Edge Function already wired; only the registration gap remains |
| PUSH-06 | iOS notification categories registered at module scope before first permission request | `src/lib/notifications-init.ts` imported from root `_layout.tsx` (D-20, D-21); Code Example "notifications-init.ts" |
| PUSH-07 | Differentiated Android channels (`plan_invites` MAX, `friend_free` HIGH, `morning_prompt` DEFAULT, `system` LOW) | Module-init channel creation in `notifications-init.ts` (D-18); Code Example "Android Channels" |
| PUSH-08 | iOS pre-prompt before system permission modal, deferred to first meaningful action | AsyncStorage `campfire:push_prompt_eligible` gate (D-01..D-03); Code Example "Pre-Prompt Modal" |
| PUSH-09 | Parse Expo ticket-level errors; mark `invalidated_at` | Edge Function update in Code Example "Ticket Error Parsing" (D-22) |
| PUSH-10 | EAS dev build (not Expo Go) | First deliverable, user-run (D-09..D-11); smoke-test checklist in phase folder |
| DM-01 | Tap friend card → DM via `get_or_create_dm_channel` | Code Example "HomeFriendCard Tappable" mirroring `friends/[id].tsx:55-67` (D-04, D-08) |
</phase_requirements>

## Standard Stack

### Already Installed (verified by reading `package.json` 2026-04-06)

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `expo-notifications` | `~55.0.13` | Push tokens, categories, channels, listeners, handler | Official Expo push API; no alternative on Expo managed workflow |
| `expo-device` | `~55.0.9` | Device guard + device-id source | Required for `Device.isDevice` check + stable device identifier |
| `expo-constants` | `~55.0.7` | Read `easConfig.projectId` for `getExpoPushTokenAsync` | Required for SDK 49+ project-scoped tokens |
| `@react-native-async-storage/async-storage` | `2.2.0` | `notifications_enabled` + `push_prompt_eligible` flags | Already used, established pattern |
| `@supabase/supabase-js` | `^2.99.2` | RPC + table reads/writes | Already wired |
| `react-native` | `0.83.2` | `Pressable`, `ActionSheetIOS`, `AppState`, `Alert`, `Modal`, `Linking` | All needed APIs are first-party React Native — no extra deps |

### NOT Adding (per v1.3 zero-new-dep constraint)

| Considered | Decision | Reason |
|------------|----------|--------|
| `@expo/react-native-action-sheet` | NO | Not installed; React Native's `ActionSheetIOS` + `Alert` cross-platform shim is sufficient for the 2-action sheet in D-05 |
| `@gorhom/bottom-sheet` | NO | Not installed; Pre-prompt is a 1-screen moment — built-in `Modal` covers it |
| `expo-application` | NO | Not installed; `expo-device` `Device.osInternalBuildId` (Android) + `Constants.installationId` fallback covers `device_id` (D-14) |

### Verification: package versions are CURRENT

All `expo-*` packages are pinned to `~55.x` and match the SDK 55 release line. Latest published `expo-notifications` is `55.0.16` (per npm); installed `~55.0.13` is compatible (~ allows patch upgrades). No `npm install` required.

## Architecture Patterns

### File Structure (additive only — no folder reorganization)

```
src/
├── app/
│   ├── _layout.tsx                    # MODIFIED: import "@/lib/notifications-init"
│   ├── (tabs)/
│   │   ├── _layout.tsx                # MODIFIED: session-ready useEffect + AppState listener
│   │   └── profile.tsx                # MODIFIED: toggle delete/re-register, no register on mount
│   └── plan-create.tsx                # unchanged (delegates to PlanCreateModal)
├── components/
│   └── home/
│       └── HomeFriendCard.tsx         # MODIFIED: Pressable wrap, onPress (DM), onLongPress (sheet)
├── hooks/
│   └── usePushNotifications.ts        # REWRITTEN: device_id, eligibility gate, delete, last_seen_at
├── lib/
│   ├── notifications-init.ts          # NEW: setNotificationHandler + categories + channels (module scope)
│   └── action-sheet.ts                # NEW: cross-platform ActionSheetIOS/Alert helper
├── screens/
│   └── plans/
│       └── PlanCreateModal.tsx        # MODIFIED: read preselect_friend_id from useLocalSearchParams
└── components/notifications/
    └── PrePromptModal.tsx             # NEW: value-led pre-prompt (D-02 copy)

supabase/
├── migrations/
│   └── 0004_push_tokens_v1_3.sql      # NEW: schema evolution (D-14, D-15)
└── functions/
    └── notify-plan-invite/index.ts    # MODIFIED: invalidated filter + ticket parser + channelId
```

### Pattern 1: Module-Scope Notification Setup
**What:** All `setNotificationHandler`, `setNotificationCategoryAsync`, and `setNotificationChannelAsync` calls live in a single module that runs at JS module load, before any React component mounts.
**When to use:** Always — iOS categories MUST be registered before the first APNs registration call (per Pitfall #4). Module scope guarantees this.
**Why:** Lazy registration in a `useEffect` is the #1 cause of "action buttons silently missing" on iOS. The root layout already imports `expo-notifications` at module scope and calls `setNotificationHandler` outside any component (verified at `src/app/_layout.tsx:15-24`). We simply move that block plus categories + channels into `src/lib/notifications-init.ts` and import it from `_layout.tsx`.

### Pattern 2: Session-Ready Effect with AppState Listener
**What:** A single `useEffect` in the authenticated tabs layout that fires once when `session?.user?.id` becomes truthy AND subscribes to `AppState` change events to re-register on every foreground.
**When to use:** Any token-style state that the OS may rotate.
**Why:** PUSH-01 + PUSH-02 are the same code path. The upsert is idempotent; running it on every foreground costs one round-trip and catches APNs/FCM rotations users never know about.

### Pattern 3: Eligibility-Gated Permission Request
**What:** Before calling `requestPermissionsAsync`, check `AsyncStorage.getItem('campfire:push_prompt_eligible')`. If `null`, do not call — the user has not yet completed a meaningful action. Set the flag from the status-set and add-friend code paths the FIRST time each happens.
**When to use:** iOS permission flows where you only get one shot.
**Why:** D-01..D-03; iOS only shows the system prompt once per install lifetime.

### Pattern 4: Ticket Iteration on Expo Push Send
**What:** After `POST /push/send`, parse the JSON body's `data` array. For each ticket where `status === 'error'` and `details.error === 'DeviceNotRegistered'`, mark the matching token as invalidated.
**When to use:** Every Edge Function that sends Expo pushes.
**Why:** Expo returns ticket-level errors inside HTTP 200 — naive `res.ok` checks miss them.

### Anti-Patterns to Avoid
- **Calling `setNotificationCategoryAsync` inside a `useEffect`** — Pitfall #4. Categories must be at module scope.
- **Registering tokens only when the user toggles a switch** — current bug; the fix point of this entire phase.
- **Soft-deleting tokens on toggle off** — D-12 explicitly chose hard delete for cleaner server-side truth.
- **Renaming the existing Android `default` channel** — Android channel IDs are immutable; create new ones, leave the legacy one dormant (D-18).
- **Calling `requestPermissionsAsync` before the eligibility flag is set** — D-03; you waste the only system prompt iOS allows.
- **Creating a new `/dm/[id]` route** — D-08; the real route is `/chat/room?dm_channel_id=…&friend_name=…`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform action sheet | Custom Modal sheet with backdrop, gestures, dismissal | `ActionSheetIOS.showActionSheetWithOptions` on iOS, `Alert.alert` with array of buttons on Android | Both are first-party RN; native UX on each platform; zero new deps |
| Device identifier | UUID generated on first launch + stored in AsyncStorage (no longer survives reinstall on iOS reliably) | `Device.osInternalBuildId` (Android) and `Constants.installationId` (iOS) — fall back to a generated UUID persisted to AsyncStorage if both null | Already-installed packages; OS-provided where possible; documented Expo pattern |
| Notification handler return shape | Guess `shouldShowAlert` from old SDK docs | Use **`shouldShowBanner` + `shouldShowList`** (the SDK 55 shape; `shouldShowAlert` is deprecated) | Already correct in `src/app/_layout.tsx:16-23`; preserve as-is |
| Expo push receipt schema | Custom error mapping | Treat `details.error === 'DeviceNotRegistered'` as the only "permanently invalid" signal in v1.3; everything else is transient retry | Documented in Expo FAQ; matches existing Edge Function patterns |
| Pre-prompt UI | Bottom sheet library | React Native `Modal` with a card | One-screen moment, lowest dep cost, aligns with StyleSheet-only constraint |

**Key insight:** This phase is NOT a place for new abstractions. Every "library-shaped" need has a one-file vanilla solution. The complexity sits in the *ordering* (categories before permission, dev build before client work, migration before Edge Function update) — not in any individual piece.

## Common Pitfalls

### Pitfall 1: Categories Registered in a useEffect → iOS Action Buttons Silently Missing
**What goes wrong:** `Notifications.setNotificationCategoryAsync('morning_prompt', ...)` placed inside a `useEffect` works for some local notifications but unreliably for remote pushes; Free/Busy/Maybe action buttons never appear on the lock screen.
**Why it happens:** iOS associates categories with the APNs registration done at first `requestPermissionsAsync`. If categories aren't registered when that happens, they're not bound to the token.
**How to avoid:** D-20/D-21 — register at module scope in `src/lib/notifications-init.ts`, imported from root `_layout.tsx`.
**Warning signs:** `setNotificationCategoryAsync` inside any function body that isn't run at module load.

### Pitfall 2: Stale Tokens Silently Drop the User from the Loop
**What goes wrong:** User reinstalls → new token issued → old row sits in `push_tokens` forever; Edge Function sends to dead token, Expo returns ticket error inside HTTP 200, function logs "200 OK", user never gets another push.
**Why it happens:** Ticket errors live in the response body, not as a non-2xx status.
**How to avoid:** D-22 — parse `data[]` after every `POST /push/send`, mark `invalidated_at` on `DeviceNotRegistered`.
**Warning signs:** Edge Function only checks `res.ok` and never iterates the response body.

### Pitfall 3: Composite Unique Migration Without Backfill
**What goes wrong:** Adding `device_id` as `NOT NULL` without backfilling existing rows fails the migration mid-deploy.
**Why it happens:** Existing `push_tokens` rows have no `device_id`.
**How to avoid:** Three-step migration: (1) ADD COLUMN nullable, (2) UPDATE to set `device_id = 'legacy:' || id` and `last_seen_at = COALESCE(last_seen_at, created_at)`, (3) ALTER COLUMN SET NOT NULL, then drop old unique and add new one.
**Warning signs:** Migration uses a single `ALTER TABLE ... ADD COLUMN device_id TEXT NOT NULL`.

### Pitfall 4: iOS Permission Wasted on First Launch
**What goes wrong:** App calls `requestPermissionsAsync` on first launch before the user has any reason to care; user taps "Don't Allow"; iOS will never show the modal again for that install.
**Why it happens:** Standard Expo template calls it eagerly.
**How to avoid:** D-01..D-03 — gate behind `campfire:push_prompt_eligible` set only after the first status-set or first-friend-add.
**Warning signs:** `requestPermissionsAsync` called from a top-level effect with no eligibility check.

### Pitfall 5: Module Import Order Defeats Module-Scope Setup
**What goes wrong:** `notifications-init.ts` is imported lazily (inside a function) so the module load is deferred past the first permission request.
**Why it happens:** Expo Router uses lazy chunk loading for routes, but root `_layout.tsx` is loaded eagerly. A static `import "@/lib/notifications-init"` at the top of `src/app/_layout.tsx` runs at JS startup, BEFORE any component renders. **Verified safe** — the existing `setNotificationHandler` block in `_layout.tsx` already runs at module scope and works for the plan-invite path. The same module-load semantics apply to a sibling `import` line.
**How to avoid:** Use a top-of-file static `import` from `_layout.tsx`. Do NOT use dynamic `import()` or import from inside a hook.
**Warning signs:** `notifications-init` imported anywhere except the top of `src/app/_layout.tsx`.

### Pitfall 6: HomeFriendCard `onLongPress` Cancels Scroll
**What goes wrong:** Wrapping the card in `Pressable` with `onLongPress` may consume scroll gestures on the FlatList.
**Why it happens:** `Pressable` defaults claim the touch responder when long-press is enabled.
**How to avoid:** Use `delayLongPress={400}` and avoid `onPressIn`. React Native's gesture responder system handles scroll vs press correctly when only `onPress` and `onLongPress` are set without `onPressIn`. Test on the EAS dev build before declaring done.
**Warning signs:** Friend list scroll feels sticky or unresponsive after the change.

### Pitfall 7: `/plan-create` Pre-Selection Has No Hook
**What goes wrong:** Long-press → "Plan with..." routes to `/plan-create?preselect_friend_id=<id>` but `PlanCreateModal` ignores the param. Verified by reading `src/screens/plans/PlanCreateModal.tsx` lines 47-68 — it uses `useRouter()` (no `useLocalSearchParams`) and seeds `selectedFriendIds` only from `data.filter(f => f.status === 'free')`.
**Why it happens:** No prior phase needed it.
**How to avoid:** Add 3 lines: `import { useLocalSearchParams }`; `const { preselect_friend_id } = useLocalSearchParams<{ preselect_friend_id?: string }>();`; in the `useEffect` after `setFriends(data)`, if `preselect_friend_id` is set, replace the free-friends seed with `new Set([preselect_friend_id])`.
**Warning signs:** Long-press → Plan with... opens an empty selection.

## Code Examples

### `src/lib/notifications-init.ts` (NEW — module scope)

```typescript
// Module-scope notification setup. Imported once from src/app/_layout.tsx.
// This file MUST be imported before any component renders so iOS categories
// are bound to the APNs registration at first requestPermissionsAsync.
// See CONTEXT.md D-20, D-21.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // Foreground presentation handler — SDK 55 shape (shouldShowBanner/shouldShowList)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // iOS category for the morning prompt — Free / Busy / Maybe
  // Action handlers run inside the authenticated app (D-20)
  Notifications.setNotificationCategoryAsync('morning_prompt', [
    { identifier: 'free',  buttonTitle: 'Free',  options: { opensAppToForeground: true } },
    { identifier: 'busy',  buttonTitle: 'Busy',  options: { opensAppToForeground: true } },
    { identifier: 'maybe', buttonTitle: 'Maybe', options: { opensAppToForeground: true } },
  ]).catch(() => {
    // Categories are not supported in Expo Go; safe to swallow
  });

  // Android channels — D-18
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('plan_invites', {
      name: 'Plan invites',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
    Notifications.setNotificationChannelAsync('friend_free', {
      name: 'Friend availability',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    Notifications.setNotificationChannelAsync('morning_prompt', {
      name: 'Daily status check-in',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    Notifications.setNotificationChannelAsync('system', {
      name: 'System',
      importance: Notifications.AndroidImportance.LOW,
    });
    // Note: existing 'default' channel is dormant — Android channel IDs are immutable
  }
}
```

### `src/app/_layout.tsx` — module-scope import (1-line change)

```typescript
// Add at top of file, BEFORE any other code:
import '@/lib/notifications-init';
// Then DELETE the existing setNotificationHandler block (lines 15-24)
// since it's now in notifications-init.ts.
```

### `src/hooks/usePushNotifications.ts` (REWRITE)

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const NOTIFICATIONS_ENABLED_KEY = 'campfire:notifications_enabled';
const PUSH_PROMPT_ELIGIBLE_KEY  = 'campfire:push_prompt_eligible';

function getDeviceId(): string {
  // D-14: stable per-install identifier
  // Android: osInternalBuildId; iOS: installationId; fallback: persisted UUID
  return (
    Device.osInternalBuildId ??
    Constants.installationId ??
    // Last-resort fallback persisted on first call
    `fallback:${Constants.sessionId ?? 'unknown'}`
  );
}

export async function markPushPromptEligible(): Promise<void> {
  await AsyncStorage.setItem(PUSH_PROMPT_ELIGIBLE_KEY, 'true');
}

export async function isPushPromptEligible(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_PROMPT_ELIGIBLE_KEY)) === 'true';
}

/**
 * Register the device's Expo push token. Idempotent — safe to call on every
 * session-ready transition and every AppState 'active' event (PUSH-01, PUSH-02).
 *
 * Returns 'registered' on success, 'skipped' on opt-out or no permission,
 * 'not_eligible' if the user has not yet completed a meaningful action (D-01..D-03),
 * 'permission_denied' if iOS rejected.
 */
export async function registerForPushNotifications(
  userId: string,
  opts: { skipEligibilityCheck?: boolean } = {}
): Promise<'registered' | 'skipped' | 'not_eligible' | 'permission_denied'> {
  if (!Device.isDevice) return 'skipped';

  // Per-device opt-out (D-12)
  const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  if (enabled === 'false') return 'skipped';

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    // D-01..D-03: only request when user has earned a meaningful moment
    if (!opts.skipEligibilityCheck && !(await isPushPromptEligible())) {
      return 'not_eligible';
    }
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return 'permission_denied';

  const projectId =
    Constants?.easConfig?.projectId ??
    Constants?.expoConfig?.extra?.eas?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const deviceId = getDeviceId();

  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      device_id: deviceId,
      token,
      platform: Platform.OS,
      last_seen_at: new Date().toISOString(),
      invalidated_at: null,
    },
    { onConflict: 'user_id,device_id' }
  );

  return 'registered';
}

/**
 * Hard-delete the device's token row server-side (D-12) and set the local opt-out flag.
 */
export async function unregisterForPushNotifications(userId: string): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
  const deviceId = getDeviceId();
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId);
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return stored !== 'false';
}

export async function setNotificationsEnabledFlag(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
}
```

### Session-Ready Registration in `src/app/(tabs)/_layout.tsx`

```typescript
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { registerForPushNotifications } from '@/hooks/usePushNotifications';

// Inside TabsLayout component, add (PUSH-01, PUSH-02):
const userId = useAuthStore((s) => s.session?.user?.id);
const appState = useRef<AppStateStatus>(AppState.currentState);

useEffect(() => {
  if (!userId) return;

  // Initial register on session-ready
  registerForPushNotifications(userId).catch(() => {});

  // Foreground re-register on every AppState 'active' transition
  const sub = AppState.addEventListener('change', (next) => {
    if (appState.current.match(/inactive|background/) && next === 'active') {
      registerForPushNotifications(userId).catch(() => {});
    }
    appState.current = next;
  });

  return () => sub.remove();
}, [userId]);
```

### `src/lib/action-sheet.ts` (NEW — cross-platform helper)

```typescript
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ActionSheetItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/**
 * Cross-platform action sheet. iOS uses native ActionSheetIOS;
 * Android uses Alert with cancellable buttons (no new dep — D-05).
 */
export function showActionSheet(title: string, items: ActionSheetItem[]): void {
  if (Platform.OS === 'ios') {
    const labels = [...items.map((i) => i.label), 'Cancel'];
    const cancelButtonIndex = labels.length - 1;
    const destructiveButtonIndex = items.findIndex((i) => i.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: labels,
        cancelButtonIndex,
        destructiveButtonIndex: destructiveButtonIndex === -1 ? undefined : destructiveButtonIndex,
      },
      (idx) => {
        if (idx !== cancelButtonIndex && items[idx]) items[idx].onPress();
      }
    );
  } else {
    Alert.alert(
      title,
      undefined,
      [
        ...items.map((i) => ({
          text: i.label,
          style: (i.destructive ? 'destructive' : 'default') as 'destructive' | 'default',
          onPress: i.onPress,
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  }
}
```

### Tappable `src/components/home/HomeFriendCard.tsx`

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import { supabase } from '@/lib/supabase';
import { showActionSheet } from '@/lib/action-sheet';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface HomeFriendCardProps {
  friend: FriendWithStatus;
  showStatusPill?: boolean;
}

export function HomeFriendCard({ friend, showStatusPill = false }: HomeFriendCardProps) {
  const router = useRouter();

  // Single tap → DM (D-04, D-08) — mirrors src/app/friends/[id].tsx:55-67
  async function handlePress() {
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: friend.friend_id, // confirm property name from FriendWithStatus
    });
    if (error || !data) {
      Alert.alert('Error', "Couldn't open chat. Try again.");
      return;
    }
    router.push(
      `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(friend.display_name)}` as never
    );
  }

  // Long-press → action sheet (D-05) — View profile / Plan with...
  function handleLongPress() {
    showActionSheet(friend.display_name, [
      {
        label: 'View profile',
        onPress: () => router.push(`/friends/${friend.friend_id}` as never),
      },
      {
        label: `Plan with ${friend.display_name.split(' ')[0]}...`,
        onPress: () =>
          router.push(`/plan-create?preselect_friend_id=${friend.friend_id}` as never),
      },
    ]);
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${friend.display_name}, ${friend.status}. Tap to message, long press for more.`}
    >
      {/* ... existing inner JSX unchanged ... */}
    </Pressable>
  );
}

// styles add:
//   pressed: { opacity: 0.7 }
```

> **Note:** Confirm exact property name on `FriendWithStatus` — likely `friend_id`. The existing card uses `friend.display_name`, `friend.avatar_url`, `friend.status`, `friend.context_tag`. The DM RPC takes `other_user_id`.

### `src/screens/plans/PlanCreateModal.tsx` — pre-selection (3-line addition)

```typescript
// At top, add useLocalSearchParams to existing expo-router import:
import { useRouter, useLocalSearchParams } from 'expo-router';

// Inside PlanCreateModal(), after const router = useRouter():
const { preselect_friend_id } = useLocalSearchParams<{ preselect_friend_id?: string }>();

// Modify the existing useEffect (lines 60-68) to honor preselect:
useEffect(() => {
  fetchFriends().then(({ data }) => {
    if (data) {
      setFriends(data);
      if (preselect_friend_id) {
        setSelectedFriendIds(new Set([preselect_friend_id]));
      } else {
        const freeFriendIds = data.filter((f) => f.status === 'free').map((f) => f.friend_id);
        setSelectedFriendIds(new Set(freeFriendIds));
      }
    }
  });
}, [preselect_friend_id]);
```

### `supabase/migrations/0004_push_tokens_v1_3.sql` (NEW)

```sql
-- Phase 1 v1.3: evolve push_tokens for device-scoped uniqueness + stale-token reaping
-- D-14, D-15

-- Step 1: add columns nullable
ALTER TABLE public.push_tokens
  ADD COLUMN device_id TEXT,
  ADD COLUMN last_seen_at TIMESTAMPTZ,
  ADD COLUMN invalidated_at TIMESTAMPTZ;

-- Step 2: backfill legacy rows
UPDATE public.push_tokens
   SET device_id = 'legacy:' || id::text,
       last_seen_at = COALESCE(last_seen_at, created_at)
 WHERE device_id IS NULL;

-- Step 3: enforce NOT NULL on device_id and last_seen_at
ALTER TABLE public.push_tokens
  ALTER COLUMN device_id SET NOT NULL,
  ALTER COLUMN last_seen_at SET NOT NULL,
  ALTER COLUMN last_seen_at SET DEFAULT now();

-- Step 4: swap unique constraint
ALTER TABLE public.push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_token_key;
CREATE UNIQUE INDEX idx_push_tokens_user_device
  ON public.push_tokens (user_id, device_id);

-- Step 5: partial index for active-token reads in fan-out
CREATE INDEX idx_push_tokens_active
  ON public.push_tokens (user_id)
  WHERE invalidated_at IS NULL;

-- RLS unchanged — existing "Users manage own push tokens" policy covers all CRUD (D-15)
```

### `supabase/functions/notify-plan-invite/index.ts` — minimal updates (D-19, D-22)

```typescript
// Change 1: filter invalidated tokens
const tokensResult = await supabase
  .from('push_tokens')
  .select('token')
  .eq('user_id', record.user_id)
  .is('invalidated_at', null);  // NEW

// Change 2: add channelId for new installs
const messages = tokens.map((token) => ({
  to: token,
  sound: 'default' as const,
  title: 'Plan invite',
  body: `${inviterName} invited you to ${planTitle}`,
  data: { planId: record.plan_id },
  channelId: 'plan_invites',  // NEW (D-19) — legacy installs ignore unknown channel
}));

// Change 3: parse ticket-level errors and mark stale tokens (D-22)
interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}
interface ExpoSendResponse {
  data?: ExpoTicket[];
  errors?: unknown[];
}

const res = await fetch('https://exp.host/--/api/v2/push/send', { /* ... */ });
const body = (await res.json()) as ExpoSendResponse;

if (body.data) {
  const invalidatedTokens: string[] = [];
  body.data.forEach((ticket, idx) => {
    if (
      ticket.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered'
    ) {
      invalidatedTokens.push(tokens[idx]);
    }
  });
  if (invalidatedTokens.length > 0) {
    await supabase
      .from('push_tokens')
      .update({ invalidated_at: new Date().toISOString() })
      .in('token', invalidatedTokens);
  }
}

return new Response(JSON.stringify(body), {
  headers: { 'Content-Type': 'application/json' },
});
```

### `src/components/notifications/PrePromptModal.tsx` (NEW — sketch)

```typescript
// Value-led pre-prompt; D-02 copy. Modal-based (Claude's discretion).
// Render conditionally from the call site that just marked the user eligible
// (e.g., after first status set or first friend add).
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

interface PrePromptModalProps {
  visible: boolean;
  onAccept: () => void;  // proceeds to native iOS prompt
  onDecline: () => void; // sets local "not now" flag, dismisses
}

export function PrePromptModal({ visible, onAccept, onDecline }: PrePromptModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.body}>
            Get a heads up when friends are free — we only push when something matters.
          </Text>
          <Pressable style={styles.primary} onPress={onAccept}>
            <Text style={styles.primaryLabel}>Sounds good</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onDecline}>
            <Text style={styles.secondaryLabel}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
// styles: backdrop overlay, centered card with COLORS.surface.card,
// SPACING.lg padding, RADII.lg, primary button accent, secondary text-only.
```

### `app.config.ts` — plugin tuple form

```typescript
plugins: [
  'expo-router',
  '@react-native-community/datetimepicker',
  [
    'expo-notifications',
    {
      icon: './assets/images/notification-icon.png', // Android-only; 96x96 white-on-transparent PNG
      color: '#ff6b35',                              // Campfire orange (Android tint)
      // sounds: ['./assets/sounds/ping.wav'],         // omit unless we ship a custom sound
      mode: 'production',                            // APNs environment
    },
  ],
],
```

> **Asset prerequisite:** confirm `./assets/images/notification-icon.png` exists. If it doesn't, the plan must include either creating it or omitting the `icon` key (Android falls back to the app icon, which is acceptable for v1.3).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setNotificationHandler` returning `shouldShowAlert: true` | `setNotificationHandler` returning `shouldShowBanner` + `shouldShowList` separately | Expo SDK 53+ | Already correct in this codebase; preserve |
| `expo-notifications` config in `app.json` `notification:` field | `expo-notifications` config plugin tuple in `plugins:` array | Expo SDK 55 (the old field was REMOVED — prebuild errors if present) | Must convert from bare-string to tuple form |
| `pg_net` from inside a trigger | Database Webhook → Edge Function (queue table pattern for v1.3 phase 3) | Phase 3 milestone, not phase 1 | N/A this phase |
| Single Android channel | Differentiated channels per notification kind | Always best practice; v1.3 implements | Legacy installs keep using `default`; new installs use `plan_invites` |

**Deprecated/outdated:**
- `shouldShowAlert` — replaced by `shouldShowBanner`/`shouldShowList`. Do not reintroduce.
- `app.json` `notification:` field — removed in SDK 55, throws on prebuild.

## Open Questions

1. **Does `./assets/images/notification-icon.png` exist?**
   - What we know: it's the conventional path; `app.config.ts` currently has no plugin options.
   - What's unclear: whether it's been authored.
   - Recommendation: plan-phase task should `ls assets/images/` early and either reference an existing file or omit the `icon` key.

2. **`Device.osInternalBuildId` vs `Constants.installationId` survivability.**
   - What we know: `osInternalBuildId` is Android-only; `Constants.installationId` is being phased out across SDKs but still present in SDK 55.
   - What's unclear: whether `installationId` is stable across reinstalls on iOS in SDK 55. Documented behavior suggests it survives within the app's keychain but not across full uninstall.
   - Recommendation: accept the trade-off — a reinstall produces a fresh `device_id`, and the old row gets reaped via `last_seen_at` staleness or `DeviceNotRegistered` ticket error. Both safety nets are in scope this phase.

3. **Database Webhook retry semantics.**
   - What we know: Supabase Database Webhooks retry on non-2xx response.
   - What's unclear: exact retry policy (count, backoff, dead-letter behavior).
   - Recommendation: treat retries as opaque — Edge Function must be idempotent (the ticket-error parser is, since `UPDATE ... WHERE token = $1` is deterministic). Don't depend on retries for correctness.

4. **`FriendWithStatus.friend_id` confirmation.**
   - What we know: existing code at `src/app/friends/[id].tsx:65` uses `id` (route param), and `PlanCreateModal` uses `item.friend_id`.
   - Recommendation: plan-phase reads `src/hooks/useFriends.ts` to confirm the field name on `FriendWithStatus` before writing the HomeFriendCard tap handler.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None installed for unit/integration**. Devtools present: `@playwright/test ^1.58.2` (Playwright is browser/web only — not applicable to RN native paths). No `jest`, `vitest`, `@testing-library/react-native`, or `detox` in `package.json`. |
| Config file | none |
| Quick run command | n/a — see Wave 0 |
| Full suite command | `npm run lint` (only existing automated check besides TS) + `npx tsc --noEmit` |
| Manual smoke-test | EAS dev build + checklist in `.planning/phases/01-push-infrastructure-dm-entry-point/SMOKE-TEST.md` |

**Reality check:** This is a React Native + Expo app with no test infrastructure beyond ESLint + TypeScript. Per CONTEXT.md constraints, **Phase 1 is not the right place to introduce a test framework** (no new deps allowed for v1.3). Validation strategy must combine:
1. **Static checks:** `npm run lint` and `tsc --noEmit` block on every commit (existing).
2. **Manual smoke-test on EAS dev build:** authoritative for push delivery, action sheet, channels (the dev build is required by D-11 anyway).
3. **SQL-level migration test:** apply migration to a scratch Supabase database and verify backfill + composite unique.
4. **Edge Function dry-run:** invoke `notify-plan-invite` from the Supabase dashboard with a fabricated webhook payload after seeding a `DeviceNotRegistered` token, verify `invalidated_at` flips.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated? | Validation Action |
|--------|----------|-----------|------------|-------------------|
| PUSH-01 | Token registers on session-ready | manual + DB inspect | NO (no RN test runner) | Smoke: fresh install → log in → check `select * from push_tokens where user_id = …` |
| PUSH-02 | Token re-registers on foreground | manual + DB inspect | NO | Smoke: background app 30s → foreground → check `last_seen_at` advanced |
| PUSH-03 | Schema has `device_id`, `last_seen_at`, `invalidated_at` + composite unique | SQL | YES (via migration apply + `\d push_tokens`) | `psql -c "\d public.push_tokens"` after migration |
| PUSH-04 | Toggle OFF deletes row by `(user_id, device_id)` | manual + DB inspect | NO | Smoke: toggle off → row count = 0 for that device; toggle on → row reappears |
| PUSH-05 | Plan-invite reaches fresh install | manual end-to-end | NO | Smoke: 2 EAS dev builds, user A invites B, B receives push within 5s |
| PUSH-06 | iOS action buttons visible on `morning_prompt` category | manual on EAS build | NO | Smoke: send a push with `categoryIdentifier: 'morning_prompt'` from Expo Push Tool, pull down notification, see Free/Busy/Maybe |
| PUSH-07 | Android channels exist with correct importance | manual on EAS build | NO | Smoke: Android Settings → Apps → Campfire → Notifications → see four channels |
| PUSH-08 | Pre-prompt fires only after first meaningful action | manual | NO | Smoke: fresh install → no system prompt; set status → pre-prompt appears |
| PUSH-09 | `DeviceNotRegistered` marks `invalidated_at` | Edge Function dry-run | YES (one-off curl + SQL) | Seed dead token, invoke function via Supabase dashboard, verify `invalidated_at IS NOT NULL` |
| PUSH-10 | EAS dev build exists | user-run | NO | User confirms `eas build --profile development` succeeded and the .ipa/.apk installs |
| DM-01 | Tap friend card opens DM | manual | NO | Smoke: tap any HomeFriendCard, lands on `/chat/room?dm_channel_id=…` |

### Sampling Rate

- **Per task commit:** `npm run lint && npx tsc --noEmit` (existing static checks).
- **Per wave merge:** Migration applied to a scratch Supabase project + Edge Function dry-run test.
- **Phase gate:** Full smoke-test checklist green on EAS dev build before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `.planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md` — step-by-step `eas build --profile development` user runbook (D-09, D-10).
- [ ] `.planning/phases/01-push-infrastructure-dm-entry-point/SMOKE-TEST.md` — manual checklist mapped 1:1 to PUSH-01..10 + DM-01.
- [ ] No automated test framework will be added in this phase (zero-new-deps constraint). The lint + tsc + manual-checklist combination is the validation surface.
- [ ] Plan-phase decision: should `EAS-BUILD-INSTRUCTIONS.md` be authored by the user or by Claude? Per D-09, **Claude writes the instructions**, the user runs the commands.

## Sources

### Primary (HIGH confidence)
- Direct read: `package.json`, `app.config.ts`, `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/profile.tsx`, `src/app/friends/[id].tsx`, `src/app/plan-create.tsx`, `src/screens/plans/PlanCreateModal.tsx`, `src/components/home/HomeFriendCard.tsx`, `src/hooks/usePushNotifications.ts`, `supabase/migrations/0003_push_tokens.sql`, `supabase/functions/notify-plan-invite/index.ts`
- `.planning/research/SUMMARY.md`, `STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`
- `.planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md` (22 locked decisions)
- [Expo Notifications SDK Documentation (latest)](https://docs.expo.dev/versions/latest/sdk/notifications/) — confirms `setNotificationHandler` shape, plugin tuple options, channel API
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — config plugin tuple form for SDK 55
- [Expo Push Notifications FAQ — DeviceNotRegistered](https://docs.expo.dev/push-notifications/faq/) — ticket error schema
- [Expo Send Notifications](https://docs.expo.dev/push-notifications/sending-notifications/) — `/push/send` and `/push/getReceipts` schemas

### Secondary (MEDIUM confidence)
- [expo-notifications npm page](https://www.npmjs.com/package/expo-notifications) — confirms latest SDK 55 release line (55.0.16) compatible with installed `~55.0.13`
- [Expo SDK 55 Beta Changelog](https://expo.dev/changelog/sdk-55-beta) — confirms removal of `app.json` `notification:` field

### Tertiary (LOW confidence — flagged in Open Questions)
- `Device.osInternalBuildId` / `Constants.installationId` exact reinstall survivability on SDK 55 (mitigated by ticket-error reaping + `last_seen_at`)
- Database Webhook retry policy specifics (mitigated by idempotent function design)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct package.json read, zero new deps verified
- Architecture: HIGH — every integration point grounded in actual file/line citations
- Pitfalls: HIGH — three are reproductions of documented Expo gotchas, four are codebase-specific findings (route correction, missing pre-selection, AppState wiring, eligibility gate)
- Validation: MEDIUM — no test framework exists; the manual+static combination is honest about that constraint

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (Expo SDK 55 release line is stable; Supabase patterns are stable)
