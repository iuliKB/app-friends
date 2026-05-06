# Research Summary: v1.8 Deep UI Refinement & Screen Overhaul

**Project:** Campfire v1.8
**Domain:** Consumer mobile social coordination app — close friend groups (3–15 people)
**Researched:** 2026-05-06
**Confidence:** HIGH

---

## Executive Summary

Campfire v1.8 is a polish milestone that redesigns five screens (Home, Squad, Explore, Auth, Welcome) without changing data architecture. The codebase is mature — 9 milestones and ~26,000 LOC of validated TypeScript — which means the overhaul risk is almost entirely in breaking existing functionality, not in building new plumbing. Every screen has stable data hooks that must not be touched; all changes are visual + layout. The one genuinely new piece is the Welcome onboarding flow, which introduces a new AsyncStorage key and a small Zustand store extension.

The recommended approach is screen-by-screen isolation: treat each screen as a contained visual redesign that preserves its hook contracts. The exception is the Auth → Welcome dependency: Auth should land first to establish the gradient token system and visual language, Welcome second to define `welcomeComplete` in `useAuthStore`, and Home third so `OnboardingHintSheet` can be cleanly removed after Welcome exists. Squad and Explore are fully independent and can follow in any order.

The highest risks are cross-cutting: the `useMemo([colors])` pattern must be applied to every new sub-component or dark/light switching breaks silently; hardcoded gradient hex values bypass the ESLint enforcer; and `FriendSwipeCard` is the only Reanimated component in the codebase — mixing Animated API into it during a redesign causes silent failures. These three failure modes have burned time on previous milestones and are the most likely to surface again.

---

## Stack Additions

- **`react-native-pager-view` (new, required)** — Install with `npx expo install react-native-pager-view`. Needed for the Welcome 3-slide flow. Wraps native `UIPageViewController` / `ViewPager2`; included in Expo Go; supports New Architecture. Version 8.0.1.
- **`react-native-reanimated` + `react-native-gesture-handler` (already installed, use intentionally)** — All gesture and animation needs for card swipe refinement, radar pulse, and entering/exiting layout transitions are covered. No new animation library is needed.
- **`expo-glass-effect` (already installed, iOS 26+ enhancement only)** — Usable for status pill, tab bar, and modal surfaces on iOS 26+. Degrades to a plain `View` on Android. Treat as an enhancement, not a structural dependency.
- **`expo-blur` (optional, do not add unless design spec requires it)** — Has a known Modal boundary limitation on Android. `expo-glass-effect` already covers the iOS glass surface use case. Add only if the design explicitly calls for backdrop blur on bottom sheets.
- **Do not add:** `react-native-keyboard-controller` (Expo Go incompatible, SDK 55 regression), any third-party swipe card library (existing `Gesture.Pan()` in `FriendSwipeCard.tsx` is sufficient), `lottie-react-native` (requires EAS), NativeWind / Tamagui / Gluestack (violates no-UI-libraries constraint).

---

## Feature Table Stakes (per screen)

**Home Screen:** The screen must answer "who's free right now?" within 2 seconds of opening. Status legibility is the non-negotiable: ALIVE / FADING / DEAD heartbeat states must be immediately readable without close inspection. The status pill must remain visible in the header at all times — never hidden behind a tap. The view toggle (Radar / Cards) must be immediately discoverable and persist across sessions via AsyncStorage. Pull-to-refresh and the nudge action must be present. Empty state with "Invite friends" CTA is required for zero-friends users. Radar view animations must pulse only ALIVE-status friends — animating all 15 bubbles simultaneously creates visual overload and kills performance.

**Squad Screen:** Dashboard cards must be scannable in 5 seconds: the single most important number (streak count, days to next birthday, net IOU balance) must be the visual hero of each card, not buried in details. Each card must have a single clear CTA (streak → goals, birthday → birthday chat, IOU → create or settle). The IOU card hero metric is net balance — not a transaction ledger. Positive-only streak copy is mandatory (anti-Snapchat design decision validated in v1.3). Nested scroll inside a ScrollView is forbidden — the `ListFooterComponent` pattern for Squad cards is already the correct approach and must not be reverted.

