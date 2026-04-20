# Phase 13: Profile Rework + Friend Profile - Research

**Researched:** 2026-04-20
**Domain:** React Native / Expo — screen restructure, navigation, data source migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 (PROF-01):** Remove "YOUR STATUS" section header and `MoodPicker` component entirely from `profile.tsx`. Status entry point is home screen only.

**D-02 (PROF-02):** Collapse SETTINGS and MORNING PROMPT section headers into a single "NOTIFICATIONS" section header. All three toggles — plan invites, friend availability, morning prompt — live under this one header. Morning prompt time picker row and denied hint text remain directly below the morning prompt toggle row, within the same section.

**D-03 (PROF-03):** Avatar tap on profile tab triggers photo picker directly (inline — no screen navigation). Pencil overlay remains as the affordance. No `router.push` from avatar tap.

**D-04 (PROF-03):** A separate "Edit Profile" tappable row navigates to a text-only detail editor screen.

**D-05 (PROF-03):** Detail editor screen contains: display name text field, @username read-only (not editable), birthday picker. No avatar, no wish list.

**D-06 (PROF-03):** Username is read-only in this phase. Show @username as non-interactive text in the detail editor.

**D-07:** Add "My Wish List" tappable row to profile tab (after Edit Profile row, before ACCOUNT). Navigates to `/profile/wish-list`.

**D-08:** Wish list management screen contains add/delete wish list item functionality moved from `profile/edit.tsx`.

**D-09 (PROF-04/05):** Switch status data source from `statuses` table to `effective_status` view. NULL effective_status means expired — omit status row entirely on friend profile.

