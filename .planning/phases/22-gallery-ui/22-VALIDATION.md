---
phase: 22
slug: gallery-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit framework** | Node built-in assert via `npx tsx` (no jest/vitest installed) |
| **Visual framework** | Playwright (`@playwright/test` ^1.58.2) |
| **Unit config** | None — run directly: `npx tsx tests/unit/<file>.test.ts` |
| **Visual config** | `playwright.config.ts` — `testDir: ./tests/visual`, base URL: `http://localhost:8081` |
| **Quick run command** | `npx tsx tests/unit/gallery.photoCap.test.ts` |
| **Full suite command** | `npx playwright test tests/visual/plan-gallery.spec.ts` |
| **Estimated runtime** | ~15 seconds (unit), ~60 seconds (visual, requires Expo web server) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx tests/unit/gallery.photoCap.test.ts`
- **After every plan wave:** Run `npx playwright test tests/visual/plan-gallery.spec.ts`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | — | — | N/A — test infrastructure only | unit | `npx tsx tests/unit/gallery.photoCap.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | — | — | N/A — test infrastructure only | visual | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | GALL-04 | — | N/A | visual | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 1 | GALL-04 | — | N/A | visual | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | GALL-05 | — | N/A | visual | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ W0 | ⬜ pending |
| 22-03-02 | 03 | 2 | GALL-06 | — | N/A | visual | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ W0 | ⬜ pending |
| 22-03-03 | 03 | 2 | GALL-07 | T-21-del | Delete only own photos (RLS enforced server-side) | visual | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ W0 | ⬜ pending |
| 22-03-04 | 03 | 2 | GALL-08 | — | N/A | manual | See Manual-Only Verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/gallery.photoCap.test.ts` — unit tests for "hide Add button at ≥ 10 own photos" logic and `isMember` derivation
- [ ] `tests/visual/plan-gallery.spec.ts` — Playwright visual tests for GALL-04, GALL-05, GALL-06, GALL-07; includes FlatList refactor regression check

*Existing infrastructure (Playwright + npx tsx) covers the phase — only new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Save to camera roll | GALL-08 | `expo-media-library` is a native API; Playwright runs on Chromium (web) and cannot access the device camera roll | Open any plan with photos → open GalleryViewerModal → tap Save → confirm photo appears in device Photos app; confirm haptic fires |

*GALL-08 is deferred to the project's Hardware Verification Gate (v1.3 Phase 5 policy).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
