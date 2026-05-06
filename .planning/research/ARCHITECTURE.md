# Architecture Analysis: v1.8 UI/UX Screen Overhaul

**Milestone:** v1.8 Deep UI Refinement & Screen Overhaul
**Analyzed:** 2026-05-06
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Router and Auth Gate Overview

The app uses three `Stack.Protected` guards in `src/app/_layout.tsx`:

```
session && !needsProfileSetup  →  (tabs)         main app
session &&  needsProfileSetup  →  profile-setup  first-run profile creation
!session                       →  (auth)         login / sign-up
```

`needsProfileSetup` is driven by `useAuthStore` (Zustand). After sign-up or OAuth,
`onAuthStateChange` fires in `_layout.tsx`, which checks `profiles.username` and writes the flag.
After profile-setup completes, `setNeedsProfileSetup(false)` is called, Stack.Protected re-evaluates,
and the navigator switches to `(tabs)` automatically — `AuthScreen` does not push a route.

The Welcome/Onboarding flow must fit into this chain without adding a new `Stack.Protected` guard
(adding guards mid-list is fragile — guards are evaluated top-to-bottom in JSX order).

---

## Screen 1: Home

### Current Component Tree

```
(tabs)/index.tsx
  → screens/home/HomeScreen.tsx
      ├── OwnStatusCard              [status/OwnStatusCard.tsx]
      │     reads useStatusStore; onPress → opens StatusPickerSheet
      ├── StatusPickerSheet          [status/StatusPickerSheet.tsx]
      │     writes useStatusStore → Supabase upsert
      ├── RadarViewToggle            [home/RadarViewToggle.tsx]
      │     reads/writes useViewPreference (AsyncStorage key @campfire/view_preference)
      ├── RadarView                  [home/RadarView.tsx]
      │     └── RadarBubble×N       [home/RadarBubble.tsx]
      │           receives FriendWithStatus prop; computes heartbeat internally
      ├── CardStackView              [home/CardStackView.tsx]
      │     └── FriendSwipeCard     [home/FriendSwipeCard.tsx]
      │           calls supabase.rpc('send_nudge') on nudge action
      ├── UpcomingEventsSection      [home/UpcomingEventsSection.tsx]
      │     reads usePlansStore (populated by usePlans() called in HomeScreen)
      ├── RecentMemoriesSection      [home/RecentMemoriesSection.tsx]
      │     own Supabase query via hook
      ├── HomeWidgetRow              [home/HomeWidgetRow.tsx]
      │     receives iouSummary + birthdays as props from HomeScreen
      └── OnboardingHintSheet        [onboarding/OnboardingHintSheet.tsx]
            Modal triggered by @campfire/onboarding_hint_shown AsyncStorage flag
            *** REMOVED in v1.8 — replaced by WelcomeFlow ***
```

### Data Flow

- `useHomeScreen` hook: calls `get_friends` RPC, then queries `effective_status` view, merges both
  into `FriendWithStatus[]`, writes `useHomeStore`. Also subscribes a Supabase Realtime channel
  (`home-statuses`) on the `statuses` table for live friend status updates.
- `usePlans()` is called in HomeScreen to populate `usePlansStore`. `UpcomingEventsSection` reads
  from the store client-side — it does not fetch directly.
- `useIOUSummary` and `useUpcomingBirthdays` are direct Supabase hooks; results are passed as props
  into `HomeWidgetRow` — they are not accessed from a store.
- `OwnStatusCard` reads from `useStatusStore`. `StatusPickerSheet` writes to `useStatusStore` and
  Supabase.
- A 60-second `setInterval` in HomeScreen calls `setHeartbeatTick` to trigger re-renders that
  recompute `computeHeartbeatState()` without a network fetch.

### Integration Points for Overhaul

| Area | What Changes | Stable Contracts |
|------|-------------|-----------------|
| OwnStatusCard redesign | Visual + layout only | `{ onPress: () => void }` prop interface; `useStatusStore` reads unchanged |
| RadarView redesign | Visual + possible layout algorithm | Must preserve `onLayout`-based width measurement (NEVER `Dimensions.get`). `computeScatterPositions` is pure and replaceable |
| CardStackView redesign | Stack shell and depth cards visual | `FriendSwipeCard` gesture physics live in a separate component — redesigning the stack container does not touch gesture code |
| OnboardingHintSheet removal | Delete from HomeScreen | Remove `onboardingVisible` state, `ONBOARDING_FLAG_KEY` constant, and `OnboardingHintSheet` import from `HomeScreen.tsx` |
| Section reordering | JSX order in ScrollView | Each section is an independent component — reorder by moving JSX lines |

