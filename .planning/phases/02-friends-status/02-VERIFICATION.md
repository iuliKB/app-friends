---
phase: 02-friends-status
verified: 2026-03-18T00:00:00Z
status: gaps_found
score: 14/15 must-haves verified
gaps:
  - truth: "Profile tab shows My Friends row, Friend Requests row with counts"
    status: partial
    reason: "Friend Requests count is wired correctly via usePendingRequestsCount. The My Friends count badge always shows 0 because profile.tsx calls useFriends() but never calls fetchFriends() — the friends array stays at its initial empty value []."
    artifacts:
      - path: "src/app/(tabs)/profile.tsx"
        issue: "useFriends() called but fetchFriends() never invoked. Line 29: `const { friends } = useFriends()` — no useEffect or call site for fetchFriends. Line 91 renders friends.length which is always 0."
    missing:
      - "Add a useEffect in profile.tsx that calls fetchFriends() on mount (after the existing useFriends() destructure)"
human_verification:
  - test: "Navigate to Profile tab"
    expected: "My Friends row shows correct friend count (not always 0). Friend Requests row shows pending count with red badge when non-zero."
    why_human: "Count correctness requires a live Supabase session with test data."
  - test: "Open Friends list, tap a friend card"
    expected: "FriendActionSheet slides up with View profile, Start DM, Remove friend actions. Tapping Remove shows inline confirmation 'Remove [name]? They won't be notified.' with Remove and Keep Friend buttons."
    why_human: "Animated bottom sheet and modal interaction cannot be verified by grep."
  - test: "Search for a username in Add Friend"
    expected: "Debounced search returns profile cards after 500ms typing pause. Add Friend button transitions to Pending state after tap. Duplicate request shows Alert."
    why_human: "Debounce timing and network round-trip require runtime verification."
  - test: "Switch to QR tab in Add Friend, scan a QR code"
    expected: "Camera opens with permission gate. After scanning a valid QR, profile card appears with Add Friend button. Scan Again resets the flow."
    why_human: "Camera permission and barcode scan require a physical device."
  - test: "Profile tab > My QR Code"
    expected: "Full-screen QR code showing user UUID is displayed with display name and hint text."
    why_human: "QR code rendering from react-native-qrcode-svg requires visual verification."
  - test: "Tap a status segment on Home screen and on Profile tab"
    expected: "Active segment fills with correct colour (Free=#22c55e, Busy=#ef4444, Maybe=#eab308). Loading spinner appears on active segment while saving. Haptic feedback fires."
    why_human: "Visual colour accuracy, animation, and haptics require device testing."
  - test: "Tap an emoji in EmojiTagPicker (Profile tab only)"
    expected: "Emoji border turns to status-colour, background fills at 20% opacity. Tapping again clears. Correct per-emoji spinner while saving."
    why_human: "Active tint and toggle-off behaviour require visual and tactile verification."
---

# Phase 2: Friends & Status Verification Report

