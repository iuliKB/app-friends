# Phase 19: Theme Migration - Research

**Researched:** 2026-04-28
**Domain:** React Native theme migration — replacing static COLORS import with dynamic useTheme() hook across 100 source files
**Confidence:** HIGH

## Summary

Phase 19 is a mechanical refactor: every file that currently does `import { COLORS } from '@/theme'` must switch to `import { useTheme } from '@/theme'` and call `const { colors } = useTheme()` inside the component body. The pattern is already established in Phase 18 — `ThemeProvider` wraps the app tree in `src/app/_layout.tsx`, `useTheme()` is live, and the DARK/LIGHT palettes are tested. 100 non-theme source files still import the static `COLORS` symbol.

The three-wave structure from CONTEXT.md maps cleanly to the actual file counts: Plan A has 30 shared/auth/status/friends/notifications components, Plan B has 39 feature components, Plan C has 31 app routes and screens plus compat shim removal. The compat shim removal at end of Plan C is the correctness gate — any missed file causes a TypeScript compile error.

One special case requires attention: `src/app/_layout.tsx` uses `COLORS` in the splash screen early-return (lines 301–308) and on the `GestureHandlerRootView` wrapping element (line 312), both of which render **outside** the `ThemeProvider` tree. These usages must remain static (`COLORS` or direct string literals) — they cannot use `useTheme()`. The splash-specific tokens (`COLORS.splash.*`) are identical in both palettes, making static retention safe. The `GestureHandlerRootView` background can use `COLORS.surface.base` statically or a hardcoded value.

**Primary recommendation:** Follow the D-02 pattern strictly: move every `StyleSheet.create` that references `COLORS` into a `useMemo([colors])` inside the component body; replace all inline JSX `color={COLORS.x}` references with `color={colors.x}`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Three-plan bottom-up wave structure: Plan A (shared+auth ~30 files), Plan B (feature components ~39 files), Plan C (screens + compat shim removal ~31 files).
- **D-02:** `StyleSheet.create` must be called **inside the component body** wrapped in `useMemo([colors])`. Module-level `StyleSheet.create` calls that reference `COLORS` must be moved inside the function. Non-color StyleSheet entries can stay in the memo or be split to a static constant.
- **D-03:** After each plan: `tsc --noEmit` must pass with zero errors. Then a quick manual scroll through all five tabs in **light mode** and **dark mode** in Expo Go. No Playwright required per wave.
- **D-04:** THEME-01 is satisfied when tapping Light / Dark / System in Profile instantly flips every screen and persists across an app restart. No visual confirmation animation required. Compat shim removal in Plan C is the final gate.
- **D-05:** No files are flagged for special treatment. The `useMemo([colors])` pattern is applied uniformly. The planner may add notes for files that use `COLORS` in conditional or computed expressions, but no separate handling strategy is needed.
- **D-06:** The compat shim (`export { COLORS } from './colors'` line in `src/theme/index.ts`) is removed in Plan C after all files have been migrated.

### Claude's Discretion

- Exact grouping of files within each wave (planner decides the precise list per plan)
- Whether to split non-color StyleSheet entries into a static constant vs keeping everything in `useMemo`
- Order of files within each plan (planner can sequence for minimal diff size)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THEME-04 | All existing screens render correctly in both light and dark modes | Achieved by replacing COLORS with useTheme().colors throughout all 100 files; verified when tsc --noEmit passes and manual smoke test shows light backgrounds in light mode |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Theme context provision | Frontend (React Context) | — | ThemeProvider already wraps entire app tree in _layout.tsx |
| Color resolution per component | Component (hook call) | — | Each component calls useTheme() and receives resolved palette |
| Theme persistence | AsyncStorage layer | — | Already implemented in ThemeContext.tsx (Phase 18) |
| Splash screen static colors | Static (module scope) | — | Renders before ThemeProvider mounts; must remain static |
| Tab bar / navigation chrome | Component (hook call) | — | CustomTabBar is a React component; can use useTheme() |
| Compat shim removal gate | TypeScript compiler | — | tsc --noEmit surfaces any missed migration as compile error |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native StyleSheet | (bundled) | Style definitions | Platform-native, required for RN styling |
| React useMemo | (bundled) | Memoize per-render stylesheets | Prevents StyleSheet recreation on every render |
| useTheme() | internal (`src/theme/ThemeContext.tsx`) | Resolve current palette | Established in Phase 18; wraps React Context |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript tsc --noEmit | 5.9.3 (project) | Validate zero COLORS references remain | Run after each plan as correctness gate |

