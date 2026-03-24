# Feature Research

**Domain:** React Native design system for a small friend-group app (StyleSheet-only)
**Researched:** 2026-03-24
**Confidence:** HIGH (token patterns backed by official RN docs + multiple practitioner sources; complexity estimates from direct codebase audit)

---

## Context

This is a SUBSEQUENT MILESTONE. V1 shipped all social features. This research covers only design-system features — what to extract, standardize, and build as a foundation for future views. The codebase uses React Native StyleSheet directly (no UI library). All recommendations stay within that constraint.

**Codebase audit findings (direct observation):**
- `COLORS` constant exists in `src/constants/colors.ts` — 13 named values. Used everywhere.
- No spacing, typography, border-radius, or shadow constants exist yet.
- Font sizes in use: 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 48. Most common: 14 (components) and 16 (screens).
- Border radii in use: 2, 4, 6, 8, 12, 16, 18, 22, 28. Most common: 8 and 12.
- Padding in use: predominantly 16 for horizontal screen padding. 8, 12, 16, 24, 32 for vertical rhythm. Several one-off values (14, 40, 64, 100) that are component-specific.
- Existing shared components: `PrimaryButton`, `EmptyState`, `LoadingIndicator`, `OfflineBanner`, `AvatarCircle`.
- No FAB component exists. No form input component. No error display component. No consistent view title pattern.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a consistent app. Missing these = the app feels unfinished when new screens are added.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Color tokens (semantic + brand) | Every screen imports COLORS already. Without semantic naming (`textPrimary` vs `#f5f5f5`), dark mode and theming are impossible later. COLORS already partially exists — extend it, don't replace it. | LOW | Already ~80% done. Add semantic grouping (surface, text, border, interactive, feedback). Move status colors out of the nested sub-object for consistency. |
| Spacing scale | 16 is used 21+ times for paddingHorizontal. 8, 12, 16, 24, 32 form a natural scale. Without constants, every new screen reinvents it. | LOW | 8pt grid: 4, 8, 12, 16, 24, 32, 48. Export as `SPACING.xs` through `SPACING.xxl`. One-off values (100 = tab bar clearance, 64 = safe area) stay inline — don't over-tokenize. |
| Typography scale | Font sizes 14 and 16 dominate. 24 is always a screen heading. 20 is always a section heading. Without constants, inconsistency compounds across new screens. | LOW | Define 6-8 named roles: `body`, `bodySmall`, `label`, `heading`, `sectionTitle`, `caption`. Each role = `{ fontSize, fontWeight, lineHeight }`. |
| Border radius scale | 8 and 12 dominate (22 of 29 usages). 28 appears only for pill/FAB shapes. 2 and 4 are likely accidents. | LOW | Define 4 values: `sm` (8), `md` (12), `lg` (16), `pill` (28). Any value not in this set gets reviewed and likely collapsed. |
| Reusable `FAB` component | Every list screen (Plans, Home) has a floating action button. None share a component. Adding a new list view requires re-implementing the FAB. | LOW | Single `FAB` with `icon` and `onPress` props. Fixed position, `COLORS.accent` background, `RADII.pill` border radius. |
| Reusable form input component | Auth screens have inputs; no shared `TextInput` wrapper exists. Every auth screen duplicates the same border/background/padding/color pattern. | LOW-MEDIUM | `FormInput` with label, error message slot, `secureTextEntry` support, and focus state styling. Replaces 4+ duplicate input patterns across auth screens. |
| Reusable error display component | Inline errors appear as ad-hoc `Text` components with hardcoded `COLORS.destructive`. No shared component, no consistent spacing. | LOW | `InlineError` component: icon + text, `COLORS.destructive`, consistent padding. Used wherever form validation errors appear. |
| Pull-to-refresh standardization | Chat list has it. Plans and Home do not. Users expect PTR on any scrollable list — it is a table-stakes mobile interaction. | LOW | Add `onRefresh` + `refreshing` props to every `FlatList` view. Not a component, but a pattern to apply consistently. Pattern documented in ARCHITECTURE.md. |
| Consistent screen title treatment | Plans and Chat both use `fontSize: 24, fontWeight: '600'` with `paddingHorizontal: 16`. Home uses different padding. No shared component — just repeated values. | LOW | Either a `ScreenHeader` component or a `Typography.screenTitle` style object that every screen imports. The simpler option (style object) avoids prop-drilling layout concerns. |