**Phase Goal:** Users can find and connect with friends, and set their daily availability status
**Verified:** 2026-03-18
**Status:** gaps_found — 1 gap (My Friends count badge always 0 on Profile tab)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | User can search for another user by username and see their profile card | VERIFIED | `AddFriend.tsx` debounces `searchUsers()` from `useFriends` hook; `ilike('username'` pattern confirmed in `useFriends.ts:204`; `SearchResultCard` renders results |
| 2  | User can send a friend request that shows as Pending | VERIFIED | `sendRequest()` inserts into `friendships`; `SearchResultCard` renders Pending state; `AddFriend.tsx` tracks `requestStatuses` Map; `23505` error handled with Alert |
| 3  | User can view incoming friend requests and accept or reject each one | VERIFIED | `FriendRequests.tsx` calls `fetchPendingRequests()` on mount; `RequestCard` renders accept/decline buttons; `acceptRequest`/`rejectRequest` update `status` column; per-card loading set |
| 4  | User can view their complete friends list sorted by status then alphabetically | VERIFIED | `FriendsList.tsx` calls `fetchFriends()` on mount; `useFriends.ts:87-91` sorts by `STATUS_ORDER` then `localeCompare`; `FlatList` renders `FriendCard` per item |
| 5  | User can tap a friend to see actions (View profile, Start DM, Remove friend) | VERIFIED | `FriendActionSheet` opened on `FriendCard` press; 3 action rows with correct icons; `onViewProfile`/`onStartDM` show Phase 6/5 alerts (intentional deferred stubs) |
| 6  | User can remove a friend with inline confirmation | VERIFIED | `handleRemovePress` sets `confirming=true`; confirmation UI renders `Remove [name]?` heading + "They won't be notified." + Remove/Keep Friend buttons; `handleConfirmRemove` calls `removeFriend` then refetches |
| 7  | Profile tab shows My Friends row, Friend Requests row with counts | PARTIAL | Friend Requests count wired correctly via `usePendingRequestsCount`. My Friends count always shows 0 — `useFriends()` called in `profile.tsx` but `fetchFriends()` never invoked; `friends` array stays as initial `[]` |
| 8  | User can view their own QR code from Profile tab and it encodes their UUID | VERIFIED | `QRCodeDisplay.tsx` renders `QRCode value={session.user.id}`; Profile tab navigates to `/qr-code` route; `qr-code.tsx` renders `QRCodeDisplay`; profile data fetched from Supabase on mount |
| 9  | User can scan another user's QR code and see their profile card before confirming | VERIFIED | `QRScanView.tsx` uses `CameraView` with `onBarcodeScanned`; UUID regex validates before calling `onScanned`; `AddFriend.tsx` `handleScanned()` fetches profile from Supabase and sets `scannedProfile`; profile card renders in `loaded` state |
| 10 | After confirming, a friend request is sent to the scanned user | VERIFIED | `handleQRAddFriend()` calls `sendRequest(scannedProfile.id)`; success transitions to Pending state; self-scan guard shows info text |
| 11 | User can set their availability to Free, Busy, or Maybe with one tap | VERIFIED | `SegmentedControl` calls `onValueChange` on press; `useStatus.updateStatus()` calls `supabase.from('statuses').update()`; server confirmation: state set only after successful response |
| 12 | Active segment fills with the correct status colour and shows loading during save | VERIFIED | `SegmentedControl.tsx:31` applies `{ backgroundColor: seg.color }` when `isActive`; `saving && isActive` renders `ActivityIndicator` in place of label; all segments `disabled={saving}` |
| 13 | User can attach an emoji context tag from the 8 presets | VERIFIED | `EMOJI_PRESETS` array in `EmojiTagPicker.tsx:13` has all 8 (`☕️ 🎮 🏋️ 🍕 🎵 🎉 🎬 😴`); `onTagChange` calls `updateContextTag(emoji)`; `useStatus.updateContextTag` updates `statuses.context_tag` |
| 14 | User can clear an emoji context tag by tapping it again | VERIFIED | `useStatus.ts:46`: `const nextTag = contextTag === emoji ? null : emoji` — toggle-off logic confirmed |
| 15 | Status toggle appears on both Home screen and Profile tab | VERIFIED | `SegmentedControl` imported and rendered in `src/app/(tabs)/index.tsx:21` and `src/app/(tabs)/profile.tsx:62`; `useStatus` called in both; `EmojiTagPicker` only on Profile tab (correct per spec) |

**Score: 14/15 truths verified** (1 partial — My Friends count)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/hooks/useFriends.ts` | All friend DB ops: get_friends RPC, status merge, send/accept/reject/remove, search | Yes | Yes — 227 lines, full implementation | Yes — imported by FriendsList, FriendRequests, AddFriend, profile.tsx | VERIFIED |
| `src/hooks/usePendingRequestsCount.ts` | Pending request count for badge | Yes | Yes — count-exact query with refetch | Yes — imported by _layout.tsx, friends/index.tsx, profile.tsx | VERIFIED |
| `src/components/friends/StatusPill.tsx` | Coloured status badge | Yes | Yes — 37 lines, renders status colour + label | Yes — used in FriendCard | VERIFIED |
| `src/components/friends/FriendCard.tsx` | Friend row with avatar + name + status pill | Yes | Yes — renders AvatarCircle, display name, @username, StatusPill | Yes — used in FriendsList | VERIFIED |
| `src/components/friends/FriendActionSheet.tsx` | Bottom sheet with 3 actions + remove confirmation | Yes | Yes — 277 lines, Modal + Animated, confirming state | Yes — used in FriendsList | VERIFIED |
| `src/components/friends/RequestCard.tsx` | Pending request row with accept/decline | Yes | Yes — 132 lines, relativeTime helper, loading state | Yes — used in FriendRequests | VERIFIED |
| `src/components/friends/SearchResultCard.tsx` | Search result with Add/Pending states | Yes | Yes — 93 lines, idle/loading/pending states, isSelf guard | Yes — used in AddFriend | VERIFIED |
| `src/screens/friends/FriendsList.tsx` | Friends list with FlatList, FAB, empty state | Yes | Yes — 151 lines, FlatList + FAB + empty state + action sheet | Yes — exported from `friends/index.tsx` | VERIFIED |
| `src/screens/friends/FriendRequests.tsx` | Pending requests with accept/reject | Yes | Yes — 120 lines, per-card loading, empty state | Yes — exported from `friends/requests.tsx` | VERIFIED |
| `src/screens/friends/AddFriend.tsx` | Search tab + QR tab | Yes | Yes — 446 lines, debounced search, QRScanView, scanState machine | Yes — exported from `friends/add.tsx` | VERIFIED |

### Plan 02 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/components/friends/QRCodeDisplay.tsx` | Fullscreen QR code with user info | Yes | Yes — `QRCode value={session.user.id}` size 240, profile fetch on mount | Yes — used in `qr-code.tsx` | VERIFIED |
| `src/components/friends/QRScanView.tsx` | Camera scanner with permission gate | Yes | Yes — CameraView, UUID regex, scanned guard, scan frame overlay | Yes — used in AddFriend.tsx | VERIFIED |
| `src/app/qr-code.tsx` | My QR Code route | Yes | Yes — renders QRCodeDisplay with Stack.Screen options | Yes — navigated from profile.tsx | VERIFIED |

