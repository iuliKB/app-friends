---
phase: 07-design-tokens
plan: 02
subsystem: tooling/lint
tags: [eslint, design-tokens, lint-rule, enforcement]
dependency_graph:
  requires: []
  provides: [custom-eslint-rule-no-hardcoded-styles, eslint-plugin-campfire]
  affects: [all .tsx files with StyleSheet.create(), CI lint checks]
tech_stack:
  added: [eslint-rules/no-hardcoded-styles.js (local ESLint plugin)]
  patterns: [ESLint flat config local plugin, AST visitor pattern]
key_files:
  created: [eslint-rules/no-hardcoded-styles.js]
  modified: [eslint.config.js]
decisions:
  - "Custom rule loaded as 'campfire' local plugin — no npm package needed"
  - "Severity set to 'warn' for Phase 7-8; will be upgraded to 'error' in Phase 9"
  - "Values 0 and 1 are exempt (resets and hairline values, not design intent)"
  - "borderRadius NOT flagged per explicit user decision"
  - "rgba() string literals flagged the same as hex literals"
metrics:
  duration: "2 minutes"
  completed: "2026-03-24"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 7 Plan 02: ESLint Design Token Enforcement Rule Summary

**One-liner:** Custom ESLint 'campfire/no-hardcoded-styles' rule fires warnings on hex colors and raw numeric fontSize/padding/margin/gap in StyleSheet.create() contexts, with src/theme/ exempt.

## What Was Built

A two-file implementation that makes design token compliance machine-verifiable:

1. **`eslint-rules/no-hardcoded-styles.js`** — Custom ESLint rule using AST visitor pattern. Detects three categories of violations inside `StyleSheet.create()` call contexts: hex color literals (and rgba strings), raw numeric spacing values (17 properties: padding/margin/gap variants), and raw numeric fontSize values. Exempts values 0 and 1. Exempts files inside `src/theme/`.

2. **`eslint.config.js`** (updated) — Loads the custom rule as a `campfire` local plugin with `'warn'` severity. Adds a separate file override block that sets the rule to `'off'` for `src/theme/**/*.ts` token definition files. Preserves the existing expo and prettier config entries.

## Verification Results

- `npx eslint src/components/chat/MessageBubble.tsx` — **21 no-hardcoded-styles warnings** (hex colors, rgba, fontSize, padding, margin, gap)
- `npx eslint src/theme/colors.ts` — **0 no-hardcoded-styles warnings** (token files exempt)
- `npx eslint src/screens/home/HomeScreen.tsx` — **18 no-hardcoded-styles warnings** (raw spacing/fontSize)
- `node -e "require('./eslint-rules/no-hardcoded-styles.js')"` — exits 0

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create custom ESLint rule for hardcoded style detection | dfc5ece | eslint-rules/no-hardcoded-styles.js |
| 2 | Integrate rule into eslint.config.js and verify warnings fire | 8f08db5 | eslint.config.js |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

- **Local plugin pattern:** Rule is loaded as a `campfire` named plugin directly from the project root — no npm package publishing required. The plugin name `campfire` will be the namespace for all future project-specific lint rules.
- **Severity 'warn' confirmed:** This is the correct severity for Phase 7-8. The upgrade to 'error' happens in Phase 9 after all screens are migrated.
- **rgba() flagged:** rgba string literals are treated the same as hex literals — both bypass the color token system.
- **Negative values flagged:** `margin: -8` style negative UnaryExpressions are caught for spacing properties.

## Self-Check: PASSED

- eslint-rules/no-hardcoded-styles.js: FOUND
- eslint.config.js: FOUND
- Commit dfc5ece: FOUND
- Commit 8f08db5: FOUND

