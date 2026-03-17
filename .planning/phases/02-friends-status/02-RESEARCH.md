# Phase 2: Friends + Status - Research

**Researched:** 2026-03-18
**Domain:** React Native friend system, QR code scanning, status toggle UI, Supabase friendship queries
**Confidence:** HIGH (core patterns verified against official docs and existing schema), MEDIUM (react-native-qrcode-svg metro config note)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Friend Search**
- Dedicated "Add Friend" screen opened from FAB button on friends list
- Add Friend screen has two tabs: Search and QR
- Search tab: type username, results show profile card (avatar, username, display name) with "Add Friend" button
- Empty search state: "Search by username to add friends" placeholder text
- After sending request: button changes to greyed-out "Pending" state
- Search uses existing `supabase.from('profiles').select()` pattern

**Friend Requests**
- Separate requests screen accessible from two paths:
  1. Badge icon in friends list header with count
  2. "Friend Requests (N)" row on Profile tab
- After accept: friend appears in friends list immediately

**Friends List**
- Accessed from Profile tab: "My Friends (N)" row → opens full friends list screen
- Each friend card: AvatarCircle + display name + coloured status pill (Free/Busy/Maybe)
- Sorted: status first (Free → Busy → Maybe), then alphabetical within each group
- Tap friend card → bottom sheet with quick actions: View profile, Start DM, Remove friend
- FAB button (bottom-right) to open Add Friend screen
- Empty state: friendly illustration + "Add your first friend" with button to search/QR

**Status Toggle**
- Full segmented control in two places: top of Home screen and Profile tab
- iOS-style segmented control with 3 segments: Free / Busy / Maybe
- Status text on coloured background pill (segment fills with status colour)
- Status update: wait for server confirmation (show brief loading, not optimistic)

**Emoji Context Tags**
- 8 preset emojis: ☕️ 🎮 🏋️ 🍕 🎵 🎉 🎬 😴
- Tap to set, tap again to clear

**QR Code**
- My QR Code: accessible from Profile tab → shows user's QR code
- Scan QR: on Add Friend screen's QR tab — live camera scanner
- QR encodes: user UUID only
- After scanning: show scanned user's profile card with "Add Friend" button — confirm before request
- QR generation: react-native-qrcode-svg
- QR scanning: expo-camera with onBarcodeScanned

### Claude's Discretion
- Accept/reject button design on requests screen
- Emoji picker exact layout (row below toggle vs expandable)
- Bottom sheet styling for friend card actions
- QR code visual styling (colours, size, branding)
- Loading indicators during friend request operations
- Remove friend confirmation flow

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FRND-01 | User can search for other users by username | `profiles` table with `profiles_select_authenticated` policy allows any authenticated user to search. Direct `.select()` query with `.ilike('username', ...)` pattern. |
| FRND-02 | User can send friend request to another user | `friendships` INSERT policy `friendships_insert_as_requester` allows direct insert with `requester_id = auth.uid()`. No RPC needed for simple insert. |
| FRND-03 | User can view pending friend requests | `friendships` SELECT policy `friendships_select_participant` allows both requester and addressee to see the row. Filter by `status = 'pending'` and `addressee_id = auth.uid()`. |
| FRND-04 | User can accept or reject a friend request | `friendships_update_as_addressee` policy allows addressee to UPDATE the row. Set `status = 'accepted'` or `status = 'rejected'`. |
| FRND-05 | User can view list of all accepted friends with their status | `get_friends()` RPC already defined in migration. Returns friend profile + friendship metadata. Join with `statuses` for status pill. |
| FRND-06 | User can generate QR code for their own profile | `react-native-qrcode-svg` 6.3.x renders QR as SVG. Encode user UUID. Peer dep: `react-native-svg` 15.x. |
| FRND-07 | User can scan QR code to add a friend | `expo-camera` SDK 55 `CameraView` with `onBarcodeScanned` callback. UUID from QR → profile lookup → confirm → insert friendship. |
| STAT-01 | User can set availability to Free, Busy, or Maybe via 3 large tap targets | iOS-style segmented control built with pure StyleSheet. Three equal-width segments. Server confirmation pattern (no optimistic). |
| STAT-02 | User can set an emoji context tag from 8 presets | Horizontal row of 8 emoji buttons below segmented control. Supabase `statuses` UPDATE sets `context_tag`. |
| STAT-03 | User can clear emoji context tag by tapping it again | Toggle: if current `context_tag === tapped emoji` → set `context_tag = null`. |
| STAT-04 | New users default to "Maybe" status | Already implemented: `handle_new_user` trigger auto-inserts `statuses(user_id)` with default `'maybe'`. No Phase 2 work needed. |
</phase_requirements>