### Plan 03 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/hooks/useStatus.ts` | Status read + update with server confirmation | Yes | Yes — 61 lines, fetch on mount, updateStatus/updateContextTag, toggle-off | Yes — used in profile.tsx and index.tsx | VERIFIED |
| `src/components/status/SegmentedControl.tsx` | 3-segment toggle with loading state | Yes | Yes — 73 lines, haptics, status colours, ActivityIndicator on saving segment | Yes — used in index.tsx and profile.tsx | VERIFIED |
| `src/components/status/EmojiTagPicker.tsx` | 8 emoji buttons with active states | Yes | Yes — 115 lines, 8 EMOJI_PRESETS, per-emoji savingTag loading, status-colour active border | Yes — used in profile.tsx only (correct) | VERIFIED |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Pattern | Status |
|------|----|-----|---------|--------|
| `FriendsList.tsx` | `supabase.rpc('get_friends')` | `useFriends` hook | `supabase.rpc('get_friends')` | VERIFIED — `useFriends.ts:44` |
| `FriendRequests.tsx` | `supabase.from('friendships')` | pending query | `.eq('status', 'pending')` | VERIFIED — `useFriends.ts:115` |
| `AddFriend.tsx` | `supabase.from('profiles').select()` | search query | `ilike('username'` | VERIFIED — `useFriends.ts:204` |
| `profile.tsx` | `src/app/friends/index.tsx` | `router.push('/friends')` | `router.push.*friends` | VERIFIED — `profile.tsx:79` |

### Plan 02 Key Links

| From | To | Via | Pattern | Status |
|------|----|-----|---------|--------|
| `QRScanView.tsx` | `expo-camera CameraView` | `onBarcodeScanned` callback | `onBarcodeScanned` | VERIFIED — `QRScanView.tsx:63` |
| `QRCodeDisplay.tsx` | `react-native-qrcode-svg` | `QRCode value={session.user.id}` | `QRCode.*value.*session` | VERIFIED — `QRCodeDisplay.tsx:43` |
| `AddFriend.tsx` | `QRScanView.tsx` | QR tab content | `QRScanView` | VERIFIED — `AddFriend.tsx:213` |

### Plan 03 Key Links

| From | To | Via | Pattern | Status |
|------|----|-----|---------|--------|
| `SegmentedControl.tsx` | `useStatus.ts` | `onValueChange` calls `updateStatus` | `onValueChange` | VERIFIED — `profile.tsx:62`, `index.tsx:21` |
| `useStatus.ts` | `supabase.from('statuses').update()` | server confirmation | `supabase.*from\('statuses'\).*update` | VERIFIED — `useStatus.ts:33` |
| `EmojiTagPicker.tsx` | `useStatus.ts` | `onTagChange` calls `updateContextTag` | `onTagChange` | VERIFIED — `profile.tsx:65` |

---

## Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| FRND-01 | 01 | User can search for other users by username | SATISFIED | `searchUsers()` calls `ilike('username', ...)`, results shown via SearchResultCard |
| FRND-02 | 01 | User can send friend request | SATISFIED | `sendRequest()` inserts into `friendships`; 23505 duplicate handled |
| FRND-03 | 01 | User can view pending friend requests | SATISFIED | `fetchPendingRequests()` queries `friendships` with `eq('status','pending')`, shown in FriendRequests screen |
| FRND-04 | 01 | User can accept or reject a friend request | SATISFIED | `acceptRequest()` updates status='accepted', `rejectRequest()` updates status='rejected'; per-card loading state |
| FRND-05 | 01 | User can view list of all accepted friends with their status | SATISFIED | `get_friends()` RPC + statuses merge; sorted by STATUS_ORDER then alphabetical; StatusPill shows status |
| FRND-06 | 02 | User can generate QR code for their own profile | SATISFIED | `QRCodeDisplay` renders `QRCode value={session.user.id}`; accessible from Profile > My QR Code |
| FRND-07 | 02 | User can scan QR code to add a friend | SATISFIED | `QRScanView` scans QR, UUID validated, profile looked up, `sendRequest` called on confirm |
| STAT-01 | 03 | User can set availability to Free/Busy/Maybe via 3 large tap targets | SATISFIED | `SegmentedControl` 3-segment with `updateStatus()` wired; server confirmation pattern |
| STAT-02 | 03 | User can set emoji context tag from 8 presets | SATISFIED | `EmojiTagPicker` with all 8 presets; `updateContextTag()` called on tap |
| STAT-03 | 03 | User can clear emoji context tag by tapping it again | SATISFIED | `useStatus.ts:46`: `const nextTag = contextTag === emoji ? null : emoji` |
| STAT-04 | 03 | New users default to "Maybe" status | SATISFIED | Pre-implemented via `handle_new_user` DB trigger (Phase 1); no Phase 2 code needed; confirmed in plan |

All 11 requirements satisfied. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/screens/friends/FriendsList.tsx` | 46, 51 | `Alert.alert('Coming soon', 'Coming in Phase 6/5')` for onViewProfile / onStartDM | Info | Intentional deferred stubs for features in Phase 5 (DM) and Phase 6 (profile view). Not a blocker — these are noted in SUMMARY as planned deferrals. |
| `src/app/(tabs)/index.tsx` | 26-28 | "Who's free?" feed is a placeholder | Info | Intentional — Home feed is Phase 3. Status toggle wired correctly. |

No blocker or warning anti-patterns found. All placeholders are intentional, explicitly scoped to future phases, and correctly documented.

---

## Gaps Summary

**1 gap found** — My Friends count badge on Profile tab always shows 0.

`profile.tsx` calls `const { friends } = useFriends()` on line 29 to render `friends.length` in the count badge at line 91. However, `fetchFriends()` is never called in this component — there is no `useEffect` that triggers the fetch. The `friends` array initialises as `[]` and never updates, so the badge permanently displays `0` regardless of how many actual friends the user has.

The fix is straightforward: add a `useEffect` in `profile.tsx` after the `useFriends()` call:

```typescript
const { friends, fetchFriends } = useFriends();

useEffect(() => {
  fetchFriends();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

The Friend Requests count is not affected — it uses `usePendingRequestsCount()` which fetches on mount correctly.

---

## Human Verification Required

### 1. My Friends Count Badge

**Test:** Navigate to Profile tab while authenticated as a user with known friends.
**Expected:** My Friends row shows the correct non-zero count.
**Why human:** Requires a live Supabase session; this is also the gap noted above and will pass once `fetchFriends()` is called on mount.

### 2. FriendActionSheet slide animation and remove confirmation

**Test:** From Friends list, tap any friend card. Then tap "Remove friend". Then tap "Remove" in the confirmation.
**Expected:** Sheet slides up with 250ms animation. After tapping Remove, content switches to confirmation UI showing "Remove [name]? They won't be notified." After confirming, friend is removed and list refreshes.
**Why human:** Animated transitions and modal interaction require runtime verification.

### 3. Username search debounce

**Test:** Navigate to Add Friend. Type a partial username slowly (one character at a time). Verify results only appear ~500ms after the last keystroke, not on every character.
**Expected:** No search fires until 500ms after typing stops.
**Why human:** Debounce timing requires runtime observation.

### 4. QR camera scan flow

**Test:** Add Friend > QR tab. Grant camera access. Hold a valid Campfire QR code (from another user's Profile > My QR Code) in front of camera.
**Expected:** Scan-once fires, profile card appears, Add Friend sends request, Scan Again resets.
**Why human:** Camera permission prompt and barcode scan require a physical device.

### 5. Status colours and haptics

**Test:** Tap Free, Busy, Maybe segments on both Home and Profile screens.
**Expected:** Correct status colours (#22c55e, #ef4444, #eab308), loading spinner on active segment while saving, haptic feedback on each tap.
**Why human:** Colour accuracy, animation, and haptics require visual and tactile device testing.

### 6. Emoji tag toggle-off

**Test:** Tap an emoji tag to select it (active state visible). Tap the same emoji again.
**Expected:** Active state clears; context_tag set to null in database.
**Why human:** Toggle-off requires live Supabase interaction to confirm null write.

---

_Verified: 2026-03-18_
_Verifier: Claude (gsd-verifier)_
