---
phase: 33
slug: friend-profile-redesign
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-13
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `33-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x + React Native Testing Library 13.x |
| **Config file** | `jest.config.js` (root) |
| **Quick run command** | `npm test -- --testPathPatterns=<modified-file>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds (full); ~5 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPatterns="<modified-file>"`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite green AND manual hardware smoke pass for animation + modal flows recorded in PROGRESS.md
- **Max feedback latency:** ~60 seconds (full); ~5 seconds (quick)

---

## Per-Task Verification Map

> Plans will produce concrete Task IDs during planning. The Req → Test mapping below tells the planner which automated command must accompany each behavior. Status column is updated during execution.

| Req ID | Plan (TBD) | Wave (TBD) | Behavior | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|--------|------------|------------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| REQ-FP-01 | 02 | W2 | `useFriendProfile` returns profile + status; shares cache slice with home; refetches on invalidate | — | N/A | unit | `npm test -- --testPathPatterns=useFriendProfile` | ❌ W0 | ⬜ pending |
| REQ-FP-02 | 01 | W1 | Migration 0027 applies cleanly; `bio` column nullable; profile rows still SELECT-able | T-33-RLS | RLS unchanged; bio reads work for any authenticated user | manual (psql up/down) | n/a | ❌ W0 (manual gate) | ⬜ pending |
| REQ-FP-03 | 01 + 07 | W1, W2 | `useUpdateMyBio` follows Pattern 5; invalidates own profile cache | T-33-XSS | React Native `<Text>` auto-escapes user input | unit | `npm test -- --testPathPatterns=useUpdateMyBio` | ❌ W0 | ⬜ pending |
| REQ-FP-04 | 03 + 06 | W1, W3 | Header collapse interpolation values match UI-SPEC at scrollY offsets 0, 80, 160 | — | N/A | manual hardware | n/a | ❌ W0 | ⬜ pending |
| REQ-FP-05 | 03 + 06 | W1, W3 | Blurred wash renders; fades in on `onLoad`; falls back to `surface.card` when avatar null | — | N/A | manual hardware | n/a | ❌ W0 | ⬜ pending |
| REQ-FP-06 | 05 + 06 | W1, W3 | Quick actions: Message opens DM; Mute toggles `chat_preferences.is_muted`; Photos navigates; More opens ActionSheet | — | N/A | unit (handler-level) + manual (visual + haptics) | `npm test -- --testPathPatterns=FriendProfileScreen` | ❌ W0 | ⬜ pending |
| REQ-FP-07 | 04 + 06 | W1, W3 | INFO / MUTUAL grouped-inset sections render with correct row visibility (bio/birthday/timezone conditional; mutual rows always present with "None yet" when zero) | — | N/A | unit (RTL render assertions) | `npm test -- --testPathPatterns=FriendProfileScreen` | ❌ W0 | ⬜ pending |
| REQ-FP-08 | 02 | W2 | `useFriendMutuals` returns correct counts; mutual rows tappable only when count > 0 | — | N/A | unit | `npm test -- --testPathPatterns=useFriendMutuals` | ❌ W0 | ⬜ pending |
| REQ-FP-09 | 06 | W3 | Tap big avatar → `ImageViewerModal` opens with `imageUrl={profile.avatar_url}` | — | N/A | unit (state assertion) + manual (modal animation) | `npm test -- --testPathPatterns=FriendProfileScreen` | ❌ W0 | ⬜ pending |
| REQ-FP-10 | 02 | W2 | Status pill reflects `effective_status` from shared `queryKeys.home.friends(myId)` slice when present; falls back to dedicated read when home cache empty | — | N/A | unit | `npm test -- --testPathPatterns=useFriendProfile.statusSharing` | ❌ W0 | ⬜ pending |
| REQ-FP-11 | 06 | W3 | Remove Friend confirm Alert → optimistic remove from `friends.list(myId)` → `router.back()`; rollback on DELETE error | T-33-RACE | Second DELETE is no-op (no row matched); UI optimistic mask | unit (handler-level) | `npm test -- --testPathPatterns=FriendProfileScreen.removeFriend` | ❌ W0 | ⬜ pending |
| REQ-FP-12 | 06 | W3 | Friend-not-found: when `friendships` returns empty for the pair, screen renders fallback empty state with "Back to friends" CTA | — | N/A | unit | `npm test -- --testPathPatterns=FriendProfileScreen.friendNotFound` | ❌ W0 | ⬜ pending |
| GATE-mutationShape | 01 + 06 | W1, W3 | New `useUpdateMyBio` passes regression gate (mutationFn + onMutate + onError + onSettled) | — | N/A | unit | `npx jest --testPathPatterns=mutationShape --no-coverage` | ✅ `src/hooks/__tests__/mutationShape.test.ts` | ⬜ pending |
| GATE-queryKeys | 01 | W1 | New `friends.mutuals(friendId)`, `friends.sharedPhotos(friendId)`, `chat.preferences(channelId)` keys are unique and follow taxonomy convention | — | N/A | unit | `npm test -- --testPathPatterns=queryKeys` (planner adds if not present) | ❓ check at plan time | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useFriendProfile.test.ts` — covers REQ-FP-01, REQ-FP-10
- [ ] `src/hooks/__tests__/useFriendMutuals.test.ts` — covers REQ-FP-08
- [ ] `src/hooks/__tests__/useUpdateMyBio.test.ts` — covers REQ-FP-03 + mutationShape gate
- [ ] `src/app/friends/__tests__/[id].test.tsx` (or equivalent path) — covers REQ-FP-06, REQ-FP-07, REQ-FP-09, REQ-FP-11, REQ-FP-12
- [ ] Reanimated mock — already includes `useReducedMotion` per Phase 29.1-04; no new mock work
- [ ] Theme mock — already includes everything needed per Phase 30-04; no new mock work

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 0027 up/down | REQ-FP-02 | Schema mutation must round-trip on a real Postgres before merge | `supabase db reset && supabase db push` on local; verify `bio TEXT NULL` exists on `profiles`; rollback and re-apply |
| Header collapse animation | REQ-FP-04 | Reanimated 4 worklet behavior is not reliable in jsdom; only verifiable on device | Scroll the friend profile screen on iOS hardware; confirm avatar shrinks smoothly from ~140px to ~28px between scrollY 0–160px; no flicker; collapsed title shows full name |
| Blurred-avatar wash render + onLoad fade | REQ-FP-05 | Expo `BlurView` + `Image.onLoad` requires native runtime | Open profile on hardware; observe the wash fades in once the avatar decodes; switch to a friend with no avatar and verify fallback to `surface.card` token |
| Quick actions row visual + haptics | REQ-FP-06 | Haptic feedback + visual polish needs device | Tap each of Message / Mute / Photos / More on hardware; confirm haptic on Mute toggle; confirm ActionSheet opens for More |
| Full-screen avatar viewer | REQ-FP-09 | `ImageViewerModal` swipe-down dismiss needs gesture system | Tap large avatar on hardware; viewer opens; swipe down dismisses; confirms no z-index bug behind nav header |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (4 new test files listed above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (full suite); < 5s (quick run)
- [ ] `nyquist_compliant: true` set in frontmatter once plans wire each REQ-FP-XX to a task ID

**Approval:** plans wired (33-01..33-07); nyquist_compliant: true. Manual gate (REQ-FP-02 round-trip) executes during Plan 01 Task 4; hardware smoke (REQ-FP-04/05/06/09) executes at Plan 06 Task 3 checkpoint.