**Explore Screen:** The map must open with the user's location centered immediately. Plan pins must be tappable with a bottom-sheet peek (title, time, host avatar) — navigating away from the map on pin tap destroys spatial context. The list/map view toggle must be visible and prominent. An empty state for no plans nearby is required (with the 25km filter it will be common for new squads). A FAB for plan creation must float above the map at all times. The permission-denied path for GPS must have an "Enable location" recovery with `Linking.openSettings()` — currently there is none.

**Auth Screen:** Social login buttons must be above the fold with correct hierarchy: Apple Sign-In first (Apple HIG requirement), then Google, then email as fallback. Password show/hide toggle is required — without it users abandon or mistype. Inline error messages on field blur (not toasts). Loading state on the auth button after tap. The `authMode` state machine (login / reset / reset-sent) must be preserved in a single component — do not extract password reset to a separate route. `WebBrowser.maybeCompleteAuthSession()` must remain at module level of the entry auth screen. The always-dark gradient in `AuthScreen.tsx` is a pre-existing light-mode bug that must be fixed during this phase.

**Welcome / Onboarding:** Exactly 3 slides — hard limit. Progress dots with minimum 44x44pt touch targets. A "Skip" button on slides 1 and 2 that bypasses to the main app entirely (not just to slide 3). Swipe-to-advance gesture. Each slide must convey one idea only ("See who's free" / "Set your status" / "Your squad is waiting"). "Get Started" on slide 3 must route based on friend count: zero friends lands on Squad → Friends tab with Add Friend prominent, not a blank home screen. Use the new AsyncStorage key `@campfire/welcome_complete` — not the old `@campfire/onboarding_hint_shown` — so existing v1.7 users see the new flow once on upgrade.

---

## Architecture Decisions

- **WelcomeFlow as Modal overlay inside `(tabs)/_layout.tsx`, not a new `Stack.Protected` guard.** Adding a guard to `RootLayoutStack` is a high-risk change affecting all three existing guards evaluated top-to-bottom. The overlay pattern matches the existing `OnboardingHintSheet` precedent and keeps the tab navigator mounted underneath (no flash on dismiss). Render `<WelcomeFlow>` as `<Modal visible={!welcomeComplete}>` in `(tabs)/_layout.tsx`.

- **`welcomeComplete` in `useAuthStore` + read from AsyncStorage on boot.** Zustand state resets on process kill; the `_layout.tsx` initial load effect must read `@campfire/welcome_complete` from AsyncStorage alongside the existing session/profile checks. Add `welcomeComplete: boolean` and `setWelcomeComplete` to `useAuthStore`.

- **Extract `CAMPFIRE_DARK_GRADIENT` to `src/theme/gradients.ts` in Phase 29 (Auth).** Three files currently hardcode `['#091A07', '#0E0F11', '#0A0C0E']`: `AuthScreen.tsx`, `HomeScreen.tsx`, and `_layout.tsx` splash. Extracting in the Auth phase lets all subsequent phases reference the constant, preventing drift.

- **`onLayout` not `Dimensions.get` for RadarView and CardStackView.** This is a documented architecture invariant. The crossfade container's `minHeight: 260` is anchored to the current radar height — if the radar layout changes during the Home overhaul, update `minHeight` to match or replace it with a dynamic `onLayout`-driven height.

- **`FriendSwipeCard` is the only Reanimated component — any modifications must stay entirely within the Reanimated API.** All other animation code uses React Native `Animated`. Mixing `Animated.Value` and `SharedValue` on the same element causes silent failures. `runOnJS()` is required for any callback that touches React state from a gesture worklet.

- **Squad tab order and `tab=memories` deep-link must survive the Squad overhaul.** The `tab=memories` param scrolls to `x: SCREEN_WIDTH` (hardcoded index 1). Define tab name constants; search all `router.push('/(tabs)/squad?tab=...')` callsites before changing tab names or order.

- **`userInterfaceStyle` on all three map instances must become dynamic.** `ExploreMapView.tsx:127`, `PlanDashboardScreen.tsx:719`, and `LocationPicker.tsx:199` all hardcode `'dark'`. Fix all three in the Explore phase: `userInterfaceStyle: isDark ? 'dark' : 'light'`. The Android `DARK_MAP_STYLE` similarly needs a light-mode branch.