### New vs Modified Components

- **REMOVE:** `OnboardingHintSheet` usage from `HomeScreen.tsx` (keep file for a release or delete)
- **MODIFY:** `OwnStatusCard` — visual-only; props and hook interface unchanged
- **MODIFY:** `RadarView` — visual; preserve `onLayout` + `computeScatterPositions` contract
- **MODIFY:** `CardStackView` — visual shell; `FriendSwipeCard` prop interface unchanged
- **MODIFY:** `HomeScreen.tsx` — remove onboarding state machine and `OnboardingHintSheet` import
- **NO CHANGE:** `useHomeScreen`, `useStatusStore`, `useViewPreference`, `usePlans`,
  `UpcomingEventsSection`, `HomeWidgetRow`, `RecentMemoriesSection`, `FriendSwipeCard` gesture logic

---

## Screen 2: Squad

### Current Component Tree

```
(tabs)/squad.tsx  (self-contained — no separate screen file)
  ├── ScreenHeader + Add Friend icon (person-add → /friends/add)
  ├── Tab bar: Squad | Memories | Activity
  │     custom Animated underline; Animated.ScrollView horizontal pager
  │
  ├── Page 0: Squad
  │     FlatList<FriendWithStatus>
  │       ListHeaderComponent: pending requests row (usePendingRequestsCount)
  │       → CompactFriendRow → FriendActionSheet
  │             onViewProfile → /friends/[id]
  │             onStartDM    → get_or_create_dm_channel RPC → /chat/room
  │             onRemoveFriend → removeFriend() from useFriends
  │
  ├── Page 1: Memories
  │     MemoriesTabContent  [squad/MemoriesTabContent.tsx]
  │
  └── Page 2: Activity
        StreakCard   [squad/StreakCard.tsx]    ← useStreakData
        IOUCard      [squad/IOUCard.tsx]       ← useIOUSummary
        BirthdayCard [squad/BirthdayCard.tsx]  ← useUpcomingBirthdays
```

### Data Flow

- `useFriends()` — Supabase RPC `get_friends`; result held in local component state (not a store).
- `usePendingRequestsCount()` — lightweight Supabase count query.
- `useStreakData`, `useIOUSummary`, `useUpcomingBirthdays` — each is a direct Supabase hook; results
  flow as props into the Activity tab cards.
- Tab deep-link: `useLocalSearchParams({ tab })` in squad.tsx allows external screens (e.g., the
  Home Memories widget) to arrive with `tab=memories`, triggering a `pagerRef.scrollTo` after a
  50ms `setTimeout` to ensure layout is mounted first.
- Entrance animations: three `Animated.Value` refs in `cardAnims` stagger on mount with a
  `hasAnimated.current` guard preventing re-animation on refresh.

### Integration Points for Overhaul

| Area | What Changes | Stable Contracts |
|------|-------------|-----------------|
| Tab bar visual | Style changes to tab header and underline indicator | `indicatorTranslateX` interpolation logic, `scrollX` event, and `Animated.ScrollView` pager are functional — only styles change |
| CompactFriendRow | Visual redesign | Props: `{ friend: FriendWithStatus; onPress: () => void }` — no changes |
| Activity cards | Visual redesign of StreakCard, IOUCard, BirthdayCard | Each card receives typed props from its hook; no data changes |
| Add Friend entry point | Currently header icon; may move to FAB | Update `rightAction` in `ScreenHeader` props; routing to `/friends/add` unchanged |
| tab=memories deep-link | Must survive layout changes | `pagerRef.scrollTo({ x: SCREEN_WIDTH, animated: false })` — depends on page 1 being at index 1; do not reorder pages |

### New vs Modified Components

- **MODIFY:** `CompactFriendRow` — visual overhaul; prop interface unchanged
- **MODIFY:** `StreakCard`, `IOUCard`, `BirthdayCard` — visual overhaul; data props unchanged
- **MODIFY:** `squad.tsx` — tab bar visual styling; pager + data logic untouched
- **NO CHANGE:** `useFriends`, `useStreakData`, `useIOUSummary`, `useUpcomingBirthdays`,
  `FriendActionSheet`, `MemoriesTabContent`, tab deep-link logic

