---
phase: 20
slug: map-feature
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed in this project |
| **Config file** | none |
| **Quick run command** | N/A |
| **Full suite command** | N/A |
| **Estimated runtime** | N/A |

---

## Sampling Rate

- **After every task commit:** TypeScript build check — `npx tsc --noEmit`
- **After every plan wave:** Full TypeScript build + manual device verification
- **Before `/gsd-verify-work`:** All manual verifications below must be signed off
- **Max feedback latency:** ~30 seconds (tsc) + manual device steps

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 0 | MAP-01 | — | N/A | manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 1 | MAP-01 | — | N/A | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 2 | MAP-02/03 | — | N/A | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 20-04-01 | 04 | 2 | MAP-04 | — | N/A | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 20-05-01 | 05 | 2 | MAP-05 | — | N/A | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npx expo install react-native-maps expo-location react-native-map-link` — install native map libraries
- [ ] EAS development build triggered after plugin config updates

*Note: No test file stubs needed — all MAP-* requirements are manual-only (GPS, map rendering, deep links require device).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Location picker opens map, pin drops on GPS position, dragging map moves center coords | MAP-01 | Native map interaction + GPS required | Open plan creation → tap "Add location" → verify map centers on current location; drag map → verify pin stays fixed at center; tap Confirm → verify coordinates + address label saved |
| Map tile appears on Plan Dashboard when plan has lat/lng; absent when null | MAP-02 | Visual verification + database state | Open plan with location → verify map tile with pin visible; open plan without location → verify no map tile |
| Address label is human-readable (not raw coordinates) | MAP-03 | Geocoder result varies by location | Attach location to plan → verify location text is formatted as "Street, City" not "43.65, -79.38" |
| Explore map tab shows friend plan pins; tapping pin navigates to plan | MAP-04 | Device GPS + friend data required | Switch to map view in Explore → verify friend plan pins visible; tap pin → verify navigation to plan dashboard |
| Get directions opens native maps app | MAP-05 | Deep link requires device + installed apps | Tap directions on plan with location → verify maps app opens with destination pre-filled |

---

## Validation Sign-Off

- [ ] TypeScript builds clean after each wave (`npx tsc --noEmit`)
- [ ] All manual verifications in table above completed on device
- [ ] No 3 consecutive tasks without TypeScript build check
- [ ] EAS dev build confirmed working before Wave 1
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
