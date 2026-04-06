# Phase 11: Navigation Restructure - Research

**Researched:** 2026-04-04
**Domain:** Expo Router tab navigation, Ionicons, Playwright visual regression
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Final tab order: Home | Squad | Explore | Chats | Profile
- Reorder `Tabs.Screen` declarations in `_layout.tsx` to match
- Plans → Explore with compass icon (`compass-outline` / `compass` for focused)
- Chat → Chats with plural chatbubble icon (`chatbubbles-outline` / `chatbubbles` for focused)
- Squad and Profile labels/icons unchanged
- Home label/icon unchanged
- Tab file renames: `plans.tsx` → `explore.tsx`, `chat/` directory stays as-is (Expo Router `name` prop controls the tab identity, not the directory name) — OR rename directory if needed for consistency
- Deep route references (`/plans/${id}`, `/chat/room`) are under `src/app/plans/` and `src/app/chat/` (NOT under `(tabs)/`) — these do NOT change with tab renames
- All `router.push` calls referencing `/plans/` and `/chat/` routes must be audited and verified still working
- Update locators: `getByText("Plans")` → `getByText("Explore")`, `getByText("Chat")` → `getByText("Chats")`
- Regenerate all visual regression baselines (tab bar appearance changed)
- Tests in `tests/visual/design-system.spec.ts`

### Claude's Discretion
- Whether to rename `chat/` directory to `chats/` or just change the `title` prop
- Whether `plans.tsx` file rename is needed or just `title` change suffices
- Exact Playwright baseline regeneration approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Bottom nav order is Home \| Squad \| Explore \| Chats \| Profile | Reorder `Tabs.Screen` declarations in `_layout.tsx`; Expo Router renders tabs in declaration order |
| NAV-02 | Plans tab displays as "Explore" with same functionality | Change `title` prop and icon on `name="plans"` screen; optionally rename file to `explore.tsx` |
| NAV-03 | Chat tab displays as "Chats" with same functionality | Change `title` prop and icon on `name="chat"` screen; directory rename is discretionary |
| NAV-04 | All existing navigation routes (plans, chat) work after rename | Deep routes (`/plans/`, `/chat/`) live outside `(tabs)/` — unaffected by tab renames; verified by audit of 6 router.push call sites |
</phase_requirements>

---

## Summary

Phase 11 is a pure cosmetic restructure of the bottom navigation bar. No new screens, no data layer changes, no business logic changes. The entire scope is: (1) reorder five `Tabs.Screen` declarations, (2) change two `title` props and two icon names, (3) optionally rename one file and one directory, (4) update two Playwright text locators and regenerate all seven visual regression baselines.

The key architectural insight is that Expo Router separates **tab identity** (the `name` prop on `Tabs.Screen`, which maps to the file/directory name under `(tabs)/`) from **tab label** (the `title` option). The `/plans/${id}` and `/chat/room` deep routes live at `src/app/plans/` and `src/app/(tabs)/chat/` respectively — the tab-level rename does not touch them. All six `router.push` call sites that reference `/plans/` or `/chat/` routes will continue to work unchanged because those route segments are not being renamed.

The Playwright impact is limited but mandatory: locators `getByText("Plans")` and `getByText("Chat")` will fail after the rename, and all seven snapshot baselines will be stale because the tab bar layout changes (reorder + new icons). Both must be fixed in the same commit as the implementation.

**Primary recommendation:** Change `title` and icon props only (no file/directory renames). This is the smallest, safest change and fully satisfies all four requirements.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~4.x (project-installed) | File-based routing including tabs | Project uses it; `Tabs.Screen` is the only tab API needed |
| @expo/vector-icons (Ionicons) | project-installed | Tab bar icons | Already used for all existing tab icons |
| @playwright/test | project-installed | Visual regression tests | Existing test infrastructure |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-safe-area-context | project-installed | `useSafeAreaInsets` in layout | Already in layout; no change needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Title-only rename | File/directory rename | File rename requires updating every import of the screen component; title rename requires zero imports changes — prefer title rename |
| Manual snapshot deletion | `--update-snapshots` flag | Manual deletion risks missing OS-suffixed filenames; use the flag |

**Installation:** No new packages required.

---

## Architecture Patterns

### Expo Router Tab Identity vs. Label

The `name` prop on `Tabs.Screen` maps to the file or directory name under `(tabs)/`. The `title` option controls the displayed label. These are independent.

