# Architecture Research

**Domain:** React Native homescreen redesign — adding bottom sheet picker, Radar view, Card Stack view, view toggle, and status pill to an existing Expo + Supabase app
**Researched:** 2026-04-10
**Confidence:** HIGH (grounded entirely in repo inspection and verified library research)

---

## Context: What Already Exists

All findings verified by reading the actual codebase.

| Asset | Status | Key facts |
|-------|--------|-----------|
| `HomeScreen.tsx` | EXISTS, 238 lines | ScrollView wrapper; renders `ReEngagementBanner`, `MoodPicker`, `freeFriends` FlatList, `otherFriends` FlatList |
| `HomeFriendCard.tsx` | EXISTS, 149 lines | Grid card — handles tap → DM, long-press → action sheet |
| `MoodPicker.tsx` | EXISTS, 228 lines | Inline 3-row mood selector with LayoutAnimation expand; calls `useStatus().setStatus()` |
| `ReEngagementBanner.tsx` | EXISTS, 150 lines | Animated height banner when heartbeat is FADING; reads `useStatus()` |
| `useStatus.ts` | EXISTS, 210 lines | Hydrates from `effective_status` view; exposes `currentStatus`, `heartbeatState`, `setStatus`, `touch` |
| `useHomeScreen.ts` | EXISTS, 191 lines | Fetches `friends` array, computes `freeFriends`/`otherFriends` partitions, Realtime subscription |
| `useStatusStore.ts` | EXISTS | Zustand — owns `currentStatus`, `setCurrentStatus`, `updateLastActive`, `clear` |
| `useHomeStore.ts` | EXISTS | Zustand — owns `friends[]`, `lastActiveAt`, `lastFetchedAt` |
| `heartbeat.ts` | EXISTS | Pure `computeHeartbeatState(expiresAt, lastActiveAt)` — mirrors SQL view logic |
| `windows.ts` | EXISTS | `getWindowOptions()`, `computeWindowExpiry()`, `formatWindowLabel()` |
| `src/theme/` | EXISTS | 6 token files: colors, spacing, radii, shadows, typography, barrel export |
| `react-native-reanimated` | v4.2.1 (Expo SDK 55) | Already installed, pre-bundled in Expo Go |
| `react-native-gesture-handler` | v2.30.0 | Already installed, pre-bundled in Expo Go |
| `AsyncStorage` | EXISTS | Used for notification toggle preference — established pattern for per-device persistence |

**Critical library finding:** `@gorhom/bottom-sheet` v5 (the current release as of April 2026) supports Reanimated v1–3 only. It is NOT compatible with Reanimated v4. The project runs Reanimated v4.2.1. Installing `@gorhom/bottom-sheet` would create a version conflict with no working resolution. The correct approach is a custom `Modal`-based bottom sheet — which also satisfies the existing "no UI libraries" constraint.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HomeScreen.tsx                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Header row: ScreenHeader title + StatusPill (tappable)      │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ViewToggle (Radar | Cards) — persisted to AsyncStorage      │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  RadarView  OR  CardStackView                                │   │
│  │  (both receive same friends[] from useHomeScreen)            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  StatusPickerSheet (Modal, rendered at root level)           │   │
│  │  Contains: MoodPicker logic (lifted into sheet)              │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                           Hooks Layer                                │
│  useHomeScreen  ──→  useHomeStore  (friends[], lastActiveAt)        │
│  useStatus      ──→  useStatusStore (currentStatus, heartbeatState) │
│  useViewMode    ──→  useHomeStore extended (viewMode, setViewMode)  │
├─────────────────────────────────────────────────────────────────────┤
│                        Supabase / AsyncStorage                       │
│  effective_status view  ·  statuses table  ·  AsyncStorage (mode)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|----------------|-----------------|
| `HomeScreen.tsx` | Orchestrator — composes header, toggle, active view, sheet | Modified (major) |
| `StatusPill.tsx` | Header element showing own mood + heartbeat ring; tap → open sheet | New |
| `ViewToggle.tsx` | Two-button segment (Radar / Cards); reads + writes `viewMode` | New |
| `RadarView.tsx` | Spatial bubble layout using absolute positioning; top 6 + overflow scroll | New |
| `CardStackView.tsx` | Swipeable card-per-friend with Nudge / Skip actions | New |
| `StatusPickerSheet.tsx` | Modal-based bottom sheet wrapping MoodPicker logic | New |
| `MoodPicker.tsx` | Unchanged internals — either deleted from HomeScreen or lifted into sheet | Modified (location only) |
| `ReEngagementBanner.tsx` | Remove from HomeScreen; its FADING-state nudge is handled by the pill | Removed |
| `HomeFriendCard.tsx` | Used inside RadarView bubbles and potentially CardStackView cards | Unchanged or minor |

