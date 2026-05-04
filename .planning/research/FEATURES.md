# Feature Landscape: Polish Patterns for v1.7 Launch Ready

**Domain:** Consumer mobile social coordination app — pre-launch polish pass
**Researched:** 2026-05-04
**Confidence:** HIGH for empty states, haptics, animation patterns (well-established React Native patterns, existing code audited); HIGH for skeleton loading (Reanimated 4 compatibility verified); MEDIUM for onboarding (Campfire's friend-invite model makes standard onboarding wisdom partially inapplicable); HIGH for app icon/splash (Expo docs confirmed).

---

## Context: What's Already Built vs. What Needs Polish

Campfire has working implementations of:
- `EmptyState` component (icon + heading + body + optional CTA button) — functional but static, no animation
- `LoadingIndicator` (plain `ActivityIndicator` wrapper) — functional but not polished
- `OfflineBanner` (animated height toggle, Animated API) — already handles offline detection
- `FAB` (spring press feedback via `Animated.spring`) — good pattern to extend
- Haptics via `expo-haptics` on segmented controls, swipe cards, gallery, IOU settle — partial coverage, not systematic
- `react-native-reanimated: 4.2.1` and `react-native-gesture-handler: ~2.30.0` already installed
- `expo-haptics: ~55.0.14` already installed
- `expo-linear-gradient: ~55.0.13` already installed
- App icon: `./assets/images/icon.png` — current icon is a placeholder (Expo logo family)
- Splash: background color `#ff6b35` only — no splash icon configured

This is a polish milestone. The task is elevating what's functional to what's great, not building new capabilities.

---

## 1. Empty States

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Every list screen has a contextual empty state | A blank screen or a spinner that never resolves feels broken. Users immediately assume the app crashed or their data was lost. | LOW | The `EmptyState` component exists. Audit every `FlatList` screen to confirm it fires — Friends list, Plans list, Chats list, IOU list, Birthdays list, Memories, Goals. |
| Empty state copy is specific, not generic | "No items found" is a dead end. "No plans yet — create your first one" tells the user what to do. Generic copy makes the app feel unfinished. | LOW | Each screen needs a unique icon + headline + body + CTA. The CTA should route directly to the creation flow. |
| Empty state for first-time user (zero-data state) vs. post-action state | A new user who has no friends sees a different empty state than a user who has friends but no plans for this week. Mixing them produces confusing copy. | LOW | Two distinct copy variants per screen where both states are possible. First-time: "Invite a friend to get started." Post-action: "You're all caught up." |
| Search/filter empty state | When a user searches and gets no results, the empty state must acknowledge the search term, not show the generic zero-data state. | LOW | Conditioned on whether a search/filter is active. Copy: "No results for '[query]'" with a "Clear search" action. |
| Empty state CTA is actionable | The button in the empty state must navigate to the correct creation flow. A CTA that does nothing or routes incorrectly is worse than no CTA. | LOW | Verify each empty state CTA actually fires the correct navigation. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Subtle fade-in animation on empty state mount | The empty state appearing with a 200ms fade rather than popping in instantly feels intentional and polished. It avoids the jarring blank-then-content flash. | LOW | `Animated.timing` opacity from 0→1 on mount. Add to the existing `EmptyState` component as a built-in behavior. No new dependency. |
| Contextual illustration or large emoji per screen | An emoji at 64px (larger than the current 48px) or a custom icon per screen gives each empty state visual personality. The current EmptyState supports both emoji and Ionicons — the issue is whether the right icon is chosen per screen. | LOW | Audit and update icon choices per screen. Campfire's warm brand tone works well with expressive emoji (e.g., "🔥" for no plans, "🎂" for no upcoming birthdays). |
| Empty state for the home screen when user has no friends | The most critical empty state in the app. A new user with no friends sees the home screen's radar/card view with nothing in it. This is the first impression. | MEDIUM | Special-case the home screen: if `friends.length === 0`, show a prominent "Find your people" empty state with a button to Squad → add friend. This is the activation moment. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Animated Lottie illustrations for empty states | Lottie files are 50–200 KB each. For 8+ distinct empty states, the bundle impact is significant. The animation value is low relative to the cost. | Static emoji or Ionicons at 48–64px. Fade-in animation is sufficient motion. |
| Different visual design per screen | Inconsistent empty states (different layouts, different button styles) make the app look unfinished. | Use the shared `EmptyState` component for all screens. Vary only the icon, copy, and CTA. |
| Loading spinner as a permanent empty state | Showing a spinner indefinitely when a list is empty (e.g., "loading...") makes users wait forever for content that doesn't exist. | Distinguish loading (data fetch in progress) from empty (fetch complete, zero rows). |

---

## 2. Skeleton / Shimmer Loading

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Replace full-screen `ActivityIndicator` with skeleton rows on initial list load | A full-screen spinner that blocks all content is the lowest-quality loading pattern. Modern apps (Instagram, Twitter/X, LinkedIn) show content structure while data loads. Users perceive skeleton-loaded screens as ~20% faster. | MEDIUM | Build a `SkeletonRow` component using `Animated.loop` + opacity pulse (0.3→1→0.3, 800ms). Use the built-in `Animated` API — do not add a skeleton library (Moti skeleton has an open bug with New Architecture/Reanimated 4; third-party libs add fragility). |
| Skeleton layout matches real content structure | If the skeleton shows a rectangle where a 3-column grid will appear, the layout shift on load completion is jarring. The skeleton must mirror the real item height, padding, and rough shape. | MEDIUM | Create `SkeletonFriendCard`, `SkeletonPlanCard`, `SkeletonMessageBubble`, `SkeletonChatRow` as reusable components. Use `colors.surface.elevated` for the base and `colors.border` for the shimmer. |
| Transition from skeleton to real content without layout jump | If skeleton rows are a different height than real rows, content will jump when data arrives. This is worse than no skeleton at all. | LOW | Match skeleton row dimensions to real row dimensions. Use fixed heights that match the populated state. |
| Skeleton for the home screen's radar/card section | The home screen is the highest-traffic screen. Showing a spinner there while friends load hurts first impressions. | MEDIUM | Radar skeleton: ~3 blurred circles at approximate radar positions. Card stack skeleton: single card-shaped rectangle. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Animated shimmer gradient (sweep left→right) vs. pulse | A left-to-right shimmer gradient is the iOS/Android native skeleton pattern (used by Facebook, LinkedIn). Pulse (opacity fade) is simpler but less premium-feeling. | MEDIUM | Use `expo-linear-gradient` (already installed) + `Animated.timing` to sweep a gradient overlay. This is the callstack.com recommended pattern for performant cross-platform shimmers. Since `expo-linear-gradient` is already a dep, no new package needed. |
| Shared animation value across multiple skeleton rows | If each skeleton row runs its own animation, they animate out of sync. A single `Animated.Value` shared via React Context (or passed as prop) keeps all rows in phase — this is the professional-grade pattern. | LOW | Wrap list screens in a `SkeletonProvider` that vends a single shared animation value. All `SkeletonRow` children read from it. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Moti skeleton library | Has an open unresolved bug with New Architecture (this project uses Reanimated 4 which requires New Architecture). Will render as a static block. | Built-in `Animated` API + `expo-linear-gradient` shimmer. |
| react-native-skeleton-placeholder | Depends on `react-native-linear-gradient` (not `expo-linear-gradient`). Expo managed workflow incompatibility — will break managed builds. | Custom `SkeletonRow` component using existing `expo-linear-gradient`. |
| Skeleton on every single screen | Skeleton loading makes sense for high-frequency screens with multiple rows of data (home, chat list, plans list). For a screen that loads in <300ms or has only 1–2 items, a skeleton is overhead that slows perceived performance instead of improving it. | ActivityIndicator remains appropriate for: form submission feedback, image uploads, single-item detail screens. |
| Indefinite skeleton (never clears) | If the data fetch errors and the skeleton stays visible, users are trapped in limbo. | Always transition to either real content OR an error state OR an empty state after fetch settles. Maximum skeleton display time: ~10 seconds, then surface an error. |

---

## 3. Micro-Interactions and Animation

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Press feedback (scale down) on all interactive elements | Without visual press feedback, taps feel unresponsive. iOS provides this via `UIButton` highlight; Android via Material ripple. In React Native StyleSheet–only (no UI library), this must be built explicitly. | LOW | Scale from 1.0→0.96 on `onPressIn`, back to 1.0 on `onPressOut`, via `Animated.spring`. FAB already does this correctly. Extend to all tappable cards (plan cards, friend cards, IOU rows, birthday rows, chat rows). |
| `activeOpacity` on `TouchableOpacity` ≤ 0.7 | The default `activeOpacity` of 0.2 is too aggressive — items nearly disappear on press. 0.7 is the right balance. | LOW | Global audit: every `TouchableOpacity` in the codebase should have `activeOpacity={0.7}` or `activeOpacity={0.8}`. |
| List item entrance animation when FlatList first loads | Content appearing with a slight fade + translate-up (staggered by index) feels curated rather than dumped on screen. Used by Gmail, Instagram, Airbnb. | MEDIUM | `Animated.spring` on mount with `useEffect`. Stagger delay: `index * 40ms`. Keep entrance under 400ms total. Cap stagger at first 8 items — don't stagger the full list. |
| Status change confirmation animation | When a user changes their Free/Busy/Maybe status, the UI should respond visually beyond just updating text. A brief scale pulse on the status pill confirms the change registered. | LOW | Add a `useRef(new Animated.Value(1))` scale pulse to `OwnStatusPill` that fires on status value change. 150ms spring, scale 1.0→1.15→1.0. |
| Reaction add/remove animation on chat messages | Tapping a reaction should show a brief scale bounce. Already partially in place — verify consistency. | LOW | Confirm `Animated.spring` on reaction press in `ReactionsSheet` and `MessageBubble`. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Screen-level shared element transition for plan detail | When a user taps a plan card and the plan detail opens, a shared element animation (the card expanding into the detail screen) creates a spatial relationship. | HIGH | Requires `react-native-reanimated` Shared Element API or React Navigation's `SharedElement`. High complexity, potential navigation issues with Expo Router. **Defer to v2 unless trivial to wire up.** |
| Bottom sheet snap animation (for status picker) | The `StatusPickerSheet` already opens as a modal. Ensuring it uses a spring-based snap animation (not a linear slide) makes it feel iOS-native. | LOW | Verify the existing bottom sheet uses `Animated.spring` for the snap motion. If using a plain `Modal`, consider wrapping in a `useRef` spring animation on `visible` prop change. |
| Card swipe velocity-based animation (FriendSwipeCard) | Already built with gesture handler. Verify that the swipe-to-dismiss uses velocity-based spring exit (the card "flies off" at realistic velocity) rather than a fixed linear exit. | LOW | Audit `FriendSwipeCard.tsx` — confirm it passes gesture velocity into the spring `velocity` parameter for natural motion. |
| Pull-to-refresh custom indicator | The platform default PTR indicator works but using a custom brand-color spinner (Campfire's `#ff6b35`) on the `refreshControl` `tintColor` and `colors` props ties the interaction to the brand. | LOW | One-line change on every `FlatList` that has `onRefresh`: set `tintColor={colors.interactive.accent}` on `<RefreshControl>`. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Animations on every UI element | Over-animating creates visual fatigue and slows the user down. The Principle of Least Astonishment: motion should serve communication, not decorate every tap. | Animate state changes and user-initiated actions. Leave static display elements (text, labels, icons) unanimated. |
| Long animation durations (>400ms) for UI transitions | Interactions >400ms feel sluggish. Apple's HIG recommends 200–300ms for most UI animations. A user tapping a button should see response in under 200ms. | Cap all interactive feedback animations at 200ms. Screen transitions can be 300–350ms. |
| `useNativeDriver: false` for transform/opacity animations | Without native driver, animations run on the JS thread and will stutter during heavy JS work (data fetching, rendering). | All `transform` and `opacity` animations must use `useNativeDriver: true`. Only `height`, `width`, `padding`, `margin` require `useNativeDriver: false`. The `OfflineBanner` correctly uses `false` for height. |
| Reanimated worklets for simple opacity pulses | Reanimated 4 is powerful but adds cognitive overhead and compilation complexity. For simple press feedback and fade-in, the built-in `Animated` API is sufficient and already used throughout the codebase. | Use Reanimated only for gesture-driven animations (the swipe card, bottom sheet velocity) where JS-thread animation would stutter. |

---

## 4. Onboarding / First-Run Experience

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| App is useful immediately after sign-up | A social coordination app that requires inviting friends before showing any value is a cold-start trap. New users who see an empty home screen with no friends immediately churn. | MEDIUM | Show a "Getting started" state on the home screen for users with 0 friends. Include: (1) a prominent "Invite a friend" CTA, (2) brief copy explaining what Campfire does ("See who's free, make plans instantly"). The home screen is the onboarding surface. |
| Permission requests at the moment they're needed | Asking for notifications, location, and camera access all on launch is a permission request wall that causes ~50% of users to deny everything. | LOW | Trigger notification permission when user first sets their status or creates a plan. Trigger location permission when user taps Explore map for the first time. Never ask at launch. |
| Profile completion prompt (name + avatar) | An app where all friends show as "@username" with no avatar feels impersonal. Social apps need faces. | LOW | After sign-up, route through a profile completion screen: display name + avatar. Make it skippable but prominent. This exists in some form from v1.0 — verify the flow is polished. |
| Morning prompt opt-in during first status set | The morning prompt notification is one of Campfire's core engagement mechanics. New users who never encounter it miss the loop entirely. | LOW | On first status set, after the status is confirmed, show a contextual prompt: "Want a morning nudge to share your status?" → configure morning prompt time. Not a modal on launch — triggered by the first meaningful action. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Seed the home screen with helpful copy for zero-friend state | Instead of a blank home screen, show explanatory content: "Your friends will appear here once you connect. Share your link to invite them." with a large share button. | LOW | Conditional render in `HomeScreen.tsx` when `friends.length === 0`. No new component needed — reuse `EmptyState` with a share-link CTA. |
| Deep-link from "Add Friend" QR code / share link that pre-populates friend request | The best social app onboarding is when someone invites you. The invitee should land in the app with the friend request pre-populated, not in a blank home screen. | MEDIUM | Campfire already has QR code / username-based friend adds. Verify the deep link scheme (`campfire://`) properly handles incoming invites and routes to the friend request flow, not just the home tab. |
| Skip onboarding carousel entirely | A 5-screen feature tour before users can see the app is the single most skipped UI in mobile apps. Duolingo's research showed "use product first, sign up second" was their highest-impact retention change. For an app already requiring sign-up (auth required), the equivalent is: get users to the home screen immediately. | LOW | Explicitly recommend against a feature carousel. If any screens have been added since v1.0 that show "here's how Campfire works" — remove them. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Onboarding carousel (swipeable "feature tour" screens) | Users skip them. Always. Studies consistently show carousel completion rates under 20%. They delay the user from doing the thing they came to do. | Jump directly to the home screen. Let the empty state do the teaching. |
| All permissions requested at launch | iOS and Android both show a native permission dialog. Three in a row on first launch causes "deny everything" behavior. Notification permission denial is permanent until users manually re-enable in Settings. | Contextual permission requests, triggered at the natural moment of first use. |
| Mandatory profile photo | Blocking app use behind a required avatar upload is friction with no immediate payoff for the user. 30% of users will abandon. | Make avatar optional. Default to initials avatar (already exists in `AvatarCircle`). |
| Social graph import (contacts / Facebook) | Campfire is for a specific known friend group of 3–15 people, not a public social network. Contact import implies "grow your network" — wrong product model. It also requires significant platform permissions. | Manual add-by-username or QR scan is the right model for an intimate group app. |

---

## 5. App Icon and Splash Screen

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Custom branded app icon (not the Expo placeholder) | The current icon (`./assets/images/icon.png`) appears to be in the Expo logo family based on the android assets present. A placeholder icon is an immediate signal to App Store reviewers and users that the app is unpolished. App Store review may reject placeholder icons. | LOW | Design a 1024×1024 icon. For Campfire: campfire/fire motif, warm orange (#ff6b35) brand color. Simple silhouette — a single flame or stylized campfire that reads at 40px. |
| Android adaptive icon with correct layers | The `app.config.ts` has `foregroundImage` and `backgroundColor` configured. The foreground image must be sized correctly for adaptive icon safe zone (66% of total canvas = foreground should be centered in a 108dp with safe zone at 72dp). | LOW | Verify `android-icon-foreground.png` is correctly composed for adaptive icon requirements. The icon content should be within the inner 72dp safe zone. |
| Splash screen with branded icon, not just background color | Current `app.config.ts` has `splash.backgroundColor: '#ff6b35'` but no `splash.image` or `splash.icon` configured. An orange screen with nothing on it for 2–3 seconds is unpolished. | LOW | Add `splash.image` pointing to a 1024×1024 PNG of the icon on a transparent background. The Expo config plugin handles sizing. Use `splash.resizeMode: 'contain'` to center it. |
| Splash background color matches first screen background | If the splash is orange but the home screen is white (light mode) or dark (dark mode), the transition is jarring. | LOW | Set `splash.backgroundColor` to match the app's primary surface color, not the brand orange. Consider `#1a1a2e` (dark) with a conditional light/dark splash image (iOS supports this via `userInterfaceStyle: 'automatic'`). Alternatively: use white `#ffffff` for light, let the system handle dark. |
| App icon tested at small sizes (40px iPhone grid, 29px settings) | An icon that looks good at 1024px can become an unreadable smear at 40px if it has too much detail. | LOW | Test the icon at 40px, 60px, 76px, and 83.5px (all iOS sizes). Apple's HIG requires legibility at all sizes. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Icon uses Campfire brand color as primary (#ff6b35) | Brand color consistency across icon → splash → app UI → notifications creates a coherent visual identity. Users recognize the orange instantly. | LOW | Already partially done (notification icon color is `#ff6b35`). Extend to the icon and splash. |
| Dark/light splash variant (iOS 26 Liquid Glass consideration) | On iOS 26, icons are treated as layered glass. Designing the icon with a transparent background (icon on clear) rather than a solid background enables the OS to apply its own effects while the brand silhouette remains recognizable. | LOW | Use a transparent background on the icon PNG. Let `adaptiveIcon.backgroundColor` supply the background layer for Android. For iOS, the rounded corner + Liquid Glass effects are applied by the OS — no need to bake them in. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Text in the app icon | Both iOS and Android guidelines prohibit or strongly discourage text in icons. At 40px, "Campfire" is illegible. The icon must work as a pure visual symbol. | Wordmark lives in the App Store listing, not the icon. |
| App name in the icon | Same as above — the OS displays the app name below the icon. Putting it in the icon doubles the label and looks amateur. | Visual symbol only. |
| Detailed/complex icon illustration | Icons with multiple elements, gradients on gradients, and fine linework become visual noise at 40–60px. The most successful social app icons (WhatsApp, Telegram, Messenger) use one bold shape at maximum 2–3 colors. | Single silhouette, brand orange, transparent or white background. |
| Animated splash screen beyond a simple fade | Custom animated splashes require `expo-splash-screen` with manual hide timing + a matching first-screen animation. High complexity, marginal value. App Store testers specifically look for apps that take too long to show first content. | Static splash with fast hide. Call `SplashScreen.hideAsync()` as soon as the auth check and initial data load resolves. |
| Long splash duration | The splash must hide as soon as the app is ready. A 3+ second branded animation feels like the app is slow, not premium. | Splash should hide within 1.5 seconds on a normal device. Target <1 second. |

---

## 6. Error States and Offline Handling

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Every data-fetching screen has an error state | A screen that silently shows nothing when the network fails looks broken. Users need to know: "something went wrong" vs "there's nothing here." | LOW | The `ErrorDisplay` component exists. Audit every screen that uses `useEffect` + Supabase query to confirm `error` state is handled, not just `loading` and `data`. |
| Error state includes a retry button | Without a retry mechanism, users must close and reopen the app to recover. A "Try again" button in the error state is the minimum viable recovery flow. | LOW | `ErrorDisplay` should accept an `onRetry` callback. Pass the re-fetch function as the retry action. |
| Offline banner is visible but not obtrusive | The `OfflineBanner` component already exists and uses animated height. Verify it appears correctly on all screens (it should sit below the `ScreenHeader` and above the list content). | LOW | Integration audit: confirm `OfflineBanner` is mounted in the root layout so it appears on all screens without duplication. |
| Offline state does not block viewing cached data | If the user has viewed their friends' statuses, those should still be visible (even if stale) when offline. Showing an empty screen just because the network is down is poor UX. | MEDIUM | For most screens, Zustand store state persists in-memory during the session. The issue arises on fresh app launch offline. Since Campfire does not use local persistence (no SQLite/MMKV), this is limited: the offline banner explains the situation, and the screens show empty states with "No connection" messaging rather than full error states. **Note for PITFALLS.md:** offline-first persistence is a v2 concern, but the UX should gracefully degrade. |
| Network errors distinguished from empty data | A `[]` response from Supabase (empty list) must not be treated the same as a `{ error }` response. The empty state and error state must be distinct. | LOW | Audit hooks: confirm `error !== null` → error state, `data.length === 0` → empty state, `data.length > 0` → content. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Reconnected" toast when coming back online | When the offline banner disappears (connection restored), showing a brief "You're back online" toast with an auto-trigger data refresh reassures the user that their data is now current. | LOW | In `OfflineBanner`, add a callback when `isConnected` transitions false→true. Trigger a brief toast via a shared notification utility. Auto-dismiss after 2 seconds. |
| Optimistic updates for status changes (already partially exists) | The existing "server confirmation before local update" pattern is safe but creates a perceived lag on status change. An optimistic update (update local state immediately, roll back on error) makes the status toggle feel instant. | MEDIUM | Risk: if the server update fails, the user sees their status revert. For the status composer, this is acceptable (same as iMessage send failure). The existing pattern in `useExpenseCreate` already uses optimistic patterns. |
| Retry with exponential backoff for failed Supabase queries | A single retry on error is good. Automatic retry with backoff (1s, 2s, 4s) is better for transient network hiccups. | MEDIUM | Campfire does not use React Query (project constraint). Implement a simple `useRetry` hook that wraps the fetch function. Cap at 3 retries. Not required for v1.7 unless fetch failures are frequent — flag as a polish improvement. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full-screen error modal on every API failure | Modal errors for transient failures block the entire app for what might be a 500ms network blip. | Inline error states per-screen. Modal only for unrecoverable auth errors (session expired). |
| "Something went wrong" without context | Opaque error messages teach users nothing and create support tickets. Campfire is not at scale — contextual errors ("Couldn't load your friends — check your connection") are fine at this stage. | Contextual error copy per screen. Include the screen context in the error message. |
| Blocking writes when offline | If a user writes a plan or a chat message while offline, silently discarding it is unacceptable. | For now: disable write actions (grey out buttons) when `isConnected === false` rather than silently discarding. A toast: "Can't create plans offline" is better than silent failure. This is already the effective behavior since all writes go to Supabase directly. |

---

## 7. Haptic Feedback

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Haptic on status change (mood/context selection) | Already implemented in `MoodPicker.tsx` (`Light` for context chip, `Medium` for mood row). Verify this also fires when the status is committed via the bottom sheet picker. | LOW | Confirm `StatusPickerSheet` fires haptic on status commit, not just on individual chip selection. |
| Haptic on plan RSVP (going / not going) | Confirming a plan RSVP is a definitive action. `Medium` impact confirms it registered. | LOW | Audit `PlanRSVPButton` or wherever RSVP state changes. Add `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` on RSVP commit. |
| Haptic on send message | Chat message send is the most frequent social action. A `Light` impact on send makes the interaction feel immediate and confirmed. | LOW | Add `Haptics.impactAsync(ImpactFeedbackStyle.Light)` in `SendBar.tsx` `handleSend` after the optimistic message insert. |
| Haptic on reaction add | Adding a reaction is a discrete selection action. `selectionAsync()` (the selection haptic, lightest) is appropriate. | LOW | Audit `ReactionsSheet.tsx` reaction tap handler. Add `Haptics.selectionAsync()`. |
| Haptic on friend request accept/reject | These are meaningful social gestures. `Medium` for accept (positive action), `Light` for decline. | LOW | Audit `FriendRequestRow` or similar component. Add haptic on both actions. |
| Success haptic on IOU settle | Already implemented with `Medium` impact. Verify. | LOW | Already in `useExpenseDetail.ts`. Confirm it works end-to-end. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `notificationAsync(Success)` for high-value completions | `Haptics.notificationAsync(NotificationFeedbackType.Success)` produces a triple-tap pattern (distinctly "done!") that iOS uses for Apple Pay confirmation. Use this for: plan created successfully, expense settled, friend request accepted. | LOW | Upgrade from `impactAsync(Medium)` to `notificationAsync(Success)` for 3 specific "task complete" moments. This is the highest-quality haptic pattern available. |
| `notificationAsync(Warning)` for destructive confirmations | Before a destructive action (delete a plan, remove a friend), a `Warning` haptic pattern (`notificationAsync(NotificationFeedbackType.Warning)`) creates a "pause and reconsider" sensation. | LOW | Add to any confirmation dialog before irreversible actions. |
| `selectionAsync()` for all segmented control and tab changes | Already on `SegmentedControl` and `ThemeSegmentedControl`. Extend to the Squad top tabs (Friends / Goals) and any picker-style selections (date pickers, split mode controls). | LOW | The `SplitModeControl.tsx` already has it. Verify the Squad tab underline switcher has it. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Haptic on every tap | Over-hapticating (every list row tap, every navigation, every keyboard key) creates sensory fatigue. iOS system apps use haptics sparingly — only for state changes, confirmations, and meaningful selections. | Haptics only for: (a) state changes (status set, RSVP, reaction), (b) high-value completions (plan created, expense settled), (c) selections in picker/segmented controls. Never on: navigation taps, list row opens, info displays. |
| Heavy (`Heavy` impact) for routine actions | `Heavy` impact is for system-level events (scroll lock, end of list bounce). Using it for routine social actions makes everything feel like a system alert. | `Light` for selection/navigation feedback. `Medium` for confirmations. `Heavy` reserved for errors or truly significant moments. `notificationAsync` for completions and warnings. |
| Haptic feedback without `try/catch` | `expo-haptics` silently fails on devices without haptic engines (iPad, some Android). But mixing synchronous haptic calls with `await` in an event handler can cause unhandled rejections if the promise rejects. | Wrap all haptic calls in `.catch(() => {})` (already done in some places — ensure all call sites follow this pattern). |

---

## Feature Dependencies

```
Empty States
  └── requires: EmptyState component (exists, needs animation enhancement)
  └── requires: per-screen copy audit (new work)
  └── enhances: First-run experience (zero-friend state is the onboarding surface)

Skeleton Loading
  └── requires: expo-linear-gradient (already installed)
  └── requires: Animated API (built-in React Native)
  └── requires: per-screen skeleton components matching real row shapes
  └── conflicts: Moti skeleton (New Architecture incompatible — do not use)

Micro-Interactions
  └── requires: react-native-reanimated (installed, v4.2.1)
  └── requires: Animated API (built-in)
  └── no new dependencies

Haptic Feedback
  └── requires: expo-haptics (installed, ~55.0.14)
  └── enhances: Micro-interactions (haptic + visual animation together = polished)
  └── no new dependencies

App Icon & Splash
  └── requires: 1024x1024 PNG assets (must be designed/sourced)
  └── requires: app.config.ts update (splash.image, potentially splash.backgroundColor)
  └── requires: EAS build to test (Expo Go cannot fully replicate splash from SDK 52+)
  └── independent of all other polish features

Onboarding / First-Run
  └── requires: home screen empty state (see Empty States)
  └── requires: deep-link routing works (campfire:// scheme in app.config.ts exists)
  └── enhances: Skeleton loading (empty vs loading is clearer with both states handled)
  └── no new dependencies

Error States / Offline
  └── requires: OfflineBanner (exists)
  └── requires: ErrorDisplay (exists)
  └── requires: per-screen error state audit (new work)
  └── enhances: Loading states (error must replace skeleton when fetch fails)
```

---

## MVP for v1.7 (Launch Polish)

### Ship with v1.7

- [ ] Custom app icon (1024×1024 brand asset) — first thing App Store reviewers and users see
- [ ] Splash screen with icon (not just background color) — eliminates 2-second orange void
- [ ] Empty state audit: every list screen has unique icon + copy + CTA — table stakes
- [ ] Error state audit: every data-fetching screen handles `error !== null` with retry — table stakes
- [ ] Skeleton loading on home screen (friends section), plans list, and chat list — highest-traffic screens
- [ ] Press feedback (scale 1.0→0.96) on all tappable cards and rows — most visible polish delta
- [ ] Haptic audit: status change, RSVP, message send, reaction add, friend request — complete the pattern
- [ ] `notificationAsync(Success)` for plan creation and expense settle — upgrade 2 highest-value moments
- [ ] First-run home screen state for zero-friend users — activation / retention critical
- [ ] Pull-to-refresh `tintColor` set to brand orange on all lists — 1-line brand polish

### Add After Initial v1.7 Ship (v1.7.x)

- [ ] Shimmer gradient sweep (upgrade from pulse to gradient) — higher polish, `expo-linear-gradient` ready
- [ ] "Back online" toast notification — nice touch once offline handling is confirmed stable
- [ ] Morning prompt opt-in contextual prompt on first status set — engagement loop
- [ ] List item entrance animations (staggered fade+slide) — visual delight, not critical path

### Defer to v2

- [ ] Shared element screen transitions — High complexity, Expo Router compatibility uncertain
- [ ] Offline-first persistence (SQLite/MMKV) — architectural change, not a polish pass
- [ ] Optimistic updates for all write operations — risk of rollback UX complexity

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| App icon + splash | HIGH — first impression | LOW — asset design + config | P1 |
| Empty state audit | HIGH — every screen | LOW — copy + EmptyState component | P1 |
| Press feedback on cards | HIGH — most visible | LOW — Animated.spring pattern | P1 |
| Error state audit | HIGH — crash prevention perception | LOW — ErrorDisplay + retry | P1 |
| Haptic audit (complete coverage) | MEDIUM — feel | LOW — expo-haptics calls | P1 |
| Skeleton on home/chat/plans | HIGH — perceived speed | MEDIUM — build SkeletonRow components | P1 |
| Zero-friend home state | HIGH — activation/retention | LOW — conditional EmptyState | P1 |
| notificationAsync(Success) upgrades | MEDIUM — delight | LOW — change 3 call sites | P2 |
| Pull-to-refresh brand color | LOW — subtle | LOW — 1 prop change per list | P2 |
| Shimmer gradient (vs pulse) | MEDIUM — premium feel | MEDIUM — linear gradient animation | P2 |
| Entrance animations on lists | MEDIUM — delight | MEDIUM — staggered Animated.spring | P2 |
| "Back online" toast | LOW — reassurance | LOW — OfflineBanner callback | P2 |
| Contextual permission opt-in | MEDIUM — retention | LOW — timing adjustment | P2 |
| Shared element transitions | LOW — wow factor | HIGH — Expo Router uncertainty | P3 |

**Priority key:**
- P1: Must have for launch — without these, the app feels unfinished
- P2: Should have — meaningfully improves the experience, low risk
- P3: Nice to have — defer unless effort is trivial

---

## Sources

- Expo Haptics API documentation: [https://docs.expo.dev/versions/latest/sdk/haptics/](https://docs.expo.dev/versions/latest/sdk/haptics/)
- Expo Splash Screen + App Icon guide: [https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)
- React Native Reanimated withSpring docs: [https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/)
- Callstack shimmer performance guide (react-native-svg + Reanimated): [https://www.callstack.com/blog/performant-and-cross-platform-shimmers-in-react-native-apps](https://www.callstack.com/blog/performant-and-cross-platform-shimmers-in-react-native-apps)
- Moti skeleton New Architecture incompatibility (open bug): [https://github.com/nandorojo/moti/issues/337](https://github.com/nandorojo/moti/issues/337)
- Skeleton loading built-in Animated API pattern: [https://medium.com/@saiabhishek.k/every-skeleton-loader-library-is-secretly-just-this-animated-api-ed6ac82fa437](https://medium.com/@saiabhishek.k/every-skeleton-loader-library-is-secretly-just-this-animated-api-ed6ac82fa437)
- App icon design best practices 2025: [https://asomobile.net/en/blog/app-icon-trends-and-best-practices-2025/](https://asomobile.net/en/blog/app-icon-trends-and-best-practices-2025/)
- Mobile onboarding best practices: [https://nextnative.dev/blog/mobile-onboarding-best-practices](https://nextnative.dev/blog/mobile-onboarding-best-practices)
- Empty state UX design rules: [https://www.eleken.co/blog-posts/empty-state-ux](https://www.eleken.co/blog-posts/empty-state-ux)
- Android haptics UX design (official): [https://source.android.com/docs/core/interaction/haptics/haptics-ux-design](https://source.android.com/docs/core/interaction/haptics/haptics-ux-design)
- 2025 haptics guide: [https://saropa.com/articles/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback/](https://saropa.com/articles/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback/)

---
*Feature research for: Campfire v1.7 — Polish & Launch Ready*
*Researched: 2026-05-04*