---

## Screen 3: Explore

### Current Component Tree

```
(tabs)/plans.tsx
  → screens/plans/PlansListScreen.tsx
      ├── ScreenHeader with list/map toggle (two Ionicons icon buttons in rightAction)
      ├── viewMode === 'map'  → ExploreMapView  [maps/ExploreMapView.tsx]
      └── viewMode === 'list' → FlatList<PlanWithMembers>
            ListHeaderComponent: invite banner → Invitations Modal (pageSheet)
            PlanCard → router.push('/plans/[id]')
      └── FAB → /plan-create (modal presentation)
```

### Data Flow

- `usePlans()` — Supabase query; writes `usePlansStore`; same hook called on Home populates the
  same store — Explore and Home share the same cache.
- `useInvitations()` — separate Supabase query for pending plan invites; `accept`/`decline` methods
  call Supabase directly and then re-fetch plans.
- `ExploreMapView` receives `plans` as prop. Internally: calls `expo-location` for GPS, filters
  plans by 25km haversine, renders `react-native-maps` MapView with `PROVIDER_DEFAULT`
  (Apple Maps on iOS, Google Maps on Android).
- Default `viewMode` is `'map'` — local `useState`, not persisted.

### Integration Points for Overhaul

| Area | What Changes | Stable Contracts |
|------|-------------|-----------------|
| Map visual | Custom markers, callout cards, map style | `DARK_MAP_STYLE` array in `src/lib/maps.ts`. `MapView` `userInterfaceStyle` and `customMapStyle` props control appearance. Custom `Marker` with `callout` child is the standard RN Maps pattern |
| View toggle | Icon buttons in header — may change affordance | Just calls `setViewMode('map' | 'list')` — logic is trivial |
| Invite UX | Banner + pageSheet modal may be redesigned | `useInvitations` hook returns same shape; visual wrapper is all that changes |
| Challenges feature | New UI — design decision needed on placement | If inline in list view: add to `FlatList` `ListHeaderComponent`. If separate tab: replicate the Squad pager pattern in `PlansListScreen` |

### New vs Modified Components

- **MODIFY:** `PlansListScreen` — layout and visual overhaul; `usePlans` + `useInvitations` unchanged
- **MODIFY:** `ExploreMapView` — possibly add map overlays or custom callout cards; `expo-location`
  + `MapView` core logic is stable
- **POSSIBLY NEW:** `ChallengesSection` or `ChallengesTab` — scoping depends on design decision
- **NO CHANGE:** `usePlans`, `useInvitations`, `PlanCard`, `FAB`, haversine filter logic

---

## Screen 4: Auth

### Current Component Tree

```
(auth)/index.tsx
  → screens/auth/AuthScreen.tsx   (self-contained ~620 LOC)
      ├── LinearGradient background: ['#091A07', '#0E0F11', '#0A0C0E']
      ├── KeyboardAvoidingView + ScrollView
      ├── Header section: emoji + "Campfire" + tagline
      ├── AuthTabSwitcher  [auth/AuthTabSwitcher.tsx]   login | signup
      ├── Animated form area (opacity crossfade on mode switch)
      │     mode=login:      FormField(email) + FormField(password) + forgot link + PrimaryButton
      │     mode=signup:     FormField(email) + FormField(password) + FormField(confirm) + PrimaryButton + ToS
      │     mode=reset:      email field + send link button + back link
      │     mode=reset-sent: success icon + message + back link
      └── OAuth section (only when mode=login)
            OAuthButton(google) + OAuthButton(apple) [iOS only]
```

### Auth Completion Flow

On successful sign-in or sign-up, `supabase.auth.onAuthStateChange` fires in `_layout.tsx`. The
layout checks `profiles.username` and sets `needsProfileSetup`. `Stack.Protected` gates re-evaluate
and switch the navigator. `AuthScreen` does NOT call `router.push` — routing is entirely driven by
the auth state change. Auth redesigns require zero changes to routing logic.

### Integration Points for Overhaul

