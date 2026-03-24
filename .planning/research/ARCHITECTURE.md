# Architecture Research

**Domain:** Design system integration — React Native StyleSheet-only codebase
**Researched:** 2026-03-24
**Confidence:** HIGH — based on direct inspection of the full 9,322 LOC, 221-file codebase

> This file supersedes the v1.0 architecture research. It focuses exclusively on how design tokens and shared components integrate with the existing React Native + StyleSheet codebase for the v1.1 milestone.

---

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                          Screens Layer                             │
│  src/screens/{domain}/ScreenName.tsx                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │  Home    │ │  Plans   │ │  Chat    │ │ Friends  │ │ Auth   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘  │
│       │             │            │             │            │       │
├───────┴─────────────┴────────────┴─────────────┴────────────┴──────┤
│                        Components Layer                             │
│  src/components/{domain}/                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  common/  (cross-domain shared UI)                           │  │
│  │  FAB  ScreenHeader  FormField  ErrorDisplay  EmptyState  ... │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │  plans/  │ │  chat/   │ │ friends/ │ │  home/   │  ...         │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│       │             │            │             │                    │
├───────┴─────────────┴────────────┴─────────────┴───────────────────┤
│                      Design Tokens Layer  ← NEW                     │
│  src/constants/                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐   │
│  │  colors.ts   │ │  spacing.ts  │ │      typography.ts        │   │
│  │  (EXISTING)  │ │  (NEW)       │ │      (NEW)                │   │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|---------------|---------------|
| `src/constants/colors.ts` | Brand color palette (17 tokens) | EXISTS — well-structured, used everywhere |
| `src/constants/spacing.ts` | Numeric spacing scale | MISSING — all spacing hardcoded in StyleSheets |
| `src/constants/typography.ts` | Font size + weight pairs | MISSING — all text styles hardcoded in StyleSheets |
| `src/components/common/PrimaryButton.tsx` | Primary CTA button | EXISTS — clean, uses COLORS |
| `src/components/common/EmptyState.tsx` | Empty list placeholder | EXISTS — minor hardcoded spacing to fix |
| `src/components/common/LoadingIndicator.tsx` | Full-screen loading spinner | EXISTS — clean |
| `src/components/common/AvatarCircle.tsx` | User avatar image/initials | EXISTS — clean |
| `src/components/common/OfflineBanner.tsx` | Network status banner | EXISTS — clean |
| `src/components/common/FAB.tsx` | Floating action button | MISSING — duplicated inline in HomeScreen + PlansListScreen |
| `src/components/common/ScreenHeader.tsx` | Consistent view title treatment | MISSING — each screen implements its own heading |
| `src/components/common/ErrorDisplay.tsx` | Inline error + retry | MISSING — each screen implements its own error text |
| `src/components/common/FormField.tsx` | Labeled text input with error | EXISTS at `auth/FormField.tsx` — needs relocation to `common/` |

---

## Recommended Project Structure

Only files that change for this milestone are annotated. All other directories remain as-is.

