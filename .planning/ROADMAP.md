# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- 🚧 **v1.1 UI/UX Design System** — Phases 7-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-24</summary>

- [x] Phase 1: Foundation + Auth (4/4 plans) — completed 2026-03-17
- [x] Phase 2: Friends + Status (3/3 plans) — completed 2026-03-17
- [x] Phase 3: Home Screen (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Plans (3/3 plans) — completed 2026-03-18
- [x] Phase 5: Chat (2/2 plans) — completed 2026-03-18
- [x] Phase 6: Notifications + Polish (3/3 plans) — completed 2026-03-19

</details>

### 🚧 v1.1 UI/UX Design System (In Progress)

**Milestone Goal:** Extract a design system from the best v1.0 screens and apply it consistently across the entire app, eliminating all hardcoded style values and creating a foundation for future views.

- [x] **Phase 7: Design Tokens** — Define all token constants (color, spacing, typography, radii, shadows) and install the lint rule that enforces their use (completed 2026-03-24)
- [ ] **Phase 8: Shared Components** — Build the common component library (FAB, FormField, ErrorDisplay, ScreenHeader, pull-to-refresh) on top of design tokens
- [ ] **Phase 9: Screen Consistency Sweep** — Migrate all 11 screens to use tokens and shared components; lint rule passes across all files

## Phase Details

### Phase 7: Design Tokens
**Goal**: All style constants live in named token files in src/theme/; a lint rule enforces token usage from day one
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: TOKN-01, TOKN-02, TOKN-03, TOKN-04, TOKN-05, TOKN-06
**Success Criteria** (what must be TRUE):
  1. Importing `COLORS`, `SPACING`, `FONT_SIZE`, `FONT_WEIGHT`, `RADII`, and `SHADOWS` from `@/theme` provides named constants for every visual value used in the app
  2. The undeclared blue `#3b82f6` has a named semantic token (`COLORS.feedback.info`) in the color file
  3. Any `.tsx` file with a hardcoded hex literal or raw numeric `fontSize`/`padding` value triggers an ESLint warning
  4. TypeScript autocomplete offers token names when typing `SPACING.` or `FONT_SIZE.` in any file
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Create all design token files in src/theme/ (colors, spacing, typography, radii, shadows, barrel export)
- [ ] 07-02-PLAN.md — Create ESLint rule enforcing token usage (block hardcoded hex + raw spacing/typography values)

### Phase 8: Shared Components
**Goal**: A small shared component library exists in `src/components/common/` that covers every repeated UI pattern across screens, all built with Phase 7 tokens
**Depends on**: Phase 7
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. A single `<FAB>` component renders correctly in all three existing variants (icon-only, icon+label, centered) via props — no inline FAB JSX remains in any screen
  2. `<FormField>` is importable from `@/components/common/` and renders identically to the auth-screen version it replaced
  3. `<ErrorDisplay>` renders inline form errors and screen-level error states with consistent styling
  4. `<ScreenHeader>` renders a screen title matching the Plans view treatment, with an optional right-action slot
  5. Pull-to-refresh (RefreshControl) works on Home, Plans, and Friends list views — dragging down triggers a data reload
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Screen Consistency Sweep
**Goal**: Every screen and component in the app uses only design tokens and shared components — no raw style values remain and the lint rule passes across all 221 files
**Depends on**: Phase 7, Phase 8
**Requirements**: SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05, SCRN-06, SCRN-07
**Success Criteria** (what must be TRUE):
  1. All 11 screens visually match their pre-refactor appearance — no layout regressions on either iOS or Android
  2. The ESLint hardcoded-value rule passes on every `.tsx` file in the repository (zero violations)
  3. Every screen title uses `<ScreenHeader>` and looks consistent across the app
  4. Every form input uses `<FormField>` with token-based styling
  5. `tsc --noEmit` passes with `"strict": true` and `"noUncheckedIndexedAccess": true` after all migrations
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Auth | v1.0 | 4/4 | Complete | 2026-03-17 |
| 2. Friends + Status | v1.0 | 3/3 | Complete | 2026-03-17 |
| 3. Home Screen | v1.0 | 2/2 | Complete | 2026-03-18 |
| 4. Plans | v1.0 | 3/3 | Complete | 2026-03-18 |
| 5. Chat | v1.0 | 2/2 | Complete | 2026-03-18 |
| 6. Notifications + Polish | v1.0 | 3/3 | Complete | 2026-03-19 |
| 7. Design Tokens | 2/2 | Complete    | 2026-03-24 | - |
| 8. Shared Components | v1.1 | 0/TBD | Not started | - |
| 9. Screen Consistency Sweep | v1.1 | 0/TBD | Not started | - |
