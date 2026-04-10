# Phase 1: Status Pill & Bottom Sheet - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-11
**Phase:** 01-status-pill-bottom-sheet
**Mode:** assumptions
**Areas analyzed:** Bottom Sheet Implementation, Status Pill Placement, Atomic Removal, Pulse Session Tracking

## Assumptions Presented

### Bottom Sheet Implementation
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Use Modal + Animated.timing pattern from FriendActionSheet — not Reanimated | Confident | Zero Reanimated imports in codebase; FriendActionSheet.tsx exists |
| Auto-dismiss via useStatusStore.currentStatus watch | Confident | MoodPicker.tsx lines 39-42 use same pattern |

### Status Pill Placement
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Pass pill to ScreenHeader via rightAction prop | Confident | ScreenHeader.tsx line 8 exposes rightAction; HomeScreen passes nothing |
| Create new OwnStatusPill, separate from existing StatusPill | Likely | Existing StatusPill has no onPress, no animations, no empty state |

### Atomic Removal
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| MoodPicker + ReEngagementBanner removal must be atomic | Confident | scrollRef + moodPickerYRef in HomeScreen lines 57-61 |

### Pulse Session Tracking
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| AsyncStorage campfire:session_count integer, disable at >3 | Likely | Existing campfire: prefixed keys in usePushNotifications.ts |

## Corrections Made

No corrections — all assumptions confirmed.