### Differentiators (Worth Building for This App)

Features beyond basic tokens that make the app feel polished without over-engineering for a 3-15 person friend group.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Semantic color grouping | Going beyond `COLORS.accent` to `COLORS.interactive.primary`, `COLORS.text.secondary`, `COLORS.surface.card` makes future dark mode a token swap, not a rewrite. Not dark mode itself — just the structure that enables it. | LOW | Reorganize the existing `COLORS` object into semantic groups. No behavior change; purely a naming/structure improvement. |
| Shadow/elevation tokens | Campfire's dark-background design creates visual hierarchy primarily through `COLORS.secondary` (card) vs `COLORS.dominant` (background). Explicit shadow tokens (`shadowSm`, `shadowMd`) prevent ad-hoc shadow values proliferating across cards. | LOW | iOS shadow properties + Android `elevation`. 3-4 levels maximum: none, subtle, card, modal. Consistent cross-platform helper function. |
| Loading state standardization | `LoadingIndicator` exists but is called differently across screens (sometimes centered, sometimes in a list, sometimes overlaid). A consistent loading pattern prevents layout shift and user confusion. | LOW | `LoadingIndicator` already exists. Audit call sites and ensure consistent placement: full-screen centered for initial loads, inline for refreshes, none needed for optimistic updates. |
| Empty state standardization | `EmptyState` exists and has a solid API (icon, heading, body, optional CTA). Not all screens use it — some have ad-hoc inline empty state text. | LOW | Audit all list views. Replace ad-hoc empty messages with `EmptyState`. This is application work, not component work — the component is already built. |

### Anti-Features (Commonly Added, Wrong for This Project)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Dark mode toggle | Seems like a premium polish feature. Users expect it in modern apps. | Doubles the token count and requires testing every screen twice. The app already uses a dark theme (dominant: `#1a1a1a`). Adding a light mode means designing a new visual language for a shipped product. | The app IS the dark theme. Treat it as a deliberate design choice, not a missing feature. Semantic color grouping (above) positions the codebase for dark mode in v2 if needed without requiring it now. |
| Responsive breakpoints / tablet layout | Design systems for web often include breakpoint systems. | React Native does not use CSS breakpoints. `Dimensions.get('window')` exists but the app targets phones only. Tablet layout requires separate design decisions, not token additions. | None needed. FlatList `numColumns` handles grid variation when needed. Don't build a breakpoint system for a phone app. |
| Animation tokens (duration, easing values) | Design system articles often include motion tokens. Looks professional. | The existing app has zero custom animations. Reanimated is not installed. Adding animation tokens with no animations to apply them to is premature abstraction. | Defer entirely. If Reanimated is added in a later milestone, add motion tokens then. For now, `activeOpacity={0.8}` on touchables is sufficient micro-interaction. |
| Full theming system (Context/Provider) | Styled-components, NativeBase, and Tamagui all use theme providers. | This app uses StyleSheet directly — a theme provider forces a rewrite of every StyleSheet.create call. The benefit (token swapping) is not worth the cost at this scale and team size. | Token constants (COLORS, SPACING, TYPOGRAPHY, RADII) imported directly. No Provider needed. This is the correct approach for StyleSheet-only projects. |
| Storybook component documentation | Teams building large component libraries use Storybook for isolated component development. | Storybook for React Native requires Expo-specific config and adds significant build tooling overhead. For 5 shared components, the overhead exceeds the benefit. | Snapshot tests or screen-level integration tests. Visual reference: the existing Plans and Chat screens serve as the living style guide. |
| Design token JSON / `style-dictionary` | Token pipelines that generate tokens from a JSON source (W3C DTCG format, style-dictionary) are used by large design systems. | Massively over-engineered for a single developer with a single platform. Adds a build step for no practical benefit. | TypeScript constants. `as const` gives full type safety and IDE autocomplete — the same benefits without the tooling. |
| Iconography system / icon font | Apps like Shopify Polaris include a full icon library as part of the design system. | Expo includes `@expo/vector-icons` with Ionicons already used in `EmptyState`. Adding a custom icon system would conflict with this. | Continue using Ionicons for all icons. Document which icon names map to which semantic concepts (e.g., "add" = `add-circle`). No new library needed. |