---

## Summary

Phase 2 adds the friend social graph and daily availability status — the two features that define Campfire's core loop. The Supabase schema is already fully defined in `0001_init.sql`: `friendships` table with RLS policies, `statuses` table with `is_friend_of()` SECURITY DEFINER helper, and two RPC functions (`get_friends()`, `get_free_friends()`). Phase 2 is primarily a UI/hook implementation phase working against an already-correct schema.

The two new dependencies needed are `react-native-qrcode-svg` (QR generation, requires `react-native-svg` peer dep) and `expo-camera` (QR scanning). Both are Expo Go compatible. The project currently runs React Native 0.83.2, which is above the 0.75 threshold where the `textEncodingTransformation` metro config hack is NOT required. The existing `statuses` table column is named `context_tag` (not `emoji_tag` — the app type uses `EmojiTag` but the DB column is `context_tag`; this is already typed correctly in `src/types/app.ts`).

The trickiest decisions are: (1) bottom sheet without a third-party library — use React Native's built-in `Modal` with bottom-anchored layout and `Animated.timing` slide-in; (2) segmented control — hand-rolled with three equal-width `TouchableOpacity` segments and an active background via StyleSheet; (3) badge count on Profile tab — use `tabBarBadge` on `Tabs.Screen` options updated via `navigation.setOptions()`.

**Primary recommendation:** Build in three plan-sized slices exactly as the roadmap states — (1) friend CRUD screens, (2) QR generation/scanning, (3) status toggle + emoji picker — in that order, since status flows use the friends list infrastructure.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@supabase/supabase-js` | `^2.99.2` | DB queries for friendships + statuses | Already installed |
| `zustand` | `^5.0.12` | Status store + UI state | Already installed |
| `expo-router` | `~55.0.5` | Navigation, tab badges, new screens | Already installed |
| `react-native-gesture-handler` | `~2.30.0` | Already in project (Expo Router dep) | Already installed |
| `react-native-reanimated` | `4.2.1` | Already in project | Already installed |

### New Dependencies for Phase 2
| Library | Version | Purpose | Expo Go |
|---------|---------|---------|---------|
| `expo-camera` | `~55.0.x` | QR code scanning via `CameraView` + `onBarcodeScanned` | YES |
| `react-native-svg` | `~15.x` (via `npx expo install`) | Peer dep for react-native-qrcode-svg; SVG rendering | YES |
| `react-native-qrcode-svg` | `6.3.21` | QR code generation component | YES |
| `expo-haptics` | `~55.0.x` | Tactile feedback on status toggle taps | YES |

**Installation:**
```bash
npx expo install expo-camera expo-haptics
npx expo install react-native-svg
npm install react-native-qrcode-svg
```

**Version verification (confirmed 2026-03-18):**
- `react-native-qrcode-svg`: 6.3.21 (npm registry)
- `react-native-svg`: 15.15.3 (npm registry)

### No metro.config.js required

React Native 0.83.2 is above the 0.75 threshold. The `textEncodingTransformation` hack for `react-native-qrcode-svg` is only needed on RN < 0.75. This project does not need a `metro.config.js` for this library.

---

## Architecture Patterns

### Recommended New File Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # ADD: status segmented control at top
│   │   └── profile.tsx        # ADD: My Friends row, Friend Requests row, My QR Code button
│   ├── friends/
│   │   ├── index.tsx          # Friends list screen (route)
│   │   ├── requests.tsx       # Pending friend requests screen (route)
│   │   └── add.tsx            # Add Friend screen: Search + QR tabs (route)
│   └── qr-code.tsx            # My QR Code fullscreen modal (route)
├── screens/
│   └── friends/
│       ├── FriendsList.tsx    # FlatList with status-sorted friend cards
│       ├── FriendRequests.tsx # Pending requests with accept/reject
│       ├── AddFriend.tsx      # Search tab + QR scan tab
│       └── QRCodeDisplay.tsx  # Fullscreen QR code display
├── components/
│   ├── friends/
│   │   ├── FriendCard.tsx     # AvatarCircle + display_name + status pill
│   │   ├── StatusPill.tsx     # Coloured pill badge (Free/Busy/Maybe)
│   │   └── FriendActionSheet.tsx # Modal bottom sheet: View/DM/Remove
│   └── status/
│       ├── SegmentedControl.tsx  # Pure StyleSheet 3-segment control
│       └── EmojiTagPicker.tsx    # Row of 8 emoji tap targets
├── hooks/
│   ├── useFriends.ts          # get_friends() + pending requests queries
│   └── useStatus.ts           # Own status read + update with server confirmation
└── stores/
    └── useStatusStore.ts      # localStatus for optimistic reads in Home screen (Phase 3)
```