**No new package installations required for this phase.** All tooling is already in the project.

## Architecture Patterns

### System Architecture Diagram

```
Component renders
      │
      ▼
useTheme()  ──────────────────►  ThemeContext
      │                          (colors = DARK | LIGHT based on AsyncStorage pref)
      │ returns { colors }
      ▼
useMemo([colors], () =>
  StyleSheet.create({           ◄─── module-level static StyleSheet REMOVED
    container: {                     (moved inside component body)
      backgroundColor: colors.surface.base,
      ...
    }
  })
)
      │
      ▼
JSX: color={colors.text.primary}   ◄─── inline COLORS.x references updated
     <ActivityIndicator color={colors.interactive.accent} />
```

**Special path — splash / outside ThemeProvider:**
```
_layout.tsx early-return (splash)
      │
      └──► COLORS.splash.* used directly (static — safe, same values in both palettes)
           GestureHandlerRootView background — static COLORS.surface.base or literal
```

### Recommended Project Structure

No structural changes. Files stay in their current locations. The migration is in-place changes only.

### Pattern 1: Standard Component Migration

**What:** Replace module-level `StyleSheet.create` + static `COLORS` with `useMemo` inside component.

**When to use:** Every component that calls `StyleSheet.create` with any `COLORS.*` reference.

**Example:**
```typescript
// Source: src/app/(tabs)/profile.tsx (Phase 18-03 reference migration)

// BEFORE:
import { COLORS, SPACING } from '@/theme';
const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface.base },
  title: { color: COLORS.text.primary },
});

// AFTER:
import { useTheme, SPACING } from '@/theme';

export function MyComponent() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { backgroundColor: colors.surface.base },
    title: { color: colors.text.primary },
  }), [colors]);
  // ...
}
```

### Pattern 2: Non-Color Static StyleSheet Split (Claude's Discretion)

**What:** Keep layout/spacing/typography entries in a static module-level constant, move only color entries into `useMemo`.

**When to use:** Files with large StyleSheets where most entries are non-color. Not required — keeping everything in `useMemo` is equally valid.

**Example:**
```typescript
// Static (layout only — never changes with theme)
const staticStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: SPACING.lg },
  flex1: { flex: 1 },
});

// Dynamic (color-dependent)
const useStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  useMemo(() => StyleSheet.create({
    container: { backgroundColor: colors.surface.base },
  }), [colors]);
```

### Pattern 3: Inline JSX Color Props

**What:** `COLORS.x` used directly in JSX props (not StyleSheet) — e.g., `<Ionicons color={COLORS.text.secondary} />`, `<Switch thumbColor={COLORS.interactive.accent} />`.

**When to use:** Any file that passes `COLORS.*` directly to a component prop in JSX.

**Example:**
```typescript
// BEFORE:
<Ionicons color={COLORS.text.secondary} />
<Switch
  trackColor={{ false: COLORS.border, true: COLORS.interactive.accent + '40' }}
  thumbColor={enabled ? COLORS.interactive.accent : COLORS.border}
/>

// AFTER (colors from useTheme):
<Ionicons color={colors.text.secondary} />
<Switch
  trackColor={{ false: colors.border, true: colors.interactive.accent + '40' }}
  thumbColor={enabled ? colors.interactive.accent : colors.border}
/>
```

### Pattern 4: Default Prop Values with COLORS (Special Case)

**What:** `COLORS` used as a default parameter value in a function signature — cannot be replaced with `useTheme()` because hooks cannot be called in parameter defaults.

**File:** `src/components/common/LoadingIndicator.tsx` — `color = COLORS.text.secondary`.

**Resolution:** Remove the default from the signature and move it inside the function body, or change the call signature.

**Example:**
```typescript
// BEFORE:
export function LoadingIndicator({
  color = COLORS.text.secondary,
  size = 'large',
  style,
}: LoadingIndicatorProps) { ... }

// AFTER:
export function LoadingIndicator({
  color,
  size = 'large',
  style,
}: LoadingIndicatorProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.text.secondary;
  return <ActivityIndicator color={resolvedColor} size={size} />;
}
```

