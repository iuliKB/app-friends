---
phase: 25-auth-onboarding-errors
reviewed: 2026-05-05T02:29:55Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/app/(tabs)/profile.tsx
  - src/app/(tabs)/squad.tsx
  - src/app/profile/wish-list.tsx
  - src/app/squad/birthday/[id].tsx
  - src/components/onboarding/OnboardingHintSheet.tsx
  - src/components/squad/MemoriesTabContent.tsx
  - src/hooks/useChatRoom.ts
  - src/hooks/useFriends.ts
  - src/hooks/useHomeScreen.ts
  - src/screens/auth/AuthScreen.tsx
  - src/screens/chat/ChatListScreen.tsx
  - src/screens/chat/ChatRoomScreen.tsx
  - src/screens/friends/AddFriend.tsx
  - src/screens/friends/FriendRequests.tsx
  - src/screens/friends/FriendsList.tsx
  - src/screens/home/HomeScreen.tsx
  - src/screens/plans/PlanDashboardScreen.tsx
  - src/screens/plans/PlansListScreen.tsx
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-05T02:29:55Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

These files implement the auth/onboarding/error-handling layer for phase 25. Overall the code is well-structured: every screen that loads remote data has an `ErrorDisplay` fallback with a retry button, loading states are handled, and optimistic updates are paired with proper rollback logic in `useChatRoom`. The patterns are consistent across screens.

One critical issue was found: the birthday group creation failure is swallowed silently — the user gets no feedback that the action failed. Six warning-level issues exist, covering a login-tab validation bypass, a missing upload error guard in `fetchProfile`, an unsafe `console.warn` left in production code, a reaction state-read side-effect anti-pattern, and two instances of missing error feedback propagation. Four informational items round out the review.

---

## Critical Issues

### CR-01: Birthday group creation failure is silently swallowed — user has no error feedback

**File:** `src/app/squad/birthday/[id].tsx:73-77`
**Issue:** When `create_birthday_group` RPC fails, the code logs a warning and returns — the button spinner stops but no alert or message is shown to the user. The user sees the "Plan Birthday" button become active again with no indication of what went wrong. This is a correctness issue: an action the user initiated failed and they cannot know it.

```tsx
if (rpcErr || !groupChannelId) {
  // Silent failure — show no alert, just return. User can retry.
  console.warn('create_birthday_group failed', rpcErr);
  return;
}
```

**Fix:**
```tsx
if (rpcErr || !groupChannelId) {
  console.warn('create_birthday_group failed', rpcErr);
  Alert.alert('Error', "Couldn't create the birthday group. Try again.");
  return;
}
```

---

## Warnings

### WR-01: Email validation runs on login tab but password validation bypass exists for login path

**File:** `src/screens/auth/AuthScreen.tsx:147-162`
**Issue:** `handleEmailAuth` calls `validatePassword` regardless of which tab is active. The `validatePassword` function enforces minimum length, letter, and number rules. On the login tab this means a user with a legacy password (e.g., 6 characters or no numbers) will see a client-side error and be unable to sign in — even though the password is correct. The password validator should only be called on the signup tab.

```tsx
const emailErr = validateEmail(email);
const passwordErr = validatePassword(password); // always called — blocks login with valid credentials
```

**Fix:**
```tsx
const emailErr = validateEmail(email);
const passwordErr = activeTab === 'signup' ? validatePassword(password) : undefined;
```

### WR-02: Avatar upload error in `fetchProfile` is silently dropped

**File:** `src/app/(tabs)/profile.tsx:67-83`
**Issue:** `fetchProfile` does not handle the Supabase query error. If the query fails (network issue, RLS denial) the profile state stays null and the UI silently shows empty display name and username — indistinguishable from a loading state. There is no retry path for the user.

```tsx
const { data } = await supabase
  .from('profiles')
  .select(...)
  .single();
if (data) { ... } // error branch never reached
```