```
src/
├── constants/
│   ├── colors.ts         # MODIFY — add COLORS.unreadDot token (currently '#3b82f6' inline in ChatListRow)
│   ├── spacing.ts        # NEW — SPACING object with named scale
│   ├── typography.ts     # NEW — TEXT object with named text style pairs
│   └── config.ts         # no change
│
├── components/
│   ├── common/
│   │   ├── AvatarCircle.tsx      # no change
│   │   ├── EmptyState.tsx        # MODIFY — swap hardcoded spacing for SPACING tokens
│   │   ├── LoadingIndicator.tsx  # no change
│   │   ├── OfflineBanner.tsx     # no change
│   │   ├── PrimaryButton.tsx     # no change
│   │   ├── FAB.tsx               # NEW — extracted from HomeScreen + PlansListScreen
│   │   ├── FormField.tsx         # MOVE from auth/FormField.tsx (same code, new path)
│   │   ├── ScreenHeader.tsx      # NEW — standard screen title with optional right slot
│   │   └── ErrorDisplay.tsx      # NEW — error text + optional retry handler
│   │
│   ├── auth/
│   │   ├── AuthTabSwitcher.tsx   # no change
│   │   ├── FormField.tsx         # DELETE after moving to common/
│   │   ├── OAuthButton.tsx       # no change
│   │   └── UsernameField.tsx     # no change
│   │
│   ├── chat/
│   │   ├── ChatListRow.tsx       # MODIFY — '#3b82f6' → COLORS.unreadDot
│   │   ├── MessageBubble.tsx     # MODIFY — '#f97316' → COLORS.accent, '#2a2a2a' → COLORS.secondary
│   │   ├── PinnedPlanBanner.tsx  # MODIFY — token sweep
│   │   └── SendBar.tsx           # MODIFY — token sweep
│   │
│   ├── friends/
│   │   ├── FriendCard.tsx        # MODIFY — token sweep
│   │   ├── QRCodeDisplay.tsx     # MODIFY — '#2a2a2a' → COLORS.secondary
│   │   └── ...                   # token sweep as needed
│   │
│   ├── home/
│   │   └── HomeFriendCard.tsx    # MODIFY — token sweep
│   │
│   └── plans/
│       ├── AvatarStack.tsx       # MODIFY — '#2a2a2a' → COLORS.secondary
│       ├── PlanCard.tsx          # MODIFY — '#2a2a2a' → COLORS.secondary
│       └── ...                   # token sweep as needed
│
└── screens/
    ├── auth/
    │   ├── AuthScreen.tsx        # MODIFY — tokens, update FormField import path
    │   └── ProfileSetup.tsx      # MODIFY — token sweep
    ├── chat/
    │   ├── ChatListScreen.tsx    # MODIFY — token sweep
    │   └── ChatRoomScreen.tsx    # MODIFY — token sweep
    ├── friends/
    │   ├── AddFriend.tsx         # MODIFY — token sweep
    │   ├── FriendRequests.tsx    # MODIFY — token sweep
    │   └── FriendsList.tsx       # MODIFY — token sweep
    ├── home/
    │   └── HomeScreen.tsx        # MODIFY — tokens + replace inline FAB → <FAB />
    └── plans/
        ├── PlanCreateModal.tsx   # MODIFY — token sweep
        ├── PlanDashboardScreen.tsx # MODIFY — token sweep
        └── PlansListScreen.tsx   # MODIFY — tokens + replace inline FAB → <FAB />
```

### Structure Rationale

- **`src/constants/` for tokens:** `colors.ts` already lives here and is imported across the entire codebase with `@/constants/colors`. Adding `spacing.ts` and `typography.ts` alongside it requires zero changes to any existing import and follows the established pattern.
- **`src/components/common/` for shared components:** Already established as the cross-domain shared UI directory. All existing components there (PrimaryButton, EmptyState) confirm this intent. New shared components (FAB, ScreenHeader, ErrorDisplay) belong here.
- **FormField relocation (auth/ → common/):** FormField is already generic enough to use on profile setup and potentially other screens. Moving it now prevents future duplication. Update all import sites atomically.

---

## Architectural Patterns

### Pattern 1: Token Import at StyleSheet Definition

**What:** Import token objects at the top of the file. Reference them inside `StyleSheet.create()`. Never construct style objects inline during render.
**When to use:** Every component and screen — both new files and refactored files.
**Trade-offs:** Tokens are evaluated once at module registration. Zero runtime overhead. No dynamic theming (Campfire is dark-only by explicit constraint — acceptable).

**Example:**
```typescript
import { COLORS } from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { TEXT } from '@/constants/typography';

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: SPACING.lg,          // 16
    gap: SPACING.sm,              // 8
  },
  title: {
    ...TEXT.bodyLarge,            // { fontSize: 16, fontWeight: '600' }
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TEXT.bodyMedium,           // { fontSize: 14, fontWeight: '400' }
    color: COLORS.textSecondary,
  },
});
```

### Pattern 2: Typography Tokens as Spread Objects

**What:** Typography tokens are plain objects with `fontSize` and `fontWeight`. Spread them into `StyleSheet.create()` entries. TypeScript infers the type when the object is typed with `as const`.
**When to use:** All text style definitions across the codebase.
**Trade-offs:** One level of indirection. Worth it: removes the single largest source of inconsistency (fontSize values appear 145+ times hardcoded across screens and components).

**Token definition:**
```typescript
// src/constants/typography.ts
export const TEXT = {
  // Screen-level headings (Plans, Chat, Home count heading)
  screenTitle:  { fontSize: 24, fontWeight: '600' as const },
  // Section headings within a screen (Details, Who's Going)
  sectionTitle: { fontSize: 20, fontWeight: '600' as const },
  // Primary body text in cards and rows
  bodyLarge:    { fontSize: 16, fontWeight: '600' as const },
  // Secondary body text, form labels, descriptions
  bodyMedium:   { fontSize: 14, fontWeight: '400' as const },
  // Timestamps, captions, small labels
  caption:      { fontSize: 13, fontWeight: '400' as const },
} as const;
```

