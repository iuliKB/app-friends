---
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - src/__mocks__/theme.js
  - src/app/(tabs)/squad.tsx
  - src/app/_layout.tsx
  - src/app/chat/_layout.tsx
  - src/app/chat/room.tsx
  - src/app/friends/[id].tsx
  - src/app/squad/birthday/[id].tsx
  - src/components/common/CustomTabBar.tsx
  - src/components/common/__tests__/CustomTabBar.test.tsx
  - src/components/home/FriendSwipeCard.tsx
  - src/components/home/HomeFriendCard.tsx
  - src/components/home/OverflowChip.tsx
  - src/components/home/RadarBubble.tsx
  - src/lib/__tests__/openChat.test.ts
  - src/lib/openChat.ts
  - src/screens/chat/ChatListScreen.tsx
  - src/screens/chat/ChatRoomScreen.tsx
  - src/screens/chat/__tests__/ChatRoomScreen.surface.test.tsx
  - src/screens/plans/PlanDashboardScreen.tsx
  - src/stores/__tests__/useNavigationStore.test.ts
  - src/stores/useNavigationStore.ts
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 30 replaces the navigator-topology-based bottom-tab-bar visibility guard with a single zustand `useNavigationStore` slice plus a `useFocusEffect` writer in `ChatRoomScreen.tsx`, and consolidates 13 inline `router.push('/chat/room?...')` callsites into one `openChat()` helper.

The producer/consumer wiring is **architecturally sound but incomplete**:
- Reader (`CustomTabBar`) and chat writer (`ChatRoomScreen`) are correct and tested.
- However, only the **chat** surface has a producer. `PlanDashboardScreen`, modal routes (`/plan-create`, `/squad/birthday/[id]`, `/friends/[id]`), and the auth stack do NOT write to the store. This leaves a visible behavioral gap that the existing tests document but do not fix — see WR-01 below.

The `openChat` helper is **clean for the dmChannel/plan/group branches but has a loading-state leak on the dmFriend branch** if `supabase.rpc` throws (vs. returning `{ error }`). See WR-02.

A pre-existing **double-decode bug** in `src/app/squad/birthday/[id].tsx:35` is in the review scope because the file was migrated as one of the 12 callsites. See WR-03.

No XSS or hardcoded-secrets risks were found. All `router.push()` URLs interpolate either UUIDs (Supabase ids) or names that pass through `encodeURIComponent`. No `eval`, no `dangerouslySetInnerHTML`, no shell exec. Test mocks at `src/__mocks__/theme.js` were **expanded, not stripped** — no test coverage was removed (verified via `git log -- src/__mocks__/theme.js`).

## Warnings

### WR-01: ChatRoomScreen `useFocusEffect` cleanup leaks the tab bar when pushing non-tabs surfaces on top

