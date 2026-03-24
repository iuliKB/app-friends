# Project Research Summary

**Project:** Campfire — v1.1 Design System Milestone
**Domain:** React Native design system retrofit (StyleSheet-only, existing codebase)
**Researched:** 2026-03-24
**Confidence:** HIGH

---

> **Note:** This file supersedes the v1.0 summary (researched 2026-03-17). The v1.0 summary covered the full social app stack and feature set. This summary covers the v1.1 milestone only: extracting a design system from the existing 9,322-LOC, 221-file codebase. No new user-facing features are built in v1.1.

---

## Executive Summary

Campfire v1.1 is a design system extraction and retrofit on a shipped React Native codebase, not a greenfield feature build. The existing app has a well-structured `COLORS` constant (`src/constants/colors.ts`, 17 tokens), but no spacing, typography, border radius, or shadow tokens — every other style value is hardcoded in 46 `StyleSheet.create` blocks across 11 screens and 15 shared components. The v1.1 goal is to extract design tokens as plain TypeScript `const` objects, build a small set of missing shared components (FAB, ScreenHeader, ErrorDisplay, FormField relocation), and sweep all files to replace raw style values with token references.

The stack constraint that shapes every decision: Expo Go managed workflow with `StyleSheet.create` only. No NativeWind, no Tamagui, no theme context provider, no build-time compiler. The correct pattern is module-level `StyleSheet.create` referencing imported token constants — this is what all existing files already do, and v1.1 extends that convention with named, consistent values. The entire design system is zero-dependency: pure TypeScript `as const` objects provide the same autocomplete and type safety as any styling library without adding a single package.

The primary failure mode is a half-finished migration: token files ship, a few screens are updated, then attention moves elsewhere and the codebase ends up with two parallel styling conventions. Prevention requires a CI lint rule rejecting hardcoded hex literals from the moment tokens are defined, plus treating the milestone as complete only when that lint rule passes on all `.tsx` files. Build order is strict: token files first (no dependencies), new shared components second (depend on tokens), hardcoded color sweep in existing components third (independent of new components), screen refactors last (depend on all prior phases).

## Key Findings

### Recommended Stack

The entire v1.1 design system adds zero new dependencies. All patterns use `React.createContext`, `useContext`, `StyleSheet.create`, `as const`, and TypeScript interfaces already present in the project. The `src/constants/` directory is the correct location — `colors.ts` already lives there and is imported from `@/constants/colors` in 40+ files. Adding `spacing.ts` and `typography.ts` alongside it requires zero changes to any existing import and follows the established convention.

The broader app stack (Expo SDK 55, React Native 0.83, React 19.2, Expo Router v7, Supabase `^2.99.x`, Zustand `^5.0.12`) is unchanged from v1.0. Legacy Architecture is dropped in SDK 55 — New Architecture only. No practical impact since the design system is pure JS.

**Core technologies for v1.1:**
- `src/constants/colors.ts` (extend existing): add semantic grouping and `unreadDot` token — enables future dark mode without touching any component
- `src/constants/spacing.ts` (new): 8-point grid scale (4, 8, 12, 16, 24, 32) — eliminates 44+ hardcoded `16` padding values and 10+ hardcoded `8` values
- `src/constants/typography.ts` (new): 5 named text role objects (`TEXT.screenTitle`, `TEXT.sectionTitle`, `TEXT.bodyLarge`, `TEXT.bodyMedium`, `TEXT.caption`) — eliminates 145+ hardcoded `fontSize` values
- `StyleSheet.create` at module level: zero runtime overhead, consistent with every existing file in the codebase
- `React.memo` on new shared components: prevents FlatList row re-renders when design system components wrap list content

**What not to add:** NativeWind (Babel transform, incompatible with StyleSheet constraint), Tamagui (requires build-time compiler), react-native-unistyles (adds dependency where pure TypeScript achieves the same result), global `StyleSheet.create` at module level with light/dark baked in (defeats theme-awareness if dark mode is added in v2).

### Expected Features

All v1.1 features are internal engineering improvements. No user-visible features are added. The value is consistency, maintainability, and a foundation that makes all future screens fast to build correctly.

