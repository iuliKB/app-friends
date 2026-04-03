# Stack Research

**Domain:** React Native top-tab navigation within an Expo Router screen
**Researched:** 2026-04-04
**Confidence:** HIGH (core approach), MEDIUM (version pinning)

---

## Context

This is a **subsequent milestone** research for v1.2 Squad & Navigation. The existing stack is locked:

- React Native + Expo SDK 55 (managed workflow)
- Expo Router ~55.0.5 (file-based routing)
- `@react-navigation/native` ^7.1.28, `@react-navigation/bottom-tabs` ^7.7.3
- `react-native-reanimated` 4.2.1, `react-native-gesture-handler` ~2.30.0, `react-native-screens` ~4.23.0, `react-native-safe-area-context` ~5.6.2

The question: **what, if anything, needs to be added** to support top tabs (Friends / Goals) inside the Squad screen, and what restructuring is needed for bottom-nav reordering and renaming.

---

## Recommended Stack

### New Dependencies Required

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@react-navigation/material-top-tabs` | `^7.4.23` | Top tab bar with swipe gesture inside Squad screen | Standard React Navigation top tab navigator; integrates with Expo Router via `withLayoutContext`; SDK 52 breaking bug resolved upstream in RN7 patch |
| `react-native-tab-view` | `^4.0.6` | Underlying pager used by material-top-tabs | Peer dep of material-top-tabs v7; provides the swipeable view |
| `react-native-pager-view` | `^6.x` (resolved by `npx expo install`) | Native ViewPager backing react-native-tab-view on iOS/Android | Required peer dep; included in Expo Go; install via `npx expo install react-native-pager-view` to get the SDK-55-pinned version |

### No New Dependencies Needed For

| Change | Approach | Reason |
|--------|---------|--------|
| Bottom nav reordering (Home→Squad→Explore→Chats→Profile) | Reorder `<Tabs.Screen>` declarations in `(tabs)/_layout.tsx` | Expo Router `<Tabs>` order matches `<Tabs.Screen>` order — pure config change |
| Renaming Plans→Explore | Rename `plans.tsx` → `explore.tsx`, update `Tabs.Screen name="explore"` and `title` | File rename + one-line title change |
| Renaming Chat→Chats | Rename `chat/` folder → `chats/`, update `Tabs.Screen name="chats"` and `title` | Folder rename + one-line title change |
| Moving friend screens into Squad subtree | Move files to `(tabs)/squad/` folder, update `href` refs | Pure file relocation; Expo Router derives routes from filesystem |

---

## Integration Pattern

### How Top Tabs Work in Expo Router

Expo Router does not ship a top-tab navigator. The integration path is:

1. Convert `squad.tsx` flat screen into a **folder** `(tabs)/squad/` with its own `_layout.tsx`
2. Inside `squad/_layout.tsx`, create a `withLayoutContext`-wrapped `MaterialTopTabs` component
3. Add sub-screens `squad/friends.tsx` and `squad/goals.tsx`

```typescript
// src/app/(tabs)/squad/_layout.tsx
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  MaterialTopTabNavigationOptions,
  MaterialTopTabNavigationEventMap,
} from '@react-navigation/material-top-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function SquadLayout() {
  return (
    <MaterialTopTabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.interactive.accent,
        tabBarInactiveTintColor: COLORS.text.secondary,
        tabBarStyle: { backgroundColor: COLORS.surface.card },
        tabBarIndicatorStyle: { backgroundColor: COLORS.interactive.accent },
        tabBarLabelStyle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
      }}
    >
      <MaterialTopTabs.Screen name="friends" options={{ title: 'Friends' }} />
      <MaterialTopTabs.Screen name="goals" options={{ title: 'Goals' }} />
    </MaterialTopTabs>
  );
}
```

The `withLayoutContext` wrapper is **required** — without it, Expo Router cannot connect its file-based route tree to the React Navigation navigator. This is documented in the Expo Router migration guide under "Rewrite Custom Navigators".

### File Structure After Migration

```
src/app/(tabs)/
  _layout.tsx              ← reorder Tabs.Screen: Home, Squad, Explore, Chats, Profile
  index.tsx                ← Home (unchanged)
  explore.tsx              ← renamed from plans.tsx
  chats/                   ← renamed from chat/
    _layout.tsx
    index.tsx
    [id].tsx
  squad/
    _layout.tsx            ← MaterialTopTabs layout (NEW)
    friends.tsx            ← friend list + add friend + requests (relocated from profile)
    goals.tsx              ← "Coming soon" placeholder (content from old squad.tsx)
  profile.tsx              ← simplified (friend features removed)
