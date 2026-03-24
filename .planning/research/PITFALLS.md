# Pitfalls Research

**Domain:** Adding a design system to an existing React Native + Expo app (v1.1 milestone)
**Researched:** 2026-03-24
**Confidence:** HIGH — grounded in direct codebase audit of 221 files + verified patterns from Shopify engineering, React Native styling guides, and design token literature

---

## Critical Pitfalls

### Pitfall 1: Half-Migration State — Old and New Styles Coexist Indefinitely

**What goes wrong:**
The refactor starts strong: tokens are defined, a few screens are updated, but not all. The codebase now has two parallel styling systems — some components use `COLORS.accent` and new spacing tokens, others still have hardcoded `'#f97316'` and raw `16` values. Over time, new features are added using whichever style the developer finds first. The design system has been introduced but never actually won, and the inconsistency problem is worse than before because there are now two valid-looking sources of truth.

**Why it happens:**
The team treats the token extraction as the finish line, not the migration. "We have a design system" becomes true before "all screens use the design system" is true. Interruptions, scope creep, or simply running out of attention cause the migration to stall mid-way.

**How to avoid:**
- Define migration completion as "zero raw color literals and zero raw spacing values outside the token file," not "token file exists."
- Run a lint rule or CI grep that fails if any `.tsx` file contains hardcoded hex values (e.g., `/['"]#[0-9a-fA-F]{3,8}['"]/`). This turns completion into a binary state — the lint either passes or fails.
- Migrate one logical domain at a time (screens by feature area), mark each done, and do not move to new features until migration is complete.

**Warning signs:**
- New components appear that use raw values even after tokens are defined.
- StyleSheet files contain both `COLORS.accent` and `'#f97316'` in adjacent lines.
- This app already has 8 files with hardcoded hex values alongside 52 files that import COLORS — this is the current state entering v1.1.

**Phase to address:** Token extraction phase AND the screen migration phase. The lint rule goes in at token extraction time so it catches regressions immediately.

---

### Pitfall 2: Token Over-Engineering — Naming Every Primitive Instead of Semantic Intent

**What goes wrong:**
Developers introduce multi-level token hierarchies: primitive tokens (`color-orange-500`), semantic tokens (`color-action-primary`), component tokens (`fab-background-color`). For an app with a single dark theme and ~15 brand colors, this tripling of token count adds maintenance surface with no practical benefit. The team spends two days on token taxonomy instead of migrating screens.

**Why it happens:**
Design token literature (especially W3C Design Tokens spec and large-scale design system case studies) describes three-tier hierarchies as best practice for multi-brand, multi-theme products. That advice does not apply to a single-theme mobile app with one team and one designer.

**How to avoid:**
- Keep the token structure flat and semantic: `COLORS.accent`, `SPACING.screenPadding`, `TYPOGRAPHY.body`. One level. No primitive alias layer.
- The existing `COLORS` constant in `src/constants/colors.ts` is already well-structured and close to correct. Extend it rather than rebuild it.
- Add `SPACING` and `TYPOGRAPHY` token files alongside `COLORS`. That is the entire system. Do not add more layers unless a concrete problem (e.g., dark mode, white-label) demands it.
- Token count should be proportional to the number of distinct visual decisions in the app — not to design system theory.

**Warning signs:**
- The token naming discussion takes longer than the first screen migration.
- Tokens like `color-primary-interactive-default-light` appear in a dark-mode-only app.
- More than one layer of indirection: a component style imports a semantic token that imports a primitive token.

**Phase to address:** Token extraction phase. Decide the token structure before writing a single file — but keep the decision simple and time-boxed to one session.

---

### Pitfall 3: FAB Consolidation Breaks Screen-Specific Behavior Silently

**What goes wrong:**
Three FAB implementations exist (HomeScreen, PlansListScreen, FriendsList). They look visually similar but have different structures: HomeScreen FAB has an icon + label in a row (`flexDirection: 'row'`), PlansListScreen FAB has centered content only, FriendsList FAB is a fixed 56×56 icon circle. A shared `<FAB>` component is created using the most common variant, and the other two screens are refactored to use it. One variant silently loses its label, another has wrong hit targets. The visual regression is subtle and only noticed weeks later.

**Why it happens:**
The refactoring developer assumes the three FABs are interchangeable because they look similar. The structural differences are in StyleSheet properties, not in JSX structure, making them easy to miss on a quick read.

**How to avoid:**
- Before building the shared component, document all three existing FAB variants and their structural differences side-by-side.
- Design the shared `<FAB>` to support all observed variants via props (`variant: 'icon-only' | 'icon-label'`, `label?: string`) — don't simplify by dropping variants.
- After replacing each usage, do a side-by-side visual comparison: screenshot before and after on both iOS and Android.
- The shared component's props interface must be narrow enough to be testable — no `style` prop override that defeats the purpose of consolidation.

