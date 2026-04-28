# Phase 19: Theme Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 19-theme-migration
**Areas discussed:** Migration wave structure, Regression verification gate, Profile THEME-01 completion, Special-case files

---

## Migration Wave Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom-up layers | Plan A: shared/auth components → Plan B: feature components → Plan C: screens + shim removal | ✓ |
| Feature-area waves | One plan per tab area | |
| Two big plans | All components vs all screens | |
| Single plan — all at once | 101 files in one pass | |

**User's choice:** Bottom-up layers (recommended)

**Follow-up — plan count:**

| Option | Description | Selected |
|--------|-------------|----------|
| 3 plans | Shared+auth (~30) / Feature components (~40) / Screens+shim (~31) | ✓ |
| 4 plans | Further split feature components wave | |
| 2 plans | All components / Screens+shim | |

**User's choice:** 3 plans (recommended)

---

## Regression Verification Gate

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript + manual scroll both modes | `tsc --noEmit` + quick scroll in light + dark in Expo Go after each plan | ✓ |
| Playwright visual tests in both themes | Run existing Playwright suite per wave | |
| TypeScript only, full UAT at the end | TypeScript per plan, one UAT after Plan C | |

**User's choice:** TypeScript + manual scroll both modes (recommended)

---

## Profile THEME-01 Completion

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle works end-to-end — that's it | Satisfied once all screens respond and persist across restart | ✓ |
| Add visual confirmation on toggle | Haptic + animation on theme switch | |
| Verify System mode edge cases explicitly | Verify live system appearance changes while app is foregrounded | |

**User's choice:** Toggle works end-to-end — that's it (recommended)

---

## Special-Case Files

| Option | Description | Selected |
|--------|-------------|----------|
| No special cases — trust the pattern | Uniform `useMemo([colors])` pattern everywhere | ✓ |
| Flag chat components specifically | Extra manual testing for ChatRoomScreen, MessageBubble, SendBar | |
| Flag _layout.tsx files | First-pass review for layout files | |

**User's choice:** No special cases — trust the pattern (recommended)

---

## Claude's Discretion

- Exact file groupings within each wave
- Whether to split non-color StyleSheet entries into a static constant
- Order of files within each plan

## Deferred Ideas

None.