### Pattern 1: Friendship Queries Against Existing Schema

The `friendships` table uses `requester_id` / `addressee_id` (NOT `user_id` / `friend_id`). All queries must check both columns. The `get_friends()` RPC handles this complexity for accepted friends.

**For pending requests (addressee receives):**
```typescript
// src/hooks/useFriends.ts
const { data, error } = await supabase
  .from('friendships')
  .select('id, requester_id, created_at, profiles!friendships_requester_id_fkey(username, display_name, avatar_url)')
  .eq('addressee_id', session.user.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

**For accepted friends via RPC (preferred — handles both directions):**
```typescript
const { data, error } = await supabase.rpc('get_friends');
// Returns: friend_id, username, display_name, avatar_url, friendship_status, created_at
```

**Sending a friend request:**
```typescript
// Look up target by username first
const { data: target } = await supabase
  .from('profiles')
  .select('id, username, display_name, avatar_url')
  .eq('username', searchUsername.toLowerCase().trim())
  .maybeSingle();

// Then insert friendship row
const { error } = await supabase
  .from('friendships')
  .insert({ requester_id: session.user.id, addressee_id: target.id });
// On conflict (unique index on canonical pair) → already exists
```

**Accepting a request:**
```typescript
const { error } = await supabase
  .from('friendships')
  .update({ status: 'accepted' })
  .eq('id', requestId)
  .eq('addressee_id', session.user.id); // RLS requires this anyway
```

**Removing a friend:**
```typescript
const { error } = await supabase
  .from('friendships')
  .delete()
  .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`)
  .or(`requester_id.eq.${friendId},addressee_id.eq.${friendId}`);
// Use canonical pair approach — see Pitfall section
```

### Pattern 2: Status Update with Server Confirmation

The decision is to wait for server confirmation (not optimistic). This means the segmented control shows a loading indicator on the active segment during the save.

```typescript
// src/hooks/useStatus.ts
export function useStatus() {
  const session = useAuthStore((s) => s.session);
  const [status, setStatus] = useState<StatusValue | null>(null);
  const [contextTag, setContextTag] = useState<EmojiTag>(null);
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus: StatusValue) {
    setSaving(true);
    const { error } = await supabase
      .from('statuses')
      .update({ status: newStatus })
      .eq('user_id', session!.user.id);
    if (!error) setStatus(newStatus);
    setSaving(false);
  }

  async function updateContextTag(emoji: EmojiTag) {
    const nextTag = contextTag === emoji ? null : emoji; // toggle off if same
    setSaving(true);
    const { error } = await supabase
      .from('statuses')
      .update({ context_tag: nextTag })
      .eq('user_id', session!.user.id);
    if (!error) setContextTag(nextTag);
    setSaving(false);
  }

  // ... fetch on mount
}
```