**Token consumption (audit-derived scale):**

| Token | fontSize | fontWeight | Derived From |
|-------|----------|------------|-------------|
| `screenTitle` | 24 | 600 | Plans heading, Chat heading (55 occurrences of 24) |
| `sectionTitle` | 20 | 600 | Plan Dashboard section titles (15 occurrences of 20) |
| `bodyLarge` | 16 | 600 | Card titles, button labels, invite text |
| `bodyMedium` | 14 | 400 | Form labels, secondary info (50 occurrences of 14) |
| `caption` | 13 | 400 | Timestamps in ChatListRow (4 occurrences of 13) |

### Pattern 3: Spacing as Named Constants

**What:** A single numeric scale exported as `SPACING`. All padding, margin, and gap values reference this.
**When to use:** All layout values in all StyleSheet definitions.
**Trade-offs:** Naming takes discipline. Designers and developers must agree on the meaning of each step. The existing codebase reveals a clear de-facto scale: 4/8/12/16/24/32 — formalize these exact values.

**Token definition:**
```typescript
// src/constants/spacing.ts
export const SPACING = {
  xs:   4,   // AvatarStack overlap offset, tight gaps
  sm:   8,   // separator height, inline gaps, icon + label gap
  md:   12,  // borderRadius(sm), card section gaps, separator marginLeft
  lg:   16,  // standard screen padding, card padding, section padding
  xl:   24,  // large section spacing, FAB bottom offset
  xxl:  32,  // screen header top, auth header padding
} as const;
```

**Audit-derived usage counts (existing codebase):**

| Value | Count | Role |
|-------|-------|------|
| 16 | 44 | Standard horizontal screen padding, card padding |
| 8 | 10 | Inline gaps, separators |
| 24 | 5 | Large vertical spacing, FAB offset |
| 32 | 4 | Header top padding, auth content padding |
| 12 | borderRadius | Card radius appears 20 times |

### Pattern 4: Incremental Screen-by-Screen Migration

**What:** Refactor one screen at a time. Token files ship first. Then new shared components. Then screens one by one. Never a single PR that rewrites all 11 screens simultaneously.
**When to use:** Any existing codebase with StyleSheet. This is the only safe migration strategy when screens are in active development.
**Trade-offs:** During migration, some screens use tokens and some do not. This is fine — StyleSheet scopes are isolated per file. The app functions correctly throughout.

---

## Data Flow

### Token Consumption Flow

```
src/constants/colors.ts      (EXISTING — 17 tokens)
src/constants/spacing.ts     (NEW — 6 named values)
src/constants/typography.ts  (NEW — 5 named text pairs)
        │
        │  import { COLORS } from '@/constants/colors'
        │  import { SPACING } from '@/constants/spacing'
        │  import { TEXT } from '@/constants/typography'
        ↓
StyleSheet.create({ ... })   evaluated once at module load
        │
        │  style prop on View / Text / TouchableOpacity
        ↓
React Native layout and rendering
```

No component library, no theme context, no runtime lookup. Tokens are compile-time constants.

### Component Extraction Flow

```
HomeScreen / PlansListScreen
  → contain duplicate inline FAB JSX + styles
  → extract to src/components/common/FAB.tsx
  → screens import <FAB onPress={...} label="..." />
  → screen StyleSheet loses the duplicated fab/fabLabel style rules

src/components/auth/FormField.tsx
  → move to src/components/common/FormField.tsx
  → update import in AuthScreen from '@/components/auth/FormField'
                                 to '@/components/common/FormField'
  → zero changes to FormField implementation
```

### Pull-to-Refresh State Flow

```
Screen mounts → hook sets refreshing = false
User pulls down → RefreshControl calls onRefresh
  → hook sets refreshing = true
  → hook re-fetches from Supabase
  → hook sets refreshing = false
  → RefreshControl hides spinner
```

Screens without pull-to-refresh today (ChatRoomScreen, FriendsList, AddFriend, ProfileSetup, PlanDashboardScreen) need `onRefresh` wired from their existing hooks. All hooks already expose `handleRefresh` or a refetch function.

---

## Build Order (Dependency Graph)

Build phases must complete in this sequence. Each phase's output is consumed by the next.

