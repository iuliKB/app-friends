# Architecture Research

**Domain:** Polish milestone integration — React Native + Expo managed workflow (~25K LOC)
**Researched:** 2026-05-04
**Confidence:** HIGH (all findings are from direct codebase inspection)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Expo Router (app/)                          │
│  _layout.tsx (ThemeProvider, GestureHandlerRootView,             │
│               SplashScreen, font loading, notification routing)  │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│  (tabs)/ │  plans/  │  friends/│  squad/  │  profile/           │
│ Home     │ [id].tsx │ [id].tsx │expenses/ │  edit.tsx           │
│ Squad    │          │ add.tsx  │birthday/ │  wish-list.tsx      │
│ Explore  │          │ requests │          │                     │
│ Chats    │          │          │          │                     │
│ Profile  │          │          │          │                     │
├──────────┴──────────┴──────────┴──────────┴─────────────────────┤
│                  Screen Layer (src/screens/)                      │
│  HomeScreen  ChatListScreen  ChatRoomScreen  PlanDashboardScreen │
│  PlansListScreen  PlanCreateModal  FriendsList  FriendRequests   │
├─────────────────────────────────────────────────────────────────┤
│               Feature Component Layer (src/components/)          │
│  home/   chat/   plans/   squad/   status/   iou/   maps/       │
├─────────────────────────────────────────────────────────────────┤
│               Shared Component Library (src/components/common/)  │
│  ScreenHeader  SectionHeader  EmptyState  LoadingIndicator       │
│  FAB  PrimaryButton  FormField  AvatarCircle  ErrorDisplay       │
│  OfflineBanner  BirthdayPicker  CustomTabBar  ThemeSegmentedControl│
├─────────────────────────────────────────────────────────────────┤
│                   Hook Layer (src/hooks/)                         │
│  useHomeScreen  useChatList  useChatRoom  usePlans               │
│  useFriends  useStatus  useIOUSummary  useUpcomingBirthdays       │
├─────────────────────────────────────────────────────────────────┤
│          Zustand Stores (src/stores/)   Theme (src/theme/)       │
│  useAuthStore  useChatStore  useHomeStore  usePlansStore          │
│  useStatusStore  |  ThemeContext / ThemeProvider / useTheme()     │
├─────────────────────────────────────────────────────────────────┤
│                     Supabase Client (src/lib/)                   │
│  Postgres · Auth · Realtime · Storage · Edge Functions            │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component Tier | Responsibility | Polish Impact |
|---------------|----------------|---------------|
| `app/` routes | Navigation wiring, modal presentation, route params | Minimal — mostly config |
| `screens/` | Data orchestration, hook composition, FlatList host | Skeleton loaders live here |
| `components/[feature]/` | Feature-specific UI, local Animated logic | Animation improvements live here |
| `components/common/` | Shared primitives — ScreenHeader, EmptyState, FAB etc | High-value enhancement targets |
| `hooks/` | Data fetching + realtime subscriptions | Add loading/error return shapes |
| `stores/` | Ephemeral UI state (Zustand) | Touch only for new UI state |
| `theme/` | Design tokens + ThemeContext | Add animation timing tokens |

---

## How Polish Changes Integrate with the Existing Architecture

### 1. The `useTheme()` + `useMemo([colors])` StyleSheet Pattern

**The pattern (everywhere in the codebase):**
```typescript
const { colors } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  card: { backgroundColor: colors.surface.card },
}), [colors]);
```

**Integration rule for new components:** Every new component that uses colors from the theme MUST follow this pattern. `colors` is the only dynamic dependency — `SPACING`, `FONT_SIZE`, `RADII`, `SHADOWS` are static `as const` objects and do NOT belong inside `useMemo`.

**Animation integration:** `Animated.Value` and `useSharedValue` refs are created outside `useMemo`. The animated style is either a separate `useAnimatedStyle` (Reanimated) or an inline `transform` on `Animated.View`. Never put animation refs inside `useMemo`.

**Correct pattern for a new animated + themed component:**
```typescript
function AnimatedCard() {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;  // outside useMemo

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      padding: SPACING.lg,
    },
  }), [colors]);  // only colors as dep

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      {/* ... */}
    </Animated.View>
  );
}
```

**Reanimated pattern (for JS-thread to native-thread migration):**
```typescript
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function AnimatedCard() {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: colors.surface.card, borderRadius: RADII.lg },
  }), [colors]);

  return <Animated.View style={[styles.card, animatedStyle]} />;
}
```

---

### 2. Skeleton Loaders Without Breaking FlatList Patterns