### Pattern 3: Friends List with Status — Joined Query

`get_friends()` returns profile data but not live status. For the friends list screen (with status pill), query both:

```typescript
// Option A: Two queries and merge in JS
const { data: friends } = await supabase.rpc('get_friends');
const friendIds = friends?.map(f => f.friend_id) ?? [];
const { data: statuses } = await supabase
  .from('statuses')
  .select('user_id, status, context_tag')
  .in('user_id', friendIds);
// merge: friends.map(f => ({ ...f, ...statuses.find(s => s.user_id === f.friend_id) }))

// Option B: Join in a single query (works due to profiles_select_authenticated policy)
// Not recommended here — get_friends() RPC already handles the join complexity
```

**Sort logic (client-side):**
```typescript
const STATUS_ORDER: Record<StatusValue, number> = { free: 0, busy: 1, maybe: 2 };

const sorted = friends.sort((a, b) => {
  const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (statusDiff !== 0) return statusDiff;
  return a.display_name.localeCompare(b.display_name);
});
```

### Pattern 4: Pure StyleSheet Segmented Control

No library. Three equal segments, the selected one fills with the status colour.

```typescript
// src/components/status/SegmentedControl.tsx
const SEGMENTS: { label: string; value: StatusValue; color: string }[] = [
  { label: 'Free',  value: 'free',  color: COLORS.status.free },
  { label: 'Busy',  value: 'busy',  color: COLORS.status.busy },
  { label: 'Maybe', value: 'maybe', color: COLORS.status.maybe },
];

export function SegmentedControl({ value, onValueChange, saving }: Props) {
  return (
    <View style={styles.container}>
      {SEGMENTS.map((seg) => {
        const active = seg.value === value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, active && { backgroundColor: seg.color }]}
            onPress={() => !saving && onValueChange(seg.value)}
            disabled={saving}
          >
            {saving && active
              ? <ActivityIndicator size="small" color={COLORS.dominant} />
              : <Text style={[styles.label, active && styles.labelActive]}>{seg.label}</Text>
            }
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 3,
    height: 44,
  },
  segment: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  labelActive: { color: COLORS.dominant, fontWeight: '600' },
});
```

### Pattern 5: Bottom Sheet Without a Library

The project constraint is no UI libraries. Use React Native's built-in `Modal` with `Animated` for slide-in from bottom. Expo Go compatible.

```typescript
// src/components/friends/FriendActionSheet.tsx
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';

export function FriendActionSheet({ visible, onClose, friend, onViewProfile, onStartDM, onRemove }: Props) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* action rows */}
      </Animated.View>
    </Modal>
  );
}
```

