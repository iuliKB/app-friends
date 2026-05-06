# Technology Stack — v1.8 Deep UI Refinement & Screen Overhaul

**Project:** Campfire v1.8
**Researched:** 2026-05-06
**Scope:** Stack additions and patterns required for overhauling 5 screens (Home, Squad, Explore, Auth, Welcome/Onboarding). Existing validated stack not re-researched.
**Overall Confidence:** HIGH

---

## Summary

The project already has the two most important libraries for this overhaul: `react-native-reanimated 4.2.1` and `react-native-gesture-handler ~2.30.0`. All gesture-driven interactions (card swipe, swipe rows, drag) and Reanimated-backed animations (layout transitions, spring micro-animations, entering/exiting) are already available without adding new dependencies.

**One new library is warranted:** `react-native-pager-view` for the Welcome/Onboarding 3-screen slide flow. It ships native iOS `UIPageViewController` and Android `ViewPager2` under the hood, is included in Expo Go, supports the New Architecture, and is the pattern recommended by Expo's own documentation for paginated slide flows. All other UI/UX improvements for the 5 target screens are achievable with the existing stack plus pure-RN patterns.

`expo-glass-effect` is already installed and usable for iOS 26+ glass surfaces on certain screens — but it is iOS-only and degrades to a plain `View` on Android. Treat it as an enhancement, not a structural dependency.

---

## Existing Stack: What Already Covers v1.8 Needs

These are already in `package.json` and require no action — only intentional use in the new screen implementations.

| Already Installed | Version | What It Covers in v1.8 |
|---|---|---|
| `react-native-reanimated` | 4.2.1 | Card swipe physics (withSpring, useSharedValue, useAnimatedStyle), entering/exiting layout animations (FadeIn, SlideInUp, ZoomIn), stagger entrance for dashboard cards |
| `react-native-worklets` | 0.7.4 | Required peer for Reanimated 4 — already present |
| `react-native-gesture-handler` | ~2.30.0 | `Gesture.Pan()` for swipe card stack, `ReanimatedSwipeable` for swipe-action rows in Squad/Home lists |
| `expo-haptics` | ~55.0.14 | Tactile feedback on swipe confirm, button presses, status changes |
| `expo-linear-gradient` | ~55.0.13 | Gradient overlays on Auth/Welcome screens, card fade masks |
| `expo-glass-effect` | ~55.0.10 | iOS 26+ liquid glass effect for status pill, tab bar, modal surfaces — iOS only, degrades to View on Android |
| `expo-blur` | (not installed — see below) | — |
| `react-native-safe-area-context` | ~5.6.2 | Edge-to-edge Auth/Welcome layouts with correct insets |
| `expo-image` | ~55.0.9 | Blurhash-placeholder avatar loading on radar view, friend cards |
| `react-native-svg` | 15.15.3 | Radar bubble positioning geometry if SVG-based layout is chosen |
| `@expo-google-fonts/*` | ^0.4.x | Custom typography already available (Nunito, Plus Jakarta Sans, Fredoka, Bricolage Grotesque) |

---

## Required Addition: react-native-pager-view

**Confidence:** HIGH

**Why needed:** The Welcome/Onboarding flow is a 3-screen horizontal slide with dot pagination. This is a fundamentally different interaction from card stacks — it requires snapping, native momentum physics per page, and a dot indicator that tracks scroll position. Two approaches exist:

1. `FlatList` with `horizontal` + `pagingEnabled` + `onViewableItemsChanged` — pure React Native, no new dependency, but has a documented Android bug where the last page bounces back when shorter than screen width, and the dot indicator lags because it updates on `viewabilityChange` events rather than scroll position.

2. `react-native-pager-view` — wraps native `UIPageViewController` (iOS) and `ViewPager2` (Android), native momentum physics per platform, scroll position available via `onPageScroll` with `position` + `offset` floats for smooth dot interpolation, included in Expo Go, New Architecture compatible.

The Expo documentation explicitly lists `react-native-pager-view` under SDK references and confirms it works in Expo Go managed workflow. For a 3-screen brand onboarding flow — a first-run, high-polish surface — the native pager is correct.

**Version:** 8.0.1 (current as of May 2026, supports New Architecture / Fabric)

```bash
npx expo install react-native-pager-view
```

**Dot indicator:** Build from scratch using the `onPageScroll` callback's `position` + `offset` values to drive `Animated.Value` interpolation into dot width/opacity. This is ~40 lines and requires no additional library.

```typescript
// Dot width interpolation pattern — no additional library needed
const scrollX = useRef(new Animated.Value(0)).current;

// In PagerView:
onPageScroll={Animated.event(
  [{ nativeEvent: { offset: scrollX } }],
  { useNativeDriver: false }
)}

// Dot style:
const dotWidth = scrollX.interpolate({
  inputRange: pages.map((_, i) => i),
  outputRange: pages.map((_, i) => i === activeIndex ? 24 : 8),
  extrapolate: 'clamp',
});
```