**Warning signs:**
- The shared FAB component has only one usage pattern tested at integration time.
- `bottom` offset calculation using `useSafeAreaInsets()` is dropped or hardcoded in the shared component.
- The label disappears on one screen without a type error.

**Phase to address:** Component extraction phase (when shared components are built). Audit all three implementations before writing the shared one.

---

### Pitfall 4: Spacing Migration Creates Layout Regressions from Inconsistent Value Mapping

**What goes wrong:**
The app currently uses raw spacing values of 8, 12, 16, 24, 32 throughout. A `SPACING` token file is introduced: `xs: 4, sm: 8, md: 16, lg: 24, xl: 32`. The migration replaces `16` with `SPACING.md` everywhere. But `12` has no clean mapping (it sits between `sm` and `md`), so developers either skip it, map it to `md` (slightly wrong), or introduce `SPACING.sm2: 12` (token bloat). Either way, some components end up with slightly different spacing than before.

**Why it happens:**
The existing spacing values were not defined by a scale — they were whatever felt right to each developer at the time. A retrofit scale cannot perfectly match all existing values without either introducing exceptions or accepting minor changes.

**How to avoid:**
- Before defining the `SPACING` scale, audit all spacing values in use (this audit is already done: 8, 12, 16, 24, 32 are the primary values).
- Build the scale to cover all values currently in use: `SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }`. Do not omit 12.
- Accept that some names will feel awkward (`md` = 12 is odd) — consistent coverage matters more than naming elegance at this scale.
- Alternatively, use a simple numeric scale: `SPACING[4]`, `SPACING[8]`, `SPACING[12]`, `SPACING[16]`, `SPACING[24]`, `SPACING[32]` — removes naming debates entirely.
- Screen-padding (16) and section-gap (24) can also be named by role: `SPACING.screenPadding`, `SPACING.sectionGap` — these are the values accessed most often.

**Warning signs:**
- Value `12` appears as a raw number after the migration is "complete."
- The `SPACING` object does not contain all values currently used in the codebase.
- Developers introduce `12` inside components because "there's no token for this."

**Phase to address:** Token extraction phase. Finalize the spacing scale by auditing all existing values first.

---

### Pitfall 5: Screen Refactor Causes JS Runtime Error from Missing or Renamed Import

**What goes wrong:**
A screen imports `COLORS` from `@/constants/colors`. After the refactor, the design system moves to `@/theme` with `colors`, `spacing`, `typography` as named exports. The screen's import is updated in the PR, but six other components in the screen's dependency tree still import from `@/constants/colors`. TypeScript does not catch this if `@/constants/colors` still exists and re-exports. At runtime, a subtle difference (e.g., a renamed key) causes a crash only on a specific screen.

**Why it happens:**
Incremental migration means the old import path and the new one both exist during transition. Any consumer that is missed continues to import from the old path. Since both files exist, there is no import error — the bug only manifests as a behavior difference if the old and new files diverge.

**How to avoid:**
- Keep `@/constants/colors.ts` as the authoritative file — do not create a parallel `@/theme` directory that duplicates it. Extend the existing file with `SPACING` and `TYPOGRAPHY` constants added alongside `COLORS`.
- If a rename/reorganization is necessary, do it in a single commit that moves the file and updates all imports atomically. Use a codemod or `sed` across the entire `src/` directory.
- Run TypeScript compiler (`tsc --noEmit`) after every screen migration, not just at the end.

**Warning signs:**
- Two files exist that both export color-related constants.
- `@/constants/colors` and `@/theme/colors` both appear in `import` statements in the same codebase.
- TypeScript passes but the app crashes on a specific screen at runtime.

**Phase to address:** Token extraction phase. Decide the final import path before any screen migration begins and do not change it mid-migration.

---

### Pitfall 6: `#3b82f6` — An Undeclared Color Never Caught Without a Lint Rule

**What goes wrong:**
ChatListRow.tsx contains `backgroundColor: '#3b82f6'` — a blue that does not exist anywhere in `COLORS` and has no semantic meaning in the app. It is the only blue in the entire codebase and does not match the Campfire brand palette. Without an automated check, this color survives the entire v1.1 migration: the developer migrating that file sees it, does not know what it represents, and either leaves it or silently maps it to the closest available color, masking the original intent.

**Why it happens:**
Hardcoded colors accumulate without review. When a developer needs a specific color once, they reach for a hex literal rather than adding a token. The color has semantic meaning (maybe an "unread" indicator or a link) but that meaning is lost because it was never named.

