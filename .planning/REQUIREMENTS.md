# Requirements — v1.8 Deep UI Refinement & Screen Overhaul

**Milestone goal:** Audit and overhaul every major screen — finish partially-built features, redesign Home/Squad/Explore/Auth UI from the ground up using /ui-ux-pro-max, and add a Welcome onboarding flow for new users.

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (continuing from v1.7 numbering)
**Phase coverage:** See Traceability section (filled by roadmapper)

---

## Active Requirements

### HOME — Home Screen Overhaul (Phase 29)

- [x] **HOME-05**: Radar bubbles clearly distinguish ALIVE, FADING (dimmed), and DEAD (visually distinct) friend statuses at a glance without requiring user interaction
- [x] **HOME-06**: User's last-used view mode (Radar vs Cards) is saved to AsyncStorage and restored on next app launch
- [ ] **HOME-07**: User with zero friends sees a prominent "Invite friends" CTA that routes to the Add Friend flow (replaces or augments current empty state)
- [x] **HOME-08**: Upcoming events section has polished card layout with consistent visual hierarchy, date/time prominence, and participant avatars

### SQUAD — Squad Screen Overhaul (Phase 30)

- [ ] **SQUAD-05**: Each Squad Dashboard card (Streak, Birthday, IOU) displays one primary hero metric and one clear CTA — no information overload on the card surface
- [ ] **SQUAD-06**: Friends list (CompactFriendRow) has polished avatar display, status freshness indicator, and consistent spacing that feels native to the app's design system
- [ ] **SQUAD-07**: Birthday card shows clear days-until-birthday countdown; IOU card shows net balance at a glance with directional indicator (you owe vs. owed to you)
- [ ] **SQUAD-08**: Streak card has a visually prominent streak count with positive-only framing and a clear visual progress indicator

### EXPLORE — Explore Screen Overhaul (Phase 31)

- [ ] **EXPLORE-01**: Explore map has a 3-state bottom sheet (Peek: compact plan count preview / Half: scrollable plan list / Full: full plan list with map minimized) — tapping a map pin shows an inline plan preview without navigating away from the map
- [ ] **EXPLORE-02**: Explore map, Plan Dashboard map tile, and Location Picker all respect the app's current light/dark theme (fixes hardcoded `userInterfaceStyle: 'dark'` on all three components)
- [ ] **EXPLORE-03**: Explore map has a "Reset to my location" chip that re-centers the map on the user's current GPS position
- [ ] **EXPLORE-04**: Plan list (Explore tab) has a polished card layout with consistent visual hierarchy, improved loading skeleton, and a contextual empty state

### AUTH — Auth Screen Redesign (Phase 32)

- [ ] **AUTH-05**: Auth screen applies the correct light/dark theme — the LinearGradient background respects the OS theme setting (fixes the always-dark bug at `AuthScreen.tsx:410`)
- [ ] **AUTH-06**: Login error messages are specific: "No account found with this email" vs "Incorrect password" rather than a generic failure message

### ONBOARD — Welcome / Onboarding Flow (Phase 33)

- [ ] **ONBOARD-01**: New users see a 3-screen slide onboarding flow (powered by `react-native-pager-view`) before reaching the main app — each slide introduces a core Campfire concept
- [ ] **ONBOARD-02**: A Skip button is visible on every Welcome slide and routes directly to the main app (not the next slide)
- [ ] **ONBOARD-03**: The final Welcome slide CTA routes to Squad → Friends tab if the user has zero friends, or to Home if the user already has friends
- [ ] **ONBOARD-04**: Welcome flow is gated by the `@campfire/welcome_complete` AsyncStorage key — new users (key absent) see the flow; existing users (key present) never see it

---

## Future Requirements

- Account deletion flow — important before App Store submission, defer to v1.9
- Animated splash screen (Lottie) — complex, requires EAS, defer to v1.9
- Pull-to-refresh haptic on all list screens — nice to have, defer to v1.9
- Keyboard avoiding improvements for chat on older iOS — not blocking, defer to v1.9
- OAuth button hierarchy (Apple ≥ Google) — App Store best practice, defer to v1.9
- Password confirm field removal on sign-up — mobile UX improvement, defer to v1.9

---

## Out of Scope

- App Store metadata, screenshots, description — not submitting yet
- New features (challenges, live location, calendar sync) — polish milestone only
- Playwright visual regression baseline updates — web renderer not representative of native polish
- Android adaptive icon monochromeImage — no EAS build yet
- React Native New Architecture deliberate opt-in — Reanimated 4 works without explicit flag

---

## Traceability

| REQ-ID | Requirement | Phase |
|--------|-------------|-------|
| HOME-05 | Radar ALIVE/FADING/DEAD visual distinction | Phase 29 |
| HOME-06 | View mode persistence (AsyncStorage) | Phase 29 |
| HOME-07 | Zero-friends "Invite friends" CTA | Phase 29 |
| HOME-08 | Events section card polish | Phase 29 |
| SQUAD-05 | Dashboard card hero metric + CTA redesign | Phase 30 |
| SQUAD-06 | Friends list polish | Phase 30 |
| SQUAD-07 | Birthday + IOU card layout | Phase 30 |
| SQUAD-08 | Streak card visual polish | Phase 30 |
| EXPLORE-01 | 3-state map bottom sheet | Phase 31 |
| EXPLORE-02 | Map theme fix (light/dark) | Phase 31 |
| EXPLORE-03 | Reset to my location chip | Phase 31 |
| EXPLORE-04 | Plan list card polish | Phase 31 |
| AUTH-05 | Auth screen light/dark theme fix | Phase 32 |
| AUTH-06 | Specific login error messages | Phase 32 |
| ONBOARD-01 | 3-screen Welcome slide flow | Phase 33 |
| ONBOARD-02 | Real Skip button | Phase 33 |
| ONBOARD-03 | Smart final CTA routing | Phase 33 |
| ONBOARD-04 | New-users-only gate | Phase 33 |

---

*Last updated: 2026-05-06 — v1.8 requirements defined*