---

## Recommended Project Structure

```
src/
├── screens/
│   └── home/
│       └── HomeScreen.tsx          # rewritten orchestrator
├── components/
│   └── home/
│       ├── HomeFriendCard.tsx      # existing — unchanged
│       ├── ReEngagementBanner.tsx  # existing — DELETED from HomeScreen render
│       ├── StatusPill.tsx          # NEW
│       ├── ViewToggle.tsx          # NEW
│       ├── RadarView.tsx           # NEW
│       └── CardStackView.tsx       # NEW
├── components/
│   └── status/
│       ├── MoodPicker.tsx          # existing — rendered inside sheet, not inline
│       └── StatusPickerSheet.tsx   # NEW
├── hooks/
│   └── useHomeScreen.ts            # existing — unchanged (still provides friends[])
├── stores/
│   └── useHomeStore.ts             # modified — add viewMode + setViewMode
└── lib/
    └── viewMode.ts                 # NEW — AsyncStorage key + read/write helpers
```

### Structure Rationale

- **`components/home/`** owns all home-specific visual components; Radar and Cards live here alongside the existing `HomeFriendCard`.
- **`components/status/`** already holds `MoodPicker` and mood presets; `StatusPickerSheet` belongs there as it is the status-setting surface.
- **`stores/useHomeStore`** is the natural place for `viewMode` since it already owns the home screen's data state and is the only store `useHomeScreen` writes to.
- **`lib/viewMode.ts`** isolates AsyncStorage key and serialization — same pattern as `lib/morningPrompt.ts` and `lib/expiryScheduler.ts`.

---

## Architectural Patterns

### Pattern 1: Custom Modal-Based Bottom Sheet (no third-party library)

**What:** A `Modal` component wrapping a `View` that slides up with `Animated.timing`. Backdrop is a semi-transparent `Pressable` that dismisses on tap. The sheet is rendered at the root of `HomeScreen` (outside the `ScrollView`) so it overlays everything including the tab bar.

**When to use:** Any time `@gorhom/bottom-sheet` would be the instinct — but the project runs Reanimated v4 which is incompatible with that library's current release.

**Trade-offs:** Less polish than `@gorhom/bottom-sheet` (no spring-physics snap, no drag-to-dismiss gesture) but zero dependency risk, works in Expo Go, fits the "no UI libraries" constraint. Drag-to-dismiss can be added later using the existing `react-native-gesture-handler` (already installed).

**Example shape:**

```typescript
// src/components/status/StatusPickerSheet.tsx
interface StatusPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function StatusPickerSheet({ visible, onClose }: StatusPickerSheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : SHEET_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />
      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <MoodPicker onCommit={onClose} />
      </Animated.View>
    </Modal>
  );
}
```

`MoodPicker` needs one new optional prop `onCommit?: () => void` — called after `handleWindowPress` succeeds so the sheet auto-closes on commit. This is a minimal addition to the existing component.

### Pattern 2: Radar View — Pre-Computed Absolute Positioning

**What:** A fixed-height `View` (e.g., 320dp) with `position: 'relative'`. Each friend bubble is a `View` with `position: 'absolute'` and pre-computed `top`/`left` values. The first 6 friends fill designated "orbits"; overflow friends appear in a horizontal `FlatList` below.

**When to use:** Any spatial "who's around" layout that doesn't need physics or drag. Status-freshness rings can be done with `borderColor` + `opacity` using existing `computeHeartbeatState`.

**Trade-offs:** Simple, no library. Positions are deterministic (not physics-simulated), which means consistent layout that doesn't "jitter" on re-render. If animated placement is wanted later, Reanimated shared values can replace the static `top`/`left`.

**Example coordinate scheme (6 positions):**

```typescript
// Positions relative to a 320×300 canvas, centre = (160, 150)
const RADAR_SLOTS: { top: number; left: number }[] = [
  { top: 20,  left: 130 },  // top centre
  { top: 80,  left: 230 },  // top right
  { top: 180, left: 230 },  // bottom right
  { top: 220, left: 130 },  // bottom centre
  { top: 180, left: 30  },  // bottom left
  { top: 80,  left: 30  },  // top left
];
```

The `friends` array from `useHomeScreen` is sliced to `friends.slice(0, 6)` for the radar. Remaining friends go into a `FlatList` with `horizontal` below the canvas.