**Fix:**
```tsx
const { data, error } = await supabase
  .from('profiles')
  .select(...)
  .single();
if (error) {
  // surface the error — caller (useFocusEffect) runs on each focus; retry is implicit
  console.warn('fetchProfile failed', error.message);
  return;
}
if (data) { ... }
```

The more complete fix would be to track an error state and render an `ErrorDisplay` in the profile header, but even guarding the call prevents the silent empty-state.

### WR-03: `console.warn` left in production code path

**File:** `src/app/squad/birthday/[id].tsx:75`
**Issue:** `console.warn('create_birthday_group failed', rpcErr)` is in a user-triggered action handler, not a development utility. In a production build this leaks internal RPC error details to device consoles and log aggregators, and is inconsistent with every other error path in the codebase (which all use `Alert.alert`).

**Fix:** Replace with `Alert.alert` (see CR-01). Remove the `console.warn` call entirely.

### WR-04: `setMessages` used as a read-only state reader — anti-pattern that can produce stale reads under concurrent renders

**File:** `src/hooks/useChatRoom.ts:279-286` and `src/hooks/useChatRoom.ts:296-303`
**Issue:** `handlePollVoteInsert` and `handlePollVoteDelete` call `setMessages(prev => { isInRoom = prev.some(...); return prev; })` to read the current messages array. While this works in practice, it relies on the updater running synchronously relative to the `if (isInRoom)` check that follows. In concurrent React (React 18+), the updater may be deferred. The `isInRoom` variable is read outside the updater, which means the check could run against a stale initial value if the updater hasn't fired yet.

```ts
let isInRoom = false;
setMessages((prev) => {
  isInRoom = prev.some((m) => m.poll_id === incomingPollId);
  return prev; // no-op
});
if (isInRoom) { // isInRoom may still be false if updater was deferred
  setLastPollVoteEvent(...);
}
```

**Fix:** Use a React ref to store the latest messages so it can be read synchronously without a state updater trick:

```ts
const messagesRef = useRef<MessageWithProfile[]>([]);
// In the state setter calls: messagesRef.current = enriched;
// Then in the handlers:
const isInRoom = messagesRef.current.some((m) => m.poll_id === incomingPollId);
if (isInRoom) { setLastPollVoteEvent(...); }
```

### WR-05: `FriendRequests` shows error state from `useFriends.error` which is set by `fetchFriends`, not `fetchPendingRequests`

**File:** `src/screens/friends/FriendRequests.tsx:76-86`
**Issue:** The screen renders an `ErrorDisplay` when `error` from `useFriends` is truthy. However, `useFriends.error` is only set by `fetchFriends` (line 46 in `useFriends.ts`) — `fetchPendingRequests` does not set it. If `fetchPendingRequests` fails, `error` stays `null` and the screen shows no feedback; if a prior `fetchFriends` call elsewhere set `error`, this screen will show an unrelated error message.

**Fix:** `fetchPendingRequests` should set the shared `error` state on failure, or the screen should use its own local error state:

```tsx
// In FriendRequests component:
const [fetchError, setFetchError] = useState<string | null>(null);

useFocusEffect(useCallback(() => {
  fetchPendingRequests().then(({ error }) => {
    if (error) setFetchError(error.message);
  });
}, []));

if (fetchError) {
  return <ErrorDisplay mode="screen" message="Couldn't load friend requests." onRetry={...} />;
}
```

### WR-06: `AddFriend` shows search-failure `ErrorDisplay` using `error` from `useFriends` which reflects `fetchFriends` failures, not search failures

**File:** `src/screens/friends/AddFriend.tsx:296-306`
**Issue:** Same root cause as WR-05. `useFriends.error` is only written by `fetchFriends`, not by `searchUsers`. If the user's search network request fails silently (inside `doSearch`), the error is dropped because `doSearch` destructures only `{ data }` and discards the error:

```tsx
const { data } = await searchUsers(q); // error silently dropped
setResults(data ?? []);
```

