# Phase 9: Screen Consistency Sweep - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all 11 screens and ~34 components to use design tokens from `@/theme` and shared components from Phase 8. Replace all inline FABs with `<FAB>`, all screen titles with `<ScreenHeader>`, all raw style values with tokens. Delete `src/constants/colors.ts`. Upgrade ESLint rule from warn to error. Zero violations when complete.

</domain>

<decisions>
## Implementation Decisions

### Migration ordering
- **By domain** — migrate each domain's screens + associated components together:
  1. Auth (AuthScreen, ProfileSetup + auth components)
  2. Home (HomeScreen + HomeFriendCard, status components)
  3. Plans (PlansListScreen, PlanDashboardScreen, PlanCreateModal + plan components)
  4. Chat (ChatListScreen, ChatRoomScreen + chat components)
  5. Friends (FriendsList, FriendRequests, AddFriend + friend components)
  6. Profile (profile tab, edit screen)
  7. Navigation/layout files (app layouts, tab layouts)
- Components are migrated alongside their screens, not in a separate pass

### ESLint upgrade timing
- **Flip warn → error at the START of the phase** — before any migration work
- Every file must be clean before moving to the next domain
- This means the first commit is the lint rule severity change, then migration fixes violations domain by domain

### Old imports cleanup
- **Delete `src/constants/colors.ts` entirely** after all files migrated — clean break
- Delete `src/components/auth/FormField.tsx` re-export stub (Phase 8 artifact)
- Remove the `COLORS as THEME` alias pattern from the 5 screens that Phase 8 touched — replace with direct `COLORS` from `@/theme`
- Any import from `@/constants/colors` that remains after migration will fail at build time (intentional — catches stragglers)

### What gets replaced in each file
- `import { COLORS } from '@/constants/colors'` → `import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII, SHADOWS } from '@/theme'` (import only what's used)
- `import { COLORS as THEME } from '@/theme'` → `import { COLORS } from '@/theme'` (remove alias)
- Hardcoded hex colors → `COLORS.xxx` semantic tokens
- Raw `fontSize: N` → `FONT_SIZE.xxx`
- Raw `fontWeight: 'N'` → `FONT_WEIGHT.xxx`
- Raw `padding/margin/gap: N` → `SPACING.xxx`
- Raw `borderRadius: N` → `RADII.xxx` (where exact match exists; otherwise keep raw — lint doesn't block borderRadius)
- Raw `shadowColor/shadowOffset/shadowOpacity/shadowRadius/elevation` → `...SHADOWS.xxx` spread
- Inline FAB JSX → `<FAB icon={...} label={...} onPress={...} accessibilityLabel={...} />`
- Inline screen titles → `<ScreenHeader title={...} subtitle={...} rightAction={...} />`
- Inline section titles → `<SectionHeader title={...} rightAction={...} />`

### Claude's Discretion
- Exact domain batching (which components go with which domain plan)
- Whether to split large domains into multiple plans
- Handling edge cases where raw values don't match any token exactly (e.g., paddingVertical: 14 in FormField)
- Whether `src/constants/config.ts` stays in constants/ (it should — it's app config, not styling)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design tokens (source of truth for all replacement values)
- `src/theme/colors.ts` — COLORS semantic groups
- `src/theme/spacing.ts` — SPACING scale
- `src/theme/typography.ts` — FONT_SIZE and FONT_WEIGHT
- `src/theme/radii.ts` — RADII tokens
- `src/theme/shadows.ts` — SHADOWS presets
- `src/theme/index.ts` — barrel export

### Shared components (replacements for inline patterns)
- `src/components/common/FAB.tsx` — Unified FAB with flexible props
- `src/components/common/ScreenHeader.tsx` — Screen title component
- `src/components/common/SectionHeader.tsx` — Section title component
- `src/components/common/FormField.tsx` — Token-migrated form field
- `src/components/common/ErrorDisplay.tsx` — Inline + screen-level errors

### Files to delete after migration
- `src/constants/colors.ts` — Old color constants (replaced by src/theme/colors.ts)
- `src/components/auth/FormField.tsx` — Re-export stub (replaced by common/FormField.tsx)

### ESLint rule to upgrade
- `eslint.config.js` — Change `campfire/no-hardcoded-styles` from `warn` to `error`
- `eslint-rules/no-hardcoded-styles.js` — The rule implementation (don't modify, just severity)

### Audit and prior context
- `.planning/UI-REVIEW.md` — Original audit with file:line references
- `.planning/phases/07-design-tokens/07-CONTEXT.md` — Token naming decisions
- `.planning/phases/08-shared-components/08-CONTEXT.md` — Component API decisions
- `.planning/phases/08-shared-components/08-UAT.md` — FAB bounce animation deferred here

### Hardcoded hex files (9 files still have raw hex)
- `src/screens/auth/AuthScreen.tsx`
- `src/screens/friends/FriendsList.tsx`
- `src/screens/plans/PlansListScreen.tsx`
- `src/screens/home/HomeScreen.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ChatListRow.tsx`
- `src/components/plans/PlanCard.tsx`
- `src/components/plans/AvatarStack.tsx`
- `src/components/friends/QRCodeDisplay.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### Migration scope
- 51 files import `@/constants/colors` — all need migration to `@/theme`
- 9 files have hardcoded hex literals — need token replacement
- 11 screen files + ~34 component files total
- 5 screens already have `COLORS as THEME` alias from Phase 8 pull-to-refresh work

### Screens inventory (11 total)
- Auth: AuthScreen.tsx, ProfileSetup.tsx
- Home: HomeScreen.tsx
- Plans: PlansListScreen.tsx, PlanDashboardScreen.tsx, PlanCreateModal.tsx
- Chat: ChatListScreen.tsx, ChatRoomScreen.tsx
- Friends: FriendsList.tsx, FriendRequests.tsx, AddFriend.tsx

### Inline FABs to replace (3 screens)
- HomeScreen.tsx — icon + "Start Plan" label
- PlansListScreen.tsx — icon-only "+"
- FriendsList.tsx — icon-only person+

### Established patterns from Phase 8
- Components import exclusively from `@/theme`, never `@/constants/colors`
- Named exports for component + Props interface
- `useSafeAreaInsets()` for FAB bottom positioning

### Integration points
- `src/constants/colors.ts` deletion requires verifying zero remaining imports
- `tsconfig.json` `@/constants` path alias can stay (config.ts still there)
- ESLint severity change is a single line edit in eslint.config.js

</code_context>

<specifics>
## Specific Ideas

- Plans view is the gold standard — after migration, all screens should feel as consistent as Plans
- FAB adoption on Home/Plans/Friends will finally enable the bounce animation (Phase 8 UAT gap)
- The `COLORS as THEME` alias on 5 screens is a Phase 8 artifact — clean it up by using `COLORS` directly

</specifics>

<deferred>
## Deferred Ideas

- Dark mode / theming — v1.2+ (semantic naming now positions for it)
- Full ESLint setup with @typescript-eslint/recommended — separate effort
- Toast/snackbar, bottom sheet, skeleton loading — future milestone

</deferred>

---

*Phase: 09-screen-consistency-sweep*
*Context gathered: 2026-03-25*
