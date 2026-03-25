---
phase: 09-screen-consistency-sweep
plan: 01
subsystem: design-tokens
tags: [lint, migration, auth, common-components, theme]
dependency_graph:
  requires: [phase-07-design-tokens, phase-08-shared-components]
  provides: [no-hardcoded-styles-enforced, auth-domain-tokenised, common-components-tokenised]
  affects: [all-subsequent-domain-plans]
tech_stack:
  added: []
  patterns: [eslint-disable-next-line for no-exact-token values]
key_files:
  created: []
  modified:
    - eslint.config.js
    - src/components/common/AvatarCircle.tsx
    - src/components/common/EmptyState.tsx
    - src/components/common/FAB.tsx
    - src/components/common/FormField.tsx
    - src/components/common/OfflineBanner.tsx
    - src/components/common/PrimaryButton.tsx
    - src/components/common/LoadingIndicator.tsx
    - src/screens/auth/AuthScreen.tsx
    - src/screens/auth/ProfileSetup.tsx
    - src/components/auth/AuthTabSwitcher.tsx
    - src/components/auth/OAuthButton.tsx
    - src/components/auth/UsernameField.tsx
decisions:
  - "eslint-disable-next-line used for genuinely no-exact-token values (fontSize: 48 emoji, paddingTop: 48, paddingVertical: 14)"
  - "height/minHeight are not in SPACING_PROPS so no disable needed for those — rule only covers padding/margin/gap/fontSize"
  - "UsernameField updated to import FormField directly from @/components/common/FormField (no longer via re-export stub)"
metrics:
  duration: 5m
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_modified: 13
---

# Phase 9 Plan 01: ESLint Severity Flip + Auth/Common Token Migration Summary

ESLint `no-hardcoded-styles` upgraded from `warn` to `error`; 7 common components and 5 auth domain files fully migrated to `@/theme` tokens with zero lint violations.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Flip ESLint severity + migrate common components | 6e98377 | eslint.config.js severity warn->error; AvatarCircle, EmptyState, FAB, FormField, OfflineBanner, PrimaryButton, LoadingIndicator all migrated |
| 2 | Migrate auth domain | f4a6083 | AuthScreen, ProfileSetup, AuthTabSwitcher, OAuthButton, UsernameField all migrated |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- `height` and `minHeight` are not in the ESLint rule's `SPACING_PROPS` set, so no disable directives are needed for them. The plan's "no exact token" guidance only applies to actual flagged properties.
- `fontSize: 48` (emoji in EmptyState) has no FONT_SIZE token — suppressed with inline disable.
- `paddingVertical: 14` (FormField input) has no exact token — suppressed with inline disable per Phase 8 decision.
- `paddingTop: 48` (ProfileSetup title) has no SPACING token — suppressed with inline disable.
- UsernameField's import of FormField updated from `./FormField` (re-export stub) to `@/components/common/FormField` directly, ahead of stub deletion.

## Verification

- `grep "'campfire/no-hardcoded-styles': 'error'" eslint.config.js` — PASS
- `grep -r "@/constants/colors" src/components/common/ src/screens/auth/ src/components/auth/AuthTabSwitcher.tsx src/components/auth/OAuthButton.tsx src/components/auth/UsernameField.tsx` — PASS (empty)
- `npx eslint src/components/common/*.tsx src/screens/auth/*.tsx src/components/auth/AuthTabSwitcher.tsx src/components/auth/OAuthButton.tsx src/components/auth/UsernameField.tsx` — PASS (zero no-hardcoded-styles)
- `npx tsc --noEmit` — PASS (clean)

## Self-Check: PASSED

- eslint.config.js modified: FOUND
- AvatarCircle.tsx: FOUND (imports @/theme, no @/constants/colors)
- AuthScreen.tsx: FOUND (imports @/theme, no @/constants/colors)
- Commits 6e98377 and f4a6083: FOUND in git log