**How to avoid:**
- Before migration, audit every hardcoded color literal and determine its semantic intent. Document: "ChatListRow `#3b82f6` = unread indicator blue, add as `COLORS.unread`."
- If a color has no clear semantic purpose, flag it for design review before the migration, not during.
- Add it to `COLORS` with a name before the screen migration touches that file.
- The lint rule (see Pitfall 1) catches any new occurrences going forward.

**Warning signs:**
- `#3b82f6` is the only blue in the codebase — it is clearly an anomaly that was never reviewed.
- A hardcoded color appears in exactly one file, suggesting it was added without design review.
- The `COLORS` constant has no `unread`, `info`, or `link` key despite those states being visible in the UI.

**Phase to address:** Pre-migration audit (before Phase 1 of the design system work). Document all hardcoded colors and their intent before touching any screen.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Leaving raw `shadowColor: '#000'` after migration | Avoids bikeshedding a shadow token | Shadow values become inconsistent as new components are added | Acceptable if explicitly excluded from the lint rule scope (shadow is not brand color) |
| Skipping token for one-off values (e.g., `fontSize: 13`) | Faster per-component | One-off values proliferate; typography scale diverges | Never — add the token or pick the nearest step |
| `style` override prop on shared components | Allows fast screen-level customization | Overrides bypass the design system and re-introduce inconsistency | Only for layout/positioning (margin, flex), never for color or typography |
| Leaving `StyleSheet.create` blocks in place alongside token usage | Gradual migration | Mixed usage is harder to read than either pure approach | Only during active migration sprint — must be cleaned up before the phase closes |
| Component-level `COLORS` import instead of through theme | Works today with single theme | Every component needs updating if theme becomes dynamic | Never for a app that may add dark mode or theming in v2 |
| Hardcoding `bottom: 24 + insets.bottom` directly in each FAB | Avoids shared component work | Three FABs drift independently again after any future change | Never — this is exactly what shared components prevent |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `useSafeAreaInsets` in shared FAB | Calling `useSafeAreaInsets()` inside a presentational component, requiring each consumer to also set up `SafeAreaProvider` | Accept `bottomInset` as a prop, or call the hook once in the screen and pass the result down |
| TypeScript strict + token objects | Accessing `SPACING['something']` that doesn't exist — fails only at runtime without index signature | Declare token objects `as const` so TypeScript narrows keys to the exact set |
| `StyleSheet.create` + token values | Calling `StyleSheet.create` at module load time with token values that are not yet available (e.g., if tokens are async-loaded or theme-dependent) | Keep tokens as plain `const` objects; do not make them dynamic or async for this app |
| Expo Go + no runtime style errors | Expo Go does not throw for undefined style values the same way a native build does | Always test on device after each screen migration, not only in Expo Go simulator |
| `as const` on `COLORS` | Prevents adding new keys without touching the file — necessary for TypeScript to narrow types correctly | Keep `as const`; add new colors explicitly rather than using string indexing |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Shared components with non-memoized style calculations | FlatList rows re-render on every parent state change after design system wraps them | Move StyleSheet.create outside the component; use `useMemo` for dynamic styles only | At any scale — noticeable immediately in chat list |
| Shared `EmptyState` component with `PrimaryButton` inside | Every list screen re-renders the button during scroll because EmptyState is not memoized | Wrap `EmptyState` in `React.memo` | Any screen with FlatList + empty state toggle |
| Token object created inside component render | New object reference on every render breaks `React.memo` equality | Always define style objects outside the function component | Immediate — defeats all memoization |
| Inline style in FlatList `renderItem` after design system wraps it | List items re-render on every keystroke in chat | Extract to `StyleSheet.create` at module level | Always visible in chat room |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Visual regression on safe area — FAB covers last list item | FAB occludes content; user cannot tap the last plan/friend | Ensure list has `contentContainerStyle={{ paddingBottom: FAB_HEIGHT + insets.bottom + 16 }}` on every refactored list screen |
| Screen title treatment changes during migration | Each screen looks slightly different before migration is complete | Migrate all screen titles in one pass, not incrementally across phases |
| Pull-to-refresh spinner color does not match brand after migration | Refresh indicator is default gray/blue, not Campfire orange | Set `tintColor={COLORS.accent}` on every `RefreshControl` during standardization pass |
| Typography scale changes knock content out of bounds | Text truncates or overflows on small screens (SE, 13 mini) | Test every screen on iPhone SE simulator after typography token migration |
| Loading indicators use different sizes/colors after component refactor | App feels inconsistent during loading states | Consolidate `LoadingIndicator` to use a single size and `COLORS.accent` tint; audit all usages |

---

## "Looks Done But Isn't" Checklist

