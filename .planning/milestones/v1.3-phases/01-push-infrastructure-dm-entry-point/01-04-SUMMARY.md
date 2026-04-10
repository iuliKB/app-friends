---
phase: 01-push-infrastructure-dm-entry-point
plan: 04
subsystem: push-notifications
tags: [push, registration, app-state, pre-prompt, ios-permission]
requires:
  - 01-03 (notification handler init)
  - 01-05 (registerForPushNotifications + helpers + RegisterResult)
  - 01-06 (PrePromptModal component)
provides:
  - Session-ready push token registration in (tabs)/_layout.tsx
  - AppState foreground re-registration (catches OS token rotation)
  - Runtime wiring for value-led pre-prompt -> native iOS permission chain
affects:
  - src/app/(tabs)/_layout.tsx
tech_stack:
  added: []
  patterns:
    - useEffect-on-session-userId
    - AppState change listener with previous-state ref
    - Fragment-wrapped layout to render sibling Modal
key_files:
  created: []
  modified:
    - src/app/(tabs)/_layout.tsx
decisions:
  - D-01..D-03 enforced: pre-prompt visibility gated on hook-reported needs_pre_prompt
  - Decline handler sets opt-out flag so pre-prompt cannot re-fire on every foreground
  - Accept handler marks seen BEFORE re-calling register (so skipEligibilityCheck branch fires native prompt)
  - Errors swallowed in registration calls to avoid crashing the tabs layout
metrics:
  duration_min: 5
  tasks_completed: 1
  files_touched: 1
  completed: 2026-04-07
requirements:
  - PUSH-01
  - PUSH-02
  - PUSH-05
  - PUSH-08
---

# Phase 01 Plan 04: Session-Ready Push Registration + Pre-Prompt Wiring Summary

Added a session-ready `useEffect` and `AppState` listener to `src/app/(tabs)/_layout.tsx` that auto-registers the device for push on every authenticated launch and renders `PrePromptModal` when the hook reports `needs_pre_prompt`, completing the value-led permission flow.

## What Changed

`src/app/(tabs)/_layout.tsx` now:
1. Selects `userId` from `useAuthStore` via a stable Zustand selector.
2. On `userId` becoming truthy, fires `registerForPushNotifications(userId)` once and stores the result in component state.
3. Subscribes to `AppState.addEventListener('change', ...)` and re-registers when the previous state matched `inactive|background` and the next state is `active`. The subscription is cleaned up via `sub.remove()` on unmount.
4. Renders `<PrePromptModal visible={registerState === 'needs_pre_prompt'}>` as a sibling to `<Tabs>` (return wrapped in a Fragment).
5. `handlePrePromptAccept` awaits `markPushPrePromptSeen()`, then calls `registerForPushNotifications(userId, { skipEligibilityCheck: true })` so the hook fires the native iOS permission prompt.
6. `handlePrePromptDecline` awaits `markPushPrePromptSeen()` AND `setNotificationsEnabledFlag(false)`, locking the pre-prompt out for this install (D-03) without ever invoking `requestPermissionsAsync`.
7. Errors from registration are swallowed (`.catch(() => {})`) — registration must never crash the tabs layout.

## Tasks

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Session-ready effect + AppState listener + PrePromptModal render + Accept/Decline handlers | f8210dc | done |

## Verification

- `npx tsc --noEmit` — passes (exit 0)
- `npx eslint src/app/(tabs)/_layout.tsx --max-warnings 0` — passes (after `--fix` re-indented inner JSX inside the new Fragment wrapper)
- All grep substring checks from the plan present:
  - `AppState.addEventListener`, `appState.current.match(/inactive|background/)`, `sub.remove()`
  - `registerForPushNotifications`, `useAuthStore`, `markPushPrePromptSeen`, `setNotificationsEnabledFlag`
  - `PrePromptModal`, `needs_pre_prompt`, `skipEligibilityCheck: true`
- `requestPermissionsAsync` only appears inside a comment in the decline handler — never called directly from the layout (D-03 honored).

## Threat Model Status

- T-1-02 (registration bypass) — MITIGATED. Token is upserted on every authenticated session and on every foreground transition; the Profile toggle is no longer the only entry point.
- T-1-04 (permission spam) — MITIGATED. Both Accept and Decline mark `pre_prompt_seen`; Decline additionally sets the local opt-out flag, so the value-led modal can only surface once per install lifetime.
- Effect-fire stability — `userId` is a primitive selector return; effect re-runs only on sign-in/sign-out.
- Subscription leak — `return () => sub.remove()` cleanup in place.

## Deviations from Plan

None. Plan executed exactly as written. Prettier auto-fix re-indented the inner `<Tabs>` JSX after the Fragment wrapper was introduced — this is formatting only and not a behavioral deviation.

## Known Stubs

None.

## Self-Check: PASSED

- File `src/app/(tabs)/_layout.tsx` — FOUND, modified
- Commit f8210dc — FOUND in `git log`
- All acceptance-criteria substrings — FOUND
- `tsc --noEmit` — PASS
- `eslint --max-warnings 0` — PASS