**File:** `src/screens/chat/ChatRoomScreen.tsx:126-131`
**Issue:** The cleanup unconditionally restores `'tabs'`:
```tsx
useFocusEffect(
  useCallback(() => {
    setSurface('chat');
    return () => setSurface('tabs');
  }, [setSurface])
);
```
This is correct when the user navigates BACK to a tabs screen, but incorrect when the user navigates FORWARD to another non-tabs surface (e.g., from a group chat tapping a `/friends/[id]` link, or from any screen pushing `/plan-create` modal). The chat screen loses focus → cleanup runs → surface flips to `'tabs'` → `CustomTabBar` renders → tab bar leaks through under the new screen until that screen mounts and writes its own surface (which it doesn't, because only ChatRoomScreen is a writer — see WR-04).

The task description explicitly called out this concern. The current code does not guard against it.

**Fix:** Either (a) make cleanup conditional on the next surface being tabs, or (b) add the missing producers (WR-04) so the next screen overwrites `'tabs'` before paint. Option (a) requires knowing the destination, which `useFocusEffect` doesn't surface. Option (b) is the cleaner fix. Minimum correct cleanup:
```tsx
return () => {
  // Only restore tabs if no other producer has claimed the surface.
  // If a sibling screen has already written 'plan'/'modal'/'auth',
  // do not overwrite it.
  if (useNavigationStore.getState().currentSurface === 'chat') {
    setSurface('tabs');
  }
};
```
This is still racey (the next screen's focus effect runs after this cleanup), so the durable fix is to add the missing producers per WR-04.

### WR-02: `openChat` leaks `loadingDM=true` if `supabase.rpc` throws (not returns error)

**File:** `src/lib/openChat.ts:101-110`
**Issue:** The dmFriend branch calls `onLoadingChange(true)` before the RPC and `onLoadingChange(false)` after, but only on the happy path:
```ts
options?.onLoadingChange?.(true);
const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
  other_user_id: params.friendId,
});
options?.onLoadingChange?.(false);   // <-- skipped if rpc throws
```
If `supabase.rpc` rejects (network error, JS exception inside the supabase-js client, unexpected throw), the second `onLoadingChange(false)` is never invoked and the caller's `loadingDM` state stays `true` forever, with the spinner pinned in the sheet.

`src/app/(tabs)/squad.tsx:204-211` wraps the call in `try { await openChat(...) } finally { handleCloseSheet(); }` — but `handleCloseSheet` does NOT reset `loadingDM`, only sheet visibility and selected friend. So the loading state is leaked.

**Fix:** Move the `onLoadingChange(false)` into a `finally` block so it always fires:
```ts
options?.onLoadingChange?.(true);
let data: string | null = null;
let error: unknown = null;
try {
  ({ data, error } = await supabase.rpc('get_or_create_dm_channel', {
    other_user_id: params.friendId,
  }));
} finally {
  options?.onLoadingChange?.(false);
}
if (error || !data) {
  alertError(options?.silentError);
  return;
}
router.push(buildDmUrl(data, params.friendName) as never);
```
Also add a unit test asserting `onLoadingChange(false)` is still called when the RPC promise rejects.

### WR-03: `decodeURIComponent` double-decode crash in `squad/birthday/[id].tsx` for names containing literal `%`

**File:** `src/app/squad/birthday/[id].tsx:35`
**Issue:** `expo-router`'s `useLocalSearchParams` already returns URL-decoded values. The route explicitly decodes again:
```tsx
const friendName = name ? decodeURIComponent(name) : 'Friend';
```
For most names this is a no-op (no `%` in the decoded string), but for a `display_name` containing a literal `%` character (e.g., `"50% Off Party"`), the sequence is:
1. Caller `squad/birthdays.tsx:231` encodes: `"50% Off Party"` → `50%25%20Off%20Party`.
2. Router & `useLocalSearchParams` decode once: `"50% Off Party"`.
3. `decodeURIComponent("50% Off Party")` throws `URIError: URI malformed` (the `% ` is an invalid percent-escape).

This crashes the route. While `%` in display names is rare, it's user-controllable input. The same pattern is NOT present in the new `openChat` helper or in `chat/room.tsx` — `room.tsx` correctly reads `friend_name` without re-decoding.

**Fix:** Remove the redundant `decodeURIComponent`:
```tsx
const friendName = name ?? 'Friend';
```
Or wrap in try/catch and fall back to the raw value.

### WR-04: Incomplete migration — `'plan'`, `'modal'`, and `'auth'` surfaces have no producers

**File:** `src/stores/useNavigationStore.ts:19` (type) + `src/screens/plans/PlanDashboardScreen.tsx` (missing writer) + `src/app/_layout.tsx` (missing modal/auth writers)
**Issue:** The `NavigationSurface` union declares 5 literals, and the test file `src/components/common/__tests__/CustomTabBar.test.tsx:76-92` asserts that the bar hides for `'plan'`, `'modal'`, and `'auth'`. But **no screen ever writes those values**. Verified via:
```bash
grep -rn "setSurface\|useNavigationStore.*setSurface" src/ --include='*.tsx'
# Only hit: src/screens/chat/ChatRoomScreen.tsx:128-129
```
This means:
- The unit test passes (because it manually sets the surface), but the integration path is dead.
- Combined with WR-01, the chat blur-cleanup unconditionally resets to `'tabs'`, so even if a non-tabs screen IS pushed on top of chat, the bar surfaces under it for at least one render until the navigator finishes the transition.

The Phase 30 PATTERNS doc presumably documents which screens are responsible for writing surfaces; this should be enforced.

**Fix:** Add `useFocusEffect` writers to:
- `src/screens/plans/PlanDashboardScreen.tsx` → writes `'plan'` on focus, restores `'tabs'` on blur.
- `src/app/plan-create.tsx` (or wherever the modal lives) → writes `'modal'`.
- `src/app/(auth)/_layout.tsx` (or each auth screen) → writes `'auth'`.

Each one mirrors ChatRoomScreen's pattern. Without these, the type-union and the test coverage for them are aspirational.

### WR-05: `friends/[id].tsx` `handleStartDM` passes `string | undefined` as `friendId` (type-erased via `as never` chain)

**File:** `src/app/friends/[id].tsx:89-96`
**Issue:**
```tsx
const params = useLocalSearchParams<{ id: string | string[] }>();
const id = Array.isArray(params.id) ? params.id[0] : params.id;  // id: string | undefined
...
async function handleStartDM() {
  if (!profile) return;
  await openChat(router, {
    kind: 'dmFriend',
    friendId: id,            // <-- type is `string | undefined`, not `string`
    friendName: profile.display_name,
  });
}
```
The `openChat` signature requires `friendId: string` for the `dmFriend` variant. The guard `if (!profile)` doesn't narrow `id`. If TypeScript strict mode is on, this should be a compile error — yet it isn't being flagged, suggesting either:
- `OpenChatParams` is being inferred too loosely at the callsite, OR
- An implicit `as never` / `unknown` cast somewhere is swallowing the mismatch.

If `id` is `undefined` at runtime (URL navigated to without an id param), the Supabase RPC receives `other_user_id: undefined`, which serializes to `null` over the wire — Supabase returns an error and the user sees a generic "Couldn't open chat" alert with no debug context.

**Fix:** Guard `id` explicitly, or move the guard up so TS narrows it:
```tsx
async function handleStartDM() {
  if (!profile || !id) return;
  await openChat(router, {
    kind: 'dmFriend',
    friendId: id,            // now narrowed to `string`
    friendName: profile.display_name,
  });
}
```
Same pattern applies anywhere else where `id` from `useLocalSearchParams` is passed straight through.

## Info

### IN-01: `ChatListScreen.handleChatPress` does not await `openChat`

**File:** `src/screens/chat/ChatListScreen.tsx:33-58`
**Issue:** `openChat` returns a `Promise<void>` but the three calls inside `handleChatPress` discard the promise without `await`. For the three synchronous variants used here (`plan`, `group`, `dmChannel`) this is harmless because no awaited work happens, but it bypasses the eslint `no-floating-promises` rule and would silently mask any future regression if a fourth variant is added that does awaited work.
**Fix:** Either `await openChat(...)` and make `handleChatPress` async, or explicitly mark intent: `void openChat(...)`.

### IN-02: `chat/room.tsx` race between `navigation.setOptions({ title })` and `ChatRoomScreen`'s `headerTitle` JSX

**File:** `src/app/chat/room.tsx:15-19` ↔ `src/screens/chat/ChatRoomScreen.tsx:138-156`
**Issue:** Both write to `navigation.setOptions`:
- `room.tsx` line 15-19 sets `title: friend_name` when `friend_name` is truthy (fires for both DM AND group routes).
- `ChatRoomScreen.tsx` line 138-156 sets `headerTitle: () => <TouchableOpacity>...` for group chats only.

Order is not guaranteed; for group chats the second effect's `headerTitle` should win (because it runs later in the child component tree), but during a re-render where `friend_name` changes (e.g., the title-strip on group routes), both effects could race. This is pre-existing, not introduced by Phase 30, but it sits in the migrated callsite list.
**Fix:** Move the `title` write into `ChatRoomScreen` and gate by route variant, so there is one writer.

### IN-03: Mock `theme.js` missing keys that source code references

**File:** `src/__mocks__/theme.js`
**Issue:** The mock covers FONT_WEIGHT and SHADOWS for Phase 30 (verified added in commit `f4730a4`), but several production keys are still missing:
- `colors.interactive.destructive` — used by `src/app/squad/birthday/[id].tsx:135`, `src/app/friends/[id].tsx:196`, and 12+ other files.
- `colors.cardElevation` — used by `src/components/home/HomeFriendCard.tsx:29` and `src/screens/plans/PlanDashboardScreen.tsx:900`.
- `colors.splash.gradientStart` / `splash.gradientEnd` / `splash.text` — used by `src/app/_layout.tsx:340-350`.
- `FONT_FAMILY.body.medium`, `FONT_FAMILY.body.bold`, `FONT_FAMILY.display.extrabold` — referenced across `src/app/squad/*`, `src/app/profile/*`, and `src/app/_layout.tsx`.

This is not a regression — Phase 30 did not introduce these. But anyone adding tests that render the migrated screens (`friends/[id].tsx`, `squad/birthday/[id].tsx`, `PlanDashboardScreen.tsx`) will hit `undefined` reads.
**Fix:** Extend the mock with the missing keys (single defensive patch) or annotate which screens are intentionally out-of-scope for tests. No test coverage was lost in this phase, but the gap is widening.

### IN-04: `ChatListScreen.handleChatPress` — comment mentions a behavioral change that the test suite does not verify

**File:** `src/screens/chat/ChatListScreen.tsx:37-40`
**Issue:** Comment says "URL param ORDER may change for the group branch ... This is functionally equivalent because chat/room.tsx consumes params via key-based useLocalSearchParams, not positional parsing." This claim is true today but is exactly the kind of invariant that should be locked in a test (e.g., a snapshot of the URL produced for each kind, plus a test that `useLocalSearchParams` returns the expected keys regardless of order).
**Fix:** Add a test in `src/lib/__tests__/openChat.test.ts` (or a new `chat/room.params.test.tsx`) asserting that all three group-URL variations (with and without `birthday_person_id`) parse correctly.

### IN-05: `friends/[id].tsx:113` — string interpolation into Supabase `.or()` filter

**File:** `src/app/friends/[id].tsx:113`
**Issue:** This line is pre-existing (not introduced by Phase 30), but sits in a reviewed file:
```ts
.or(
  `and(requester_id.eq.${myId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${myId})`
)
```
`id` comes from `useLocalSearchParams` and is treated as a UUID, but is not validated. Supabase PostgREST `.or()` does not parameterize the filter string the way `.eq()` does — a crafted `id` could inject filter syntax (e.g., a string containing `)),or(...))` to broaden the delete). The real production risk is low because `id` is bound to URL routing, but URL params are user-controllable.
**Fix:** Validate `id` against a UUID regex before constructing the filter, or restructure as two separate `.delete().eq()` calls combined via `.or()` syntax that takes structured operands.

### IN-06: `useNavigationStore.reset()` not wired to logout / auth state change

**File:** `src/stores/useNavigationStore.ts:33` + `src/app/_layout.tsx:300-302`
**Issue:** The store has a `reset()` method but only the test file calls it. On `SIGNED_OUT` the auth listener sets `needsProfileSetup = false` but does not reset the navigation surface. If a user signs out while on a chat screen, `currentSurface` will remain `'chat'` (until ChatRoomScreen unmounts and runs cleanup — which it will, but only after the auth-gate flips). Probably benign, but worth wiring for parity with other slice resets.
**Fix:** Add `useNavigationStore.getState().reset()` to the `SIGNED_OUT` branch of the auth listener.

### IN-07: `_layout.tsx` notification dispatcher silently swallows ALL errors

**File:** `src/app/_layout.tsx:313-326`
**Issue:** Both notification routing paths catch errors and discard them:
```ts
handleNotificationResponse(response, router).catch(() => {
  // Silent — don't crash the app on notification routing failure
});
```
Comment says "silent" is intentional, but combined with WR-02 (`openChat` not always firing `onLoadingChange(false)`), a thrown error inside `handleNotificationResponse` (which calls `openChat` for the FREE-09 path) would silently leave the app in a broken state with no telemetry. Production builds should at least log to Sentry/equivalent.
**Fix:** Replace `catch(() => {})` with `catch((err) => { reportError(err); })`, even if just `console.warn` for now. This is pre-existing, not introduced in Phase 30, but the new `openChat` call at line 61 widened the surface area.

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