---

## Optional Addition: expo-blur (for Bottom Sheet / Modal Backdrops)

**Confidence:** MEDIUM

**Why potentially useful:** `expo-blur`'s `BlurView` adds glassmorphism-style backdrop blur behind modals, sheets, and overlays. The status pill bottom sheet and onboarding skip overlays could use this for a premium feel. `expo-glass-effect` (already installed) covers iOS 26+ liquid glass on surfaces, but `expo-blur` handles the translucent-background-behind-modal pattern that `expo-glass-effect` does not.

**SDK 55 status:** Stable on Android via RenderNode API (Android 12+). Requires wrapping blurred content in `<BlurTargetView>` for Android. iOS uses `UIVisualEffectView` as before.

**Known limitation:** `BlurView` cannot cross a React Native `Modal` boundary on Android — `BlurTargetView` and `BlurView` must live in the same native window. The existing bottom sheet implementation (custom modal) should be tested before committing to blur here.

**Verdict:** Install only if the design spec explicitly calls for backdrop blur on bottom sheets or modals. If the design uses solid surface colors from the existing token system, do not add this.

```bash
npx expo install expo-blur
```

**Version:** expo-blur is versioned with the SDK — `npx expo install` pins it correctly.

---

## Patterns: What Needs No New Libraries

These capabilities are fully achievable with the existing stack. No new installs required.

### Card Stack Swipe (Home Screen)

The card stack already exists (`FriendSwipeCard.tsx` using `Gesture.Pan()`). The v1.8 overhaul should refine the physics, not rebuild the architecture. Key improvements are parameter-only changes:

- **Velocity threshold:** Treat fling velocity > 800 px/s as a swipe regardless of distance. Already supported via `event.velocityX` in the pan gesture handler.
- **Rotation interpolation:** `rotate: (translateX / SCREEN_WIDTH * 15) + 'deg'` gives the Tinder-style lean. Use `useAnimatedStyle` + `interpolate`.
- **Background card scale:** Pre-render 2 cards behind the active card, each scaled 0.95 and 0.90. Animate scale to 1 as the active card flies off.
- **Nudge / Skip action buttons:** Already present. Wire to the same `open()` / `dismiss()` callbacks used by swipe, so both gestures and buttons produce identical state transitions.

### Radar View Bubble Layout (Home Screen)

The radar view already exists. Polished layout improvements are purely StyleSheet + Animated API:

- Bubble positioning: Use `position: 'absolute'` with calculated `top`/`left` from a deterministic layout function (fixed offsets per friend index, capped at 8 visible bubbles for 3–15 person groups).
- Pulse ring: `useSharedValue` + `withRepeat(withTiming(1.3, { duration: 1200 }), -1)` on a transparent border circle — creates the FADING heartbeat pulse effect.
- No SVG or external library needed for the radar layout itself.

### Onboarding Dot Indicator

Built inline in the Welcome screen using `Animated.Value` interpolation (see pattern above in PagerView section). ~40 lines, zero new dependency.

### Auth Screen Keyboard Handling

The existing `KeyboardAvoidingView` from React Native core is sufficient for the redesigned Auth screens given they have a simple form structure. Set:

- `behavior="padding"` on iOS
- `behavior="height"` on Android (or set `android.softwareKeyboardLayoutMode: "pan"` in `app.json`)

`react-native-keyboard-controller` (popular alternative) requires a development build and does not work in Expo Go — confirmed by the library's own documentation. It also has an open issue with SDK 55 / Fabric (KeyboardToolbar persisting after dismiss). Do not add for this milestone.

### Segmented Control / Tab Toggle (Squad Screen)

The existing custom underline tab switcher (Squad Friends/Goals) is already the correct pattern. The v1.8 design may introduce additional segmented controls (e.g., IOU/Birthday toggle in Squad). Reuse the same `CustomTabBar.tsx` pattern or extract a smaller `SegmentedControl` component using `Pressable` + `Animated.View` underline. Zero new dependencies.

### Status Pill Animation

The status pill header is already built. Polishing the expand/collapse bottom sheet animation uses `SlideInUp.springify().damping(20)` from Reanimated's entering animation presets — already available.

### Map Pin Clustering (Explore Screen)

`react-native-maps` (already installed) supports `Marker` clustering via `Callout` and custom `Marker` components. For the Explore screen challenges feature, use custom `Marker` components with `expo-image` for avatars and `LinearGradient` for highlight rings. No new map library needed — the map tile and GPS filter are already built.

### Form Field Polish (Auth Screen)

`FormField.tsx` (already a shared component) handles the base pattern. Auth screen redesign adds:
- Focus ring: `borderColor` toggled via `onFocus`/`onBlur` using colors from `useTheme()`
- Error inline display: Already handled by `FormField`'s `error` prop
- Password show/hide toggle: Add an `Ionicons` eye icon inside the field using the existing icon pattern