| Area | What Changes | Stable Contracts |
|------|-------------|-----------------|
| Visual redesign | Background gradient, header layout, form spacing | All auth logic (signIn, signUp, OAuth, reset) stays in place |
| AuthTabSwitcher | May be replaced by different visual pattern | Props: `{ activeTab: 'login' | 'signup'; onTabChange: (tab) => void }` — no changes |
| OAuthButton | Visual overhaul | Props: `{ provider: 'google' | 'apple'; onPress: () => void; loading: boolean }` — no changes |
| FormField | Used across the whole app | If Auth needs a different look, prefer a prop variant (e.g., `variant="dark"`) rather than changing default appearance — other screens use FormField too |
| Gradient constant | Same gradient is hardcoded in AuthScreen + HomeScreen dark mode + _layout splash | Extract to `src/theme/gradients.ts` as `CAMPFIRE_DARK_GRADIENT` to prevent three diverging hex arrays |

### New vs Modified Components

- **MODIFY:** `AuthScreen.tsx` — visual redesign; all Supabase auth calls unchanged
- **MODIFY:** `AuthTabSwitcher` — visual overhaul; props unchanged
- **MODIFY:** `OAuthButton` — visual overhaul; props unchanged
- **NO CHANGE:** Auth logic, Supabase calls, routing, `FormField`, `PrimaryButton`, `ErrorDisplay`

---

## Screen 5: Welcome / Onboarding

### Current State

`OnboardingHintSheet` is a bottom-sheet Modal shown once on HomeScreen when a new user has zero
friends. It is triggered by checking AsyncStorage key `@campfire/onboarding_hint_shown` after
friends data loads. It has a single CTA "Get Started" that writes the flag and dismisses.

This is the entire existing onboarding experience. v1.8 replaces it with a full-screen 3-slide flow.

### Recommended Integration Pattern

**Use an in-tree overlay — do not add a new `Stack.Protected` guard.**

The new `WelcomeFlow` renders as a full-screen `Modal` (or `position: 'absolute' + zIndex: 999`)
overlay inside the `(tabs)` navigator. When `!welcomeComplete`, the overlay is shown on top of the
tab navigator content. On the last slide CTA, it dismisses, revealing the app underneath.

This approach is preferred over adding a new route segment because:
1. Adding a new `Stack.Protected` guard requires modifying guard ordering in `RootLayoutStack` — a
   high-risk change that affects all three existing guards.
2. The tab navigator mounts underneath, so the first tab load is hidden (no flash) when Welcome
   dismisses.
3. Matches the existing `OnboardingHintSheet` modal pattern already in the codebase.

### Store Changes

Add to `src/stores/useAuthStore.ts`:

```typescript
welcomeComplete: boolean;
setWelcomeComplete: (v: boolean) => void;
```

Add to the initial load effect in `_layout.tsx` (inside the existing `supabase.auth.getSession()` chain):

```typescript
const welcomeDone = await AsyncStorage.getItem('@campfire/welcome_complete');
if (welcomeDone === 'true') {
  useAuthStore.getState().setWelcomeComplete(true);
}
```

### WelcomeFlow Component Structure

