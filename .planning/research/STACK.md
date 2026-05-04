# Technology Stack — v1.7 Polish & Launch Ready

**Project:** Campfire v1.7
**Researched:** 2026-05-04
**Scope:** Polish milestone only — animations, haptics patterns, skeleton loading, gesture refinements, app icon/splash screen config. Existing stack (Expo 55, RN 0.83.6, Reanimated 4.2.1, GestureHandler 2.30, expo-haptics, expo-linear-gradient, expo-splash-screen) not re-researched.
**Overall Confidence:** HIGH

---

## What Is Already Installed and Covers All Polish Needs

No new npm packages are required for v1.7. Every polish capability is achievable with the existing stack.

| Already Installed | Version | What It Covers in v1.7 |
|---|---|---|
| `react-native-reanimated` | 4.2.1 | Skeleton shimmer (withRepeat + withTiming), entering/exiting layout animations (FadeIn, SlideInUp, ZoomIn), spring micro-animations |
| `react-native-worklets` | 0.7.4 | Required peer for Reanimated 4 — already installed, no action |
| `react-native-gesture-handler` | ~2.30.0 | `Swipeable` (reanimated variant) for swipe-to-dismiss/action rows; `Pressable` for uniform press feedback across platforms |
| `expo-haptics` | ~55.0.14 | All haptic patterns needed: `impactAsync(Light/Medium/Heavy)`, `notificationAsync(Success/Warning/Error)`, `selectionAsync()` |
| `expo-linear-gradient` | ~55.0.13 | Shimmer sweep for skeleton loaders — gradient already imported in `FriendSwipeCard.tsx` |
| `expo-splash-screen` | ~55.0.19 | Splash screen config via plugin; `preventAutoHideAsync` + `hide()` already used |
| `expo-image` | ~55.0.9 | Progressive image loading (blurhash placeholder → full image) — replaces skeleton for image-heavy screens |

---

## Skeleton Loading: Build From Existing Stack, Do Not Add a Library

**Confidence:** HIGH

The project uses Reanimated 4.2.1 and expo-linear-gradient. Both Moti (the dominant skeleton library) and `react-native-reanimated-skeleton` have active compatibility problems with Reanimated 4.x:

