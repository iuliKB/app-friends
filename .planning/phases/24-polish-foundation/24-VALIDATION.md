---
phase: 24
slug: polish-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (via `npx jest`) |
| **Config file** | `jest.config.js` (existing) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | POLISH-02 | — | N/A | automated | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 24-01-02 | 01 | 1 | POLISH-01 | — | N/A | automated | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 2 | POLISH-03 | — | N/A | manual | Visual check — EmptyState with ctaLabel renders PrimaryButton | ✅ | ⬜ pending |
| 24-01-04 | 01 | 2 | POLISH-04 | — | N/A | manual | Visual check — PrimaryButton with loading prop shows ActivityIndicator | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/common/SkeletonPulse.tsx` — stub file to satisfy tsc before full implementation
- [ ] `src/theme/animation.ts` — must exist before SkeletonPulse imports it

*Wave 0 ensures TypeScript compiler doesn't fail mid-wave on missing imports.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shimmer gradient visible in light and dark mode | POLISH-01 | Visual rendering cannot be asserted by tsc | Run on simulator in both light/dark mode; confirm gradient band sweeps left-to-right |
| EmptyState CTA renders PrimaryButton | POLISH-03 | UI rendering verification | Render EmptyState with `ctaLabel="Test"` and confirm button appears |
| PrimaryButton loading state disables and shows spinner | POLISH-04 | UI rendering verification | Render PrimaryButton with `loading={true}` and confirm disabled + ActivityIndicator |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