```typescript
// Source: src/app/(tabs)/_layout.tsx (current)
<Tabs.Screen
  name="plans"          // maps to plans.tsx — this is the route segment
  options={{
    title: 'Plans',     // displayed label — change this to 'Explore'
    tabBarIcon: ...     // change icon here
  }}
/>
```

After the change:
```typescript
<Tabs.Screen
  name="plans"          // unchanged — route segment /plans still resolves
  options={{
    title: 'Explore',   // new label
    tabBarIcon: ({ color, focused }) => (
      <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
    ),
  }}
/>
```

### Recommended Final Tab Declaration Order

Expo Router renders tabs in the order they are declared. The new order must be:

```typescript
// 1. index     → Home
// 2. squad     → Squad
// 3. plans     → Explore  (reordered: was position 2, now position 3)
// 4. chat      → Chats    (reordered: was position 3, now position 4)
// 5. profile   → Profile
```

Current order in `_layout.tsx`: index → plans → chat → squad → profile
Target order: index → squad → plans → chat → profile

### Current vs. Target Tab Layout

| Position | Current name | Current title | Current icon | Target title | Target icon |
|----------|-------------|---------------|--------------|--------------|-------------|
| 1 | index | Home | home/home-outline | Home | unchanged |
| 2 | plans | Plans | calendar/calendar-outline | (move to pos 3) | — |
| 3 | chat | Chat | chatbubble/chatbubble-outline | (move to pos 4) | — |
| 4 | squad | Squad | people/people-outline | (move to pos 2) | unchanged |
| 5 | profile | Profile | person/person-outline | Profile | unchanged |

After reorder:
| Position | name | title | icon |
|----------|------|-------|------|
| 1 | index | Home | home/home-outline |
| 2 | squad | Squad | people/people-outline |
| 3 | plans | Explore | compass/compass-outline |
| 4 | chat | Chats | chatbubbles/chatbubbles-outline |
| 5 | profile | Profile | person/person-outline |

### Deep Routes Are Unaffected

```
src/app/
  plans/
    _layout.tsx      ← Stack layout for /plans/* routes
    [id].tsx         ← /plans/:id — NOT a tab file, NOT renamed
  (tabs)/
    plans.tsx        ← Tab entry point only (renders PlansListScreen)
    chat/
      index.tsx      ← /chat route in tab context
      room.tsx       ← /chat/room — router.push target
```

The six `router.push` call sites all reference `/plans/...` or `/chat/...` which are the deep route segments — they remain unchanged.

### Anti-Patterns to Avoid

- **Renaming the file without updating the `name` prop:** The `name` prop must match the file name. If you rename `plans.tsx` → `explore.tsx`, you must also change `name="plans"` to `name="explore"`. This changes the route segment from `/explore` which would break the title-only approach.
- **Renaming directory `chat/` → `chats/`:** This changes the deep route `/chat/room` to `/chats/room`, breaking all six `router.push('/chat/room')` call sites. Only do this if all six references are also updated.
- **Updating snapshots before updating locators:** The `getByText("Plans")` locator will fail before reaching the screenshot step. Fix locators first, then regenerate snapshots.
- **Partial snapshot regeneration:** All seven snapshots will be stale (the tab bar reorder affects every screen that shows the tab bar). Regenerate all, not just the two renamed ones.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab ordering | Custom tab bar component | Expo Router `Tabs.Screen` declaration order | Expo handles focus state, deep linking, gestures |
| Icon variants | Custom focused/unfocused logic | Ionicons focused prop already passed to tabBarIcon | Already the established pattern in this codebase |
| Snapshot update | Manual file deletion + re-run | `npx playwright test --update-snapshots` | Handles OS-suffixed filenames automatically |

---

## Common Pitfalls

### Pitfall 1: File rename changes the route segment
**What goes wrong:** Renaming `plans.tsx` → `explore.tsx` changes the Expo Router route from `/(tabs)/plans` to `/(tabs)/explore`. The `name` prop in `_layout.tsx` must also be updated to `name="explore"`.
**Why it happens:** Expo Router derives route identity from the file name. The `name` prop is a declaration that must match the file.
**How to avoid:** For this phase, change only `title` and icon — do not rename the file unless also updating the `name` prop and confirming no references exist to the old tab segment.
**Warning signs:** Metro bundler warning about unmatched screen names; tab press navigates to wrong screen.

