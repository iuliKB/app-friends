---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — Phase 1 establishes scaffold. Lint + typecheck as validation proxy. |
| **Config file** | `eslint.config.js` + `tsconfig.json` (created in Plan 01-01) |
| **Quick run command** | `npx expo lint && npx tsc --noEmit` |
| **Full suite command** | `npx expo lint && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx expo lint && npx tsc --noEmit`
- **After every plan wave:** Run `npx expo lint && npx tsc --noEmit` + manual smoke test on device
- **Before `/gsd:verify-work`:** Full lint + typecheck must be green + physical device smoke test
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFR-05 | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | INFR-03 | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | INFR-01 | manual-only | Supabase dashboard confirms tables | N/A | ⬜ pending |
| 01-02-02 | 02 | 1 | INFR-02 | manual-only | Dashboard RLS check | N/A | ⬜ pending |
| 01-02-03 | 02 | 1 | INFR-04 | file-check | `test -f supabase/seed.sql` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | INFR-06 | manual-only | Dashboard RPC check | N/A | ⬜ pending |
| 01-03-01 | 03 | 2 | AUTH-01 | manual-only | Test on device | N/A | ⬜ pending |
| 01-03-02 | 03 | 2 | AUTH-02 | manual-only | Test on physical device | N/A | ⬜ pending |
| 01-03-03 | 03 | 2 | AUTH-03 | manual-only | Test on iOS device | N/A | ⬜ pending |
| 01-03-04 | 03 | 2 | AUTH-04 | manual-only | Close/reopen app | N/A | ⬜ pending |
| 01-03-05 | 03 | 2 | AUTH-05 | manual-only | Tap logout, verify | N/A | ⬜ pending |
| 01-03-06 | 03 | 2 | PROF-01 | manual-only | Complete profile, verify | N/A | ⬜ pending |
| 01-03-07 | 03 | 2 | PROF-02 | manual-only | Upload avatar, verify | N/A | ⬜ pending |
| 01-03-08 | 03 | 2 | NAV-01 | manual-only | Visual inspection | N/A | ⬜ pending |
| 01-03-09 | 03 | 2 | NAV-02 | manual-only | Visual inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tsconfig.json` — `strict: true, noUncheckedIndexedAccess: true` (created in Plan 01-01)
- [ ] `eslint.config.js` — created by `npx expo lint` in Plan 01-01
- [ ] `lib/types.ts` — generated TypeScript types from Supabase schema (Plan 01-02)
- [ ] `supabase/seed.sql` — moved from project root (Plan 01-02)

*(No dedicated test file infrastructure needed for Phase 1; all validation is lint + typecheck + manual)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email signup creates user | AUTH-01 | Requires Supabase auth + device | Create account on device, verify in Supabase Auth dashboard |
| Google OAuth completes | AUTH-02 | Requires physical device + browser redirect | Test on iOS + Android via Expo Go |
| Apple Sign-In works | AUTH-03 | Requires iOS physical device | Test on iOS device, confirm in dashboard |
| Session persists on restart | AUTH-04 | Requires app restart cycle | Close app, reopen, verify logged in |
| Logout redirects to auth | AUTH-05 | Requires device interaction | Tap logout button, verify redirect |
| Profile creation flow | PROF-01 | Requires full auth + form flow | Complete profile after signup, check profiles table |
| Avatar uploads to Storage | PROF-02 | Requires device photo picker | Select photo, check Supabase Storage |
| 5 tabs visible | NAV-01 | Visual UI check | Open app, verify all 5 tabs render |
| Squad tab shows stub | NAV-02 | Visual UI check | Tap Squad tab, verify "Coming soon" card |
| RLS policies enforced | INFR-02 | Requires Supabase dashboard | Query pg_tables for rowsecurity column |
| RPC functions exist | INFR-06 | Requires Supabase dashboard | Check pg_proc for public functions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