---

## What NOT to Add

| Avoid | Why | Use Instead |
|---|---|---|
| `react-native-keyboard-controller` | Requires development build — not Expo Go compatible in managed workflow. Open SDK 55 regression (KeyboardToolbar persists on dismiss). | `KeyboardAvoidingView` from React Native core |
| Any swipe-card library (`react-native-deck-swiper`, `rn-swiper-list`, etc.) | The card stack already exists using RNGH + Reanimated. Third-party card libraries add bundle weight, pin their own gesture handler versions, and offer less control over physics and visual style. | Existing `Gesture.Pan()` pattern in `FriendSwipeCard.tsx` |
| `react-native-snap-carousel` | Unmaintained; last significant update 2022; has known crashes on New Architecture. | `react-native-pager-view` for fixed-page flows; FlatList for horizontally scrolling content |
| `react-native-onboarding-swiper` | Opinionated UI (forces its own slide/button layout), no Reanimated 4 support confirmed, low maintenance. | `react-native-pager-view` + custom dot indicator (40 lines) |
| NativeWind / Tamagui / Gluestack | No benefit over `useTheme()` + `useMemo([colors])` pattern. Adds enormous bundle weight, conflicts with ESLint `no-hardcoded-styles` enforcement, violates the "no UI libraries" constraint. | Existing design token system |
| `lottie-react-native` | Not Expo Go compatible in managed workflow without EAS. Native rebuild required. | Reanimated 4 `entering`/`exiting` layout animations |
| `react-spring` | Web-focused library. React Native support exists but is minimal compared to Reanimated. | Reanimated 4 `withSpring` |
| `expo-blur` (unless design calls for it) | Adds complexity. Android support requires `BlurTargetView` wrapper and has known Modal boundary limitation. `expo-glass-effect` (already installed) covers the iOS glass surface use case. | `expo-glass-effect` for iOS glass surfaces; opaque surface tokens for cross-platform |
| Any map library other than `react-native-maps` | `react-native-maps` is already installed and provides all needed map capabilities. | Existing `react-native-maps` with custom Marker components |

---

## Installation

```bash
# Required: one new package
npx expo install react-native-pager-view

# Optional (only if design calls for backdrop blur on modals/sheets):
npx expo install expo-blur
```

---

## Version Reference

| Package | Version | Source Confidence |
|---|---|---|
| `react-native-reanimated` | 4.2.1 (already installed) | HIGH — verified SDK 55 compat via Expo changelog |
| `react-native-gesture-handler` | ~2.30.0 (already installed) | HIGH — verified Expo Go compatible |
| `react-native-pager-view` | 8.0.1 (new) | MEDIUM — latest npm version; Expo Go include confirmed by docs.expo.dev |
| `expo-linear-gradient` | ~55.0.13 (already installed) | HIGH — SDK-matched version |
| `expo-glass-effect` | ~55.0.10 (already installed) | HIGH — SDK 55, iOS 26+ only |
| `expo-haptics` | ~55.0.14 (already installed) | HIGH — SDK-matched version |
| `expo-blur` | SDK-matched via `npx expo install` | MEDIUM — stable Android in SDK 55 but Modal boundary limitation noted |

---

## Sources

- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) — React Native 0.83, Reanimated 4.x, New Architecture only
- [Expo SDK 55 Migration Guide](https://reactnativerelay.com/article/expo-sdk-55-migration-guide-breaking-changes-sdk-53-to-55) — Reanimated 4.1.x, GestureHandler 2.28+
- [react-native-pager-view Expo Docs](https://docs.expo.dev/versions/latest/sdk/view-pager/) — Included in Expo Go, confirmed
- [react-native-pager-view npm](https://www.npmjs.com/package/react-native-pager-view) — Version 8.0.1, New Architecture support confirmed
- [Reanimated Compatibility Table](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) — v4.1.x/4.2.x/4.3.x all support RN 0.83
- [ReanimatedSwipeable API](https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/) — Drop-in replacement for Swipeable, SharedValue progress
- [expo-blur BlurView Docs](https://docs.expo.dev/versions/latest/sdk/blur-view/) — BlurTargetView requirement for Android SDK 55
- [expo-glass-effect Docs](https://docs.expo.dev/versions/latest/sdk/glass-effect/) — iOS 26+ UIVisualEffectView, degrades to View on Android
- [react-native-keyboard-controller Expo Docs](https://docs.expo.dev/versions/latest/sdk/keyboard-controller/) — Requires development build, not Expo Go
- [react-native-keyboard-controller SDK 55 issue](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1411) — KeyboardToolbar regression in SDK 55 / Fabric

---
*Stack research for: Campfire v1.8 Deep UI Refinement & Screen Overhaul*
*Researched: 2026-05-06*
