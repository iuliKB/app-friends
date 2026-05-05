# Requirements — v1.7 Polish & Launch Ready

**Milestone goal:** Take every shipped feature from functional to great — comprehensive UI/UX polish, interaction refinements, and feature improvements across the entire app, plus final app icon and splash screen branding.

**REQ-ID format:** `[CATEGORY]-[NUMBER]`
**Phase coverage:** See Traceability section (filled by roadmapper)

---

## Active Requirements

### POLISH — Foundation

- [ ] **POLISH-01**: User sees SkeletonPulse shimmer placeholders on any screen while data is loading
- [ ] **POLISH-02**: Animation durations and easing values are defined as `src/theme/` tokens so animation is consistent across the app
- [ ] **POLISH-03**: EmptyState component supports an optional CTA button to guide users to action from empty screens
- [ ] **POLISH-04**: PrimaryButton shows an inline spinner when an async operation is in progress

### BRAND — App Icon & Splash

- [ ] **BRAND-01**: App has a final 1024×1024 branded Campfire icon replacing the Expo placeholder
- [ ] **BRAND-02**: Splash screen uses branded imagery with a fade transition configured via the expo-splash-screen plugin
- [ ] **BRAND-03**: Splash screen adapts to dark/light OS mode (separate dark and light background treatments)

### HOME — Home Screen

- [ ] **HOME-01**: Home screen shows SkeletonPulse placeholders while friend status data loads
- [ ] **HOME-02**: New user with zero friends sees an actionable empty state guiding them to add a friend
- [ ] **HOME-03**: Friends with FADING heartbeat status show a subtle animated pulse on their radar bubble
- [ ] **HOME-04**: All tappable cards on the home screen have spring press feedback (scale 1.0→0.96)

### CHAT — Chat & Messaging

- [ ] **CHAT-01**: Chat list screen shows skeleton rows while conversations load
- [ ] **CHAT-02**: Sending a message triggers `impactAsync(Light)` haptic; tapping a reaction triggers `selectionAsync()`
- [ ] **CHAT-03**: Sent messages appear immediately in the conversation with a subtle "sending" indicator before server confirmation
- [ ] **CHAT-04**: Long-pressing a message bubble shows a subtle scale press animation before the context menu appears

### PLANS — Plans & Explore

- [ ] **PLANS-01**: Plans list (Explore tab) shows skeleton cards while plan data loads
- [ ] **PLANS-02**: RSVP buttons (Yes/No/Maybe) have a spring bounce animation and haptic feedback on press
- [ ] **PLANS-03**: Successfully creating a plan triggers `notificationAsync(Success)` haptic feedback
- [ ] **PLANS-04**: Explore map shows a friendly empty state when no friend plans are nearby

### SQUAD — Squad & Social

- [ ] **SQUAD-01**: Accepting a friend request triggers `notificationAsync(Success)` haptic; rejecting triggers `impactAsync(Medium)`
- [ ] **SQUAD-02**: Settling an IOU expense triggers `notificationAsync(Success)` haptic
- [ ] **SQUAD-03**: Squad Dashboard feature cards stagger-animate in on load (FadeIn with 80ms delay between cards)
- [ ] **SQUAD-04**: Claiming or unclaiming a birthday wish list item has spring scale press feedback

### AUTH — Auth, Onboarding & Errors

- [x] **AUTH-01**: User can reset their password via an email link from the login screen
- [x] **AUTH-02**: Sign-up screen shows visible Terms of Service and Privacy Policy links
- [x] **AUTH-03**: Every data-fetching screen shows ErrorDisplay with a retry action when the fetch fails
- [ ] **AUTH-04**: First-run users see a one-time hint guiding them to set their status and add a friend

---

## Future Requirements

- Account deletion flow — important before App Store submission, defer to v1.8
- Animated splash screen (Lottie) — complex, requires EAS, defer to v1.8
- Pull-to-refresh haptic on all list screens — nice to have, defer to v1.8
- Keyboard avoiding improvements for chat on older iOS — not blocking, defer to v1.8

---

## Out of Scope

- App Store metadata, screenshots, description — not submitting yet (v1.8)
- New features of any kind — this milestone is polish only
- Playwright visual regression baseline updates — web renderer is not representative of native polish
- Android adaptive icon monochromeImage — not blocking, no EAS build yet
- React Native New Architecture opt-in — Reanimated 4 works without explicit flag, defer deliberate opt-in

---

## Traceability

| REQ-ID | Requirement | Phase |
|--------|-------------|-------|
| POLISH-01 | SkeletonPulse component | Phase 24 |
| POLISH-02 | Animation theme tokens | Phase 24 |
| POLISH-03 | EmptyState CTA variant | Phase 24 |
| POLISH-04 | PrimaryButton loading state | Phase 24 |
| BRAND-01 | App icon | Phase 28 |
| BRAND-02 | Splash screen | Phase 28 |
| BRAND-03 | Dark/light splash variants | Phase 28 |
| HOME-01 | Home skeleton | Phase 26 |
| HOME-02 | Zero-friend empty state | Phase 26 |
| HOME-03 | Radar FADING pulse | Phase 26 |
| HOME-04 | Home card press feedback | Phase 26 |
| CHAT-01 | Chat list skeleton | Phase 26 |
| CHAT-02 | Chat haptics | Phase 26 |
| CHAT-03 | Optimistic send | Phase 26 |
| CHAT-04 | Message bubble press | Phase 26 |
| PLANS-01 | Plans list skeleton | Phase 27 |
| PLANS-02 | RSVP spring animation | Phase 27 |
| PLANS-03 | Plan creation haptic | Phase 27 |
| PLANS-04 | Map empty state | Phase 27 |
| SQUAD-01 | Friend request haptics | Phase 27 |
| SQUAD-02 | IOU settle haptic | Phase 27 |
| SQUAD-03 | Squad dashboard stagger | Phase 27 |
| SQUAD-04 | Wish list press feedback | Phase 27 |
| AUTH-01 | Forgot password | Phase 25 |
| AUTH-02 | ToS & Privacy links | Phase 25 |
| AUTH-03 | Error state audit | Phase 25 |
| AUTH-04 | First-run onboarding hint | Phase 25 |

---

*Last updated: 2026-05-04 — v1.7 traceability filled by roadmapper*