### Pitfall 2: Directory rename breaks deep route references
**What goes wrong:** Renaming `(tabs)/chat/` → `(tabs)/chats/` changes the route segments. All `router.push('/chat/room?...')` calls would 404.
**Why it happens:** Expo Router maps directory names to route segments.
**How to avoid:** Either keep the directory as `chat/` (recommended) or update all six `router.push` references in the same commit.
**Warning signs:** Chat room navigation silently fails or shows 404 screen.

### Pitfall 3: Playwright locator ambiguity with text match
**What goes wrong:** `getByText("Chat")` after the rename would find "Chats" — or fail if exact match is default. Conversely, `getByText("Chats")` must be used for the new label.
**Why it happens:** Playwright's `getByText` default is substring match. The old "Chat" locator would still match "Chats" but targeting the wrong element.
**How to avoid:** Update both locators (`Plans` → `Explore`, `Chat` → `Chats`) and verify by running tests before regenerating snapshots.
**Warning signs:** Tests pass navigation but screenshot shows wrong screen.

### Pitfall 4: invitationCount badge must stay on Explore tab
**What goes wrong:** When reordering `Tabs.Screen` declarations, the `tabBarBadge` prop on the Plans/Explore screen must move with it.
**Why it happens:** Copy-paste reordering that drops the badge assignment.
**How to avoid:** Move the entire `Tabs.Screen` block (name + all options) when reordering.
**Warning signs:** Invitation count badge disappears from Explore tab.

### Pitfall 5: pendingCount badge must stay on Squad tab
**What goes wrong:** Same as above — the `tabBarBadge` prop for pending requests must remain on the Squad screen after reordering.
**How to avoid:** Move entire `Tabs.Screen` block, do not reconstruct options piecemeal.

---

## Code Examples

### Final _layout.tsx tab declarations (target state)

```typescript
// Source: derived from current src/app/(tabs)/_layout.tsx
<Tabs ...>
  <Tabs.Screen
    name="index"
    options={{
      title: 'Home',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
      ),
    }}
  />
  <Tabs.Screen
    name="squad"
    options={{
      title: 'Squad',
      tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
      ),
    }}
  />
  <Tabs.Screen
    name="plans"
    options={{
      title: 'Explore',
      tabBarBadge: invitationCount > 0 ? invitationCount : undefined,
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
      ),
    }}
  />
  <Tabs.Screen
    name="chat"
    options={{
      title: 'Chats',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
      ),
    }}
  />
  <Tabs.Screen
    name="profile"
    options={{
      title: 'Profile',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
      ),
    }}
  />
</Tabs>
```

### Updated Playwright locators

```typescript
// BEFORE (tests/visual/design-system.spec.ts)
await page.getByText("Plans").click();   // line 52
await page.getByText("Chat").click();    // line 60

// AFTER
await page.getByText("Explore").click();
await page.getByText("Chats").click();
```

### Playwright snapshot regeneration command

```bash
# Run from project root with Expo dev server already running on :8081
npx playwright test --update-snapshots
```

This overwrites all seven `.png` files in `tests/visual/design-system.spec.ts-snapshots/`.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `title` prop drives label only | `name` prop drives route identity; `title` drives label | Rename title safely without changing routes |
| Tab order = declaration order | Same (Expo Router, stable) | Reordering declarations is the correct mechanism |

**Confirmed available Ionicons:**
- `compass` / `compass-outline` — available in Ionicons 5+ (used by @expo/vector-icons)
- `chatbubbles` / `chatbubbles-outline` — available in Ionicons 5+

Both icon names follow the same focused/outline pattern already used for all current tab icons.

---

## Open Questions

1. **File rename: `plans.tsx` → `explore.tsx`?**
   - What we know: Not required for labels/icons to change; Expo Router uses `name` prop for identity
   - What's unclear: Long-term maintainability preference (file name matches displayed label vs. stability)
   - Recommendation: Skip the rename. `plans.tsx` continues to work. Add a comment in the file if needed for clarity. This avoids any risk of import breakage and keeps the route segment stable.

2. **Directory rename: `chat/` → `chats/`?**
   - What we know: Six `router.push` call sites reference `/chat/room` and `/chat/...`
   - What's unclear: Whether the user wants filesystem consistency with the label
   - Recommendation: Keep `chat/` directory. Zero risk. The `title: 'Chats'` achieves the visual goal without touching six push call sites or the nested Stack layout.