### Pattern 3: View Toggle State — Zustand Slice + AsyncStorage Persistence

**What:** Add `viewMode: 'radar' | 'cards'` and `setViewMode(mode)` to `useHomeStore`. On app start, `useHomeScreen` (or a dedicated `useViewMode` hook) reads the persisted value from AsyncStorage and hydrates the store. On change, `setViewMode` writes to AsyncStorage.

**When to use:** Any UI preference that should survive app restarts but doesn't need server sync.

**Trade-offs:** Synchronous Zustand reads are fast; AsyncStorage writes are fire-and-forget. The first render uses the Zustand default (e.g., `'radar'`); the hydrated value arrives within a few milliseconds before any user interaction. No flicker risk in practice at this app's scale.

**Why not local state in HomeScreen:** The view mode should survive navigation away and back (e.g., user visits Squad, returns to Home — the toggle should stay where they left it). Zustand persists across React unmounts within the session; AsyncStorage persists across restarts.

**Why not a separate `useViewModeStore`:** `useHomeStore` already owns home screen UI state (`lastFetchedAt`, `lastActiveAt`). Adding two fields there keeps the store count flat and follows the existing pattern.

### Pattern 4: Status Pill — Direct useStatusStore Read

**What:** A header-area component that reads `currentStatus` and `heartbeatState` directly from `useStatusStore` (not via `useStatus` hook — no Supabase calls needed, store is already hydrated). Tapping the pill calls a local `setSheetVisible(true)` in `HomeScreen`.

**When to use:** Any component that needs to display already-cached status without triggering a refetch.

**Trade-offs:** The pill is purely display. It stays reactive because Zustand subscriptions are fine-grained — any `setCurrentStatus` call from anywhere (profile screen, notification handler) updates the pill instantly.

---

## Data Flow

### Status Update Flow (new — via bottom sheet)

```
User taps StatusPill
    ↓
HomeScreen sets sheetVisible = true
    ↓
StatusPickerSheet renders (Modal slides up)
    ↓
User selects mood + tag + window in MoodPicker
    ↓
MoodPicker.handleWindowPress → useStatus().setStatus(mood, tag, windowId)
    ↓
supabase.from('statuses').upsert(...)  [server confirmation]
    ↓
setCurrentStatus({...}) updates useStatusStore
    ↓
StatusPill re-renders with new mood (Zustand subscription)
MoodPicker collapses via existing useEffect on currentStatus change
MoodPicker calls onCommit() → sheet closes
```

### Friend List → View Rendering Flow

```
useHomeScreen (unchanged)
    ↓
friends: FriendWithStatus[]  (stored in useHomeStore)
    ↓
HomeScreen reads viewMode from useHomeStore
    ↓
viewMode === 'radar'  →  <RadarView friends={friends} />
viewMode === 'cards'  →  <CardStackView friends={friends} />
```

Both views receive the same `friends[]` array. No new Supabase queries. No new hooks for data fetching.

### View Mode Persistence Flow

```
App start
    ↓
useHomeScreen mounts → reads AsyncStorage('home_view_mode')
    ↓
Calls useHomeStore.setViewMode(persisted | 'radar')
    ↓
HomeScreen renders correct view immediately
    ↓
User taps ViewToggle
    ↓
useHomeStore.setViewMode(newMode) → AsyncStorage.setItem (fire-and-forget)
```

---

## Integration Points — New vs Modified

### New Components

| File | What it does | Integration seam |
|------|-------------|-----------------|
| `StatusPill.tsx` | Shows own mood pill + heartbeat indicator | Rendered in HomeScreen header row, replaces the bare `ScreenHeader` |
| `ViewToggle.tsx` | Two-segment control (Radar / Cards) | Rendered below header, reads/writes `useHomeStore.viewMode` |
| `RadarView.tsx` | Spatial bubble canvas | Rendered in HomeScreen body when `viewMode === 'radar'`; receives `friends[]` |
| `CardStackView.tsx` | Swipeable card deck | Rendered in HomeScreen body when `viewMode === 'cards'`; receives `friends[]` |
| `StatusPickerSheet.tsx` | Modal bottom sheet wrapping MoodPicker | Rendered at HomeScreen root (outside ScrollView), controlled by `sheetVisible` local state |
| `lib/viewMode.ts` | AsyncStorage helpers for view mode | Used by `useHomeScreen` on mount; by `useHomeStore.setViewMode` on write |

### Modified Components