### Pattern 5: _layout.tsx Splash Early-Return (Special Case — Do NOT use useTheme())

**What:** `src/app/_layout.tsx` renders a splash `<LinearGradient>` before `ready && fontsLoaded`. This render path executes before `ThemeProvider` is mounted — calling `useTheme()` here would throw "useTheme must be used inside ThemeProvider".

**Decision:** The COLORS usages in the splash early-return (lines 301–308) and `GestureHandlerRootView` background (line 312) must remain static. The splash tokens (`COLORS.splash.*`) are identical in both palettes. The COLORS import in `_layout.tsx` is retained for these specific usages even after Plan C removes the compat shim — the import changes from `COLORS` (compat) to `DARK as COLORS` or to a direct import from `./colors`. **However**, the compat shim removal means the import `{ COLORS } from '@/theme'` will fail. Resolution: change that one import to `import { COLORS as DARK } from '@/theme'` and use `DARK` for the splash renders, OR inline the splash color literals directly.

**Confirmed safe hardcoded values for splash:**
- `COLORS.splash.gradientStart` = `'#B9FF3B'` (same in both palettes)
- `COLORS.splash.gradientEnd` = `'#8DFF2F'` (same in both palettes)
- `COLORS.splash.text` = `'#0E0F11'` (same in both palettes)
- `COLORS.surface.base` = `'#0E0F11'` (DARK value — acceptable for splash/root background)

**Example resolution for _layout.tsx:**
```typescript
// Import DARK directly (bypasses compat shim):
import { DARK, SPACING, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, ThemeProvider } from '@/theme';

// In the splash early-return: use DARK instead of COLORS
<LinearGradient colors={[DARK.splash.gradientStart, DARK.splash.gradientEnd]} ...>
<GestureHandlerRootView style={{ flex: 1, backgroundColor: DARK.surface.base }}>
```

### Anti-Patterns to Avoid

- **Module-level StyleSheet with COLORS after migration:** Any `const styles = StyleSheet.create({ ..COLORS... })` at module scope will be frozen to the initial (dark) palette and will not update when theme changes.
- **Calling useTheme() outside a React component:** Calling it in a module-scope initializer, default parameter value, or utility function that isn't a hook will fail. Move the call inside the component body.
- **Forgetting inline JSX props:** grep for `COLORS\.` not just `StyleSheet.create` — many files pass `COLORS.x` directly to `color={}` props on icons, ActivityIndicators, Switches, etc.
- **Leaving COLORS import after migration:** Even if COLORS is unused in StyleSheet, stale `import { COLORS }` lines will cause TS errors after compat shim removal in Plan C.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting missed migrations | Manual audit | `tsc --noEmit` after shim removal | TypeScript will error on any `COLORS` import once shim is gone |
| Theme-aware color selection | Custom resolver function | `useTheme().colors` | Already returns the correct palette; no logic needed |
| useMemo dependency tracking | Manual invalidation | `useMemo([colors])` | React ensures styles regenerate when palette changes |

## Runtime State Inventory

> This is a code refactor phase — no runtime state is affected.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — no database records store color values | None |
| Live service config | None — no external service references COLORS | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — Expo/Metro bundler rebuilds on source change | None |

## Common Pitfalls

### Pitfall 1: Stale Inline JSX Color Props
**What goes wrong:** Developer migrates `StyleSheet.create` correctly but leaves `color={COLORS.x}` props on `<Ionicons>`, `<ActivityIndicator>`, `<Switch>` etc. unchanged. Theme toggles but icons stay the wrong color.
**Why it happens:** grep for StyleSheet catches the obvious cases; inline props require a separate pass.
**How to avoid:** After changing each file, grep for remaining `COLORS\.` occurrences before moving on.
**Warning signs:** tsc --noEmit passes (import removed) but runtime colors don't update.

### Pitfall 2: _layout.tsx ThemeProvider Boundary
**What goes wrong:** Developer replaces `COLORS` with `useTheme()` in the splash early-return path. App crashes with "useTheme must be used inside ThemeProvider" on cold start.
**Why it happens:** The splash renders before `ThemeProvider` is mounted.
**How to avoid:** Keep the `DARK` (or literal value) import for the splash section and `GestureHandlerRootView`. Only the inner content under `<ThemeProvider>` can call `useTheme()`.
**Warning signs:** Crash log shows "useTheme must be used inside ThemeProvider" during app boot.

