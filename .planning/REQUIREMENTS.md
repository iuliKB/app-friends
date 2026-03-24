# Requirements: Campfire

**Defined:** 2026-03-24
**Core Value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must

## v1.1 Requirements

Requirements for UI/UX Design System milestone. Each maps to roadmap phases.

### Design Tokens

- [x] **TOKN-01**: Color constants reorganized into semantic groups (text, surface, interactive, feedback) with all hardcoded hex literals replaced
- [x] **TOKN-02**: Spacing scale defined (4/8/12/16/24/32) and exported as named constants
- [x] **TOKN-03**: Typography scale defined (caption/bodyMedium/bodyLarge/sectionTitle/screenTitle) with size + weight pairs
- [x] **TOKN-04**: Border radius tokens defined from audited values and exported as named constants
- [x] **TOKN-05**: Shadow tokens defined for card and elevated surface styles
- [x] **TOKN-06**: ESLint rule rejects hardcoded hex color literals and raw numeric fontSize/padding values in StyleSheet

### Shared Components

- [x] **COMP-01**: Unified FAB component supports icon-only, icon+label, and centered variants via props
- [x] **COMP-02**: FormField component moved from auth/ to common/ with consistent styling using design tokens
- [x] **COMP-03**: ErrorDisplay component for inline form errors and screen-level error states
- [x] **COMP-04**: ScreenHeader component with consistent title treatment matching Plans view pattern
- [x] **COMP-05**: Pull-to-refresh (RefreshControl) added to Home, Plans, and Friends list views

### Screen Consistency

- [x] **SCRN-01**: All 11 screens use spacing tokens instead of raw numeric padding/margin values
- [x] **SCRN-02**: All screens use typography tokens instead of raw fontSize/fontWeight values
- [ ] **SCRN-03**: All screens use border radius and shadow tokens instead of raw values
- [x] **SCRN-04**: Undeclared color #3b82f6 resolved with semantic token name
- [ ] **SCRN-05**: All FAB instances replaced with unified FAB component
- [x] **SCRN-06**: All form inputs use shared FormField component
- [ ] **SCRN-07**: All view titles use shared ScreenHeader component

## Future Requirements

### Theming

- **THME-01**: Dark mode support via useColorScheme + semantic color tokens
- **THME-02**: User theme preference override (light/dark/system)

### Advanced Components

- **ADVC-01**: Toast/snackbar notification component
- **ADVC-02**: Bottom sheet component
- **ADVC-03**: Skeleton loading placeholders

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dark mode | Semantic naming positions for it, but implementation deferred to v1.2+ |
| Theme provider / React Context for theming | Unnecessary for single-theme app, adds complexity |
| Animation tokens | Over-engineering for current app scale |
| Storybook / component playground | Overhead not justified for team size |
| Responsive breakpoints | Fixed mobile form factor, unnecessary |
| UI component library (NativeWind, Tamagui) | Violates StyleSheet-only constraint |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOKN-01 | Phase 7 | Complete |
| TOKN-02 | Phase 7 | Complete |
| TOKN-03 | Phase 7 | Complete |
| TOKN-04 | Phase 7 | Complete |
| TOKN-05 | Phase 7 | Complete |
| TOKN-06 | Phase 7 | Complete |
| COMP-01 | Phase 8 | Complete |
| COMP-02 | Phase 8 | Complete |
| COMP-03 | Phase 8 | Complete |
| COMP-04 | Phase 8 | Complete |
| COMP-05 | Phase 8 | Complete |
| SCRN-01 | Phase 9 | Complete |
| SCRN-02 | Phase 9 | Complete |
| SCRN-03 | Phase 9 | Pending |
| SCRN-04 | Phase 9 | Complete |
| SCRN-05 | Phase 9 | Pending |
| SCRN-06 | Phase 9 | Complete |
| SCRN-07 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap creation*