**Why not `@gorhom/bottom-sheet`:** That library requires `react-native-reanimated` worklets and `GestureHandlerRootView`, and has known instability issues with Expo SDK 52–54 upgrades (GitHub issues #2035, #2291, #2528). The simple `Modal` + `Animated` pattern is sufficient for 3 action rows.

### Pattern 6: QR Code Generation

```typescript
import QRCode from 'react-native-qrcode-svg';

// In QRCodeDisplay.tsx
<QRCode
  value={session.user.id}   // encodes UUID only
  size={240}
  color={COLORS.textPrimary}
  backgroundColor={COLORS.dominant}
/>
```

Import is `import QRCode from 'react-native-qrcode-svg'` (default export). No metro config needed for RN 0.83.

### Pattern 7: QR Code Scanning

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/camera/
import { CameraView, useCameraPermissions } from 'expo-camera';

export function QRScanTab({ onScanned }: { onScanned: (uuid: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission?.granted) {
    return <Button title="Grant camera access" onPress={requestPermission} />;
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFillObject}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={scanned ? undefined : (result) => {
        setScanned(true);
        onScanned(result.data); // UUID string
      }}
    />
  );
}
```

**Important:** Pass `undefined` to `onBarcodeScanned` after first scan to prevent repeated callbacks. Reset `scanned` state when user navigates back or presses "Scan Again".

**Physical device only:** `CameraView` requires a physical device (iOS or Android). It does not work in simulators/emulators. Expo Go on device is fine.

### Pattern 8: Tab Badge for Pending Requests

The tabs layout uses `Tabs` from `expo-router` (React Navigation bottom tabs under the hood). Set badge via `tabBarBadge` on the `Tabs.Screen` options.

```typescript
// In profile.tsx — update badge on navigation when requests load
import { useNavigation } from 'expo-router';

const navigation = useNavigation();

useEffect(() => {
  navigation.setOptions({ tabBarBadge: pendingCount > 0 ? pendingCount : undefined });
}, [pendingCount, navigation]);
```

**Note:** `tabBarBadge` accepts `string | number | undefined`. Passing `undefined` hides the badge.

### Anti-Patterns to Avoid

- **Storing full friends list in Zustand:** Server data stays in React component state from hooks. Zustand is for `localStatus` optimistic override only (used in Phase 3 home screen, not Phase 2 friends list).
- **Using `SELECT *` on profiles:** Always specify `'id, username, display_name, avatar_url'`.
- **Checking friendship direction only one way:** The canonical pair (`least(requester_id, addressee_id)`, `greatest(requester_id, addressee_id)`) means the requester could be either column. `get_friends()` RPC handles this; for raw queries always use `.or('requester_id.eq.X, addressee_id.eq.X')`.
- **`expo-barcode-scanner` import:** That package was removed in SDK 53. Never import from it. Only `expo-camera`.
- **Using `react-native-reanimated` for bottom sheet:** The simple `Animated` + `Modal` pattern avoids worklet complexity.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code pixel matrix | Custom canvas/SVG renderer | `react-native-qrcode-svg` | Error correction, encoding modes, spec compliance |
| Camera live preview + barcode decoding | Custom native module | `expo-camera` + `onBarcodeScanned` | Platform-specific decode APIs (Google Code Scanner on Android, VisionKit on iOS 16+) |
| UUID generation for QR value | crypto.randomUUID() or manual | User's existing `auth.uid()` (already a UUID) | QR encodes the Supabase user UUID; already exists at `session.user.id` |
| Friendship symmetry enforcement | Client-side dedup | DB `UNIQUE INDEX idx_friendships_canonical_pair` already enforces this | Canonical pair unique index in migration prevents duplicate friendships |
| Status row creation for new users | INSERT on first status set | `handle_new_user` trigger already inserts default `maybe` status | STAT-04 is already implemented in DB trigger |

**Key insight:** The schema in `0001_init.sql` pre-solves nearly all data layer complexity. Phase 2 is mostly UI hooks consuming already-correct RLS/RPC infrastructure.

---

## Common Pitfalls

### Pitfall 1: Friendship Table Column Names vs Type Names

**What goes wrong:** The `friendships` table uses `requester_id` and `addressee_id` columns (not `user_id` / `friend_id` as referenced in generic patterns in ARCHITECTURE.md). The `get_friends()` RPC maps these to a `friend_id` output column. Confusing the two leads to broken queries.

**How to avoid:** Raw queries against `friendships` must reference `requester_id` / `addressee_id`. The RPC output uses `friend_id`. Never write `where user_id = ...` on the friendships table — that column doesn't exist.

**Warning signs:** Type errors on `data.user_id` after `get_friends()` — it's `data.friend_id`.

### Pitfall 2: Removing a Friend — Delete by Canonical Pair

**What goes wrong:** `DELETE FROM friendships WHERE requester_id = A AND addressee_id = B` misses the row if B was the original requester.

**How to avoid:**
```typescript
// Use the canonical pair approach
const { error } = await supabase
  .from('friendships')
  .delete()
  .eq('id', friendshipId); // If you have the friendship id (from get_friends result)
// OR if you only have the friend's user_id:
.or(
  `and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`
)
```

`get_friends()` does NOT return the friendship `id`. To enable "Remove friend" by friendship id, either add `f.id` to the RPC return or re-query the friendships table for the row id first.

### Pitfall 3: Sending Duplicate Friend Request

**What goes wrong:** User taps "Add Friend" twice quickly → two INSERT attempts → second INSERT violates `idx_friendships_canonical_pair` unique index → Supabase returns `23505` unique constraint violation error.

**How to avoid:** Disable the "Add Friend" button immediately on first tap (set loading state). Handle `error.code === '23505'` gracefully: "Friend request already sent."

### Pitfall 4: QR Scan Fires Multiple Times

**What goes wrong:** `onBarcodeScanned` fires on every camera frame where a QR code is detected (continuous). Without debouncing, the callback fires 5–10 times per second, sending multiple friend requests.

**How to avoid:** Use a `scanned` boolean state flag. Set it `true` on first callback, pass `onBarcodeScanned={scanned ? undefined : handler}` to prevent further callbacks.

### Pitfall 5: Context Tag Column Name Mismatch

**What goes wrong:** The `statuses` table column is `context_tag`. The `app.ts` type alias calls it `EmojiTag` but the field name in `UserStatus` is `context_tag`. Queries using `emoji_tag` will silently return empty data.

**How to avoid:** All Supabase queries on statuses use `.select('user_id, status, context_tag, updated_at')`. Never use `emoji_tag` in DB queries.

### Pitfall 6: Camera Permission Not Requested Before QR Tab

**What goes wrong:** Navigating to the QR tab with no camera permission results in a blank screen with no affordance to grant permission.

**How to avoid:** Check `permission?.granted` at the start of the QR scan component. If not granted, render a permission request UI immediately. Use `useCameraPermissions()` hook from `expo-camera`.

### Pitfall 7: Profile Badge Not Visible Without Navigation Event

**What goes wrong:** `navigation.setOptions({ tabBarBadge: N })` only updates when the screen is mounted and the effect runs. If requests arrive while user is on another tab, badge won't update until they navigate to Profile.

**How to avoid:** Load pending request count in the tab layout (`_layout.tsx`) rather than inside `profile.tsx`. The tab layout is always mounted and can run the count query and update badge via a store or context.

**Recommended approach:** Create a `usePendingRequestsCount` hook that queries on mount. Call it from `(tabs)/_layout.tsx` and pass the count to `Tabs.Screen tabBarBadge` via state.

---

## Code Examples

### Verified: expo-camera CameraView Barcode Scanning
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/camera/
import { CameraView, useCameraPermissions } from 'expo-camera';

const [permission, requestPermission] = useCameraPermissions();

<CameraView
  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
  onBarcodeScanned={(result: BarcodeScanningResult) => {
    // result.type === 'qr'
    // result.data === UUID string
  }}
/>
```

### Verified: QR Code Generation
```typescript
// Source: https://github.com/awesomejerry/react-native-qrcode-svg
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={userId}         // string — user's UUID
  size={240}             // number — pixel dimensions
  color="#f5f5f5"        // foreground colour
  backgroundColor="#1a1a1a"  // background colour
  ecl="M"               // error correction level: L/M/Q/H
/>
```

### Verified: tabBarBadge Dynamic Update
```typescript
// Source: https://reactnavigation.org/docs/6.x/bottom-tab-navigator/
// In (tabs)/_layout.tsx — query pending count and pass to screen options
<Tabs.Screen
  name="profile"
  options={{
    tabBarBadge: pendingRequestCount > 0 ? pendingRequestCount : undefined,
  }}
/>
```

### Verified: Supabase get_friends() RPC Call
```typescript
// Calls the SECURITY DEFINER function defined in 0001_init.sql
const { data: friends, error } = await supabase.rpc('get_friends');
// Returns: friend_id, username, display_name, avatar_url, friendship_status, created_at
```

### Verified: Friend Request Insert
```typescript
// RLS policy friendships_insert_as_requester enforces requester_id = auth.uid()
const { error } = await supabase
  .from('friendships')
  .insert({
    requester_id: session.user.id,
    addressee_id: targetUserId,
    // status defaults to 'pending' in schema
  });
// error.code === '23505' → duplicate (already friends or request exists)
```

### Verified: Accept/Reject Request
```typescript
// RLS policy friendships_update_as_addressee enforces addressee_id = auth.uid()
const { error } = await supabase
  .from('friendships')
  .update({ status: 'accepted' }) // or 'rejected'
  .eq('id', friendshipRowId)
  .eq('addressee_id', session.user.id); // belt-and-suspenders (RLS handles this)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-barcode-scanner` for QR scanning | `expo-camera` with `onBarcodeScanned` | SDK 51 deprecated, SDK 53 removed | Never import the old package — it doesn't exist in SDK 55 |
| `Camera` component (expo-camera v13) | `CameraView` component (expo-camera v14+, SDK 50+) | SDK 50 | Import from `expo-camera`, not `expo-camera/next` |
| `onBarCodeScanned` prop (legacy) | `onBarcodeScanned` prop (no capital C) | SDK 50 | Old prop name silently ignored |
| `@react-native-segmented-control/segmented-control` | Pure StyleSheet custom component | n/a — project constraint | Avoids native module dependency |
| `@gorhom/bottom-sheet` | Modal + Animated (custom) | n/a — library has Expo 52–54 compatibility issues | Simpler, no worklet overhead for 3-item action sheet |

**Deprecated/outdated:**
- `expo-barcode-scanner`: Removed in SDK 53. No replacement needed — `expo-camera` handles all barcode types.
- `BarCodeScanner` import from `expo-camera`: Uses legacy API. Use `CameraView` and `useCameraPermissions`.
- `onBarCodeScanned` (camelCase B): Old prop name from pre-SDK 50. Current prop is `onBarcodeScanned`.

---

## Open Questions

1. **`get_friends()` does not return friendship `id`**
   - What we know: The RPC returns `friend_id, username, display_name, avatar_url, friendship_status, created_at`. No `friendship_id`.
   - What's unclear: "Remove friend" from the bottom sheet needs to delete the friendship row. Options: (a) re-query friendships table by canonical pair to get id, (b) add `f.id` to the RPC select — but that would require a DB migration.
   - Recommendation: On the friends list screen, augment the `get_friends()` result with a separate query for the friendship `id` using the canonical pair, OR do the delete by matching both `requester_id` / `addressee_id` without needing the `id`. Doing delete by `.or(...)` on both columns is safe and avoids a migration.

2. **Pending requests count in tab layout**
   - What we know: Expo Router's `(tabs)/_layout.tsx` is always mounted but doesn't have access to user hooks by default unless the session store is read.
   - What's unclear: The cleanest pattern to show a badge that stays current as requests arrive.
   - Recommendation: Create `usePendingRequestsCount()` hook. Call it from `profile.tsx` and update the tab badge via `navigation.setOptions`. The Profile tab is low-traffic enough that this is acceptable. Full real-time badge updates are Phase 6 scope.

---

## Validation Architecture

### Test Framework

No test framework is configured in this project. Phase 2 validation follows manual smoke testing on physical device.

| Property | Value |
|----------|-------|
| Framework | None — no Jest/Vitest configured |
| Config file | None |
| Quick run command | `npx expo start` (manual test on device) |
| Full suite command | Manual smoke test checklist |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| FRND-01 | Username search returns profile card | manual | n/a | Test on device: type username, see card |
| FRND-02 | Send friend request inserts pending row | manual | n/a | Verify in Supabase dashboard |
| FRND-03 | Pending requests screen shows incoming requests | manual | n/a | Use two test accounts from seed.sql |
| FRND-04 | Accept → moves to friends list; reject → disappears | manual | n/a | Test both paths |
| FRND-05 | Friends list shows status pill with correct colour | manual | n/a | Verify Free=#22c55e, Busy=#ef4444, Maybe=#eab308 |
| FRND-06 | QR code displays user UUID as scannable code | manual | n/a | Physical device only; use a QR reader app to verify |
| FRND-07 | Scan QR → shows profile card → confirm → request sent | manual | n/a | Requires two physical devices |
| STAT-01 | Tapping a status segment saves to DB and UI updates | manual | n/a | Verify in Supabase statuses table |
| STAT-02 | Tapping emoji sets context_tag | manual | n/a | Verify column in DB dashboard |
| STAT-03 | Tapping same emoji again clears context_tag to null | manual | n/a | DB column becomes NULL |
| STAT-04 | New user automatically has 'maybe' status | automated (DB trigger) | Supabase trigger on `auth.users` INSERT | Already implemented — verify in seed setup |

### Wave 0 Gaps
- [ ] No Jest/React Native Testing Library configured — manual testing only for Phase 2
- [ ] Seed data (`seed.sql`) should include at least 2 test user accounts with a pending friendship row to enable FRND-03/04 testing without needing two physical devices

---

## Sources

### Primary (HIGH confidence)
- [expo-camera Docs (SDK 55)](https://docs.expo.dev/versions/latest/sdk/camera/) — `CameraView`, `useCameraPermissions`, `onBarcodeScanned` prop, Expo Go compatibility confirmed
- `supabase/migrations/0001_init.sql` — Canonical schema: `friendships` table structure, `is_friend_of()` helper, `get_friends()` RPC, `statuses` table with `context_tag` column, `handle_new_user` trigger
- [React Navigation Bottom Tabs — tabBarBadge](https://reactnavigation.org/docs/6.x/bottom-tab-navigator/) — `tabBarBadge` prop type and `setOptions` update pattern
- `src/types/app.ts` — Confirmed `EmojiTag` and `UserStatus.context_tag` field naming in app types
- `package.json` — Confirmed: `expo-camera`, `react-native-svg`, `expo-haptics` NOT installed; `react-native-reanimated` 4.2.1 IS installed

### Secondary (MEDIUM confidence)
- [react-native-qrcode-svg GitHub (Expensify fork)](https://github.com/Expensify/react-native-qrcode-svg) — v6.3.21, peer dep `react-native-svg`, no metro config needed for RN >= 0.75
- [npm: react-native-qrcode-svg](https://www.npmjs.com/package/react-native-qrcode-svg) — Version 6.3.21 confirmed current (2026-03-18)
- [npm: react-native-svg](https://www.npmjs.com/package/react-native-svg) — Version 15.15.3 confirmed current
- [Expo FYI: barcode-scanner-to-expo-camera](https://github.com/expo/fyi/blob/main/barcode-scanner-to-expo-camera.md) — Official deprecation notice for expo-barcode-scanner

### Tertiary (LOW confidence — needs dev validation)
- WebSearch results on `@gorhom/bottom-sheet` SDK 52–54 issues — multiple GitHub issues corroborating; validates choosing Modal+Animated instead

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry 2026-03-18; Expo Go compatibility confirmed in official docs
- Architecture: HIGH — patterns derived directly from existing schema and established project patterns; no speculation
- Pitfalls: HIGH — column names verified against actual migration SQL; MEDIUM for QR scan debounce (observed pattern)
- QR library compatibility: MEDIUM — metro config "not needed for RN >= 0.75" based on library README; needs dev validation on first run

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable libraries; expo-camera API changes slowly)
