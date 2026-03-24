# Phase 7: Design Tokens - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Define all style token constants (color, spacing, typography, border radius, shadows) in a new `src/theme/` directory and install an ESLint rule that enforces token usage. This phase creates the token infrastructure — it does NOT refactor existing screens (that's Phase 9) or build shared components (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Color organization
- Restructure COLORS into **semantic nested groups**: `COLORS.text.primary`, `COLORS.surface.card`, `COLORS.interactive.accent`, `COLORS.feedback.error`, etc.
- Add `COLORS.shadow` token for the 3 hardcoded `shadowColor: '#000'` instances
- Keep splash gradient colors inside COLORS (splashGradientStart, splashGradientEnd, splashText)
- The undeclared `#3b82f6` becomes `COLORS.info` — a generic notification/indicator color, not tied to "unread dot" specifically
- Existing `COLORS.status.free/busy/maybe` nesting pattern is a good precedent for the new semantic groups

### Spacing tokens
- **Size-based naming**: SPACING.xs (4), SPACING.sm (8), SPACING.md (12), SPACING.lg (16), SPACING.xl (24), SPACING.xxl (32)
- Scale derived from audit of existing codebase — no invented values

### Typography tokens
- **Separate size and weight tokens** (not combined presets)
- FONT_SIZE: sm (13), md (14), lg (16), xl (20), xxl (24)
- FONT_WEIGHT: regular ('400'), semibold ('600')
- Two-tier title system: screen title (larger, bolder) and section title (smaller) — both represented in the token scale

### Border radius tokens
- Extract from audit — common values to be named (e.g., RADII.sm, RADII.md, RADII.lg, RADII.full)

### Shadow tokens
- Extract from audit — card shadows, FAB shadows, elevated surface shadows
- Named presets that spread into StyleSheet (e.g., SHADOWS.card = { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation })

### Lint rule
- **Scope**: Block hardcoded hex color literals AND raw numeric fontSize/padding/margin/gap values in StyleSheet
- **Severity**: Warning during Phase 7-8, upgraded to error in Phase 9
- **Setup**: Minimal ESLint config — only the custom design-token enforcement rule, no other linting rules
- borderRadius raw values NOT blocked (only colors + spacing + typography)

### Token file structure
- New `src/theme/` directory — move colors.ts there, add spacing.ts, typography.ts, radii.ts, shadows.ts
- Barrel export via `src/theme/index.ts` — single import path: `import { COLORS, SPACING, FONT_SIZE } from '@/theme'`
- All objects use `as const` pattern (consistent with existing COLORS)

### Claude's Discretion
- Exact semantic group names within COLORS (text/surface/interactive/feedback are guidance, not rigid)
- How to handle the COLORS import migration (alias, re-export from old path, or direct update)
- ESLint rule implementation approach (custom plugin vs inline rule)
- Exact RADII and SHADOWS token values (derived from codebase audit)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing token files
- `src/constants/colors.ts` — Current COLORS definition (31 lines, flat with one nested status group). Source of truth for existing color values.
- `src/constants/config.ts` — App config, not styling. Do not move to theme/.

### Audit findings
- `.planning/UI-REVIEW.md` — Full 6-pillar visual audit with file:line references for all hardcoded values
- `.planning/research/ARCHITECTURE.md` — Integration points, de-facto spacing/type scale values, build order
- `.planning/research/PITFALLS.md` — Half-migration risk, spacing value 12 must be in scale, token over-engineering warnings

### Research
- `.planning/research/STACK.md` — Token file patterns, StyleSheet factory, theme provider patterns (for reference, not for this phase)
- `.planning/research/FEATURES.md` — Table stakes vs anti-features categorization

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/constants/colors.ts`: Existing COLORS object — refactor target, not replace
- `as const` pattern already established — extend to all new token files

### Established Patterns
- Imports use `@/constants/colors` path alias — barrel export from `@/theme` follows same convention
- All styling via `StyleSheet.create()` at module level — tokens must work with this pattern
- No ESLint config exists — clean slate for rule setup

### Integration Points
- Every `.tsx` file importing `COLORS` from `@/constants/colors` needs import path update
- `app.json` or `tsconfig.json` may need `@/theme` path alias if not already covered by `@/constants` pattern
- 13 files with hardcoded hex colors — these will show lint warnings once rule is active

### Hardcoded values inventory (from codebase scout)
- Hardcoded hex colors in: QRCodeDisplay.tsx, FriendsList.tsx, PlansListScreen.tsx, AvatarStack.tsx, PlanCard.tsx, MessageBubble.tsx (6 instances), ChatListRow.tsx, HomeScreen.tsx
- Raw fontSize/fontWeight in: EmojiTagPicker.tsx, FriendCard.tsx, MessageBubble.tsx, and likely all screen files
- Raw padding/margin/gap in: nearly every component and screen file

</code_context>

<specifics>
## Specific Ideas

- Plans view is the gold standard for spacing and title treatment — extract token values from its actual styles
- Chats view is the reference for pull-to-refresh pattern (relevant to Phase 8, not this phase)
- Navigation bar is solid as-is — don't change its styling during token extraction

</specifics>

<deferred>
## Deferred Ideas

- Dark mode / theming via useColorScheme + ThemeProvider — v1.2+ (semantic naming in this phase positions for it)
- Full ESLint setup with @typescript-eslint/recommended + React Native plugin — separate effort
- Upgrading lint rule from warning to error — Phase 9

</deferred>

---

*Phase: 07-design-tokens*
*Context gathered: 2026-03-24*