---

## Watch Out For

**1. Hardcoded gradient hex values bypass ESLint and silently break light mode** (`src/screens/auth/AuthScreen.tsx:410` — always-dark gradient regardless of theme; `src/screens/home/HomeScreen.tsx:269`). `LinearGradient`'s `colors` prop is not a StyleSheet property so the `no-hardcoded-styles` rule does not flag it. Every new or modified gradient must branch on `isDark` or read stops from the theme. AuthScreen's existing bug must be fixed in Phase 29.

**2. `useMemo([colors])` omitted on new sub-components breaks dark/light switching silently.** During screen splits (common in overhaul phases), developers write static `StyleSheet.create({...})` at module level. The ESLint rule catches raw values but not a missing `useMemo` wrapper. Every new component that references `colors.*` in a StyleSheet must use the full `useTheme()` + `useMemo([colors])` pattern. Most likely to surface during Squad (most sub-sections) and Home (radar + card + widget splits).

**3. Multiple concurrent `Animated.loop` instances on Home Screen cause Android frame-budget pressure** (`src/components/home/RadarBubble.tsx:68`, `OwnStatusCard.tsx:124`, `OwnStatusPill.tsx:93` — each runs an independent loop). Up to 15 RadarBubbles are mounted simultaneously. Do not add any new `Animated.loop` to HomeScreen without counting the existing total first. Use `isInteraction: false` on all timing calls (existing code already does this). New looping effects must use `useNativeDriver: true`; never use `useNativeDriver: false` inside a loop.

**4. Old AsyncStorage flag `@campfire/onboarding_hint_shown` silences the Welcome flow for all existing users** (`src/screens/home/HomeScreen.tsx:56-70`). The new flow must use a different key: `@campfire/welcome_complete`. The old `OnboardingHintSheet` import and flag check must be removed from HomeScreen in the same phase that introduces WelcomeFlow — not before, not after.

**5. iOS back gesture conflicts with the horizontal slide pager** if WelcomeFlow is placed inside a Stack navigator. The system gesture handler claims horizontal swipes starting near the edge, causing the user to accidentally navigate back instead of advancing slides. Disable the Stack screen gesture (`gestureEnabled: false`) or use the Modal overlay pattern (recommended) which avoids the Stack entirely.

**6. FlatList without `flex: 1` inside the Squad horizontal pager collapses to zero height on Android** (`src/app/(tabs)/squad.tsx:249-252` — `page` style has `flex: 1`). If the overhaul adds a sticky subheader above the FlatList, the subheader must have `flexShrink: 0` and the FlatList must retain `flex: 1`. Test on Android after any layout change to the Squad pager container — this failure is silent on iOS.

---

## Recommended Phase Order

**Phase 29 — Auth Screen Redesign**
Rationale: Fully self-contained; no other phase depends on it. Establishes the visual language for the overhaul and extracts `CAMPFIRE_DARK_GRADIENT` to `src/theme/gradients.ts` so all subsequent phases can reference it. Fixes the pre-existing always-dark gradient bug. Low risk, high signal.

**Phase 30 — Welcome / Onboarding Flow**
Rationale: Must land before the Home cleanup phase. Defines `welcomeComplete` in `useAuthStore` and introduces `@campfire/welcome_complete` in AsyncStorage. After this phase, the complete new-user journey (Auth → Welcome → Home) can be tested end-to-end for the first time. Home cannot cleanly remove `OnboardingHintSheet` until this store field exists.

**Phase 31 — Home Screen Overhaul**
Rationale: Highest-traffic daily screen; highest animation complexity (radar, card stack, concurrent loops, heartbeat tick). `OnboardingHintSheet` stays in HomeScreen until this phase executes — it does not block Phase 30. Removal of `OnboardingHintSheet` is the only dependency on Phase 30, and it resolves cleanly once `welcomeComplete` is in the store.

**Phase 32 — Squad Screen Overhaul**
Rationale: Self-contained. `CompactFriendRow`, `StreakCard`, `IOUCard`, `BirthdayCard`, and tab bar can all be redesigned independently. Highest density screen in the app — the risk is cards trying to be mini-apps. Verify `tab=memories` deep-link and FlatList flex chain on Android after any layout changes.

