---
status: partial
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
source: [30-VERIFICATION.md]
started: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:00:00Z
---

## Current Test

[awaiting human testing — deferred to v1.3 Hardware Verification Gate per project_hardware_gate_deferral.md]

## Tests

### 1. Originating bug: Squad → Memories → PlanDashboard → "Open Chat" pill
expected: Bar hidden on chat entry from the non-canonical path that triggered this phase; bar restored on back
result: [pending]

### 2. Full 8-path verification anchor (from CONTEXT.md)
expected: For every entry path (chat tab, squad friends sub-tab → friend → DM, plans tab → "Open Chat" pill, home OverflowChip / FriendSwipeCard / HomeFriendCard / RadarBubble DM, birthday page wish chat, friend detail page DM, push notification deep link) — bar hides on chat focus and restores on blur; chat URL resolves identically; no double-mount of ChatRoomScreen visible
result: [pending]

### 3. DM error Alert copy preserved
expected: Identical alert ("Error" / "Couldn't open chat. Try again.") appears for non-silent callers (home components, friends/[id], squad.tsx); push-notification path silent-fails
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
