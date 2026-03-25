# Phase 8: Shared Components - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build shared component library in `src/components/common/` covering every repeated UI pattern across screens. All components built on Phase 7 design tokens from `@/theme`. This phase does NOT refactor existing screens to use these components (that's Phase 9).

Components: FAB, FormField (move), ErrorDisplay, ScreenHeader, SectionHeader, pull-to-refresh standardization.

</domain>

<decisions>
## Implementation Decisions

### FAB component
- **Fully flexible** — `<FAB icon={...} label={...} size={...} onPress={...} />` with no preset variants
- Pass icon component, optional label text, optional custom size
- **Fixed bottom-right position** — always uses `insets.bottom + 24`, not configurable
- **Scale bounce animation** on press — quick scale down to 0.95, bounce back to 1.0
- Uses `COLORS`, `SHADOWS.fab`, `RADII` tokens from `@/theme`
- Must handle all 3 current use cases: Home (icon + "Start Plan" label), Plans (icon-only +), Friends (icon-only person+)

### ErrorDisplay component
- **Inline errors only** — generic inline error text component for non-form contexts
- FormField already handles its own inline form errors — ErrorDisplay is for other contexts
- **User-friendly messages only** — no technical details shown to user, technical info logged to console
- Screen-level error state design is Claude's discretion (likely similar to EmptyState pattern)

### ScreenHeader component
- **Title + optional subtitle + optional right action slot**
- Title matches Plans view treatment (screen-level title sizing and weight from tokens)
- Optional subtitle rendered below title in secondary text style
- Optional right-action slot (renders ReactNode) for action buttons
- **Does NOT handle safe area** — screens wrap in their own SafeAreaView
- Uses FONT_SIZE, FONT_WEIGHT, SPACING, COLORS tokens

### SectionHeader component
- **Separate component** for in-screen section titles (not a ScreenHeader variant)
- Smaller than screen title (section-level sizing from tokens)
- Optional right-action slot (like "See all" links)
- Consistent spacing above/below

### FormField
- **Move + token migrate only** — move from `src/components/auth/FormField.tsx` to `src/components/common/FormField.tsx`
- Update imports from `@/constants/colors` to `@/theme`
- Replace raw numeric style values with SPACING, FONT_SIZE, FONT_WEIGHT, RADII tokens
- No new props or behavior changes
- Update all existing import paths in auth screens

### Pull-to-refresh
- **Standardize tint color** across all RefreshControl instances using `COLORS.interactive.accent` (or appropriate token)
- Home and Plans already have RefreshControl — verify and update tint color
- Friends (FriendsList, FriendRequests) — add RefreshControl if missing, or fix existing
- ChatListScreen — check and standardize (may use different pull-to-refresh mechanism)

### Claude's Discretion
- ErrorDisplay screen-level error state visual design (icon, layout, retry button)
- FAB shadow intensity and animation timing
- SectionHeader exact spacing values
- Pull-to-refresh: whether ChatListScreen needs changes or is already correct

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design tokens (Phase 7 output — source of truth for all styling)
- `src/theme/colors.ts` — COLORS with semantic nested groups
- `src/theme/spacing.ts` — SPACING xs/sm/md/lg/xl/xxl
- `src/theme/typography.ts` — FONT_SIZE and FONT_WEIGHT
- `src/theme/radii.ts` — RADII tokens
- `src/theme/shadows.ts` — SHADOWS presets (card, fab, none)
- `src/theme/index.ts` — barrel export

### Existing components to reference or modify
- `src/components/auth/FormField.tsx` — Current FormField (move target, 98 lines)
- `src/components/common/EmptyState.tsx` — Pattern reference for ErrorDisplay screen-level state
- `src/components/common/PrimaryButton.tsx` — Pattern reference for button styling

### FAB implementations to consolidate
- `src/screens/home/HomeScreen.tsx` — FAB with icon + label ("Start Plan")
- `src/screens/plans/PlansListScreen.tsx` — FAB icon-only
- `src/screens/friends/FriendsList.tsx` — FAB icon-only (person+)

### Pull-to-refresh screens
- `src/screens/home/HomeScreen.tsx` — Has RefreshControl
- `src/screens/plans/PlansListScreen.tsx` — Has RefreshControl
- `src/screens/friends/FriendsList.tsx` — Has refreshing state
- `src/screens/friends/FriendRequests.tsx` — Has refreshing state
- `src/screens/chat/ChatListScreen.tsx` — Has refreshing/onRefresh

### Audit findings
- `.planning/UI-REVIEW.md` — 6-pillar audit with component-level findings

### Phase 7 context (prior decisions)
- `.planning/phases/07-design-tokens/07-CONTEXT.md` — Token structure decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmptyState.tsx`: Pattern for centered icon + message + action layout — reuse for ErrorDisplay screen state
- `PrimaryButton.tsx`: Button styling reference
- `FormField.tsx`: Already well-built, just needs relocation and token migration
- `AvatarCircle.tsx`, `LoadingIndicator.tsx`, `OfflineBanner.tsx`: Existing common components — ensure new components follow same patterns

### Established Patterns
- Components use `StyleSheet.create()` at module level with `COLORS` from `@/constants/colors`
- Props interfaces defined above component, exported with named export
- Components are self-contained (styles defined in same file)
- FABs all use `useSafeAreaInsets()` for bottom positioning

### Integration Points
- FAB: 3 screens will need import changes in Phase 9 (Home, Plans, Friends)
- FormField: auth screens import from `@/components/auth/FormField` — path updates needed
- ScreenHeader/SectionHeader: new components, no existing imports to change
- Pull-to-refresh: existing RefreshControl props, just tint color update

</code_context>

<specifics>
## Specific Ideas

- Plans view title treatment is the gold standard for ScreenHeader
- FAB on Home has icon + label ("Start Plan") — the label variant should look natural, not forced
- Keep OfflineBanner as-is — it's a different pattern (banner vs error display)

</specifics>

<deferred>
## Deferred Ideas

- Toast/snackbar notification component — future milestone
- Bottom sheet component — future milestone
- Skeleton loading placeholders — future milestone

</deferred>

---

*Phase: 08-shared-components*
*Context gathered: 2026-03-24*