**D-10 (PROF-05):** Add birthday display on friend profile below username. Only render if birthday_month and birthday_day are non-null. Format: "Month Day" (e.g., "Aug 14"). No year. No emoji (UI-SPEC overrides D-10's emoji suggestion — clean minimalism).

**D-11 (PROF-05):** Add wish list section on friend profile below action buttons. Use `useFriendWishList` hook. Display using `WishListItem` with `readOnly={true}` (no claim/vote). Empty state: "No wish list items."

**D-12:** Back navigation from friend profile already works — `router.back()` at Stack level. No changes needed.

### Claude's Discretion

- Exact placement of "Edit Profile" and "My Wish List" rows (between avatar block and ACCOUNT section — UI-SPEC layout confirmed).
- Copy for null/expired status on friend profile — UI-SPEC decision: omit status row entirely (no text).
- Whether detail editor reuses `profile/edit.tsx` route or becomes a new route — prefer reusing `/profile/edit` (avoids Expo Router rerouting work).
- Styling and section label for friend profile wish list — UI-SPEC: "WISH LIST" section label, matches existing birthday screen pattern.

### Deferred Ideas (OUT OF SCOPE)

- Username editing — potential Phase 15+ addition.
- Claim/vote interactivity on friend profile wish list — full claim/vote in birthday group chat context only.
- Status freshness badge (FADING/DEAD visual distinction) on friend profile.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | Status display removed from profile screen | Remove MoodPicker + "YOUR STATUS" section header from profile.tsx. No new code needed — pure deletion. |
| PROF-02 | Notification toggles grouped under single "Notifications" section header | Collapse three separate sections (SETTINGS, MORNING PROMPT) into one. All toggle state/logic unchanged — only the JSX structure reorganizes. |
| PROF-03 | Edit profile details accessible separately from photo edit | Three changes: (1) avatar tap inline, (2) "Edit Profile" row added, (3) edit.tsx stripped to text-only fields. |
| PROF-04 | Tapping a friend's name/avatar opens full friend profile screen | Route already exists at `/friends/[id].tsx`. This phase enriches data — no new route needed. |
| PROF-05 | Friend profile shows avatar, display name, current status, birthday, and wish list | Switch to effective_status view, add birthday_month/birthday_day to profile SELECT, drop in useFriendWishList + WishListItem. |

</phase_requirements>

---

## Summary

Phase 13 is a focused UI restructure with zero new backend infrastructure. All five requirements are satisfied through client-side changes to three existing screens and one new screen. The codebase already contains every building block — the work is reorganization, data source migration (statuses table → effective_status view), and surfacing existing hooks on a different screen.

The heaviest lift is `profile.tsx`: the avatar tap behavior must move inline (from navigate-to-edit to direct photo picker), two new tappable rows must be added ("Edit Profile", "My Wish List"), and three section headers collapse to one. The `profile/edit.tsx` screen must be stripped — avatar section and wish list section removed, username made read-only text. The wish list logic moves verbatim to a new `profile/wish-list.tsx` screen.

The friend profile (`friends/[id].tsx`) needs a data source swap and two new UI sections. The `effective_status` query pattern is already established in `useHomeScreen.ts` and is a one-line change. Birthday and wish list are additive renders — no existing UI is removed, only new sections appended.

**Primary recommendation:** Execute in four waves — (1) profile.tsx restructure, (2) edit.tsx strip + wish-list.tsx create, (3) friends/[id].tsx enrichment, (4) profile group layout update for wish-list route.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Profile tab UI restructure | Frontend (RN screen) | — | Pure JSX reorganization; no server changes |
| Avatar photo picker inline | Frontend (RN screen) | Supabase Storage | ImagePicker + upload already exists in edit.tsx; moves to profile.tsx |
| Notification toggles consolidation | Frontend (RN screen) | — | Section header label change only; toggle logic unchanged |
| "Edit Profile" row navigation | Frontend (RN screen) | — | `router.push('/profile/edit')` — Expo Router client nav |
| Wish list management screen | Frontend (RN screen) | Supabase DB | New screen wrapping existing `useMyWishList` hook |
| Edit.tsx strip to text-only | Frontend (RN screen) | — | Delete avatar + wish list JSX blocks; keep display name + birthday |
| Username read-only display | Frontend (RN screen) | — | Render @username as Text, not TextInput |
| Friend profile status (effective_status) | Frontend (RN screen) | Supabase DB view | Query `effective_status` view; NULL = omit row |
| Friend profile birthday display | Frontend (RN screen) | — | Add birthday_month/birthday_day to existing profiles SELECT |
| Friend profile wish list | Frontend (RN screen) | Supabase DB | Drop in `useFriendWishList` + `WishListItem readOnly` |
| Back navigation | Expo Router Stack | — | Already works via `router.back()` — no change |

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | project version | File-based routing, Stack navigation | Project standard; friends route already uses Stack |
| expo-image-picker | project version | Photo library + camera access for avatar upload | Already used in edit.tsx; moves to profile.tsx |
| @react-native-community/datetimepicker | project version | Birthday picker, morning prompt time picker | Already in profile.tsx + BirthdayPicker component |
| @supabase/supabase-js | project version | Supabase queries | Project DB client |
| @expo/vector-icons (Ionicons) | project version | Row icons | Project icon standard |

[VERIFIED: codebase grep] — all libraries confirmed in existing imports across profile.tsx, edit.tsx, friends/[id].tsx.

### No New Dependencies

This phase requires zero new npm packages. All capabilities are already in the project.

**Installation:**
```bash
# No installation required
```

---

## Architecture Patterns

### System Architecture Diagram

```
User Interaction (Profile Tab)
        |
        +---> Avatar tap ──────────────────> ImagePicker Alert (inline in profile.tsx)
        |                                           |
        |                                    uploadAvatar() ──> Supabase Storage (avatars bucket)
        |
        +---> "Edit Profile" row ──────────> router.push('/profile/edit')
        |                                           |
        |                                    profile/edit.tsx (text-only)
        |                                    display_name TextInput
        |                                    @username Text (read-only)
        |                                    BirthdayPicker ──────────────> Supabase profiles UPDATE
        |
        +---> "My Wish List" row ──────────> router.push('/profile/wish-list')
        |                                           |
        |                                    profile/wish-list.tsx (new)
        |                                    useMyWishList hook ────────────> Supabase wish_list_items
        |
        +---> Notifications section ──────> (unchanged toggle logic, new section header only)


User Interaction (Friend Profile)
        |
        v
friends/[id].tsx
        |
        +---> Promise.all([
        |       profiles SELECT (display_name, username, avatar_url, birthday_month, birthday_day)
        |       effective_status SELECT (effective_status, context_tag)  <-- changed from statuses table
        |     ])
        |
        +---> useFriendWishList(id) ──────> Supabase wish_list_items + wish_list_claims
        |
        v
Render: Avatar + Name + Username
        + Status row (if effective_status non-null)
        + Birthday row (if birthday_month + birthday_day non-null)
        + Action buttons (Message, Remove Friend)
        + Wish List section (WishListItem readOnly, or empty state)
```

### Recommended Project Structure

```
src/app/
├── (tabs)/
│   └── profile.tsx          # Modified: remove MoodPicker, add rows, inline avatar tap
├── profile/
│   ├── _layout.tsx          # Modified: add 'wish-list' Screen entry
│   └── edit.tsx             # Modified: strip avatar + wish list, add read-only username
│   └── wish-list.tsx        # NEW: wish list CRUD screen
└── friends/
    └── [id].tsx             # Modified: effective_status, birthday, wish list sections
```

### Pattern 1: Avatar Tap Inline (moving from edit.tsx to profile.tsx)

Move `handleChangeAvatar`, `uploadAvatar`, and related state (`avatarLoading`) from `edit.tsx` into `profile.tsx`. The avatar `onPress` changes from `router.push('/profile/edit')` to `handleChangeAvatar`. The pencil overlay badge remains.

**What:** The TouchableOpacity wrapping the avatar in profile.tsx currently navigates to edit. After this change it calls `handleChangeAvatar` directly.

**Example:**
```typescript
// profile.tsx — BEFORE
<TouchableOpacity
  style={styles.avatarHeader}
  onPress={() => router.push('/profile/edit' as never)}
  activeOpacity={0.8}
>

// profile.tsx — AFTER
// Avatar tap triggers photo picker directly (D-03)
// AvatarCircle gets onPress directly; the outer TouchableOpacity wraps only the pencil badge area
<View style={styles.avatarHeader}>
  <View style={{ position: 'relative' }}>
    <AvatarCircle
      size={80}
      imageUri={profile?.avatar_url}
      displayName={profile?.display_name || 'U'}
      onPress={handleChangeAvatar}
    />
    <View style={styles.pencilOverlay}>
      <Ionicons name="pencil-outline" size={SPACING.lg} color={COLORS.interactive.accent} />
    </View>
  </View>
  <Text style={styles.displayName}>{profile?.display_name || ''}</Text>
  <Text style={styles.username}>@{profile?.username ?? ''}</Text>
</View>
```

[VERIFIED: codebase] — AvatarCircle has an `onPress` prop; confirmed in WishListItem and edit.tsx usage. No API change needed.

### Pattern 2: Notifications Section Consolidation

**What:** Replace two section headers ("SETTINGS", "MORNING PROMPT") with one ("NOTIFICATIONS"). All three toggle rows move under the single header with no other logic changes.

**JSX order in profile.tsx after change:**
```
<Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
{/* Plan invites row (Switch) */}
{/* Friend availability row (Switch) */}
{/* Morning prompt row (Switch) */}
{/* Time row (tappable, disabled when morningEnabled false) */}
{/* DateTimePicker (conditional) */}
{/* morningDeniedHint text (conditional) */}
```

[VERIFIED: codebase] — Confirmed by reading profile.tsx lines 293–381. Section headers are plain `<Text style={styles.sectionHeader}>` — no component to update.

### Pattern 3: effective_status View Query (friend profile data source swap)

The home screen already queries `effective_status` correctly. Replicate that pattern for a single user.

**Example:**
```typescript
// friends/[id].tsx — BEFORE
supabase.from('statuses').select('status, context_tag').eq('user_id', id).single()

// friends/[id].tsx — AFTER (D-09)
supabase
  .from('effective_status')
  .select('effective_status, context_tag')
  .eq('user_id', id)
  .single()
```

`effective_status` is a view, not a table. It returns NULL for `effective_status` when the status has expired or no status exists. The `.single()` call will return `{ data: null, error: ... }` if no row exists (friend has never set a status), or `{ data: { effective_status: null, context_tag: null } }` if the status expired.

**Handling both cases:**
```typescript
// After fetch:
const effectiveStatus = statusResult.data?.effective_status ?? null;
const contextTag = statusResult.data?.context_tag ?? null;
// effectiveStatus === null → omit status row in render
```

[VERIFIED: codebase] — useHomeScreen.ts lines 86–103 show the exact `from('effective_status').select(...)` pattern. The view is confirmed in PROJECT.md decision log.

### Pattern 4: Profile Group Layout Registration

The `profile/_layout.tsx` currently only registers the `edit` screen. The new `wish-list` screen needs to be added:

```typescript
// src/app/profile/_layout.tsx — AFTER
<Stack ...>
  <Stack.Screen name="edit" options={{ headerShown: false }} />
  <Stack.Screen name="wish-list" options={{ headerShown: false }} />
</Stack>
```

[VERIFIED: codebase] — _layout.tsx has a single Stack.Screen. Expo Router requires explicit registration for screens with `headerShown: false` to suppress the default Stack header. The new screen uses `ScreenHeader` component per project pattern.

### Pattern 5: Read-Only Username Display in Edit Screen

Replace the (non-existent) username TextInput with a static Text label:

```typescript
// profile/edit.tsx — ADD (between char count and birthday label)
<Text style={styles.usernameLabel}>Username</Text>
<Text style={styles.usernameValue}>@{username}</Text>
```

New styles using existing tokens:
```typescript
usernameLabel: {
  fontSize: FONT_SIZE.md,
  fontWeight: FONT_WEIGHT.regular,
  color: COLORS.text.secondary,
  marginTop: SPACING.xl,
  marginBottom: SPACING.sm,
},
usernameValue: {
  fontSize: FONT_SIZE.lg,
  fontWeight: FONT_WEIGHT.regular,
  color: COLORS.text.secondary,  // secondary to signal non-interactive
  paddingHorizontal: SPACING.lg,
},
```

State: add `const [username, setUsername] = useState<string | null>(null);` and fetch `username` from profiles SELECT.

[VERIFIED: codebase] — edit.tsx currently does NOT fetch or display username. The profiles SELECT at line 56 omits username — add it. No uniqueness validation needed (D-06).

### Pattern 6: Birthday Formatting (friend profile)

```typescript
// Month names lookup (0-indexed for Date constructor)
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatBirthday(month: number, day: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

// Render (conditional):
{profile.birthday_month && profile.birthday_day ? (
  <Text style={styles.birthday}>
    {formatBirthday(profile.birthday_month, profile.birthday_day)}
  </Text>
) : null}
```

[VERIFIED: codebase] — birthday_month is 1-indexed (January = 1) per the birthday picker and DB column convention established in v1.4. The UI-SPEC confirms "Aug 14" format (abbreviated month name + day).

### Anti-Patterns to Avoid

- **Wrapping `AvatarCircle` in a TouchableOpacity for avatar tap on profile.tsx:** AvatarCircle already accepts an `onPress` prop. Pass `onPress={handleChangeAvatar}` directly. Wrapping adds redundant touch targets.
- **Querying `statuses` table for friend status:** The `statuses` table shows raw status without freshness expiry. Always use `effective_status` view — NULL result = expired, not an error condition.
- **Using `FlatList` for wish list on friend profile inside a `ScrollView`:** The friend profile is a `ScrollView`. Add the wish list items as plain mapped `WishListItem` components inside the scroll. FlatList nested in ScrollView breaks Android scroll silently (established decision v1.4).
- **Navigating to a new route for avatar change:** D-03 is explicit — avatar tap on profile tab stays inline with Alert.alert. No `router.push`.
- **Showing "Status unavailable" text when status is null:** UI-SPEC and D-09 are explicit — omit the status row entirely. No placeholder text.
- **Keeping the avatar upload state in edit.tsx:** The avatar upload (`handleChangeAvatar`, `uploadAvatar`, `avatarLoading`, `avatarUrl`) moves to `profile.tsx`. After stripping, edit.tsx no longer needs ImagePicker or decode imports.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Birthday month name formatting | Custom intl object | Simple `MONTH_NAMES` array lookup | Single use, no locale complexity needed; 12-item array is simpler than Intl.DateTimeFormat for just abbreviated month |
| Wish list CRUD | New Supabase query logic | `useMyWishList` hook (existing) | Full hook already tested in v1.4 |
| Friend wish list fetch | New query | `useFriendWishList` hook (existing) | Handles RLS, claim state, claimer names |
| Wish list item UI | Custom row component | `WishListItem` with `readOnly={true}` | Component already has readOnly prop designed for exactly this use case |
| Photo picker | Custom native module | `expo-image-picker` (existing) | Already in project, working in Expo Go |
| Avatar upload | Custom fetch | `decode` + `supabase.storage.from('avatars').upload(...)` pattern | Already in edit.tsx — move verbatim to profile.tsx |

---

## Runtime State Inventory

> Rename/refactor phase: NOT APPLICABLE. This phase is feature work (UI restructure + data enrichment), not a rename or migration.

None — verified. No stored data, service configs, OS-registered state, secrets, or build artifacts need updating. The `effective_status` view already exists in the database (created in v1.3). The `wish_list_items` table already exists (migration 0017). No new DB migrations are required for this phase.

---

## Common Pitfalls

### Pitfall 1: Avatar State Lives in Two Places After Partial Refactor

**What goes wrong:** If `avatarUrl` state and upload logic are moved to `profile.tsx` but the edit screen also refreshes profile data on mount, the displayed avatar can stale-read from the DB and overwrite an in-session upload.

**Why it happens:** Both screens independently fetch from `profiles` table. An upload updates Supabase Storage and sets a new URL with cache-busting `?t=Date.now()`. If edit.tsx still fetches avatar_url, it would re-render with the non-cache-busted DB URL.

**How to avoid:** After stripping edit.tsx, it no longer fetches or displays avatar_url at all. The profile.tsx `fetchProfile()` (called on `useFocusEffect`) will get the new URL on next focus. No avatar_url state needed in edit.tsx.

**Warning signs:** If edit.tsx still imports `AvatarCircle` or `decode` from base64-arraybuffer — it should not after the strip.

### Pitfall 2: effective_status Returns No Row vs. Returns Null effective_status

**What goes wrong:** Two distinct cases look similar but require different handling:
1. Friend has NEVER set a status → `effective_status` view returns 0 rows → `.single()` returns `{ data: null, error: { code: 'PGRST116' } }`
2. Friend's status has expired → view returns 1 row with `effective_status: null`

**Why it happens:** `supabase.from(...).select(...).eq('user_id', id).single()` throws an error when 0 rows are returned, which may be swallowed as a regular error and leave `status` in its initial 'free' state.

**How to avoid:** Destructure `data` and `error` separately. Treat both cases as "no active status" — if `error` exists OR `data?.effective_status === null`, set effective status to null and omit the status row.

```typescript
const effectiveStatus = (statusResult.error || !statusResult.data)
  ? null
  : (statusResult.data.effective_status as StatusValue | null);
```

**Warning signs:** Friend profile always shows "Free" status even for friends who've never set a status, or shows stale status for a friend who set status days ago.

### Pitfall 3: Wish List FlatList Inside ScrollView

**What goes wrong:** Using `FlatList` to render wish list items inside the `ScrollView` in `friends/[id].tsx` silently breaks nested scroll on Android.

**Why it happens:** React Native's VirtualizedList (FlatList) and ScrollView conflict when nested — Android drops touch events unpredictably.

**How to avoid:** Map `useFriendWishList` items to `WishListItem` components directly inside the `ScrollView` container. No `FlatList` needed — friend wish lists are typically short (under 20 items), making virtualization unnecessary.

**Warning signs:** Scroll stops working on Android after adding the wish list section.

### Pitfall 4: profile/_layout.tsx Missing wish-list Screen Registration

**What goes wrong:** Navigating to `/profile/wish-list` shows a blank screen with the default Stack header instead of the `ScreenHeader` component, because the Stack.Screen with `headerShown: false` is not registered.

**Why it happens:** Expo Router auto-discovers route files but `headerShown: false` requires explicit `<Stack.Screen name="wish-list" options={{ headerShown: false }} />` in the layout.

**How to avoid:** Add the Stack.Screen entry to `src/app/profile/_layout.tsx` in the same wave as creating `wish-list.tsx`.

**Warning signs:** New screen shows a native header bar with "Wish List" or "wish-list" as the title AND the `ScreenHeader` component below it — double headers.

### Pitfall 5: isDirty Check in Edit.tsx After Stripping Avatar/Wish List Fields

**What goes wrong:** The `isDirty` check in edit.tsx currently includes `avatarUrl !== originalAvatarUrl`. After stripping avatar, this comparison references undefined state and the Save button may be permanently disabled or enabled.

**Why it happens:** Mechanical strip without updating the isDirty computation.

**How to avoid:** Update `isDirty` to only compare display name and birthday fields after stripping:
```typescript
const isDirty =
  displayName.trim() !== originalDisplayName ||
  birthdayMonth !== originalBirthdayMonth ||
  birthdayDay !== originalBirthdayDay ||
  birthdayYear !== originalBirthdayYear;
```

**Warning signs:** Save button is permanently greyed out even after changing display name.

### Pitfall 6: Username State Not Fetched in Stripped Edit.tsx

**What goes wrong:** The read-only username display renders an empty string because `username` is not included in the profiles SELECT in edit.tsx (it currently selects only `display_name, avatar_url, birthday_month, birthday_day, birthday_year`).

**How to avoid:** Add `username` to the SELECT in the useEffect fetch. Set `const [username, setUsername] = useState<string | null>(null)` and populate from `data.username`.

**Warning signs:** "@" is displayed with nothing after it in the username row.

---

## Code Examples

### Moving Avatar Logic from edit.tsx to profile.tsx

The upload function is self-contained. Move these from edit.tsx to profile.tsx verbatim:

```typescript
// Source: src/app/profile/edit.tsx (moving to profile.tsx)
// Add to profile.tsx imports:
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { APP_CONFIG } from '@/constants/config';

// Add state:
const [avatarLoading, setAvatarLoading] = useState(false);

// Add functions (verbatim from edit.tsx):
async function uploadAvatar(asset: ImagePicker.ImagePickerAsset) { ... }
function handleChangeAvatar() { ... }
```

After adding, update `fetchProfile` to also set a local `avatarUrl` state so the profile screen can display the uploaded avatar immediately (with cache-bust) without waiting for re-fetch.

### effective_status Query for Single User

```typescript
// Source: useHomeScreen.ts pattern, adapted for single user
const { data: statusData, error: statusError } = await supabase
  .from('effective_status')
  .select('effective_status, context_tag')
  .eq('user_id', id)
  .single();

const effectiveStatus = (statusError || !statusData)
  ? null
  : (statusData.effective_status as 'free' | 'busy' | 'maybe' | null);
const contextTag = statusData?.context_tag as string | null ?? null;
```

### Friend Profile Birthday Display

```typescript
// Add to FriendProfile interface:
interface FriendProfile {
  display_name: string;
  username: string;
  avatar_url: string | null;
  birthday_month: number | null;   // ADD
  birthday_day: number | null;     // ADD
}

// Add to profiles SELECT:
supabase
  .from('profiles')
  .select('display_name, username, avatar_url, birthday_month, birthday_day')
  .eq('id', id)
  .single()

// Birthday formatting helper:
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatBirthday(month: number, day: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

// Conditional render (below @username, above action buttons):
{profile.birthday_month && profile.birthday_day ? (
  <Text style={styles.birthday}>
    {formatBirthday(profile.birthday_month, profile.birthday_day)}
  </Text>
) : null}
```

### Friend Profile Wish List Section

```typescript
// Add hook call at top of FriendProfileScreen:
const { items: wishListItems, loading: wishListLoading } = useFriendWishList(id ?? '');

// Render (below actionsSection, inside ScrollView):
<View style={styles.wishListSection}>
  <Text style={styles.sectionHeader}>WISH LIST</Text>
  {wishListLoading ? null : wishListItems.length === 0 ? (
    <Text style={styles.emptyWishList}>No wish list items.</Text>
  ) : (
    wishListItems.map((item) => (
      <WishListItem
        key={item.id}
        title={item.title}
        url={item.url}
        notes={item.notes}
        isClaimed={item.isClaimed}
        isClaimedByMe={item.isClaimedByMe}
        readOnly={true}
      />
    ))
  )}
</View>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `statuses` table for friend status | `effective_status` view | v1.3 | View computes freshness; NULL = expired; must use view not table |
| Avatar tap → navigate to edit screen | Avatar tap → inline photo picker | Phase 13 (this phase) | Split nav path (photo vs. text edit) |
| Single SETTINGS section with 2 toggles | NOTIFICATIONS section with 3 toggles | Phase 13 (this phase) | Cleaner categorization |
| Wish list in edit screen | Dedicated wish list screen | Phase 13 (this phase) | Separation of concerns |

---

## Open Questions (RESOLVED)

1. **Avatar URL refresh after upload on profile.tsx**
   - What we know: edit.tsx updates a local `avatarUrl` state with cache-busted URL immediately. Profile.tsx currently fetches avatar_url from DB on focus.
   - What's unclear: Should profile.tsx maintain a local `avatarUrl` state separate from `profile.avatar_url` to show the cache-busted URL immediately after upload, or is the focus-triggered `fetchProfile` sufficient?
   - Recommendation: Add a local `avatarUrl` state in profile.tsx (initialized from `profile?.avatar_url`). Set it immediately after upload completes (with cache-buster). This matches the existing UX from edit.tsx and avoids the user seeing their old avatar briefly after photo change.

2. **wish-list.tsx Save/Add UX**
   - What we know: wish list items are added one at a time (title + optional URL + optional notes). The form resets after adding.
   - What's unclear: Does the wish list screen need a "Save" concept or is each add/delete immediate?
   - Recommendation: Each operation is immediate (add inserts on button press, delete removes on "Remove" press). No global Save button needed. This matches how edit.tsx currently handles wish list adds.

---

## Environment Availability

> Step 2.6: SKIPPED — this phase has no external tool dependencies. All libraries are already installed in the project. No new services, CLIs, or runtimes are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (Expo Web visual regression — per PROJECT.md v1.1) |
| Config file | playwright.config.ts (project root) |
| Quick run command | `npx playwright test --grep "profile"` |
| Full suite command | `npx playwright test` |

**Note on test scope for this phase:** Phase 13 changes are UI restructure on native screens. The Playwright suite targets Expo Web rendering. The primary validation for this phase is manual Expo Go verification per the project's established hardware-gate pattern (noted in project memory). The Playwright suite can cover profile tab layout structure but cannot cover native interactions (ImagePicker, DateTimePicker, Switch).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | MoodPicker absent from profile tab | Manual Expo Go | n/a | n/a |
| PROF-02 | Single NOTIFICATIONS section, three toggles | Manual Expo Go | n/a | n/a |
| PROF-03 | Avatar tap → photo picker; Edit Profile row → edit screen | Manual Expo Go | n/a | n/a |
| PROF-04 | Friend profile opens from friend tap | Manual Expo Go | n/a | n/a |
| PROF-05 | Friend profile: status, birthday, wish list render correctly | Manual Expo Go | n/a | n/a |

### Sampling Rate

- **Per task commit:** TypeScript strict compile check — `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit && npx eslint src/app/(tabs)/profile.tsx src/app/profile/edit.tsx src/app/profile/wish-list.tsx src/app/friends/[id].tsx --max-warnings 0`
- **Phase gate:** Manual Expo Go smoke test per all 5 success criteria before `/gsd-verify-work`

### Wave 0 Gaps

- None — no new test files needed. TypeScript strict + ESLint + manual Expo Go are the validation gates for this phase.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not touched |
| V3 Session Management | No | Not touched |
| V4 Access Control | Yes (partial) | Supabase RLS on wish_list_items, wish_list_claims already enforced |
| V5 Input Validation | Yes | Display name max length (APP_CONFIG.displayNameMaxLength), wish item title maxLength 120 — carry forward from edit.tsx |
| V6 Cryptography | No | Not touched |

### RLS Verification

`wish_list_items` and `wish_list_claims` RLS was implemented in v1.4 (migration 0017). Key policies in scope for this phase:

- **wish_list_items SELECT:** Authenticated users can read items belonging to friends (RLS enforced — `useFriendWishList` relies on this).
- **wish_list_claims SELECT:** RLS hides claims from the item owner — this is the birthday-secrecy feature. On the friend profile wish list (read-only, `readOnly={true}`), claim visibility is irrelevant since we don't render claim buttons or states, but the data still arrives with correct RLS filtering.
- **profiles SELECT:** The added `birthday_month, birthday_day` columns are on `profiles`. RLS on profiles allows friends to read — no change needed.

No new RLS policies required for this phase.

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reading another user's wish list items | Information Disclosure | RLS on wish_list_items — already in place |
| Displaying stale/expired status as current | Spoofing | effective_status view (NULL for expired) — query pattern enforces freshness |
| Display name XSS | Tampering | React Native Text renders as native text — no HTML injection surface |

---

## Project Constraints (from CLAUDE.md)

No CLAUDE.md found at project root. Constraints sourced from PROJECT.md §Constraints:

- **Expo Go managed workflow:** No native modules. All libraries must work in Expo Go. This phase uses only existing installed libraries — compliant.
- **No UI libraries:** React Native StyleSheet only. All styling via `@/theme` tokens. ESLint `no-hardcoded-styles` enforced.
- **No Redux, React Query:** Zustand + direct Supabase hooks. `useMyWishList` and `useFriendWishList` are direct Supabase hooks — compliant.
- **TypeScript strict:** `"strict": true`, `"noUncheckedIndexedAccess": true`. No `any`. All new code must satisfy.
- **RLS is security:** Client-side filtering only supplements RLS. Friend profile wish list read relies on Supabase RLS, not client-side gating.
- **FlatList for all lists:** Wish list items in friend profile (inside ScrollView) must NOT use FlatList — use mapped components instead.
- **Design tokens:** All styling via `@/theme`. No raw hex, fontSize, padding values except the two pre-existing documented exceptions (`fontSize: 12` in charCount, `marginTop: 48` in logoutRow, `marginRight: 6` on status dot, `rgba(0,0,0,0.5)` avatar scrim).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `effective_status` view already exists in production DB (created v1.3, confirmed in PROJECT.md decision log) | Code Examples | None — v1.3 is shipped; risk is zero |
| A2 | `wish_list_items` and `wish_list_claims` tables exist (migration 0017) | Security Domain | None — v1.4 is shipped |
| A3 | `useFriendWishList` with `readOnly=true` on `WishListItem` shows no claim button even though hook fetches claim state | Code Examples | Minor — if claim buttons appear, pass `readOnly={true}` explicitly (already in WishListItem API) |
| A4 | `birthday_month` is 1-indexed (Jan=1) based on birthday picker convention | Code Examples | Formatting off by one month if wrong — verify against BirthdayPicker.tsx before implementing |

**Verified claims:** All architecture patterns, file structures, API surfaces, and hook interfaces were verified by reading the actual source files in this session. The `effective_status` view query pattern was verified in `useHomeScreen.ts`. The `WishListItem` `readOnly` prop was verified in `src/components/squad/WishListItem.tsx`. The `profile/_layout.tsx` Stack structure was verified. No unverified architectural claims are made.

---

## Sources

### Primary (HIGH confidence — codebase reads)

- `src/app/(tabs)/profile.tsx` — full source, current structure, all section headers and state
- `src/app/profile/edit.tsx` — full source, wish list code to move, avatar upload logic to move
- `src/app/profile/_layout.tsx` — Stack layout structure; wish-list screen registration gap identified
- `src/app/friends/[id].tsx` — full source, current status query (statuses table), structure to enrich
- `src/hooks/useHomeScreen.ts` — canonical `effective_status` view query pattern
- `src/hooks/useFriendWishList.ts` — full source, interface, return shape
- `src/hooks/useMyWishList.ts` — full source, addItem/deleteItem API
- `src/components/squad/WishListItem.tsx` — full source, readOnly prop confirmed
- `.planning/phases/13-profile-rework-friend-profile/13-CONTEXT.md` — all decisions D-01 through D-12
- `.planning/phases/13-profile-rework-friend-profile/13-UI-SPEC.md` — visual contract, layout order, copywriting
- `.planning/PROJECT.md` — constraints, key decisions, migration history

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — PROF-01 through PROF-05 requirement text
- `.planning/STATE.md` — current milestone state, accumulated decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in existing codebase
- Architecture: HIGH — all file structures and APIs verified by source reads
- Pitfalls: HIGH — derived from actual code (not hypothetical patterns), existing project decisions, and known RN constraints
- Data patterns: HIGH — effective_status query verified against useHomeScreen.ts

**Research date:** 2026-04-20
**Valid until:** Indefinite — no fast-moving external dependencies; all patterns are internal to the project