**Existing loading pattern (ChatListScreen is canonical):**
```typescript
if (loading && chatList.length === 0) {
  return <LoadingIndicator />;
}
```

The `LoadingIndicator` (`ActivityIndicator` centered in `flex:1 View`) replaces the whole screen. This is functional but abrupt. Skeletons must replace this pattern, not the FlatList itself.

**Integration point:** The screen-level guard (`if (loading && items.length === 0)`) is the single place to swap in a skeleton. The FlatList below that guard is untouched.

**Skeleton pattern for FlatList screens:**
```typescript
// Replace the full-screen loading guard:
if (loading && items.length === 0) {
  return <ChatListSkeleton />;  // renders N skeleton rows, NOT a FlatList
}
```

`ChatListSkeleton` is a plain `View` with N skeleton row components — not a FlatList, not a ScrollView. It only renders while `loading === true && items.length === 0`. Once data arrives the real FlatList renders. This keeps FlatList untouched.

**Skeleton animation — use `Animated.loop` on a shared interpolation:**
```typescript
// src/components/common/SkeletonPulse.tsx
export function SkeletonPulse({ width, height, borderRadius }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => opacity.stopAnimation();
  }, [opacity]);

  const styles = useMemo(() => StyleSheet.create({
    base: { backgroundColor: colors.surface.card, width, height, borderRadius },
  }), [colors, width, height, borderRadius]);

  return <Animated.View style={[styles.base, { opacity }]} />;
}
```

**Where to add skeletons:**
- `ChatListScreen` — guard at line 58; replace with `<ChatListSkeleton />`
- `HomeScreen` — no loading guard currently (uses inline conditional rendering); add one before the `ScrollView` renders the friend sections
- `PlansListScreen` — existing `loading && plans.length === 0` guard
- `FriendsList` — existing guard

**Do NOT add skeletons to:**
- Components that already show meaningful cached data instantly (Zustand-backed)
- Modals and sheets (they animate in, so the delay is invisible)

---

### 3. Parallel vs Sequential Screen Polish — Merge Conflict Strategy

**The key insight:** Each screen composes a unique set of feature components from `src/components/[feature]/`. The `src/components/common/` library is the only shared layer. Parallel work on different screens is safe as long as phases do not simultaneously modify the same common component.

**Safe to parallelise (no common file overlap):**
| Phase | Primary Files Touched |
|-------|-----------------------|
| Home screen polish | `HomeScreen.tsx`, `components/home/*`, `RadarBubble.tsx` |
| Chat polish | `ChatRoomScreen.tsx`, `ChatListScreen.tsx`, `components/chat/*` |
| Plans polish | `PlanDashboardScreen.tsx`, `PlansListScreen.tsx`, `components/plans/*` |
| Squad/IOU/Birthday | `app/(tabs)/squad.tsx`, `components/squad/*`, `components/iou/*` |
| Profile + Auth | `app/profile/*`, `screens/auth/*` |

**Common components are sequential bottlenecks:** If two phases both enhance `EmptyState.tsx` or `LoadingIndicator.tsx`, they will conflict. The build order must be:

1. Enhance `SkeletonPulse` (new file — no conflict)
2. Enhance `EmptyState` (one phase, one PR)
3. Enhance `LoadingIndicator` (replace with skeleton variant — one phase)
4. Then per-screen phases in any order

**Shared animation tokens:** If adding animation duration constants to `src/theme/index.ts`, do it in one dedicated commit before feature phases start. Prevents diff conflicts on the barrel export.

---

### 4. App Icon and Splash Screen in Expo Managed Workflow

**Current state (from `app.config.ts`):**
- `icon`: `./assets/images/icon.png` — shared iOS/web icon
- `android.adaptiveIcon.foregroundImage`: `./assets/images/android-icon-foreground.png`
- `android.adaptiveIcon.backgroundColor`: `'#ff6b35'`
- `splash.backgroundColor`: `'#ff6b35'` — no `image` key set (no static splash image currently)
- `userInterfaceStyle: 'automatic'` (respects system light/dark)
- The in-code splash (`_layout.tsx` lines 333–343) shows a `LinearGradient` with a fire emoji and "Campfire" text while fonts load

**What needs updating:**

For the static splash (OS-level, shown before JS loads):
- Add `splash.image` key pointing to `./assets/images/splash-icon.png` (file exists)
- Set `splash.resizeMode` to `'contain'` or `'cover'`
- iOS: optionally add `splash.dark.backgroundColor` for dark mode splash

For the app icon (iOS):
- `icon.png` must be 1024x1024, no transparency, no rounded corners (App Store crops it)
- No alpha channel — iOS rejects transparent icons
- File already exists at `./assets/images/icon.png` — just replace content with final branded art