```

---

## Installation

```bash
# Get SDK-55-pinned version of pager view
npx expo install react-native-pager-view

# Get latest React Navigation top tabs (v7 aligns with existing @react-navigation/native ^7)
npm install @react-navigation/material-top-tabs react-native-tab-view
```

Use `npx expo install react-native-pager-view` (not `npm install`) to get the version pinned to Expo SDK 55. Use `npm install` for react-navigation packages since they have no Expo pin and v7 is already in use.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@react-navigation/material-top-tabs` + `withLayoutContext` | `expo-router/ui` (`Tabs`, `TabList`, `TabSlot`) | Headless components are experimental, require fully custom styling, no swipe gesture, no animated indicator. Material-top-tabs provides all of this out of the box. For 2 tabs with no custom chrome, less code. |
| `@react-navigation/material-top-tabs` + `withLayoutContext` | `@bacons/expo-router-top-tabs` | Experimental third-party wrapper around `react-native-collapsible-tab-view`. No stable release. Not appropriate for production. |
| Rename files + reorder `<Tabs.Screen>` | Keep old names + add redirects | Renaming is cleaner. No existing deep links or external navigation to `plans` or `chat` routes. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `expo-router/ui` headless tabs for this case | Experimental API; no swipe gesture; no animated indicator; structural constraints on `TabList`/`TabTrigger` nesting; requires building all tab chrome from scratch | `@react-navigation/material-top-tabs` with `withLayoutContext` |
| `@bacons/expo-router-top-tabs` | Experimental, third-party, no stable release | `@react-navigation/material-top-tabs` |
| Raw `createMaterialTopTabNavigator` without `withLayoutContext` | Navigator won't connect to Expo Router's file-based route tree; screens don't render | Wrap with `withLayoutContext` as shown above |
| State + conditional rendering to simulate tabs | Loses URL-addressability, back-button behavior, and lazy loading | Proper nested navigator |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|----------------|-------|
| `@react-navigation/material-top-tabs` ^7.4.23 | `@react-navigation/native` ^7.x | v7 aligns with the existing `@react-navigation/native` ^7.1.28 — no version conflict |
| `react-native-tab-view` ^4.x | `react-native-reanimated` ^3.x / 4.x | Project has reanimated 4.2.1 — compatible |
| `react-native-pager-view` ^6.x | Expo SDK 55 (React Native 0.83) | Included in Expo Go; install via `npx expo install` for SDK-55 pin |
| SDK 52 touch/label regression | Fixed in React Navigation upstream (issue #12279) | Current v7.4.23 includes the fix; no workaround needed |

---

## Sources

- Expo Router — Custom Tab Layouts: https://docs.expo.dev/router/advanced/custom-tabs/
  - HIGH confidence (official Expo docs)
- Expo Router — Nesting Navigators: https://docs.expo.dev/router/advanced/nesting-navigators/
  - HIGH confidence (official Expo docs)
- React Navigation — Material Top Tabs Navigator: https://reactnavigation.org/docs/material-top-tab-navigator/
  - MEDIUM confidence (verified via WebFetch; current v7 docs)
- GitHub expo/expo issue #41111 — `withLayoutContext` requirement: https://github.com/expo/expo/issues/41111
  - HIGH confidence (resolved; documents the mandatory pattern; marked COMPLETED by Expo team)
- GitHub expo/expo issue #33096 — SDK 52 breaking bug in material-top-tabs: https://github.com/expo/expo/issues/33096
  - HIGH confidence (resolved upstream; confirmed fix in React Navigation v7 patch)
- Expo SDK 55 changelog: https://expo.dev/changelog/sdk-55
  - HIGH confidence (official changelog; no material-top-tabs breakage noted for SDK 55)
- WebSearch — @react-navigation/material-top-tabs v7.4.23 (latest as of 2026-04-04)
  - MEDIUM confidence (npm search result; not verified via registry directly)

---
*Stack research for: Top-tab navigation (Squad screen) and bottom-nav restructuring in Expo Router*
*Researched: 2026-04-04*