- **Moti 0.30.0** — open GitHub issue (nandorojo/moti#391, opened Sep 2025, still unresolved as of May 2026): animations malfunction with Reanimated 4.1+. Do not install.
- **react-native-reanimated-skeleton** — targets Reanimated v3 internally, requires a postinstall script to swap `react-native-linear-gradient` for `expo-linear-gradient`. Fragile, low-maintenance.

**The correct approach: a thin `SkeletonBox` component using tools already in the project.**

The shimmer effect requires exactly two pieces: a pulsing opacity via `withRepeat`+`withTiming` (Reanimated 4, already installed) and theme-aware background colors from `useTheme()`. No `expo-linear-gradient` sweep is needed — an opacity pulse is visually equivalent for small group sizes (3–15 people) and has zero dependency overhead.

```typescript
// src/components/common/SkeletonBox.tsx — ~30 lines, zero new imports
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useTheme, RADII } from '@/theme';

export function SkeletonBox({ width, height, borderRadius = RADII.sm }: Props) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,   // infinite
      false // do not reverse (sequence already handles it)
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.surface.card }, animStyle]}
    />
  );
}
```

**Where to use:** Home screen friend list while status data loads, Plans/Explore list while plans fetch, Chat list while conversations load. The existing `LoadingIndicator` (full-screen `ActivityIndicator`) stays for initial app-level loads; `SkeletonBox` is for in-list placeholders.

---

## Animation Patterns: What Reanimated 4 Provides Out of the Box

**Confidence:** HIGH (verified via Context7 /software-mansion/react-native-reanimated)

Reanimated 4.2.1 (already installed) provides everything needed for polish-level animations. No additional animation library is warranted.

### Layout Animations (Entering/Exiting)

Apply directly to `Animated.View` with no additional setup. Useful for list items appearing, modals mounting, and confirmation feedback:

```typescript
import Animated, { FadeIn, FadeOut, SlideInUp, ZoomIn } from 'react-native-reanimated';

// List item appearing
<Animated.View entering={FadeIn.duration(200).delay(index * 50)}>

// Bottom sheet mounting
<Animated.View entering={SlideInUp.springify().damping(20)}>

// Success confirmation
<Animated.View entering={ZoomIn.springify().damping(15)}>
```

**Available families:** FadeIn/Out, SlideInUp/Down/Left/Right, ZoomIn/Out, BounceIn/Out, FlipInEasyX/Y. All modifiers: `.duration()`, `.delay()`, `.springify()`, `.damping()`, `.stiffness()`.

### Spring Micro-animations (Already Pattern in FriendSwipeCard)

The existing `withSpring` + `withTiming` pattern from `FriendSwipeCard.tsx` is the correct approach. Extend to button press feedback, card expansion, and status updates:

```typescript
// Press feedback: scale down then spring back
const scale = useSharedValue(1);
const onPressIn = () => { scale.value = withSpring(0.96, { damping: 20 }); };
const onPressOut = () => { scale.value = withSpring(1, { damping: 15 }); };
```

### withRepeat for Continuous Effects

Already documented above for skeleton shimmer. Also useful for the heartbeat freshness indicator (gentle pulse on FADING status bubbles in radar view).

---

## Haptics: Patterns for Each Interaction Type

**Confidence:** HIGH (verified via docs.expo.dev/versions/latest/sdk/haptics/)

`expo-haptics` (already installed, already used in `FriendSwipeCard.tsx` and `ExpenseHeroCard.tsx`) covers all haptic needs. The API has five methods and is complete for v1.7:

| Method | Style/Type | Use Case in Campfire |
|---|---|---|
| `impactAsync(Light)` | UIImpactFeedbackGenerator | Button taps, row taps, toggle switches |
| `impactAsync(Medium)` | UIImpactFeedbackGenerator | Confirm actions (RSVP yes, plan create) |
| `impactAsync(Heavy)` | UIImpactFeedbackGenerator | Destructive actions (delete, settle IOU) |
| `notificationAsync(Success)` | UINotificationFeedbackGenerator | Form submission success, RSVP confirmed |
| `notificationAsync(Warning)` | UINotificationFeedbackGenerator | Rate limit hit, "already nudged" |
| `notificationAsync(Error)` | UINotificationFeedbackGenerator | Network error, form validation fail |
| `selectionAsync()` | UISelectionFeedbackGenerator | Picker scroll, segmented control switch, tab switch |

**Pattern to standardize:** Wrap in `.catch(() => {})` (existing pattern from `FriendSwipeCard`). Haptics fail silently on simulators and devices with haptics disabled — the catch prevents unhandled rejection noise.

**Android note:** `impactAsync` and `notificationAsync` map to Android's `VibrationEffect` API. `performAndroidHapticsAsync(type)` with `AndroidHaptics` enum is available for fine-grained Android control but is unnecessary for Campfire's use case — the cross-platform methods are sufficient.

---

## Gesture Refinements: ReanimatedSwipeable Already Available

**Confidence:** HIGH (verified via Context7 /websites/swmansion_react-native-gesture-handler)

`react-native-gesture-handler` 2.30 (already installed) ships `Swipeable` in a Reanimated-based variant. Import path matters:

```typescript
// Old variant (uses Animated API — avoid in v1.7, incompatible with Reanimated 4 composability)
import Swipeable from 'react-native-gesture-handler/Swipeable';

// Correct variant for Reanimated 4 projects
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
```

`ReanimatedSwipeable` accepts `renderLeftActions(progress, translation)` and `renderRightActions(progress, translation)` where `progress` and `translation` are `SharedValue<number>` — composable with `useAnimatedStyle` for animated action reveals.

**Use cases in v1.7:** Swipe-to-dismiss on notification/chat rows, swipe-to-reveal IOU settle action, swipe-to-delete on plan participants. The Gesture API used in `FriendSwipeCard` (custom `Gesture.Pan()`) remains correct for the card stack; `ReanimatedSwipeable` is better for list rows where the container handles gesture coordination.

**`Pressable` from RNGH vs React Native core:** The RNGH `Pressable` (`import { Pressable } from 'react-native-gesture-handler'`) resolves press-inside-scroll conflicts more reliably than RN's built-in. Worth adopting in any new interactive list rows added during v1.7. Existing rows that already work correctly should not be migrated — change only where press-in-scroll conflicts are noticed.

---

## App Icon: Configuration, Not a New Library

**Confidence:** HIGH (verified via docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)

App icon generation requires asset files and `app.config.ts` changes — no new npm packages.

### iOS Icon

- **File:** `./assets/images/icon.png` — 1024×1024px PNG, no transparency, no rounded corners (iOS masks automatically)
- **Tool to create:** Figma template [Expo App Icon & Splash v2 (Community)](https://www.figma.com/community/file/1466490409418563617) — exports the correct sizes. Alternatively, any design tool that exports 1024×1024 PNG.
- **EAS auto-generates** all required iOS icon sizes from the 1024×1024 source. No manual size exports needed.
- **Dark/tinted icon variants** (iOS 18+): Supported via `ios.icon` with a nested object providing `any`, `dark`, and `tinted` image paths. Optional for v1.7 — implement if there's a designed dark variant.

```typescript
// app.config.ts — current icon config (already set, may need image replaced)
icon: './assets/images/icon.png',
```

### Android Adaptive Icon

Already configured in `app.config.ts`. Requires two files:
- `android.adaptiveIcon.foregroundImage` — subject matter on transparent background (1024×1024 PNG)
- `android.adaptiveIcon.backgroundColor` — solid color string (`'#ff6b35'`)

The foreground image should have the icon subject centered in the inner 66% of the canvas (safe zone for all Android mask shapes — circle, squircle, rounded square). The system crops the outer edges.

```typescript
android: {
  adaptiveIcon: {
    foregroundImage: './assets/images/android-icon-foreground.png',
    backgroundColor: '#ff6b35',
    monochromeImage: './assets/images/android-icon-monochrome.png', // optional, Android 13+ themed icons
  },
}
```

**Asset generation shortcut:** [expo-assets-generator.vercel.app](https://expo-assets-generator.vercel.app/) generates all required sizes from a single source image. Useful if starting from a high-res design file rather than Figma.

---

## Splash Screen: Config Plugin Already Installed

**Confidence:** HIGH (verified via docs.expo.dev/versions/latest/sdk/splash-screen/)

`expo-splash-screen` 55.0.19 is already installed and the `preventAutoHideAsync` + `hide()` lifecycle is in place. v1.7 changes are config-only in `app.config.ts`.

### Current state in app.config.ts

```typescript
splash: {
  backgroundColor: '#ff6b35',
}
```

This uses the legacy `splash` key — works but does not support dark mode or the `imageWidth` sizing control.

### Recommended v1.7 config

Migrate from the legacy `splash` key to the plugin entry, which enables dark-mode splash and image sizing:

```typescript
plugins: [
  // existing plugins...
  [
    'expo-splash-screen',
    {
      backgroundColor: '#ff6b35',
      image: './assets/images/splash-icon.png',
      imageWidth: 200,
      dark: {
        backgroundColor: '#0E0F11',  // matches surface.base dark token
        image: './assets/images/splash-icon-dark.png',
      },
    }
  ]
]
```

**`SplashScreen.setOptions()`** — call before `hide()` to add a fade transition instead of an abrupt cut:

```typescript
SplashScreen.setOptions({ duration: 600, fade: true }); // iOS only; Android ignores fade
await SplashScreen.hideAsync();
```

**Known caveat:** `resizeMode: 'cover'` has a documented display bug (expo/expo#33138) where the image shows gray margins. Use `contain` (default) or `native`. The `imageWidth` property gives sufficient control over icon sizing without `cover`.

**Testing:** Splash screen cannot be tested in Expo Go — it requires a preview or production EAS build. This is expected and documented by Expo. For v1.7, the splash config can be finalized but hardware validation must wait until an EAS build is created.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|---|---|---|
| `moti` | Open incompatibility with Reanimated 4 (nandorojo/moti#391, unresolved May 2026). Animations break or behave strangely | Custom `SkeletonBox` using `withRepeat`+`withTiming` (30 lines) |
| `react-native-reanimated-skeleton` | Targets Reanimated v3, requires fragile postinstall script to swap LinearGradient provider | Custom `SkeletonBox` (see above) |
| `lottie-react-native` | Requires a native rebuild (not Expo Go compatible in managed workflow without EAS) | Reanimated layout animations for comparable results |
| `react-native-animatable` | Legacy library, uses the old Animated API, not composable with Reanimated 4 | Reanimated 4 `entering`/`exiting` props on `Animated.View` |
| `react-native-bounce-touchable` | Unnecessary — RNGH `Pressable` + `useSharedValue` spring achieves the same effect | RNGH `Pressable` with `useSharedValue` scale spring |
| NativeWind / styled-components | No benefit over existing `useTheme()` + `useMemo([colors])` pattern; large bundle addition | Existing `useTheme()` design token system |
| Any icon-set library (react-native-vector-icons) | Already using `expo-symbols` + `@expo/vector-icons` (Ionicons); adding another icon set creates inconsistency | Continue with Ionicons from `@expo/vector-icons` |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---|---|---|
| `react-native-reanimated@4.2.1` | Expo SDK 55 / RN 0.83.6 | Requires `react-native-worklets@0.7.4` (already installed). New Architecture only — SDK 55 enables New Arch by default. |
| `expo-haptics@~55.0.14` | Expo SDK 55 / RN 0.83.6 | All 5 methods confirmed working in Expo Go. `AndroidHaptics` enum Android-only but cross-platform methods work everywhere. |
| `react-native-gesture-handler@~2.30.0` | Expo SDK 55 / RN 0.83.6 | `ReanimatedSwipeable` variant compatible with Reanimated 4. Use `ReanimatedSwipeable` import path, not legacy `Swipeable`. |
| `expo-linear-gradient@~55.0.13` | Expo SDK 55 / RN 0.83.6 | For skeleton shimmer only if opacity pulse is insufficient. Optional — cross-component gradient already used in `FriendSwipeCard`. |
| `expo-splash-screen@~55.0.19` | Expo SDK 55 / RN 0.83.6 | Config plugin approach replaces legacy `splash` key. `SplashScreen.setOptions({ fade: true })` is iOS only. |

---

## Installation

No new packages needed for v1.7. All polish capabilities use the existing stack.

```bash
# No new installs required.
# To verify all packages are at their correct SDK 55 versions:
npx expo install --fix
```

---

## Sources

- Context7 `/software-mansion/react-native-reanimated` — `withRepeat`, `withSequence`, `entering`/`exiting` layout animations confirmed for v4.2.1
- Context7 `/websites/swmansion_react-native-gesture-handler` — `ReanimatedSwipeable` API, `Pressable` props confirmed
- Context7 `/nandorojo/moti` — Skeleton API confirmed; compatibility issue with Reanimated 4 cross-referenced
- [GitHub nandorojo/moti#391](https://github.com/nandorojo/moti/issues/391) — Reanimated 4 incompatibility open issue, unresolved as of May 2026 — HIGH confidence
- [expo-haptics docs (current SDK)](https://docs.expo.dev/versions/latest/sdk/haptics/) — All enum values and method signatures confirmed — HIGH confidence
- [expo-splash-screen docs (current SDK)](https://docs.expo.dev/versions/latest/sdk/splash-screen/) — Plugin config, `setOptions()`, `imageWidth` confirmed — HIGH confidence
- [Expo splash screen and app icon guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/) — 1024×1024 requirement, adaptive icon safe zone, EAS auto-generation confirmed — HIGH confidence
- [expo/expo#33138](https://github.com/expo/expo/issues/33138) — `resizeMode: 'cover'` bug confirmed, use `contain` — MEDIUM confidence

---
*Stack research for: Campfire v1.7 Polish & Launch Ready*
*Researched: 2026-05-04*