For Android adaptive icon:
- `foregroundImage` should be 108dp safe zone within a 192dp canvas
- `backgroundColor` is already set to `#ff6b35`
- `android-icon-monochrome.png` exists — verify it uses the themed monochrome path

**In-code splash (`_layout.tsx`):**
- Currently renders a fire emoji (raw Unicode) — UX audit flags this as needing an SVG/Ionicons icon
- Splash disappears after `ready && fontsLoaded` — this is the correct gate
- The `LinearGradient` uses `DARK.splash.gradientStart/End` which are hardcoded to the dark palette — correct, this runs before ThemeProvider mounts

**No native rebuild required** for icon/splash changes in Expo managed workflow — these are config-driven. EAS Build picks them up automatically. Expo Go will show new assets after a manifest reload with `--clear`.

---

### 5. `src/components/common/` — Enhance vs Leave Alone

**The 13 current components:**

| Component | Verdict | Rationale |
|-----------|---------|-----------|
| `ScreenHeader.tsx` | Leave alone | Consistent across all screens; any change ripples everywhere |
| `SectionHeader.tsx` | Leave alone | Simple, token-compliant, no polish gap |
| `FAB.tsx` | Leave alone | Already has spring animation, correct pattern |
| `PrimaryButton.tsx` | Minor enhance | Add loading state prop (`isLoading?: boolean`) for async CTA buttons |
| `FormField.tsx` | Leave alone | Functional; no visual polish gap identified |
| `AvatarCircle.tsx` | Leave alone | Simple, correct |
| `ErrorDisplay.tsx` | Leave alone | Functional; appears infrequently |
| `LoadingIndicator.tsx` | Enhance | Replace full-screen `ActivityIndicator` with skeleton-aware wrapper OR keep as-is and add separate `SkeletonPulse` |
| `EmptyState.tsx` | Enhance | Add `actionable` variant with bigger icon and richer layout for cold-start onboarding states |
| `OfflineBanner.tsx` | Leave alone | Works correctly, no UX gap |
| `BirthdayPicker.tsx` | Leave alone | Native DateTimePicker pattern, correct |
| `CustomTabBar.tsx` | Leave alone | Tab navigation; changing this touches all 5 tabs simultaneously |
| `ThemeSegmentedControl.tsx` | Leave alone | Single-purpose, Profile-only |

**New common components to add (no existing component conflicts):**

| New Component | Purpose | Used By |
|---------------|---------|---------|
| `SkeletonPulse.tsx` | Animated shimmer primitive | All skeleton screens |
| `StatusBadge.tsx` | Status dot + icon (WCAG accessibility) | RadarBubble, CompactFriendRow, FriendProfile |
| `CountdownPill.tsx` | "In 3h 45m" timer display | PlanCard, PlanDashboard |

---

## Recommended Project Structure for Polish Additions

```
src/
├── components/
│   ├── common/
│   │   ├── SkeletonPulse.tsx       # NEW — shimmer primitive
│   │   ├── StatusBadge.tsx         # NEW — accessible status indicator
│   │   ├── CountdownPill.tsx       # NEW — plan countdown display
│   │   ├── EmptyState.tsx          # ENHANCE — richer actionable variant
│   │   └── PrimaryButton.tsx       # ENHANCE — loading state prop
│   ├── home/
│   │   ├── HomeScreenSkeleton.tsx  # NEW — skeleton for HomeScreen loading state
│   │   └── ...existing files...
│   └── chat/
│       ├── ChatListSkeleton.tsx    # NEW — skeleton for chat list loading
│       └── ...existing files...
├── theme/
│   └── index.ts                    # ENHANCE — add ANIMATION timing constants
└── assets/images/
    ├── icon.png                    # REPLACE — final branded 1024x1024
    ├── android-icon-foreground.png # REPLACE — final branded adaptive icon
    └── splash-icon.png             # UPDATE — ensure correct size/format
```

---

## Architectural Patterns

### Pattern 1: Screen-Level Loading Guard Swap

**What:** The pattern `if (loading && items.length === 0) { return <LoadingIndicator />; }` exists in every data-fetching screen. This is the single integration point for skeleton loaders.

**When to use:** Always — skeleton components replace only this guard. The FlatList below is untouched.

**Trade-offs:** Simple, zero risk of breaking FlatList. Downside: skeletons only show on first load, not on subsequent pull-to-refreshes (which is correct — existing data stays visible during refresh).

### Pattern 2: Animated.Value Outside useMemo, Static Tokens Inside