```
Phase 1 — Token files (no dependencies, ship independently)
  ├── src/constants/spacing.ts        NEW
  ├── src/constants/typography.ts     NEW
  └── src/constants/colors.ts         ADD: unreadDot token

Phase 2 — New shared components (depends on Phase 1 tokens)
  ├── src/components/common/FAB.tsx          NEW (uses COLORS, SPACING)
  ├── src/components/common/ScreenHeader.tsx NEW (uses TEXT, COLORS, SPACING)
  ├── src/components/common/ErrorDisplay.tsx NEW (uses TEXT, COLORS)
  └── src/components/common/FormField.tsx    MOVE from auth/ (import path update)

Phase 3 — Hardcoded color sweep in existing components
        (depends on Phase 1 tokens; independent of Phase 2)
  ├── src/components/plans/PlanCard.tsx      '#2a2a2a' → COLORS.secondary
  ├── src/components/plans/AvatarStack.tsx   '#2a2a2a' → COLORS.secondary
  ├── src/components/chat/ChatListRow.tsx    '#3b82f6' → COLORS.unreadDot
  ├── src/components/chat/MessageBubble.tsx  '#f97316' → COLORS.accent
  │                                          '#2a2a2a' → COLORS.secondary
  └── src/components/friends/QRCodeDisplay.tsx '#2a2a2a' → COLORS.secondary

Phase 4 — Screen refactors (depends on Phases 1–3)
  ├── HomeScreen          swap inline FAB → <FAB />, tokens
  ├── PlansListScreen     swap inline FAB → <FAB />, tokens
  ├── ChatListScreen      tokens
  ├── ChatRoomScreen      tokens
  ├── PlanDashboardScreen tokens
  ├── PlanCreateModal     tokens
  ├── FriendsList         tokens, add pull-to-refresh if missing
  ├── FriendRequests      tokens
  ├── AddFriend           tokens
  ├── AuthScreen          tokens, update FormField import path
  └── ProfileSetup        tokens
```

Within Phase 4, screens can be refactored in any order — they are fully isolated by StyleSheet scope.

---

## Integration Points: New vs Modified Files

### New Files

| File | What It Contains | Consumes |
|------|-----------------|---------|
| `src/constants/spacing.ts` | `SPACING` object: xs=4 sm=8 md=12 lg=16 xl=24 xxl=32 | nothing |
| `src/constants/typography.ts` | `TEXT` object: screenTitle, sectionTitle, bodyLarge, bodyMedium, caption | nothing |
| `src/components/common/FAB.tsx` | Pressable floating button with icon + optional label | COLORS, SPACING |
| `src/components/common/ScreenHeader.tsx` | View with title Text + optional right-slot | TEXT, COLORS, SPACING |
| `src/components/common/ErrorDisplay.tsx` | Error text + optional retry TouchableOpacity | TEXT, COLORS |

### Moved Files

| From | To | Change |
|------|----|--------|
| `src/components/auth/FormField.tsx` | `src/components/common/FormField.tsx` | Path only — no implementation changes |

### Modified Files

| File | Change Type | Specific Change |
|------|------------|----------------|
| `src/constants/colors.ts` | Additive | Add `unreadDot: '#3b82f6'` token |
| `src/screens/home/HomeScreen.tsx` | Refactor | Replace inline FAB JSX → `<FAB />`, swap hardcoded values for SPACING/TEXT tokens |
| `src/screens/plans/PlansListScreen.tsx` | Refactor | Replace inline FAB JSX → `<FAB />`, swap tokens |
| `src/screens/chat/ChatListScreen.tsx` | Refactor | Swap tokens |
| `src/screens/chat/ChatRoomScreen.tsx` | Refactor | Swap tokens |
| `src/screens/plans/PlanDashboardScreen.tsx` | Refactor | Swap tokens |
| `src/screens/plans/PlanCreateModal.tsx` | Refactor | Swap tokens |
| `src/screens/friends/FriendsList.tsx` | Refactor | Swap tokens |
| `src/screens/friends/FriendRequests.tsx` | Refactor | Swap tokens |
| `src/screens/friends/AddFriend.tsx` | Refactor | Swap tokens |
| `src/screens/auth/AuthScreen.tsx` | Refactor | Swap tokens, update FormField import path |
| `src/screens/auth/ProfileSetup.tsx` | Refactor | Swap tokens |
| `src/components/plans/PlanCard.tsx` | Fix | `'#2a2a2a'` → `COLORS.secondary` |
| `src/components/plans/AvatarStack.tsx` | Fix | `'#2a2a2a'` → `COLORS.secondary` |
| `src/components/chat/ChatListRow.tsx` | Fix | `'#3b82f6'` → `COLORS.unreadDot` |
| `src/components/chat/MessageBubble.tsx` | Fix | `'#f97316'` → `COLORS.accent`, `'#2a2a2a'` → `COLORS.secondary` |
| `src/components/friends/QRCodeDisplay.tsx` | Fix | `'#2a2a2a'` → `COLORS.secondary` |