### Pitfall 3: COLORS Used as Default Prop Value
**What goes wrong:** `LoadingIndicator.tsx` has `color = COLORS.text.secondary` as a default parameter. After removing the COLORS import, TypeScript errors.
**Why it happens:** Default parameter values are evaluated at function definition, not inside the component body — hooks cannot be called there.
**How to avoid:** Pattern 4 above: move the default resolution inside the function body using `useTheme()`.
**Warning signs:** TypeScript error on the parameter default line.

### Pitfall 4: Missing useMemo Import
**What goes wrong:** After wrapping StyleSheet.create in useMemo, TypeScript errors because `useMemo` isn't imported.
**Why it happens:** Easy to forget when the file didn't previously use useMemo.
**How to avoid:** Add `useMemo` to the React import at the same time as adding `useTheme`. Confirm via tsc check.

### Pitfall 5: Plan C tsc Surfacing Plan A/B Misses
**What goes wrong:** Removing the compat shim in Plan C causes tsc to error on files that weren't fully migrated in Plans A or B.
**Why it happens:** Plan A or B file had COLORS removed from StyleSheet but still has it in an inline JSX prop, or vice versa.
**How to avoid:** Per-file check after each migration: grep the file for `COLORS\.` before staging the commit. Treat the tsc gate at end of each plan as the final catch, not the first.

### Pitfall 6: ThemeSegmentedControl — Static StyleSheet is Intentional
**What goes wrong:** Developer migrates `ThemeSegmentedControl.tsx`'s module-level `StyleSheet.create` to use `useMemo`, but the active segment color is hardcoded (`'#B9FF3B'`) per D-07 — not `colors.interactive.accent`.
**Why it happens:** The component uses COLORS for non-active segment colors (text.secondary, surface.card) that do need migration, but the active color is a deliberate hardcode.
**How to avoid:** Note from STATE.md: "ThemeSegmentedControl active colors (#B9FF3B / #0E0F11) hardcoded per D-07 — same values in both palettes; no migration needed in Phase 19." Migrate the `COLORS.surface.card` and `COLORS.text.secondary` references to `colors.*` but leave the `'#B9FF3B'` and `'#0E0F11'` literals untouched.

## Code Examples

### Minimal Migration — ScreenHeader.tsx
```typescript
// Source: src/components/common/ScreenHeader.tsx (before)
import { COLORS, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';

export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  return (...);
}

const styles = StyleSheet.create({
  title: { fontSize: FONT_SIZE.xxl, color: COLORS.text.primary },
  subtitle: { color: COLORS.text.secondary },
});

// AFTER:
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { useMemo } from 'react';

export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    title: { fontSize: FONT_SIZE.xxl, color: colors.text.primary },
    subtitle: { color: colors.text.secondary },
    // ...non-color entries can stay here or be split to a static constant
  }), [colors]);
  return (...);
}
```

### Mixed Static + Dynamic Split Example
```typescript
// Static entries extracted to module scope (never theme-dependent)
const staticStyles = StyleSheet.create({
  container: { flexDirection: 'row', padding: SPACING.lg },
  flex1: { flex: 1 },
});

// Dynamic styles inside component
export function MyComponent() {
  const { colors } = useTheme();
  const themedStyles = useMemo(() => StyleSheet.create({
    text: { color: colors.text.primary },
    card: { backgroundColor: colors.surface.card, borderColor: colors.border },
  }), [colors]);
  // Use both: style={[staticStyles.container, themedStyles.card]}
}
```

## File Inventory

### Plan A: Shared + Auth Components (30 files)