**What:** Animation refs (`useRef(new Animated.Value())`, `useSharedValue()`) live in component body. Static tokens (`SPACING`, `RADII`, `FONT_SIZE`) go inside `StyleSheet.create`. Dynamic tokens (`colors`) are the only `useMemo` dependency.

**When to use:** Every component. Violating this pattern causes either stale styles (colors not updating on theme switch) or unnecessary StyleSheet recreations on every render.

**Trade-offs:** Slightly verbose. Worth it — ESLint `no-hardcoded-styles` enforces that raw values never sneak into the static token positions.

### Pattern 3: Reanimated for Native-Thread Animations, Animated API for Simple Cases

**What:** The codebase currently uses `Animated` (JS thread) for most animations, with `react-native-reanimated` v4.2.1 and `react-native-gesture-handler` already installed. `FriendSwipeCard` is the only component currently using Reanimated.

**When to migrate:** Migrate to Reanimated when: (a) animation runs during a JS-heavy operation (chat list scroll, realtime updates), (b) it is gesture-driven, or (c) it is on Android where JS-thread animations jank more severely.

**Leave as Animated API:** Simple one-shot entry animations, pulse loops, opacity fades with no gesture component.

### Pattern 4: Feature Skeletons Are Screen-Scoped, Not Component-Scoped

**What:** Build `HomeScreenSkeleton` and `ChatListSkeleton` as dedicated components in their feature folder, composing `SkeletonPulse` primitives arranged to match the real screen layout.

**When to use:** Any screen that has a `loading && items.length === 0` guard. The skeleton component handles the layout; the primitive handles the shimmer.

**Trade-offs:** Slightly more files. Far better visual fidelity than a single generic "skeleton list" abstraction. Consistent with how `EmptyState` variants work in this codebase — each screen owns its loading state appearance.

---

## Data Flow

### Animation State Flow

```
useRef(new Animated.Value(initial))
    |
Animated.spring() / Animated.timing() called by event handler
    |
Animated.View reads value via transform / opacity
    ^
NO setState, NO store update — animation is self-contained
```

### Theme + StyleSheet Reactivity Flow

```
ThemeProvider (app/_layout.tsx)
    | (useContext)
useTheme() in every component
    |
colors object (referentially stable until theme changes)
    |
useMemo([colors]) recomputes StyleSheet only on theme switch
    |
Component re-renders with new styles
```

### Skeleton Loading Flow

```
Hook returns { loading: true, items: [] }
    |
Screen renders SkeletonComponent (N pulse rows)
    | (data arrives)
Hook returns { loading: false, items: [...] }
    |
Screen renders FlatList with real data
    | (pull-to-refresh)
Hook returns { loading: false, refreshing: true, items: [...] }
    |
FlatList RefreshControl spinner (skeleton NOT shown — data stays visible)
```

---

## Anti-Patterns

### Anti-Pattern 1: colors Inside a Static StyleSheet.create at Module Scope

**What people do:** `const styles = StyleSheet.create({ card: { backgroundColor: colors.surface.card } })` at module scope outside the component.

**Why it's wrong:** `colors` from `useTheme()` is a React hook — it cannot be called at module scope. This compiles but captures the initial value and never updates when the theme switches.

**Do this instead:** `const styles = useMemo(() => StyleSheet.create({ card: { backgroundColor: colors.surface.card } }), [colors])` inside the component body.

### Anti-Pattern 2: FlatList Inside ScrollView for Skeleton Screens

**What people do:** Add a `ScrollView` wrapper around a skeleton + FlatList to avoid warnings when both are rendered.

**Why it's wrong:** `FlatList` relies on its parent having a bounded height for virtualisation. `ScrollView` gives it unbounded height, disabling virtualisation and loading all items into memory. PROJECT.md has "FlatList for all lists: No ScrollView + map" as a hard constraint.

**Do this instead:** Render the skeleton as a plain `View` (not inside a ScrollView) for the `loading && items.length === 0` branch. The FlatList renders in its own branch, never nested in a ScrollView.

### Anti-Pattern 3: Modifying app.config.ts Splash + Icon Paths Without Clearing Cache

**What people do:** Update `icon.png` file content in-place without changing the path, assume Expo Go picks it up after refresh.

**Why it's wrong:** Expo Go caches assets by path. An in-place image replace may not invalidate the cache.

**Do this instead:** Replace the file content, then run `npx expo start --clear` to bust the bundle cache. For EAS Build, assets are always fetched fresh.

### Anti-Pattern 4: New Animation Constants as Raw Numbers

**What people do:** `Animated.timing(val, { duration: 250 })` with raw ms values scattered across files.