3. **Snapshot naming after label changes**
   - What we know: Current snapshots are `plans-screen-mobile-darwin.png` and `chat-screen-mobile-darwin.png`
   - What's unclear: Whether to rename snapshot files to match new labels
   - Recommendation: Keep existing snapshot filenames. The test names in the spec file can be updated (`"plans screen"` → `"explore screen"`) which changes the snapshot filename, but this requires deleting old files. Simplest: update test names and let `--update-snapshots` create new files, then delete the old ones manually.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (project-installed) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Tab bar shows correct order: Home\|Squad\|Explore\|Chats\|Profile | visual | `npx playwright test --update-snapshots` then `npx playwright test` | ✅ existing |
| NAV-02 | Plans tab shows as "Explore" with compass icon | visual + smoke | `npx playwright test` — snapshot comparison | ✅ existing (locator update required) |
| NAV-03 | Chat tab shows as "Chats" with chatbubbles icon | visual + smoke | `npx playwright test` — snapshot comparison | ✅ existing (locator update required) |
| NAV-04 | Existing routes /plans/* and /chat/* still navigate correctly | manual smoke | Device/simulator: tap Explore → tap a plan → verify opens; tap Chats → tap a chat room → verify opens | N/A — no automated route-level test exists |

### Sampling Rate
- **Per task commit:** `npx playwright test` (visual suite, 7 tests)
- **Per wave merge:** `npx playwright test`
- **Phase gate:** All 7 Playwright tests green + NAV-04 manual smoke pass before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all automated phase requirements. NAV-04 route verification is manual-only (no automated deep-link test exists; acceptable for this cosmetic phase).

---

## Route Reference Audit

All six `router.push` call sites identified in CONTEXT.md reference deep routes that are NOT under `(tabs)/`. These routes are unchanged by this phase.

| File | Line | Route | Status after phase |
|------|------|-------|-------------------|
| `src/app/_layout.tsx` | 86 | `/plans/${planId}` | Unchanged — deep Stack route |
| `src/app/_layout.tsx` | 95 | `/plans/${planId}` | Unchanged — deep Stack route |
| `src/components/chat/PinnedPlanBanner.tsx` | 34 | `/plans/` + planId | Unchanged — deep Stack route |
| `src/screens/plans/PlanCreateModal.tsx` | 109 | `/plans/${planId}` | Unchanged — deep Stack route |
| `src/screens/plans/PlanDashboardScreen.tsx` | 297 | `/chat/room?plan_id=${planId}` | Unchanged — chat directory not renamed |
| `src/screens/plans/PlansListScreen.tsx` | 134 | `/plans/${item.id}` | Unchanged — deep Stack route |
| `src/screens/chat/ChatListScreen.tsx` | 20 | `/chat/room?plan_id=` + item.id | Unchanged — chat directory not renamed |

**Conclusion:** NAV-04 is satisfied with zero changes to router.push call sites when using the title-only rename approach.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/app/(tabs)/_layout.tsx` — current tab declarations, order, icons
- Direct code inspection: `tests/visual/design-system.spec.ts` — locators at lines 52, 60, 68, 76
- Direct code inspection: `playwright.config.ts` — test configuration, snapshot settings
- Direct code inspection: `src/app/(tabs)/plans.tsx`, `chat/index.tsx`, `chat/room.tsx`, `squad.tsx` — screen files
- Direct code inspection: all 7 router.push sites confirmed in source files
- Expo Router documentation principle (stable, project-verified): `name` prop = route identity, `title` = display label

### Secondary (MEDIUM confidence)
- Ionicons `compass` / `chatbubbles` icon names: consistent with Ionicons 5 naming convention, same pattern as all existing icons in codebase (`home`, `people`, `calendar`, `chatbubble`, `person` — all have `-outline` variants)

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; pure configuration change in existing files
- Architecture: HIGH — direct code inspection of all affected files; Expo Router behavior verified from existing codebase patterns
- Pitfalls: HIGH — derived from direct analysis of affected code paths (route segments, Playwright locator behavior)
- Playwright: HIGH — existing test file and snapshot directory fully inspected

**Research date:** 2026-04-04
**Valid until:** Stable — no external dependencies changing; valid until Expo Router major version change
