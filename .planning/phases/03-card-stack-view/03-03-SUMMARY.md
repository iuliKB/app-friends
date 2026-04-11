---
phase: 03-card-stack-view
plan: "03"
subsystem: home, deck-state, animation
tags: [card-stack, deck-filter, heartbeat, undo, depth-effect, counter]
dependency_graph:
  requires: [03-02]
  provides: [CardStackView, CardStackViewProps]
  affects: [src/components/home/CardStackView.tsx]
tech_stack:
  added: []
  patterns: [deck-state-modulo-loop, dismissedStack-undo, STACK_CONFIGS-depth-effect, heartbeat-deck-filter]
key_files:
  created:
    - src/components/home/CardStackView.tsx
  modified: []
decisions:
  - FriendSwipeCard wrapped in View for zIndex (no style prop on SwipeCardProps) — plan anticipated this, handled with View wrapper
  - deck.length === 0 null guard placed before counter calculation to prevent % 0 crash (T-03-06)
  - STACK_CONFIGS rendered in reverse order (lowest zIndex first) so front card paints on top
metrics:
  duration: "~2 minutes"
  completed: "2026-04-11T11:59:50Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 3 Plan 03: CardStackView — Deck Container Summary

CardStackView deck container with ALIVE/FADING filter, auto-loop index, undo stack, 2-card depth effect, and alive-count counter label.

## What Was Built

**Task 1 — CardStackView component (`src/components/home/CardStackView.tsx`):**

- **Deck filter (CARD-04):** `friends.filter(f => computeHeartbeatState(...) !== 'dead')` — DEAD friends excluded at render time; HeartbeatTick re-renders keep it fresh
- **State:** `currentIndex` (number) + `dismissedStack` (FriendWithStatus[]) for undo history
- **Auto-loop (D-11):** `handleSkip` advances via `(prev + 1) % deck.length` — wraps at end, deck always has cards
- **Undo (D-10):** `handleUndo` pops `dismissedStack` and decrements index via `(prev - 1 + deck.length) % deck.length`
- **Counter (CARD-05, D-12):** `aliveFriendCount` derived from deck, text = `"N more free"` (aliveFriendCount > 0) or `"Just you right now"` (0 ALIVE in deck)
- **Empty deck guard (T-03-06):** Returns `null` when `deck.length === 0` — prevents `% 0` NaN crash, no visible error shown
- **Stack depth (D-06):** `STACK_CONFIGS` with 3 entries (translateY: 0/8/16, scale: 1.0/0.95/0.90, opacity: 1.0/0.6/0.35); rendered in reverse zIndex order; background cards are plain `COLORS.surface.card` `View`s (no gradient)
- **Front card key:** `friend.friend_id` — ensures each new front card mounts fresh (RESEARCH Pitfall 5, not index)
- **FriendSwipeCard wrapping:** `FriendSwipeCard` (no `style` prop) wrapped in a `View` with `zIndex: config.zIndex` and `position: 'absolute'` for stack positioning

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 77dedeb | feat(03-03): implement CardStackView with deck state, depth effect, counter |

## Verification

1. `grep "deck.length === 0"` — guard present (3 occurrences: null return + both handlers)
2. `grep "% deck.length"` — modulo wrap present in handleSkip, handleUndo, and friendIndex
3. `grep "friend_id"` — key uses friend_id not index on FriendSwipeCard wrapper
4. `grep "dismissedStack"` — undo state declared and used in both handlers
5. `npx tsc --noEmit` — zero errors

## Deviations from Plan

None — plan executed exactly as written. The `style` prop note ("If FriendSwipeCard doesn't accept a `style` prop, wrap it in a View") was anticipated by the plan and applied as instructed.

## Known Stubs

None — CardStackView is fully wired with real state and heartbeat filtering. HomeScreen wiring (Plan 04) is required to connect `friends` prop from `useFriends` hook.

## Threat Flags

None — T-03-05 (deck filter is UX-only, server RLS handles security) accepted per plan. T-03-06 (deck.length === 0 crash guard) is implemented.

## Self-Check: PASSED