### Untouched Files

All files in `src/hooks/`, `src/stores/`, `src/types/`, `src/lib/`, and `src/app/` are untouched. The design system has zero effect on data fetching, state management, routing, or Supabase integration.

---

## Scaling Considerations

This milestone is internal refactoring with no user-facing architectural change. Token files are compile-time constants — no runtime cost at any scale.

| Concern | Now | Future |
|---------|-----|--------|
| Token divergence | Single source per token type | No risk — one file per domain |
| Dark/light mode | Not supported (Campfire is dark-only by constraint) | Would require `useColorScheme()` hook wrapping COLORS — deferrable to V3 |
| New screens | Import from tokens, use shared components — no migration needed | Tokens pay forward immediately |
| Design iteration | Change one value in spacing.ts → all consumers update | High leverage, low cost |

---

## Anti-Patterns

### Anti-Pattern 1: Big-Bang Migration

**What people do:** Refactor all 11 screens in a single PR before shipping tokens.
**Why it's wrong:** Merge conflicts across 11 files. Partial failures break the whole app. No ability to review incrementally.
**Do this instead:** Tokens first (ship independently, zero risk). Shared components next (each independently testable). Screens last, one or two at a time.

### Anti-Pattern 2: New `theme/` Directory

**What people do:** Create `src/theme/colors.ts`, `src/theme/spacing.ts` parallel to the existing `src/constants/colors.ts`.
**Why it's wrong:** `COLORS` is imported from `@/constants/colors` in 40+ files already. A parallel structure creates two import patterns and confuses contributors.
**Do this instead:** Add `spacing.ts` and `typography.ts` alongside `colors.ts` in `src/constants/`. One import path convention, zero churn on existing files.

### Anti-Pattern 3: Dynamic Theme Functions at Render Time

**What people do:** `const styles = makeStyles(theme)` called inside component body, or wrapping StyleSheet.create in a function.
**Why it's wrong:** Campfire is dark-only. Dynamic theming has no current use. It defeats StyleSheet.create optimization (StyleSheet resolves style IDs at registration time, not render time) and adds complexity with no benefit.
**Do this instead:** Module-level `StyleSheet.create()` with static token references. This is what every existing file already does — stay consistent.

### Anti-Pattern 4: Leaving Two FormField Copies

**What people do:** Copy FormField to `common/` and leave the original in `auth/` "just in case."
**Why it's wrong:** Two sources of truth. Bug fixes in one do not propagate to the other. Import paths diverge.
**Do this instead:** Move the single file. Update all import sites in the same commit. Delete the original. One file, one import path.

### Anti-Pattern 5: Type-Only Token Files

**What people do:** Export `export type SpacingKey = 'sm' | 'md' | 'lg'` without actual values.
**Why it's wrong:** StyleSheet requires numeric values. Type-only exports force every consumer to maintain a runtime lookup.
**Do this instead:** `export const SPACING = { sm: 8, md: 12, lg: 16 } as const`. TypeScript infers the union type automatically. Values and types are co-located.

### Anti-Pattern 6: Applying Tokens Inconsistently Across the Codebase

**What people do:** Refactor HomeScreen to use SPACING but leave FriendsList with hardcoded values.
**Why it's wrong:** Creates a two-tier codebase where some files use the system and some don't. Future developers cannot trust the convention.
**Do this instead:** Once token files exist, complete the sweep across all screens and components. The Phase 3 + Phase 4 build order ensures this.

---

## Sources

- Direct inspection of `/Users/iulian/Develop/campfire/src/` — all 221 files, 9,322 LOC — HIGH confidence
- Empirical audit of fontSize values (145 hardcoded instances), borderRadius values (57 instances), paddingHorizontal values (64 instances) — HIGH confidence
- Hardcoded hex color audit: 6 files with colors bypassing COLORS constant — HIGH confidence
- React Native StyleSheet documentation (stable API) — HIGH confidence

---

*Architecture research for: Campfire v1.1 UI/UX Design System*
*Researched: 2026-03-24*