**Why it's wrong:** Makes it impossible to globally tune animation timing. Also violates the spirit of the design token system.

**Do this instead:** Add `ANIMATION` constants to `src/theme/index.ts`:
```typescript
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { speed: 50, bounciness: 8 },
} as const;
```
Use in all animation calls. This is a one-time addition to the theme barrel before feature phases start.

---

## Build Order for the Polish Milestone

The correct sequencing is dictated by dependency: shared primitives before consumers.

```
Phase 0 — Theme + primitive additions (single PR, no screen work)
  Add ANIMATION constants to src/theme/index.ts
  Create src/components/common/SkeletonPulse.tsx
  Enhance EmptyState.tsx (add actionable variant)
  Enhance PrimaryButton.tsx (add isLoading prop)

Phase 1 — App icon + splash (asset work, minimal code changes)
  Replace assets/images/icon.png (1024x1024, no alpha)
  Replace assets/images/android-icon-foreground.png
  Update app.config.ts splash.image, splash.resizeMode
  Update _layout.tsx splash: swap fire emoji for Ionicons flame

Phase 2 — Home screen polish (isolated — touches only home/ components)
  HomeScreenSkeleton.tsx (uses SkeletonPulse)
  RadarBubble pulse animation on FADING status
  HomeScreen.tsx: replace LoadingIndicator with HomeScreenSkeleton
  Migrate HomeScreen crossfade to Reanimated (lines 51-80)

Phase 3 — Chat polish (isolated — touches only chat/ components)
  ChatListSkeleton.tsx (uses SkeletonPulse)
  ChatListScreen: replace LoadingIndicator with ChatListSkeleton
  MessageBubble: optimistic send state (clock icon + reduced opacity)
  ChatListRow: sender prefix + smart timestamp
  Migrate ChatRoomScreen animations to Reanimated

Phase 4 — Plans + Explore polish (isolated — touches only plans/ + maps/)
  RSVP buttons: selected state with icon + spring animation
  PlanCard: CountdownPill integration
  Plan invitation modal: spring entry animation

Phase 5 — Squad + IOU + Birthday polish (isolated — touches squad/ + iou/)
  Squad tab stagger animation on every useFocusEffect
  CompactFriendRow: add trailing icon for action menu

Phase 6 — Auth + Onboarding (isolated — touches screens/auth/)
  Forgot password flow
  ToS/Privacy Policy links
  Account deletion flow
  Cold-start empty state: invite flow on zero-friends Home
```

**Conflict-safe because:** Phases 2–6 touch entirely separate component directories. Phase 0 is the only PR that touches `src/theme/` and `src/components/common/` — it must merge before any feature phase starts. After that, phases 2–6 can be built as independent sequential PRs with zero file overlap.

---

## Integration Points

### External Services

| Service | Integration Pattern | Polish Notes |
|---------|---------------------|--------------|
| Supabase Storage | Signed URL fetch, 1h TTL | No change needed for polish |
| Supabase Realtime | postgres_changes subscription | No change needed for polish |
| expo-haptics | `Haptics.impactAsync()` | Add to RSVP selection, skeleton-to-content transition |
| expo-image | Already used in GalleryViewerModal | Use for lazy-loaded images with blurhash placeholder |

### Internal Boundaries

| Boundary | Communication | Polish Notes |
|----------|---------------|--------------|
| ThemeContext to all components | `useTheme()` hook | Adding ANIMATION to theme barrel does not break existing consumers |
| `components/common/` to all screens | Direct import | SkeletonPulse is additive; EmptyState changes are backward-compatible with an added optional prop |
| Animated API and Reanimated | Both coexist in same codebase | Migration is file-by-file; no global refactor needed |
| `_layout.tsx` font loading | `SplashScreen.preventAutoHideAsync()` + `useFonts()` | Splash icon change is asset-only; gate logic unchanged |

---

## Sources

- Direct inspection of `/Users/iulian/Develop/campfire/src/` (HIGH confidence — codebase as of 2026-05-04)
- `app.config.ts` for Expo splash/icon config (HIGH confidence)
- `src/app/_layout.tsx` for SplashScreen gate pattern (HIGH confidence)
- `UX-AUDIT.md` for polish item inventory (HIGH confidence)
- React Native Reanimated v4 coexistence with Animated API: standard practice, both libraries in `package.json` (HIGH confidence)
- Expo managed workflow icon/splash: asset-only changes, no native rebuild required (HIGH confidence)

---
*Architecture research for: Campfire v1.7 Polish & Launch Ready milestone*
*Researched: 2026-05-04*