- [ ] **Token file exists:** Tokens defined but not all screens import them — run the hex lint rule to confirm zero raw literals remain
- [ ] **FAB consolidated:** Shared `<FAB>` built but `useSafeAreaInsets` inset calculation verified on both iOS and Android, not just one platform
- [ ] **Screen migration complete:** All 46 StyleSheet-using files updated — verify with grep, not by memory
- [ ] **`#3b82f6` resolved:** The only undeclared color in the codebase is either added to `COLORS` with a name or removed — not left as-is
- [ ] **Typography tokens applied:** `fontSize` and `fontWeight` replaced by named tokens — verify no raw `fontSize:` values remain in `.tsx` files (except in token file itself)
- [ ] **Spacing applied:** Raw `16`, `24`, `32` replaced by tokens — verify no common spacing magic numbers remain in component files
- [ ] **Pull-to-refresh standardized:** Every FlatList screen has `RefreshControl` with `tintColor={COLORS.accent}` — not just the ones touched last
- [ ] **FlatList padding for FAB:** Every screen with a FAB has bottom padding on `contentContainerStyle` — checked visually, not assumed
- [ ] **Shared components not style-overridden everywhere:** No consumer is passing raw inline styles to shared components to work around the design system
- [ ] **TypeScript still passes:** `tsc --noEmit` passes after full migration with `"strict": true` and `"noUncheckedIndexedAccess": true`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Half-migration discovered at end of milestone | MEDIUM | Enable hex lint rule, run it, get a definitive list of remaining files, migrate in order |
| Token over-engineering already in place | LOW | Flatten the hierarchy — rename tokens and do a global find-replace; one commit |
| FAB regression discovered post-merge | LOW | Revert to screen-local FAB for the broken screen, fix shared component props, re-migrate |
| Spacing regression breaks layout | LOW | The old values (8, 12, 16, 24, 32) are documented — reverting to exact old values is straightforward |
| Import path fragmentation (`@/constants` vs `@/theme`) | MEDIUM | Pick one path, delete the other, fix all imports in a single automated commit |
| Undeclared color `#3b82f6` shipped without review | LOW | Add `COLORS.unread` or equivalent, replace the one occurrence, ship |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Half-migration state | Phase 1 (token extraction): add hex lint rule immediately | CI grep for `#[0-9a-fA-F]{3,8}` returns zero results |
| Token over-engineering | Phase 1: time-box token design to one session | Token file is under 60 lines and has one level of nesting |
| FAB consolidation breaks behavior | Phase 2 (shared components): audit all three implementations before building | Side-by-side screenshot comparison on iOS and Android for each screen |
| Spacing value gaps (12 unmapped) | Phase 1: audit existing values before defining scale | Every value found in the audit appears as a named token |
| Import path fragmentation | Phase 1: decide final path before any screen migration | `grep -r "from '@/theme'" src/` returns zero results (or vice versa — one path wins) |
| Undeclared `#3b82f6` | Pre-work audit before Phase 1 | Every hardcoded color has a documented semantic name before migration starts |
| FlatList padding for FAB | Phase 3 (screen migration): check each FAB screen | Visual test on smallest supported device (iPhone SE) |
| Pull-to-refresh color | Phase 3: included in screen migration checklist | Every screen with RefreshControl has `tintColor={COLORS.accent}` |
| Typography regressions on small screens | Phase 3: test pass on iPhone SE | No truncated headings or overflowing text on SE-sized viewport |
| StyleSheet performance regression | Phase 2 (shared components): memoization review | Chat list scrolls at 60fps after LoadingIndicator and EmptyState are wrapped in React.memo |

---

## Sources

- [Shopify: 5 Ways to Improve Your React Native Styling Workflow](https://shopify.engineering/5-ways-to-improve-your-react-native-styling-workflow)
- [Thoughtbot: Structure for Style Organization in React Native](https://thoughtbot.com/blog/structure-for-styling-in-react-native)
- [Naming Tokens in Design Systems — Nathan Curtis, EightShapes](https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676)
- [The Context Dilemma: Design Tokens and Components — Frontside](https://frontside.com/blog/2021-01-15-design-tokens-and-components/)
- [React Native Styling Best Practices 2025 — RN Example](https://reactnativeexample.com/react-native-styling-best-practices-2025-expert-guide/)
- [Strangler Fig Pattern for Safe Incremental Refactoring — GoCodeo](https://www.gocodeo.com/post/how-the-strangler-fig-pattern-enables-safe-and-gradual-refactoring)
- Direct codebase audit: 221 files, 9,322 LOC — March 2026

---
*Pitfalls research for: Adding a design system to Campfire (React Native + Expo, v1.1 milestone)*
*Researched: 2026-03-24*
