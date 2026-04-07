---
phase: 1
slug: push-infrastructure-dm-entry-point
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Reality:** No JS test framework (Jest / Vitest) is installed in this codebase, and zero new npm dependencies are allowed in v1.3. Validation strategy is therefore: ESLint + TypeScript on every commit, SQL migration apply tests, Edge Function dry-run, and a manual smoke-test checklist on the EAS dev build.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (TypeScript strict + ESLint enforce static correctness; manual checklist for runtime behavior) |
| **Config file** | `tsconfig.json`, `eslint.config.js`, `playwright.config.ts` (web-only, not used here) |
| **Quick run command** | `npx tsc --noEmit && npx eslint src --max-warnings 0` |
| **Full suite command** | `npx tsc --noEmit && npx eslint src --max-warnings 0 && supabase db reset --linked=false` |
| **Estimated runtime** | ~25 seconds (tsc + eslint); ~60 seconds with `supabase db reset` |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npx eslint src --max-warnings 0`
- **After every plan wave:** Run full suite (adds `supabase db reset` to verify migration applies cleanly)
- **Before `/gsd-verify-work`:** Full suite green + manual smoke-test checklist signed off on EAS dev build
- **Max feedback latency:** 60 seconds (tsc+eslint), 5 minutes (full suite with db reset)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | PUSH-10 | — | EAS dev build artifact exists | manual | `eas build:list --platform ios --profile development` | N/A | ⬜ pending |
| 1-02-01 | 02 | 1 | PUSH-03 | T-1-01 (token forgery) | `push_tokens` has device_id, last_seen_at, invalidated_at; composite unique on (user_id, device_id); RLS unchanged | sql | `supabase db reset --linked=false && supabase db diff` | ✅ migration file | ⬜ pending |
| 1-03-01 | 03 | 1 | PUSH-06, PUSH-09 | — | notifications-init.ts exists at module scope; categories registered; handler set with shouldShowBanner/shouldShowList | static | `npx tsc --noEmit && grep -q 'setNotificationCategoryAsync' src/lib/notifications-init.ts` | ❌ W0 (file is created in this task) | ⬜ pending |
| 1-04-01 | 04 | 2 | PUSH-01, PUSH-02 | T-1-02 (registration bypass) | session-ready useEffect in (tabs)/_layout.tsx calls registerForPushNotifications on auth + AppState 'active' | static | `grep -q "AppState.addEventListener" src/app/(tabs)/_layout.tsx && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 2 | PUSH-03, PUSH-04 | T-1-03 (stale token retention) | usePushNotifications.ts upserts to (user_id, device_id); off-toggle deletes server row; on-toggle re-registers silently | static | `npx tsc --noEmit && grep -q "device_id" src/hooks/usePushNotifications.ts` | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 2 | PUSH-07 | — | Four channels created at module init: plan_invites MAX, friend_free HIGH, morning_prompt DEFAULT, system LOW | static | `grep -E "plan_invites\|friend_free\|morning_prompt\|system" src/lib/notifications-init.ts \| wc -l` returns >=4 | ❌ W0 | ⬜ pending |
| 1-07-01 | 07 | 2 | PUSH-08 | T-1-04 (permission spam) | Pre-prompt modal renders only when AsyncStorage 'campfire:push_prompt_eligible' is true; "Not now" defers; uses @/theme tokens | static | `grep -q "campfire:push_prompt_eligible" src/components/notifications/PrePromptModal.tsx && npx eslint src/components/notifications/PrePromptModal.tsx --max-warnings 0` | ❌ W0 | ⬜ pending |
| 1-08-01 | 08 | 3 | PUSH-05, PUSH-09 | T-1-03, T-1-05 (silent delivery failure) | notify-plan-invite filters invalidated_at IS NULL; parses ticket-level errors; marks DeviceNotRegistered tokens invalidated | static | `grep -q "invalidated_at IS NULL" supabase/functions/notify-plan-invite/index.ts && grep -q "DeviceNotRegistered" supabase/functions/notify-plan-invite/index.ts` | ❌ W0 | ⬜ pending |
| 1-09-01 | 09 | 4 | DM-01 | — | HomeFriendCard wrapped in Pressable; onPress calls get_or_create_dm_channel + routes to /chat/room?dm_channel_id=...; onLongPress opens action sheet with View profile + Plan with... | static | `grep -q "Pressable" src/components/home/HomeFriendCard.tsx && grep -q "get_or_create_dm_channel" src/components/home/HomeFriendCard.tsx && grep -q "ActionSheetIOS" src/components/home/HomeFriendCard.tsx` | ❌ W0 | ⬜ pending |
| 1-10-01 | 10 | 4 | DM-01 | — | plan-create accepts ?preselect_friend_id query param and pre-populates picker | static | `grep -q "preselect_friend_id" src/screens/plans/PlanCreateModal.tsx && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-11-01 | 11 | 5 | PUSH-01..10, DM-01 | — | Manual smoke-test checklist signed off on EAS dev build (token registration, plan-invite delivery, action sheet, DM tap, toggle off/on, foreground re-register, ticket-error mark-invalidated) | manual | Smoke checklist file exists with all items ticked | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity check:** No three consecutive tasks lack automated verification. Tasks 1-01-01 (manual EAS build) and 1-11-01 (manual smoke test) are bookends; every task between has a `static` or `sql` verification command.

---

## Wave 0 Requirements

- [ ] `src/lib/notifications-init.ts` — created in Plan 03 (file does not yet exist)
- [ ] `src/components/notifications/PrePromptModal.tsx` — created in Plan 07
- [ ] `supabase/migrations/0004_push_tokens_v1_3.sql` — created in Plan 02
- [ ] No new test framework installation — manual checklist + tsc/eslint cover the contract

*Existing infrastructure covers static-correctness sampling for all touched files. Runtime behaviors are verified via manual smoke checklist on the EAS dev build.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Token registration on session-ready | PUSH-01 | Requires real device (Device.isDevice gates code path) | Fresh install on EAS dev build → log in → check Supabase `push_tokens` table for new row within 5 seconds |
| Foreground re-register on AppState 'active' | PUSH-02 | Requires backgrounding the real app | Open app → background for 30s → reopen → check `push_tokens.last_seen_at` updated |
| Plan-invite push delivery on fresh install | PUSH-05 | Requires two real devices + EAS dev build | Device A creates plan inviting Device B → Device B receives push within ~5s without ever toggling Profile preference |
| iOS permission pre-prompt timing | PUSH-08 | Requires fresh install with no AsyncStorage state | Fresh install → DO NOT see permission prompt before first meaningful action; set first status → see pre-prompt → tap "Sounds good" → see iOS native prompt |
| iOS notification action buttons render | PUSH-06 | Action buttons silently fail to render in Expo Go — only visible on EAS dev build | Schedule local notification with `morning_prompt` category → swipe down on lockscreen notification → verify Free / Busy / Maybe buttons present |
| Android channel correctness | PUSH-07 | Channels are OS-level state, not introspectable from app code | Settings → Apps → Campfire → Notifications → verify four channels listed: plan_invites, friend_free, morning_prompt, system (legacy `default` may also be present on upgrades) |
| Notification toggle OFF deletes server row | PUSH-04 | Database state, not client state | Toggle off → check `push_tokens` table for that user — row should be gone |
| Notification toggle ON re-registers silently | PUSH-04 | UX path with no visible affordance | Toggle off then on → check `push_tokens` row reappears with fresh `last_seen_at`, no UI prompt shown |
| `DeviceNotRegistered` mark-invalidated | PUSH-09 | Requires triggering Expo error response | Manually corrupt a token in DB → trigger plan invite → check token's `invalidated_at` is now non-null |
| HomeFriendCard tap → DM | DM-01 | Native navigation behavior | Single tap on friend card → Chat room opens with that friend; long-press → action sheet with View profile + Plan with... |
| EAS dev build artifact exists | PUSH-10 | External build infrastructure | `eas build:list --platform ios --profile development` shows successful build; APK/IPA installable on test device |

---

## Validation Sign-Off

- [ ] All tasks have static, sql, or manual verification (no task is unverifiable)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all NEW files (notifications-init, PrePromptModal, migration)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for tsc+eslint sampling
- [ ] Manual smoke checklist documented in plan files (per CONTEXT.md D-10)
- [ ] `nyquist_compliant: true` set in frontmatter after planner completes

**Approval:** pending