---

## Feature Dependencies

```
Color tokens (COLORS)
  └──already exists──> All screens (import and use COLORS)
  └──enables──> Semantic grouping (reorganization, not replacement)
                  └──positions for──> Dark mode (v2, if needed)

Spacing scale (SPACING)
  └──requires──> None (pure constants)
  └──unblocks──> Consistent screen padding, section gaps, component margins

Typography scale (TYPOGRAPHY)
  └──requires──> None (pure constants)
  └──unblocks──> Consistent heading treatment, body text, labels

Border radius scale (RADII)
  └──requires──> None (pure constants)
  └──unblocks──> FAB component, FormInput component, card styles

Shadow tokens (SHADOWS)
  └──requires──> None (pure constants)
  └──enhances──> Card components, modals, FAB

FAB component
  └──requires──> COLORS, RADII (spacing optional)
  └──replaces──> Inline FAB code in Home, Plans screens

FormInput component
  └──requires──> COLORS, SPACING, TYPOGRAPHY, RADII
  └──replaces──> Duplicate TextInput styling in auth screens

InlineError component
  └──requires──> COLORS, SPACING, TYPOGRAPHY
  └──replaces──> Ad-hoc error Text components across forms

Pull-to-refresh pattern
  └──requires──> None (built-in RN, already on ChatListScreen)
  └──applies to──> Home, Plans list, Friends screens

Screen title treatment
  └──requires──> COLORS, TYPOGRAPHY
  └──unifies──> All 5 tabs + modal screens
```

### Dependency Notes