**Must have (P1 — milestone fails without these):**
- Token file: `COLORS` extended with `unreadDot: '#3b82f6'` and optional semantic grouping restructure
- Token file: `SPACING` (8pt grid: xs=4, sm=8, md=12, lg=16, xl=24, xxl=32) — `12` must be included; omitting it causes mapping gaps
- Token file: `TYPOGRAPHY` / `TEXT` (5 named role objects, derived from codebase audit)
- Token file: `RADII` (sm=8, md=12, lg=16, pill=28)
- Token file: `SHADOWS` (none, subtle, card, modal — iOS + Android platform variants)
- Component: `FAB` (floating action button — replaces inline duplicates in HomeScreen and PlansListScreen; must support all three existing variants)
- Component: `FormField` moved from `src/components/auth/` to `src/components/common/` (zero implementation changes, import path update only)
- Component: `ScreenHeader` (standard screen title + optional right action slot)
- Component: `ErrorDisplay` (inline error text + optional retry handler)
- Pattern: pull-to-refresh on all list screens (Home, Plans, Friends) with `tintColor={COLORS.accent}` on every `RefreshControl`
- Refactor: all 11 screens and 15 component files updated to use tokens — zero raw hex literals or magic spacing numbers remaining

**Should have (P2 — milestone succeeds without these):**
- Auth screens refactored to use the relocated `FormField` component
- `EmptyState` existing component updated to use spacing tokens

**Defer to v2+:**
- Dark mode light theme (semantic grouping now positions for it; build only when product warrants it)
- Animation tokens + Reanimated (zero animations in v1; adding tokens now is premature abstraction)
- Storybook or other component documentation tooling (overhead exceeds benefit at this team size)
- Responsive breakpoints or tablet layout (phone-only app; flex handles it natively)
- `SecondaryButton` / `GhostButton` variants (add only when a second button style is needed in product)
- Toast / Snackbar component (add only when a success/failure feedback pattern is needed beyond loading states)

### Architecture Approach

The architecture is a direct extension of the existing `src/constants/` pattern — not a new parallel directory. Token files live alongside `colors.ts` in `src/constants/`. New shared components join the existing five in `src/components/common/`. The build follows a four-phase dependency graph in strict sequence; each phase is fully complete before the next begins.

The data flow for tokens is: `const` objects in `src/constants/` → imported at file top → referenced in module-level `StyleSheet.create` → evaluated once at module load with zero runtime overhead. No theme context, no Provider, no runtime lookup. This is compile-time token resolution, identical to what every existing file already does.

**Major components:**

1. **`src/constants/{spacing,typography,radii,shadows}.ts`** — new token files; compile-time constants; zero runtime cost; consumed via `import` at module top
2. **`src/constants/colors.ts`** — existing file extended with one new token (`unreadDot`); all other color tokens unchanged
3. **`src/components/common/`** — four new/moved components: `FAB`, `ScreenHeader`, `ErrorDisplay`, `FormField` (relocated); five existing components untouched
4. **`src/screens/{domain}/` + `src/components/{domain}/`** — 11 screens and ~15 components refactored to replace hardcoded values with token references; hooks, stores, routing, and Supabase integration untouched

### Critical Pitfalls

1. **Half-migration state** — Token files exist but not all screens use them; the codebase ends up with two parallel styling conventions. Prevention: install a CI lint rule rejecting hardcoded hex literals (`/['"]#[0-9a-fA-F]{3,8}['"]/`) at the start of Phase 1, before any screen migration. The lint rule makes completion binary.

2. **Spacing scale omits `12`** — The codebase uses 4, 8, 12, 16, 24, and 32 as de-facto spacing values. A scale that maps `sm=8` and `md=16` leaves `12` unmapped. Developers either skip it (layout regressions) or introduce it as a raw number (lint failure). Prevention: include `md=12` explicitly, accept that the naming feels awkward, move on.

3. **FAB consolidation silently breaks screen-specific behavior** — Three existing FAB implementations have structural differences (icon+label row vs icon-only circle vs fixed 56×56). A shared component built against only one variant drops the others silently. Prevention: document all three variants before building the component; support all via props (`variant`, `label?`); do a side-by-side visual comparison on both iOS and Android for each screen.

4. **Parallel `@/theme` directory creates import fragmentation** — If `src/theme/colors.ts` is created alongside `src/constants/colors.ts`, both paths are valid TypeScript imports. There is no import error — the bug only appears as a behavior difference if the two files diverge. Prevention: add `spacing.ts` and `typography.ts` inside `src/constants/`, not a new directory.

5. **`#3b82f6` — undeclared color with no semantic name** — `ChatListRow.tsx` contains the only blue in the codebase, which does not appear in `COLORS`. Its semantic purpose is unknown until the pre-migration audit. Prevention: audit all hardcoded colors and document their semantic intent before Phase 1 begins; add `COLORS.unreadDot` before the screen migration touches that file.

6. **Performance regression from non-memoized shared components** — If `StyleSheet.create` is called inside a component function body (not at module level), or if shared components are not wrapped in `React.memo`, FlatList rows re-render on every parent state change. Chat list scrolls at 60fps only if `LoadingIndicator` and `EmptyState` are memoized and their styles are defined at module level.

## Implications for Roadmap

Four sequential phases. Each must be fully complete before the next begins — not "started," not "mostly done."

### Phase 1: Token Extraction