If `data` is null due to an error, `results` is set to `[]` and the UI shows "No user found" instead of a network error message.

**Fix:**
```tsx
const { data, error } = await searchUsers(q);
if (error) {
  // show inline error
  setHasSearched(false);
  Alert.alert('Error', "Couldn't search. Check your connection and try again.");
  return;
}
setResults(data ?? []);
```

---

## Info

### IN-01: `morningDeniedHint` message hardcodes "iOS Settings" — incorrect on Android

**File:** `src/app/(tabs)/profile.tsx:663-667`
**Issue:** The hint text "Enable notifications in iOS Settings to receive morning prompts." will appear on Android too (there is no platform guard). On Android the path is the system notification settings, not "iOS Settings".

**Fix:**
```tsx
{morningDeniedHint && (
  <Text style={styles.morningHint}>
    {Platform.OS === 'ios'
      ? 'Enable notifications in iOS Settings to receive morning prompts.'
      : 'Enable notifications in your device settings to receive morning prompts.'}
  </Text>
)}
```

### IN-02: `validateEmail` is an overly loose check — passes strings like `a@b`

**File:** `src/screens/auth/AuthScreen.tsx:28-32`
**Issue:** The validator only checks for the presence of `@` and `.`, so inputs like `a@b` or `test@co` pass. This is a UX issue rather than a security issue (Supabase validates on the server), but it means a user can submit an obviously invalid email and only see a failure after the network round-trip.

**Fix:** Use a slightly tighter check that requires a dot after `@`:
```ts
function validateEmail(email: string): string | undefined {
  const atIdx = email.indexOf('@');
  if (atIdx < 1) return 'Please enter a valid email address.';
  const afterAt = email.slice(atIdx + 1);
  if (!afterAt.includes('.') || afterAt.endsWith('.')) {
    return 'Please enter a valid email address.';
  }
  return undefined;
}
```

### IN-03: UUID generation uses `Math.random()` — not cryptographically secure

**File:** `src/hooks/useChatRoom.ts:444-447`, `494-497`, `556-559`
**Issue:** The same UUID-v4-shaped generation pattern appears three times in `sendMessage`, `sendImage`, and `sendPoll`. `Math.random()` is not cryptographically random and produces UUIDs with lower collision resistance than `crypto.randomUUID()`. In a chat context with many concurrent users, collisions could cause messages to overwrite each other in Supabase.

**Fix:** Use `crypto.randomUUID()` (available in React Native's Hermes engine since RN 0.74):
```ts
const messageId = crypto.randomUUID();
```
If the minimum RN version does not guarantee this, use the `uuid` npm package with its secure random source.

### IN-04: `MemoriesTabContent` `useFocusEffect` dependency on `session?.user?.id` causes an extra refetch on every session refresh

**File:** `src/components/squad/MemoriesTabContent.tsx:52-57`
**Issue:** The `useFocusEffect` callback depends on `session?.user?.id`. The eslint-disable comment suppresses the exhaustive-deps warning. If the session object reference changes (e.g., after a token refresh) but the user ID stays the same, `session?.user?.id` is stable — so this is fine. However, if the intent is to refetch only on focus (not on user ID change), the dependency should be `[]` with the user ID guard inside the callback.

The current code refetches correctly on focus AND when the user changes, which is acceptable. The issue is that the eslint-disable comment hides the dependency on `refetch` itself — if `refetch` identity changes between renders it won't be tracked. Wrap `refetch` in `useCallback` inside the hook, or use `useRef` to hold a stable reference.

**Fix:** Ensure `refetch` is stable (memoized in `useAllPlanPhotos`) or use a ref:
```tsx
const refetchRef = useRef(refetch);
useEffect(() => { refetchRef.current = refetch; });

useFocusEffect(
  useCallback(() => {
    refetchRef.current();
  }, [session?.user?.id])
);
```

---

_Reviewed: 2026-05-05T02:29:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
