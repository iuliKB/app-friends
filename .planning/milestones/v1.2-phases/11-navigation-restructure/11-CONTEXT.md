# Phase 11: Navigation Restructure - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Reorder bottom navigation tabs, rename Plans→Explore and Chat→Chats with updated icons, ensure all existing route references work after rename, and update Playwright visual regression tests with new locators and baselines.

</domain>

<decisions>
## Implementation Decisions

### Tab order
- Final order: Home | Squad | Explore | Chats | Profile
- Reorder `Tabs.Screen` declarations in `_layout.tsx` to match

### Tab renames and icons
- Plans → Explore with compass icon (`compass-outline` / `compass` for focused)
- Chat → Chats with plural chatbubble icon (`chatbubbles-outline` / `chatbubbles` for focused)
- Squad and Profile labels/icons unchanged
- Home label/icon unchanged

### Route handling
- Tab file renames: `plans.tsx` → `explore.tsx`, `chat/` directory stays as-is (Expo Router `name` prop controls the tab identity, not the directory name) — OR rename directory if needed for consistency
- Deep route references (`/plans/${id}`, `/chat/room`) are under `src/app/plans/` and `src/app/chat/` (NOT under `(tabs)/`) — these do NOT change with tab renames
- All `router.push` calls referencing `/plans/` and `/chat/` routes must be audited and verified still working

### Playwright updates
- Update locators: `getByText("Plans")` → `getByText("Explore")`, `getByText("Chat")` → `getByText("Chats")`
- Regenerate all visual regression baselines (tab bar appearance changed)
- Tests in `tests/visual/design-system.spec.ts`

### Claude's Discretion
- Whether to rename `chat/` directory to `chats/` or just change the `title` prop
- Whether `plans.tsx` file rename is needed or just `title` change suffices
- Exact Playwright baseline regeneration approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tab layout
- `src/app/(tabs)/_layout.tsx` — Current tab declarations, order, icons, badges

### Tab screens to rename
- `src/app/(tabs)/plans.tsx` — Plans screen (rename to Explore)
- `src/app/(tabs)/chat/` — Chat directory (rename to Chats)
- `src/app/(tabs)/chat/_layout.tsx` — Chat stack layout
- `src/app/(tabs)/chat/index.tsx` — Chat list screen
- `src/app/(tabs)/chat/room.tsx` — Chat room screen

### Route references to audit
- `src/app/_layout.tsx` lines 86, 95 — `router.push('/plans/${planId}')`
- `src/components/chat/PinnedPlanBanner.tsx` line 34 — `router.push('/plans/' + planId)`
- `src/screens/plans/PlanCreateModal.tsx` line 109 — `router.push('/plans/${planId}')`
- `src/screens/plans/PlanDashboardScreen.tsx` line 297 — `router.push('/chat/room?plan_id=${planId}')`
- `src/screens/plans/PlansListScreen.tsx` line 134 — `router.push('/plans/${item.id}')`
- `src/screens/chat/ChatListScreen.tsx` line 20 — `router.push('/chat/room?plan_id=' + item.id)`

### Playwright tests
- `tests/visual/design-system.spec.ts` lines 52, 60, 68, 76 — Tab navigation locators
- `playwright.config.ts` — Test configuration

</canonical_refs>

<code_context>
## Existing Code Insights

### Key Understanding
- In Expo Router, `Tabs.Screen name="plans"` maps to the FILE `plans.tsx` under `(tabs)/`. The `title` prop controls the displayed label.
- Deep routes like `/plans/${id}` are under `src/app/plans/` (NOT `(tabs)/plans.tsx`) — these are separate Stack routes
- The `chat/` directory under `(tabs)/` has its own `_layout.tsx` for nested Stack navigation (index + room screens)

### Established Patterns
- Tab icons use Ionicons with focused/outline variants
- Badge assignment via `tabBarBadge` prop
- Design tokens for all styling

### Integration Points
- `_layout.tsx` is the single file controlling tab order, labels, icons, and badges
- Playwright tests navigate by text label — any label change requires locator updates

</code_context>

<specifics>
## Specific Ideas

- User specifically chose compass icon for Explore — it signals "discovery" which is the future direction for this tab
- User chose plural chatbubbles icon to match the plural "Chats" label — visual consistency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-navigation-restructure*
*Context gathered: 2026-04-04*