**Rationale:** All other work depends on tokens. Components cannot be extracted without knowing the token values they will use. Screens cannot be refactored without tokens to reference. This phase has the lowest risk (no existing files modified, except adding one token to `colors.ts`) and the highest leverage (establishes the foundation all subsequent work uses). The lint rule that enforces completion goes in here, before any screens are touched.

**Delivers:** `src/constants/spacing.ts`, `src/constants/typography.ts`, `src/constants/radii.ts`, `src/constants/shadows.ts`; `unreadDot` added to `colors.ts`; CI lint rule rejecting hardcoded hex literals in `.tsx` files.

**Addresses:** SPACING, TYPOGRAPHY, RADII, SHADOWS token features from FEATURES.md.

**Avoids:** Spacing scale omission pitfall (audit existing values first — the audit is done; all six values must be in the scale), import path fragmentation (decide `@/constants/` as the only path before writing a single screen), half-migration pitfall (lint rule at the start, not the end).

### Phase 2: Shared Component Build

**Rationale:** New shared components depend on Phase 1 tokens. Building them before tokens would require hardcoding values that need changing later. Components must ship before screen refactors so screens can reference them. Phase 2 and Phase 3 are independent of each other and can proceed in parallel if two people are working.

**Delivers:** `FAB.tsx` (new, supports icon-only and icon+label variants), `ScreenHeader.tsx` (new), `ErrorDisplay.tsx` (new), `FormField.tsx` (moved from `auth/` to `common/` — zero implementation changes, import path update in `AuthScreen` only).

**Addresses:** FAB, ScreenHeader, ErrorDisplay, FormField features from FEATURES.md.

**Avoids:** FAB consolidation pitfall (audit all three existing FAB implementations before building; support all variants via props; visual comparison screenshots on both platforms), performance pitfall (wrap shared components in `React.memo`; keep `StyleSheet.create` at module level, not inside component body).

### Phase 3: Hardcoded Color Sweep in Existing Components

**Rationale:** Component-level hex values (`#2a2a2a` in PlanCard/AvatarStack/QRCodeDisplay, `#f97316` + `#2a2a2a` in MessageBubble, `#3b82f6` in ChatListRow) must be resolved before screen refactors reference those components, or the screen migration inherits undeclared colors. This phase is purely mechanical and independent of Phase 2.

**Delivers:** All 5 component files with hardcoded hex values updated to `COLORS.*` tokens. `#3b82f6` resolved as `COLORS.unreadDot`. Lint rule passes for all files in `src/components/`.

**Addresses:** The undeclared color pitfall — the anomalous blue is the only color in the codebase without a token name.

**Avoids:** The hex lint rule installed in Phase 1 confirms completion immediately; no manual verification required.

### Phase 4: Screen Refactors

**Rationale:** Screens are last because they depend on all prior phases — tokens (Phase 1), new shared components (Phase 2), and cleaned component dependencies (Phase 3). Within this phase, the 11 screens are fully isolated by StyleSheet scope and can be migrated in any order.

**Delivers:** All 11 screens updated to use tokens and shared components. Inline FAB JSX replaced with `<FAB />` in HomeScreen and PlansListScreen. Pull-to-refresh added to all list screens (Home, Plans, Friends) with `tintColor={COLORS.accent}`. Every FlatList screen with a FAB receives `contentContainerStyle={{ paddingBottom: FAB_HEIGHT + insets.bottom + SPACING.lg }}` to prevent content occlusion. `tsc --noEmit` passes with `"strict": true` and `"noUncheckedIndexedAccess": true`. Lint rule passes for all 221 files.

**Addresses:** All P1 features. Pull-to-refresh pattern on all list screens.

**Avoids:** Half-migration pitfall (lint rule is the completion gate), FAB safe-area pitfall (contentContainerStyle on all FAB screens), typography regression pitfall (test on iPhone SE simulator after each screen migration), performance regression (verify chat list scrolls at 60fps with memoized shared components).

### Phase Ordering Rationale

- Tokens before components before screens: pure dependency graph, no circular dependencies, each phase verifiable in isolation
- Phase 3 (component color sweep) and Phase 2 (new shared components) are independent after Phase 1 and can proceed in parallel
- Screen refactors carry the highest regression risk (most files, most opportunity for layout regressions) — completing Phases 1–3 first means all tooling (lint rule, tokens, shared components) is in place before the riskiest work begins
- Completion criterion is binary: the hex lint rule either passes across all `.tsx` files or it does not

### Research Flags

All four phases use standard, well-documented patterns. No additional research passes are needed.