Single file at `src/components/onboarding/WelcomeFlow.tsx`. Use an `Animated.ScrollView` horizontal
pager (same pattern as Squad screen's tab pager — proven, no Reanimated needed):

```
WelcomeFlow.tsx
  ├── pager: Animated.ScrollView horizontal pagingEnabled
  │     ├── Slide 1: Brand + value prop  ("Your friends, one app.")
  │     ├── Slide 2: Status feature intro  ("Let friends know you're free.")
  │     └── Slide 3: Squad/friends intro  ("See who's around. Make it happen.")
  ├── Dot indicators (derive from scrollX interpolation)
  ├── "Next" / "Get Started" PrimaryButton per slide
  └── "Skip" TouchableOpacity on slides 1-2
```

On "Get Started" or "Skip":
1. Call `setWelcomeComplete(true)` in `useAuthStore`
2. `AsyncStorage.setItem('@campfire/welcome_complete', 'true')`
3. The overlay unmounts; tab navigator is revealed underneath

### AsyncStorage Key

Use `@campfire/welcome_complete` — distinct from the old `@campfire/onboarding_hint_shown`. This
prevents the old flag from masking the new flow for users upgrading from v1.7. Existing v1.7 users
will see the Welcome flow once on first v1.8 launch (acceptable — fast and skippable).

### Trigger Condition

In `(tabs)/_layout.tsx` (or root `_layout.tsx`), after auth gate resolves:

```
session && !needsProfileSetup && !welcomeComplete → render WelcomeFlow overlay
```

The overlay is a `Modal visible={!welcomeComplete}` rendered inside the tabs layout. When
`welcomeComplete` becomes true, the Modal hides; React does not unmount the tab navigator.

### New vs Modified Components

- **NEW:** `src/components/onboarding/WelcomeFlow.tsx`
- **REMOVE:** `OnboardingHintSheet` usage from `HomeScreen.tsx` (file can remain but is unused)
- **MODIFY:** `src/stores/useAuthStore.ts` — add `welcomeComplete` + `setWelcomeComplete`
- **MODIFY:** `src/app/_layout.tsx` — read `@campfire/welcome_complete` in initial load effect
- **MODIFY:** `src/app/(tabs)/_layout.tsx` — render `WelcomeFlow` modal when `!welcomeComplete`
- **MODIFY:** `src/screens/home/HomeScreen.tsx` — remove `onboardingVisible` state, `ONBOARDING_FLAG_KEY`, and `OnboardingHintSheet` import

---

## Build Order for the 5 Phases

### Dependency Analysis

| Dependency | Blocks |
|-----------|--------|
| Welcome defines `welcomeComplete` in `useAuthStore` | Home cleanup (removing onboarding) can only be finalized once Welcome's store field exists |
| Auth is self-contained | Nothing blocks it; nothing depends on it |
| Home's `OnboardingHintSheet` removal | Depends on Welcome being built first |
| Squad is self-contained | No dependencies on other overhaul phases |
| Explore is self-contained | No dependencies on other overhaul phases |

### Recommended Phase Order

**Phase 1 — Auth Screen Redesign**

Rationale: Fully self-contained. Changes are scoped to `src/screens/auth/AuthScreen.tsx` and
`src/components/auth/*`. No shared infrastructure is touched. Low risk. Delivers polished first
impression and establishes the visual language for subsequent screens. Extract the `LinearGradient`
gradient array to `src/theme/gradients.ts` in this phase so Home and Auth stay in sync.

Deliverables:
- Redesign `AuthScreen.tsx` layout and visual styling
- Update `AuthTabSwitcher` and `OAuthButton` visuals
- Create `src/theme/gradients.ts` with `CAMPFIRE_DARK_GRADIENT` constant
- Update `HomeScreen.tsx` and `_layout.tsx` splash to reference the new constant

**Phase 2 — Welcome / Onboarding Flow**

Rationale: Adds `welcomeComplete` to `useAuthStore` and modifies `_layout.tsx` / `(tabs)/_layout.tsx`.
Must land before the Home cleanup phase (which removes `OnboardingHintSheet`). Doing it second means
Auth is polished, so the full new-user journey (Auth → Welcome → Home) can be tested end-to-end
from this phase forward.

Deliverables:
- Add `welcomeComplete` + `setWelcomeComplete` to `useAuthStore`
- Read `@campfire/welcome_complete` from AsyncStorage in `_layout.tsx` initial load effect
- Build `WelcomeFlow` component (3-slide pager, dot indicators, Next/Skip/Get Started CTAs)
- Render `WelcomeFlow` as `Modal` in `(tabs)/_layout.tsx` when `!welcomeComplete`

**Phase 3 — Home Screen Overhaul**

Rationale: Now that Welcome is defined, `OnboardingHintSheet` can be cleanly removed. Home is the
highest-traffic screen. All data hooks are stable — the overhaul is visual + layout only.

Deliverables:
- Remove `OnboardingHintSheet` from `HomeScreen.tsx` (state, flag, import, render)
- Redesign `OwnStatusCard`, `RadarView`, `CardStackView` visuals
- Reorder/adjust sections if design requires
- Preserve `onLayout`-based width measurement in Radar/Cards (critical invariant)

**Phase 4 — Squad Screen Overhaul**

Rationale: Self-contained. The `CompactFriendRow`, `StreakCard`, `IOUCard`, `BirthdayCard`, and the
tab bar can all be redesigned without touching any other overhaul phase. Verify deep-link behavior
(`tab=memories`) after any layout changes.

Deliverables:
- Redesign `squad.tsx` tab bar and pager visuals
- Redesign `CompactFriendRow`, `StreakCard`, `IOUCard`, `BirthdayCard`
- Update `FriendActionSheet` visual if required
- Verify `tab=memories` deep-link still scrolls to page 1 correctly

**Phase 5 — Explore Screen Overhaul**

Rationale: Most complex due to `react-native-maps` and `expo-location` involvement. Scoped last
to allow iteration on map specifics without blocking other screens. The challenges feature addition
(if in v1.8 scope) lands here.

Deliverables:
- Redesign `PlansListScreen` header, invite banner, view toggle affordance
- Update `ExploreMapView` (custom markers, callout cards, or map style changes)
- Add challenges UI if in scope (new `ChallengesSection` component or pager tab)
- Verify `expo-location` permission request still fires correctly after layout changes

---

## Shared Component Considerations

### Components Shared Across Multiple Overhaul Screens

| Component | Used By (v1.8 screens) | Risk If Changed Globally |
|-----------|------------------------|--------------------------|
| `FormField` | Auth, ProfileSetup, plan-create | HIGH — any visual change propagates everywhere; use a prop variant for Auth-specific styling |
| `PrimaryButton` | Auth, WelcomeFlow, multiple modals | MEDIUM — test all call sites; add variant prop if needed |
| `ScreenHeader` | Home, Squad, Explore, all sub-screens | HIGH — ~15 call sites; changes must be backward-compatible or opt-in via prop |
| `AvatarCircle` | Squad CompactFriendRow, Friends, chat | LOW — purely visual, self-contained |
| `EmptyState` | Home, Squad, Explore, Chat | LOW — self-contained |

**Rule:** If an overhaul requires a visual change to a shared component that differs from its use
elsewhere, add a prop variant (e.g., `size="large"`, `variant="hero"`) rather than changing the
default rendering.

### LinearGradient Pattern

Three places currently hardcode `['#091A07', '#0E0F11', '#0A0C0E']`:
- `AuthScreen.tsx` (always wraps entire screen)
- `HomeScreen.tsx` (dark mode only)
- `_layout.tsx` loading splash

Extract to `src/theme/gradients.ts` as `CAMPFIRE_DARK_GRADIENT` during Phase 1. Reference the
constant in all three files to prevent future drift.

---

## Architecture Invariants (Must Not Break)

1. **`useMemo([colors])` pattern** — all `StyleSheet.create` calls inside components must be
   wrapped in `useMemo` with `colors` as a dependency. Violating this breaks dark/light switching.

2. **`onLayout` not `Dimensions.get`** — `RadarView` and `CardStackView` measure container width
   via `onLayout`. This must be preserved; `Dimensions.get` does not account for split screen
   or orientation.

3. **FlatList, never ScrollView + .map()** — all lists use `FlatList`. Section redesigns must not
   introduce `ScrollView + .map()` patterns.

4. **ESLint `no-hardcoded-styles`** — all new components must use `@/theme` tokens. Where no exact
   token exists, add an `// eslint-disable-next-line campfire/no-hardcoded-styles` comment with
   a reason string.

5. **No Reanimated** — all animations use React Native `Animated` API. Reanimated broke bottom
   sheet on v4 and is excluded from this project. The horizontal pager pattern for WelcomeFlow
   uses `Animated.ScrollView pagingEnabled` — same as Squad screen.

6. **`Stack.Protected` guard order** — guards in `RootLayoutStack` are evaluated top-to-bottom
   in JSX. Do NOT add a new guard between the existing `profile-setup` and `(auth)` guards. The
   WelcomeFlow is a Modal overlay inside the tabs navigator, not a new Stack screen.

7. **`useAuthStore` is Zustand (no persistence)** — `welcomeComplete` must also be read from
   AsyncStorage on app boot; Zustand state resets on process kill. The `_layout.tsx` initial
   load effect is the correct place to read it alongside the existing session/profile checks.

---

## Sources

- Direct inspection of `/Users/iulian/Develop/campfire/src/` (HIGH confidence — codebase 2026-05-06)
- `src/app/_layout.tsx` — auth gate logic, Stack.Protected ordering
- `src/screens/home/HomeScreen.tsx` — onboarding hook, section composition
- `src/app/(tabs)/squad.tsx` — tab pager pattern, deep-link param handling
- `src/screens/plans/PlansListScreen.tsx` — Explore map/list toggle, invitations modal
- `src/screens/auth/AuthScreen.tsx` — form state machine, OAuth flow, gradient
- `src/components/onboarding/OnboardingHintSheet.tsx` — existing onboarding baseline
- `src/stores/useAuthStore.ts` — current store shape for Welcome integration plan

---
*Architecture analysis for: Campfire v1.8 UI/UX Screen Overhaul*
*Analyzed: 2026-05-06*