**src/components/common/** (15 files):
- AvatarCircle.tsx, BirthdayPicker.tsx, CustomTabBar.tsx, EmptyState.tsx, ErrorDisplay.tsx,
  FAB.tsx, FormField.tsx, LoadingIndicator.tsx (default-prop special case), OfflineBanner.tsx,
  PrimaryButton.tsx, ScreenHeader.tsx, SectionHeader.tsx, ThemeSegmentedControl.tsx
  (active-color literal special case)

**src/components/status/** (6 files):
- EmojiTagPicker.tsx, MoodPicker.tsx, OwnStatusCard.tsx, OwnStatusPill.tsx,
  SegmentedControl.tsx, StatusPickerSheet.tsx

**src/components/friends/** (7 files):
- FriendActionSheet.tsx, FriendCard.tsx, QRCodeDisplay.tsx, QRScanView.tsx,
  RequestCard.tsx, SearchResultCard.tsx, StatusPill.tsx

**src/components/auth/** (3 files):
- AuthTabSwitcher.tsx, OAuthButton.tsx, UsernameField.tsx

**src/components/notifications/** (1 file):
- PrePromptModal.tsx

### Plan B: Feature Components (39 files)

**src/components/chat/** (10 files):
- BirthdayWishListPanel.tsx, ChatListRow.tsx, GroupParticipantsSheet.tsx,
  ImageViewerModal.tsx, MessageBubble.tsx, PinnedPlanBanner.tsx, PollCard.tsx,
  PollCreationSheet.tsx, ReactionsSheet.tsx, SendBar.tsx

**src/components/home/** (12 files):
- CardStackView.tsx, EventCard.tsx, FriendSwipeCard.tsx, HomeFriendCard.tsx,
  HomeWidgetBanners.tsx, HomeWidgetRow.tsx, OverflowChip.tsx, RadarBubble.tsx,
  RadarView.tsx, RadarViewToggle.tsx, ReEngagementBanner.tsx, UpcomingEventsSection.tsx

**src/components/iou/** (6 files):
- BalanceRow.tsx, ExpenseHeroCard.tsx, ExpenseHistoryRow.tsx, ParticipantRow.tsx,
  RemainingIndicator.tsx, SplitModeControl.tsx

**src/components/plans/** (6 files):
- AvatarStack.tsx, IOUNotesField.tsx, LinkDumpField.tsx, MemberList.tsx, PlanCard.tsx, RSVPButtons.tsx

**src/components/squad/** (5 files):
- BirthdayCard.tsx, CompactFriendRow.tsx, IOUCard.tsx, StreakCard.tsx, WishListItem.tsx

### Plan C: App Routes + Screens + Compat Shim Removal (31 files)

**src/app/** (20 files):
- _layout.tsx (splash + GestureHandlerRootView special case — retain DARK import),
  (tabs)/_layout.tsx, (tabs)/chat/_layout.tsx, (tabs)/profile.tsx, (tabs)/squad.tsx,
  friends/_layout.tsx, friends/[id].tsx, friends/index.tsx, plans/_layout.tsx,
  profile/_layout.tsx, profile/edit.tsx, profile/wish-list.tsx, qr-code.tsx,
  squad/_layout.tsx, squad/birthday/[id].tsx, squad/birthdays.tsx,
  squad/expenses/[id].tsx, squad/expenses/create.tsx, squad/expenses/friend/[id].tsx,
  squad/expenses/index.tsx

**src/screens/** (11 files):
- auth/AuthScreen.tsx, auth/ProfileSetup.tsx, chat/ChatListScreen.tsx,
  chat/ChatRoomScreen.tsx, friends/AddFriend.tsx, friends/FriendRequests.tsx,
  friends/FriendsList.tsx, home/HomeScreen.tsx, plans/PlanCreateModal.tsx,
  plans/PlanDashboardScreen.tsx, plans/PlansListScreen.tsx

**Compat shim removal:** `src/theme/index.ts` — remove line 1 (`export { COLORS } from './colors'`)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { COLORS } from '@/theme'` at module scope | `const { colors } = useTheme()` inside component body | Phase 18 (ThemeProvider built) | All colors become reactive to theme toggle |
| `StyleSheet.create({...})` at module level | `useMemo(() => StyleSheet.create({...}), [colors])` inside component | Phase 18 (D-02 established) | Styles regenerate on palette switch |
| Single static DARK palette | `typeof DARK \| typeof LIGHT` union via ThemeContext | Phase 18 | Type-safe light/dark palette switching |

## Environment Availability

> Step 2.6: No new external dependencies — phase is code-only refactor.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| TypeScript (tsc) | Correctness gate per D-03 | node_modules/.bin/tsc | 5.9.3 | — |
| Expo Go | Manual smoke test per D-03 | Device-level (not verified by research) | — | Simulator |

**Note on tsc invocation:** The global `npx tsc` path has a NODE_OPTIONS conflict in this environment. Use `node_modules/.bin/tsc --noEmit` or `./node_modules/.bin/tsc --noEmit` from the project root.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | TypeScript compiler (tsc --noEmit) + manual Expo Go smoke test |
| Config file | tsconfig.json (existing) |
| Quick run command | `./node_modules/.bin/tsc --noEmit` |
| Full suite command | `./node_modules/.bin/tsc --noEmit` (same — no unit tests for visual correctness) |

Unit tests (`npx tsx tests/unit/*.test.ts`) exist for utility functions; none cover theme/styling. Playwright visual tests exist but require a running dev server and are for visual regression — not used per D-03.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THEME-04 | All screens render in both light and dark modes | Manual smoke | Expo Go — all 5 tabs in both modes | N/A |
| THEME-04 (completeness gate) | No file imports bare COLORS symbol | Compile check | `./node_modules/.bin/tsc --noEmit` (after Plan C shim removal) | ✅ tsconfig.json |

### Sampling Rate
- **Per plan commit:** `./node_modules/.bin/tsc --noEmit` (zero errors required)
- **Per plan completion:** Manual scroll through all five tabs in light mode and dark mode in Expo Go
- **Phase gate:** Full tsc clean + manual smoke before `/gsd-verify-work`

### Wave 0 Gaps
- None — tsc infrastructure exists; no new test files needed for this refactor phase.

## Security Domain

> This is a pure client-side styling refactor. No authentication, session management, access control, input validation, cryptography, or network endpoints are introduced or modified. ASVS categories do not apply.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | splash.* token values are identical in DARK and LIGHT palettes | Pattern 5 | Splash renders wrong colors — low risk, both palettes confirmed identical in light-colors.ts |
| A2 | `node_modules/.bin/tsc --noEmit` is the correct tsc invocation path for this project | Validation Architecture | Implementor must verify path before using in tasks |

## Open Questions

1. **_layout.tsx compat shim removal approach**
   - What we know: After shim removal, `import { COLORS } from '@/theme'` will fail. The file has 5 COLORS usages that must remain static (splash early-return + GestureHandlerRootView).
   - What's unclear: Whether the planner prefers (a) importing `DARK` directly from `@/theme` for those usages, or (b) inlining the 3–4 literal color strings.
   - Recommendation: Import `DARK` from `@/theme` — more readable, self-documenting intent. `export { COLORS as DARK }` remains in theme/index.ts after shim removal.

## Sources

### Primary (HIGH confidence)
- `src/theme/ThemeContext.tsx` — verified: useTheme() return shape, ThemeProvider tree position
- `src/theme/colors.ts` — verified: DARK palette structure and splash token values
- `src/theme/light-colors.ts` — verified: LIGHT palette structure and splash token values (identical to DARK)
- `src/theme/index.ts` — verified: compat shim location (line 1), existing named exports
- `src/app/_layout.tsx` — verified: ThemeProvider position (line 313), splash early-return path, COLORS usages outside ThemeProvider boundary
- `src/app/(tabs)/profile.tsx` — verified: canonical migrated screen reference (CONTEXT.md D-canonical), actual COLORS usage pattern
- `src/components/common/ThemeSegmentedControl.tsx` — verified: hardcoded active colors per D-07 (STATE.md note confirmed)
- `src/components/common/LoadingIndicator.tsx` — verified: COLORS as default prop value (special case)
- `grep -rl "import.*COLORS" src/` — verified: 100 non-theme files require migration (CONTEXT.md said 101 including ThemeContext.tsx itself which imports COLORS as DARK internally)
- `.planning/config.json` — verified: nyquist_validation=true, commit_docs=true

### Secondary (MEDIUM confidence)
- State.md accumulated decisions — confirmed Phase 18 decisions that constrain Phase 19
- REQUIREMENTS.md — confirmed THEME-04 is the sole requirement for Phase 19

## Metadata

**Confidence breakdown:**
- File inventory: HIGH — derived from live grep of project source
- Migration patterns: HIGH — verified against actual file content and Phase 18 reference
- Special cases (_layout.tsx, LoadingIndicator, ThemeSegmentedControl): HIGH — verified by reading file content
- tsc gate mechanics: HIGH — TypeScript 5.9.3 confirmed in node_modules

**Research date:** 2026-04-28
**Valid until:** Stable — purely structural refactor with no external dependencies