- **Phase 1 (Token Extraction):** Pure TypeScript constants. The spacing scale is derived from direct codebase audit. No design decisions remain open.
- **Phase 2 (Shared Components):** Standard React Native component patterns. The only design decision (FAB variant support) is documented in PITFALLS.md.
- **Phase 3 (Color Sweep):** Mechanical replacement guided by Phase 1 tokens. No design decisions.
- **Phase 4 (Screen Refactors):** Mechanical after Phases 1–3. The only non-mechanical element is safe-area FAB padding, which is documented.

One gap to monitor (see below): Android `elevation` + `borderRadius` bug in RN 0.77+. This may affect shadow token usage on rounded cards and should be tested on Android during Phase 4.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Design system is zero-dependency pure TypeScript. Core app stack verified against official release notes (Expo SDK 55, Supabase 2.99.x). All patterns use stable React Native APIs. |
| Features | HIGH | Features derived from direct codebase audit of 221 files, 9,322 LOC. Token counts (145 `fontSize` usages, 44 hardcoded `16` padding values, 6 files with undeclared hex) are empirical, not estimated. |
| Architecture | HIGH | Based on direct inspection of all existing files. Build order reflects actual dependency graph. The four-phase sequence is derived from the codebase, not from theory. |
| Pitfalls | HIGH | Grounded in direct codebase observation (e.g., `#3b82f6` is a live finding, not a hypothetical), Shopify engineering posts, design token literature, and a verified React Native GitHub issue (Android elevation bug #48874). |

**Overall confidence:** HIGH

### Gaps to Address

- **Android `elevation` + `borderRadius` bug (RN #48874):** The `SHADOWS` token for cards should avoid `elevation` on rounded surfaces (Android). Use backdrop surfaces instead. Verify this on a physical Android device during Phase 4 before shipping.

- **Pull-to-refresh screens inventory:** ARCHITECTURE.md confirms ChatListScreen already has pull-to-refresh. Home, Plans, and Friends need it added in Phase 4. FriendRequests, AddFriend, ChatRoomScreen, and PlanDashboardScreen should be confirmed against the codebase before Phase 4 execution to ensure no screen is missed.

- **`RADII` exact values:** The codebase audit identified sm=8, md=12, lg=16, pill=28 as the dominant values. The few outliers (2, 4, 22) should be reviewed and collapsed before Phase 1 finalizes the scale — values not in the scale should be removed or mapped to the nearest token, not left inline.

- **FAB safe-area calculation:** `useSafeAreaInsets()` must be used in screens (not inside the `FAB` component itself) to calculate the correct `bottom` offset. The `SafeAreaProvider` is already present via Expo Router; screens need to call the hook and pass the result to `contentContainerStyle`.

## Sources

### Primary (HIGH confidence)
- Direct codebase audit — all 221 files, 9,322 LOC, March 2026. Empirical counts of `fontSize` (145 instances), `borderRadius` (57 instances), `paddingHorizontal` (64 instances), undeclared hex colors (8 files)
- [React Native StyleSheet Docs](https://reactnative.dev/docs/stylesheet) — module-level StyleSheet behavior, style ID registration
- [React Native RefreshControl Docs](https://reactnative.dev/docs/refreshcontrol) — pull-to-refresh implementation pattern
- [Expo Color Themes Docs](https://docs.expo.dev/develop/user-interface/color-themes/) — `useColorScheme` and `userInterfaceStyle: automatic`
- [expo-barcode-scanner deprecation](https://github.com/expo/fyi/blob/main/barcode-scanner-to-expo-camera.md) — use `expo-camera` instead (referenced for stack validation)
- [React Native elevation + borderRadius bug #48874](https://github.com/facebook/react-native/issues/48874) — Android shadow limitation on rounded cards

### Secondary (MEDIUM confidence)
- [Shopify: 5 Ways to Improve RN Styling Workflow](https://shopify.engineering/5-ways-to-improve-your-react-native-styling-workflow) — styling anti-patterns, memoization
- [DEV: Design System for React Native Projects](https://dev.to/msaadullah/how-i-set-up-design-system-for-my-react-native-projects-for-10x-faster-development-1k8g) — token structure and ThemeProvider pattern
- [Prototypr: The 8pt Grid](https://blog.prototypr.io/the-8pt-grid-consistent-spacing-in-ui-design-with-sketch-577e4f0fd520) — spacing scale rationale
- [Thoughtbot: Structure for Styling in React Native](https://thoughtbot.com/blog/structure-for-styling-in-react-native) — file organization patterns
- [Strangler Fig Pattern for Incremental Refactoring](https://www.gocodeo.com/post/how-the-strangler-fig-pattern-enables-safe-and-gradual-refactoring) — migration strategy

### Tertiary (LOW confidence)
- [Naming Tokens in Design Systems — Nathan Curtis, EightShapes](https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676) — token naming guidance (designed for large multi-brand teams; simplified for Campfire's single dark theme)

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