**Phase 33 — Explore Screen Overhaul**
Rationale: Most complex due to `react-native-maps` + `expo-location` involvement and the potential three-state bottom sheet pattern. Scoped last to allow iteration on map specifics without blocking other screens. Fix all three `userInterfaceStyle: 'dark'` hardcodes in this phase. Add permission-denied recovery state with `Linking.openSettings()`. Challenges feature completion lands here if in v1.8 scope.

---

## Open Questions

1. **Does the Welcome flow show for all v1.8 upgraders or only new users (zero friends)?** ARCHITECTURE.md recommends showing it to all users once on upgrade (since the new key is distinct from the old flag). FEATURES.md notes it should gate on zero friends. Decision needed before Phase 30 implementation begins.

2. **Should Auth be a single-screen form toggle (login/signup morphs in place) or separate routes with smooth transitions?** FEATURES.md lists single-screen toggle as a Medium-complexity differentiator. ARCHITECTURE.md recommends keeping the state machine in a single component regardless. Confirm which visual pattern is intended before Phase 29 kicks off.

3. **Is the 3-state Explore bottom sheet (Peek / Half / Full) in scope for v1.8 or deferred?** FEATURES.md rates it HIGH complexity. If in scope, Phase 33 planning will need deeper research into the custom sheet implementation.

4. **Where does the Challenges feature live on the Explore screen?** ARCHITECTURE.md offers two options: inline in `FlatList` `ListHeaderComponent`, or a second pager tab. Decision determines Phase 33 scope.

5. **Does any Welcome slide need to detect invite context** ("Your squad is waiting" personalization)? FEATURES.md marks this Medium complexity. If yes, Phase 30 needs a mechanism to read invite-link metadata at session start.

6. **Are Campfire-branded illustrations per Welcome slide in scope or deferred?** If deferred, slides can use brand-colored abstract shapes or gradients as placeholders.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack covers all needs; one new library (`react-native-pager-view`) is well-documented and Expo Go confirmed |
| Features | HIGH | Auth/onboarding patterns verified via NNG + Authgear; map patterns via mapuipatterns.com; home/squad cross-referenced against Locket/BeReal/Splitwise |
| Architecture | HIGH | All findings from direct codebase inspection of `src/` as of 2026-05-06 |
| Pitfalls | HIGH | All pitfalls traced to specific file + line references in the current codebase |

**Overall confidence:** HIGH

### Gaps to Address

- **Challenges feature scope:** Not fully defined. Will need a scoping decision before Phase 33 planning.
- **Welcome slide illustration approach:** Placeholder vs. real assets affects Phase 30 effort. Resolve before execution.
- **Three-state Explore bottom sheet:** Complex enough that if it's in scope, Phase 33 warrants a focused research step on the custom sheet implementation (pan gesture + spring physics without a library).

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection, `src/` — 2026-05-06 snapshot. All architecture findings.
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) — stack compatibility
- [react-native-pager-view Expo Docs](https://docs.expo.dev/versions/latest/sdk/view-pager/) — Expo Go inclusion confirmed
- [Nielsen Norman Group — Bottom Sheet UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/)
- [Authgear — Login & Signup UX Guide 2025](https://www.authgear.com/post/login-signup-ux-guide)
- [Map UI Patterns](https://mapuipatterns.com/) — map interaction patterns

### Secondary (MEDIUM confidence)
- [NextNative — Mobile Onboarding Best Practices 2025](https://nextnative.dev/blog/mobile-onboarding-best-practices)
- [Smashing Magazine — Usability Guidelines For Better Carousels UX](https://www.smashingmagazine.com/2022/04/designing-better-carousel-ux/)
- [react-native-pager-view npm](https://www.npmjs.com/package/react-native-pager-view) — version 8.0.1, New Architecture support

### Tertiary (LOW confidence)
- Behavioral patterns cross-referenced against Locket, BeReal, Bumble, Splitwise, Duolingo (inferred from UX literature, not first-party documentation)

---

*Research completed: 2026-05-06*
*Ready for roadmap: yes*