- **COLORS, SPACING, TYPOGRAPHY, RADII are independent.** All four can be defined in parallel. They are pure TypeScript constant files with no runtime dependencies.
- **Components depend on tokens.** FAB, FormInput, InlineError should be built after tokens are defined — otherwise they import raw values that need changing later.
- **Shadow tokens are cross-platform gotcha.** iOS uses `shadowColor/shadowOffset/shadowOpacity/shadowRadius`. Android uses `elevation`. A single helper object (or function) that exports the right keys per platform prevents duplication. Note: `elevation` on Android interacts badly with `borderRadius` in RN 0.77+ (GitHub issue #48874) — use backdrop surfaces instead of elevation for rounded cards.
- **Pull-to-refresh has no component.** It is a pattern: add `onRefresh` and `refreshing` props to every FlatList screen. The `refreshControl` prop on FlatList accepts a `RefreshControl` component from React Native core — no third-party library needed.

---

## MVP Definition

### This Milestone (v1.1)

The goal is: extract a design system from the best existing screens, apply it everywhere, build the missing shared components.

- [ ] Token file: `COLORS` (extend existing, add semantic grouping)
- [ ] Token file: `SPACING` (8pt grid scale: 4, 8, 12, 16, 24, 32, 48)
- [ ] Token file: `TYPOGRAPHY` (6-8 named role objects with fontSize + fontWeight + lineHeight)
- [ ] Token file: `RADII` (sm=8, md=12, lg=16, pill=28)
- [ ] Token file: `SHADOWS` (none, subtle, card, modal — iOS + Android)
- [ ] Component: `FAB` (floating action button, replaces inline implementations)
- [ ] Component: `FormInput` (labeled text input with error slot)
- [ ] Component: `InlineError` (destructive-colored error message with icon)
- [ ] Pattern: Pull-to-refresh on all list screens (Home, Plans, Friends)
- [ ] Pattern: Consistent screen title treatment across all 5 tabs
- [ ] Refactor: All screens updated to import from token files instead of raw values
- [ ] Refactor: All screens updated to use shared components where applicable

### Add After Validation (v1.x)

- [ ] `ScreenHeader` component — only if screen title treatment gets complex enough to justify (currently a style object is simpler)
- [ ] `SecondaryButton` / `GhostButton` variants — only when a second button style is needed in product
- [ ] `Toast` / `Snackbar` component — only when success/failure feedback pattern is needed beyond loading states

### Future Consideration (v2+)

- [ ] Dark mode (light theme) — positions for it via semantic grouping now, build when product warrants it
- [ ] Animation tokens + Reanimated — only if gesture-based interactions or complex transitions are added
- [ ] Motion/transition system — strictly v2+ after core is stable
- [ ] Tablet / iPad layout — only if analytics show tablet usage

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Color tokens (extend COLORS) | HIGH — unblocks all future theming | LOW — partial file exists | P1 |
| Spacing scale (SPACING) | HIGH — eliminates magic numbers everywhere | LOW — pure constants | P1 |
| Typography scale (TYPOGRAPHY) | HIGH — 56 fontSize usages across codebase | LOW — pure constants | P1 |
| Border radius scale (RADII) | MEDIUM — 29 usages, 8-9 distinct values | LOW — pure constants | P1 |
| Shadow tokens (SHADOWS) | MEDIUM — visual hierarchy, cross-platform trap | LOW-MEDIUM — platform helper needed | P1 |
| FAB component | HIGH — replaces inline duplicates in 2+ screens | LOW — simple component | P1 |
| FormInput component | HIGH — replaces duplicate auth input styling | MEDIUM — error/focus states | P1 |
| InlineError component | MEDIUM — DRY up error display | LOW — simple component | P1 |
| Pull-to-refresh (all lists) | HIGH — table-stakes mobile pattern | LOW — pattern, not component | P1 |
| Screen title treatment | MEDIUM — visual consistency across tabs | LOW — style object or tiny component | P1 |
| Refactor all screens to use tokens | HIGH — without this, tokens have no effect | MEDIUM — mechanical, error-prone | P1 |
| Refactor auth screens to FormInput | MEDIUM — DRY, but auth already works | MEDIUM — touch existing working code | P2 |

**Priority key:**
- P1: Required for the milestone to achieve its goal
- P2: Improves the system but milestone succeeds without it
- P3: Nice to have, future consideration

---

## Sources

- [React Native StyleSheet official docs](https://reactnative.dev/docs/stylesheet)
- [React Native Appearance / useColorScheme](https://reactnative.dev/docs/appearance)
- [Expo Color Themes documentation](https://docs.expo.dev/develop/user-interface/color-themes/)
- [React Native elevation + borderRadius bug RN 0.77 — GitHub #48874](https://github.com/facebook/react-native/issues/48874)
- [The 8pt Grid: Consistent Spacing in UI Design — Prototypr](https://blog.prototypr.io/the-8pt-grid-consistent-spacing-in-ui-design-with-sketch-577e4f0fd520)
- [Anti-patterns to avoid when building a component library in React Native — Level Up Coding](https://levelup.gitconnected.com/anti-patterns-to-avoid-when-building-a-component-library-in-react-native-61f11d8c9797)
- [React Native Styling Best Practices 2025 — RN Example](https://reactnativeexample.com/react-native-styling-best-practices-2025-expert-guide/)
- [How I set up a Design System for React Native Projects — DEV Community](https://dev.to/msaadullah/how-i-set-up-design-system-for-my-react-native-projects-for-10x-faster-development-1k8g)
- Direct codebase audit: `src/constants/colors.ts`, `src/components/common/`, `src/screens/` (all files)

---
*Feature research for: React Native design system (Campfire v1.1)*
*Researched: 2026-03-24*
