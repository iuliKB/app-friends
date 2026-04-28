# Phase 19: Theme Migration - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate every file that imports the static `COLORS` symbol (101 files) to read colors through `useTheme()` instead. After all files are migrated, remove the `COLORS` compat shim from `src/theme/index.ts`. The Profile APPEARANCE section and `ThemeSegmentedControl` were built in Phase 18-03 and require no further changes — this phase makes the rest of the app respond to them.

</domain>

<decisions>
## Implementation Decisions

### Migration Wave Structure

- **D-01:** Three-plan bottom-up wave structure:
  - **Plan A:** Shared + auth components (`src/components/common/`, `src/components/status/`, `src/components/friends/`, `src/components/auth/`, `src/components/notifications/`) — ~30 files. Shared components migrated first so every screen that consumes them inherits correct theming immediately.
  - **Plan B:** Feature components (`src/components/home/`, `src/components/chat/`, `src/components/plans/`, `src/components/iou/`, `src/components/squad/`) — ~40 files.
  - **Plan C:** App screens (`src/app/` routes, `src/screens/`) + compat shim removal — ~31 files.

### StyleSheet Migration Pattern

- **D-02:** Carried from Phase 18 (D-05): `StyleSheet.create` must be called **inside the component body** wrapped in `useMemo([colors])`. Module-level `StyleSheet.create` calls that reference `COLORS` must be moved inside the function. Non-color StyleSheet entries (layout, spacing, typography) can stay in the memo or be split to a static constant if helpful — Claude's discretion.

### Regression Verification Gate

- **D-03:** After each plan: `tsc --noEmit` must pass with zero errors. Then a quick manual scroll through all five tabs in **light mode** and **dark mode** in Expo Go. No Playwright required per wave. Full TypeScript clean + manual smoke covers the correctness bar.

### THEME-01 Completion

- **D-04:** THEME-01 is satisfied when tapping Light / Dark / System in Profile instantly flips every screen and persists across an app restart. No visual confirmation animation or additional polish required beyond what Phase 18-03 built. Compat shim removal in Plan C is the final gate — once it passes TypeScript, THEME-01 is done.

### Special Cases

- **D-05:** No files are flagged for special treatment. The `useMemo([colors])` pattern is applied uniformly. The planner may add notes in plan tasks for any file that uses `COLORS` in conditional or computed expressions (not just StyleSheet), but no separate handling strategy is needed.

### Compat Shim Removal

- **D-06:** The compat shim (`export { COLORS } from './colors'` line in `src/theme/index.ts`) is removed in Plan C after all files have been migrated. TypeScript will surface any missed import as a compile error, making the removal a correctness gate. After shim removal, `COLORS` must not appear in any non-theme source file.

### Claude's Discretion

- Exact grouping of files within each wave (planner decides the precise list per plan)
- Whether to split non-color StyleSheet entries into a static constant vs keeping everything in `useMemo`
- Order of files within each plan (planner can sequence for minimal diff size)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Theme system source files
- `src/theme/ThemeContext.tsx` — `useTheme()` hook implementation and return shape (`{ colors, isDark, theme, setTheme }`)
- `src/theme/colors.ts` — existing DARK palette (= current `COLORS` object)
- `src/theme/light-colors.ts` — LIGHT palette
- `src/theme/index.ts` — barrel export; compat shim line to remove in Plan C

### Migration pattern reference
- `src/app/(tabs)/profile.tsx` — already migrated in Phase 18-03; use as the migration pattern reference for screens
- `src/components/common/ThemeSegmentedControl.tsx` — Phase 18-03 component; example of `useTheme()` usage

### Migration scope
- All 101 files matching `grep -rl "import.*COLORS" src/` — full list is the authoritative source; do NOT hardcode a subset in the plan

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTheme()` from `src/theme/ThemeContext.tsx` — returns `{ colors, isDark, theme, setTheme }`; `colors` is the resolved DARK or LIGHT palette
- `src/hooks/useViewPreference.ts` — AsyncStorage pattern reference (used for theme persistence in Phase 18)

### Established Patterns
- `StyleSheet.create` at module level with static `COLORS.x` references → must become `useMemo([colors], () => StyleSheet.create({ ... colors.x ... }))` inside the component
- Import change: `import { COLORS } from '@/theme'` → `import { useTheme } from '@/theme'` + `const { colors } = useTheme()` inside the component
- Non-color tokens (`SPACING`, `FONT_SIZE`, etc.) continue to be imported directly from `@/theme` — no change needed

### Integration Points
- `src/app/_layout.tsx` — `ThemeProvider` already wraps the tree (Phase 18-02); all child components can call `useTheme()` safely
- `src/theme/index.ts` — Plan C removes the `export { COLORS } from './colors'` line; TypeScript becomes the migration completeness verifier

</code_context>

<specifics>
## Specific Ideas

- The compat shim removal in Plan C doubles as a correctness gate: if any file still imports `COLORS`, TypeScript will error, surfacing missed migrations automatically.
- 101 files actual count (roadmap says ~98 — close enough; the grep result is authoritative).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-theme-migration*
*Context gathered: 2026-04-28*
