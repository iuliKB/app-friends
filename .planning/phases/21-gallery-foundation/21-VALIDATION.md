---
phase: 21
slug: gallery-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | npx tsx + node:assert/strict (no test framework — project pattern) |
| **Config file** | none — tests are plain TypeScript files run with `npx tsx` |
| **Quick run command** | `npx tsx tests/unit/uploadPlanPhoto.test.ts` |
| **Full suite command** | `npx tsx tests/unit/uploadPlanPhoto.test.ts && npx tsx tests/unit/usePlanPhotos.photoCap.test.ts` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx tests/unit/uploadPlanPhoto.test.ts`
- **After every plan wave:** Run full suite command above
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | GALL-01 | — | Wave 0 test scaffolds created and exit 0 | unit | `npx tsx tests/unit/uploadPlanPhoto.test.ts && npx tsx tests/unit/usePlanPhotos.photoCap.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | GALL-01 | T-21-01 | Migration creates plan_photos table with correct schema | manual | `supabase db push && supabase db diff` | ❌ W0 | ⬜ pending |
| 21-01-03 | 01 | 1 | GALL-01 | T-21-02 | RLS enforces plan membership on plan_photos | manual | Supabase Studio / SQL query | ❌ W0 | ⬜ pending |
| 21-01-04 | 01 | 1 | GALL-02 | T-21-03 | add_plan_photo RPC rejects non-members | manual | Supabase RPC call test | ❌ W0 | ⬜ pending |
| 21-01-05 | 01 | 1 | GALL-02 | T-21-04 | add_plan_photo RPC enforces 10-photo cap atomically | manual | Supabase RPC call test | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | GALL-01 | — | supabase db push applies migration without error | manual | `supabase db diff 2>&1 \| grep "No schema changes found"` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | GALL-01 | — | uploadPlanPhoto returns storage path (not URL) for private bucket | unit | `npx tsx tests/unit/uploadPlanPhoto.test.ts` | ❌ W0 | ⬜ pending |
| 21-02-03 | 02 | 2 | GALL-01 | — | uploadPlanPhoto compresses to 1920px / 0.85 quality | unit | `npx tsx tests/unit/uploadPlanPhoto.test.ts` | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 3 | GALL-03 | — | usePlanPhotos generates signed URLs via createSignedUrls batch call | unit | `npx tsx tests/unit/usePlanPhotos.photoCap.test.ts` | ❌ W0 | ⬜ pending |
| 21-03-02 | 03 | 3 | GALL-03 | — | usePlanPhotos uploadPhoto returns photo_cap_exceeded error when cap hit | unit | `npx tsx tests/unit/usePlanPhotos.photoCap.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/uploadPlanPhoto.test.ts` — stubs for GALL-01 upload lib (uses `node:assert/strict`, run with `npx tsx`)
- [ ] `tests/unit/usePlanPhotos.photoCap.test.ts` — stubs for GALL-03 cap logic (uses `node:assert/strict`, run with `npx tsx`)
- [ ] Inline mocks for `expo-image-manipulator`, `@supabase/supabase-js` storage client via module-level overrides in test files

*Database/RLS tests are manual-only — see Manual-Only Verifications below.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| plan_photos table created with correct columns and constraints | GALL-01 | Requires live Supabase instance; no mock covers DDL | Run `supabase db push` → check `plan_photos` table in Supabase Studio |
| RLS blocks non-member reads on plan_photos | GALL-01 | Live RLS enforcement | Query plan_photos as non-member user via Supabase Studio SQL editor |
| Storage bucket plan-gallery is private (no public URLs) | GALL-01 | Live Storage config | Verify bucket settings in Supabase Storage dashboard |
| add_plan_photo RPC rejects non-members | GALL-02 | Live RPC execution | Call RPC as non-member, expect permission error |
| add_plan_photo RPC rejects 11th photo with photo_cap_exceeded | GALL-02 | Live RPC execution | Insert 10 photos, attempt 11th, verify error code |
| Storage RLS blocks non-member from reading storage objects | GALL-01 | Live Storage RLS | Attempt signed URL generation as non-member via Supabase client |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