| File | What changes | What stays the same |
|------|-------------|---------------------|
| `HomeScreen.tsx` | Removes MoodPicker, ReEngagementBanner, freeFriends/otherFriends FlatLists, scroll-to-picker logic; adds StatusPill, ViewToggle, RadarView/CardStackView switch, StatusPickerSheet | FAB, RefreshControl, error state, empty state |
| `MoodPicker.tsx` | Adds optional `onCommit?: () => void` prop; called after successful window commit | All existing mood/preset/window logic unchanged |
| `useHomeStore.ts` | Adds `viewMode: 'radar' | 'cards'` field + `setViewMode(mode)` action | Existing `friends`, `lastActiveAt`, `lastFetchedAt`, `setFriends` unchanged |
| `useHomeScreen.ts` | Adds one-time AsyncStorage read on mount to hydrate `viewMode` | All friend fetching, realtime, refresh logic unchanged |

### Removed from HomeScreen (not deleted — just no longer rendered there)

| Asset | Disposition |
|-------|------------|
| `<MoodPicker />` | Moved inside `StatusPickerSheet` |
| `<ReEngagementBanner />` | Removed entirely — the StatusPill's FADING visual state (opacity ring, different color) replaces this prompt. The pill is always visible, so the heartbeat state is always communicated. |
| `freeFriends` / `otherFriends` FlatLists | Replaced by `RadarView` and `CardStackView` |
| `scrollRef` + `moodPickerYRef` scroll-to-picker logic | Obsolete once MoodPicker is in the sheet |
| `deadOnOpenRef` / `showDeadHeading` | Obsolete — the pill communicates DEAD state directly |
| 60s `setHeartbeatTick` interval | Keep in HomeScreen — RadarView and CardStackView still need heartbeat re-evaluation |

---

## Build Order (Dependency-Aware)

Dependencies flow in one direction. Each step is independently shippable once its prerequisites are done.

### Step 1 — Status Pill + Sheet (no friends view changes yet)

**Builds:** `StatusPill.tsx`, `StatusPickerSheet.tsx`, `MoodPicker.tsx` (add `onCommit`).

**Changes to HomeScreen:** Add StatusPill to header area. Add StatusPickerSheet at root. Wire `sheetVisible` local state. Remove inline `<MoodPicker />`. Remove `ReEngagementBanner`.

**Why first:** The pill and sheet replace two of the three major existing components (`MoodPicker` + `ReEngagementBanner`). Once this is done, the HomeScreen is simplified and the remaining work (views) can land on top of a cleaner base. The sheet also establishes the Modal animation pattern that is reusable.

**Validation:** Tapping the pill opens the sheet. Committing a status closes the sheet and updates the pill. FADING/DEAD states visible in the pill.

### Step 2 — View Toggle + Radar View

**Builds:** `ViewToggle.tsx`, `RadarView.tsx`, `lib/viewMode.ts`.

**Changes to:** `useHomeStore.ts` (add `viewMode`), `useHomeScreen.ts` (hydrate from AsyncStorage), `HomeScreen.tsx` (remove FlatList sections, add ViewToggle + conditional RadarView).

**Why second:** Radar view is the primary new visual. It depends on Step 1 having cleaned up the HomeScreen structure. The existing `friends[]` data is already available — no new data fetching.

**Validation:** Radar renders top-6 friends as bubbles. Overflow in horizontal scroll. Heartbeat states (alive = full opacity, fading = dimmed, dead = greyed). Tapping a bubble → DM (same `HomeFriendCard` tap logic, reproduced in the bubble).

### Step 3 — Card Stack View

**Builds:** `CardStackView.tsx`.

**Changes to:** `HomeScreen.tsx` (add `CardStackView` to the conditional render).

**Why third:** Depends on Step 2 having wired the ViewToggle and conditional render switch. The card stack is a new visual over the same data — it doesn't change data fetching or the store.

**Validation:** Toggle to Cards. Swipe right = Nudge (send DM). Swipe left = Skip (dismiss card, next friend visible). All friends cycle through.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Installing @gorhom/bottom-sheet

**What people do:** Reach for `@gorhom/bottom-sheet` as the default "bottom sheet" library.

**Why it's wrong:** As of April 2026, v5 (latest) supports Reanimated v1–3. This project runs Reanimated v4.2.1 (Expo SDK 55). The library is non-functional on this stack — the sheet either doesn't open or crashes with worklet API errors.

**Do this instead:** Custom `Modal` + `Animated.timing` (described in Pattern 1). Expo's `react-native-gesture-handler` (already installed, Expo Go compatible) can add drag-to-dismiss in a later iteration.

### Anti-Pattern 2: New Supabase Queries for RadarView or CardStackView

**What people do:** Treat each view as requiring its own data hook.

**Why it's wrong:** `useHomeScreen` already fetches all friends with status. RadarView and CardStackView are purely visual representations of the same array. New queries add round-trips, Realtime connection pressure, and split caching logic.

**Do this instead:** Pass `friends: FriendWithStatus[]` from `HomeScreen` as a prop to both views. Zero new hooks.

### Anti-Pattern 3: Storing View Mode in React Local State Only

**What people do:** `const [viewMode, setViewMode] = useState<'radar' | 'cards'>('radar')` in HomeScreen.

**Why it's wrong:** Local state is lost when HomeScreen unmounts (user navigates to Squad tab and back). Users would reset to the default on every tab switch.

**Do this instead:** Zustand slice in `useHomeStore` (survives unmount within session) + AsyncStorage write (survives app restart). Same pattern as the existing notification toggle preference.

### Anti-Pattern 4: Deleting MoodPicker Instead of Relocating It

**What people do:** Rebuild the mood/preset/window selection UI from scratch inside `StatusPickerSheet`.

**Why it's wrong:** `MoodPicker` has 228 lines of tested logic including LayoutAnimation, haptics, Zustand sync, error handling, preset chips, and window chips. Rebuilding from scratch introduces bugs and dev time.

**Do this instead:** Render `<MoodPicker onCommit={onClose} />` inside `StatusPickerSheet`. The only addition is the `onCommit` prop (3–5 lines in MoodPicker).

### Anti-Pattern 5: Removing the 60s Heartbeat Interval from HomeScreen

**What people do:** Clean up the `setHeartbeatTick` interval because the scroll-based UI is gone.

**Why it's wrong:** RadarView and CardStackView both compute `heartbeatState` per-render via `computeHeartbeatState`. Without the 60s tick forcing a re-render, FADING → DEAD transitions won't update visually without a data refetch.

**Do this instead:** Keep the existing 60s interval in HomeScreen. It's a cheap `setState` with no side effects.

---

## Scalability Considerations

| Concern | At 3–15 friends (target) | At 50+ friends |
|---------|--------------------------|----------------|
| Radar top-6 slice | Trivially cheap | Same — always slices to 6 |
| CardStackView cycling | One card at a time, no perf issue | Consider `FlatList`-based virtualization if >30 cards |
| ViewToggle AsyncStorage | Single key read/write | No change |
| StatusPill re-renders | One Zustand subscription | No change |
| `useHomeScreen` Realtime | Single channel, user_id filter | Already designed for this (OVR-07 in existing code) |

The app's stated group size is 3–15 people. Scalability beyond that is explicitly out of scope per `PROJECT.md`.

---

## Sources

- `/Users/iulian/Develop/campfire/src/screens/home/HomeScreen.tsx` — current render tree
- `/Users/iulian/Develop/campfire/src/components/home/HomeFriendCard.tsx` — card interactions
- `/Users/iulian/Develop/campfire/src/components/status/MoodPicker.tsx` — status picker logic
- `/Users/iulian/Develop/campfire/src/components/home/ReEngagementBanner.tsx` — banner to be removed
- `/Users/iulian/Develop/campfire/src/hooks/useStatus.ts` — status hook interface
- `/Users/iulian/Develop/campfire/src/hooks/useHomeScreen.ts` — friend data + realtime
- `/Users/iulian/Develop/campfire/src/stores/useStatusStore.ts` — status Zustand store
- `/Users/iulian/Develop/campfire/src/stores/useHomeStore.ts` — home Zustand store
- `/Users/iulian/Develop/campfire/src/lib/heartbeat.ts` — heartbeat computation
- `/Users/iulian/Develop/campfire/src/app/(tabs)/_layout.tsx` — tab layout + AppState pattern
- `/Users/iulian/Develop/campfire/package.json` — confirmed library versions
- [gorhom/react-native-bottom-sheet GitHub](https://github.com/gorhom/react-native-bottom-sheet) — v5.2.9 "Compatible with Reanimated v1-3" (April 8, 2026 release)
- [Issue #2600 — Feature Request: Support Reanimated v4](https://github.com/gorhom/react-native-bottom-sheet/issues/2600) — confirmed v4 incompatibility
- [React Native Reanimated Bottom Sheet example](https://docs.swmansion.com/react-native-reanimated/examples/bottomsheet/) — recommends @gorhom but acknowledges no built-in component

---

*Architecture research for: Campfire v1.3.5 Homescreen Redesign*
*Researched: 2026-04-10*
