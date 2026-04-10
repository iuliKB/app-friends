# Phase 4: Morning Prompt + Squad Goals Streak — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in 04-CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-09
**Phase:** 04-morning-prompt-squad-goals-streak
**Mode:** discuss (interactive)
**Areas discussed:** Squad scope + streak SQL, StreakCard visual + copy, Morning time + scheduling lifecycle
**Areas skipped:** Skip-if-active mechanics (resolved inline in Area 3)

## Areas Presented for Selection

Four candidate areas were surfaced:
1. Squad scope + streak SQL — CRITICAL (no squad entity exists)
2. Skip-if-active mechanics — MORN-01/06 vs scheduleNotificationAsync
3. Morning time + scheduling lifecycle
4. StreakCard visual + copy

User selected: #1, #3, #4. Skip-if-active was folded into #3 and answered via D-24/D-25.

---

## Area 1: Squad scope + streak SQL

### Q1-A — What defines "the squad"?
| Option | Selected |
|---|---|
| Viewer's friend circle (Recommended) | ✅ |
| Shared per friend-pair | |
| All plans the viewer joined | |

**Decision:** D-01, D-02

### Q1-B — Where does "Best: N weeks" live?
| Option | Selected |
|---|---|
| Computed from status_history (Recommended) | ✅ |
| New profiles.streak_best column | |
| New squad_streak_state table | |

**Decision:** D-07 (note: CONTEXT corrects "status_history" to "plans+plan_members" — best is computed from plan history, not status history. The option label conflated the two; the intent was "computed on demand, no new storage").

### Q1-C — How to detect "completed" week?
| Option | Selected |
|---|---|
| scheduled_for < now AND ≥2 rsvp='going' (Recommended) | ✅ |
| scheduled_for in week AND ≥2 going AND scheduled_for < now | |
| New plans.status='completed' field | |

**Decision:** D-03

### Q1-D — Timezone source?
| Option | Selected |
|---|---|
| Viewer's device timezone at query time (Recommended) | ✅ |
| Viewer's stored profiles.timezone | |
| UTC always | |

**Decision:** D-06

### Q1-E — Grace/break SQL expression?
| Option | Selected |
|---|---|
| Sliding 4-week window, count misses (Recommended) | ✅ |
| Two-consecutive-miss flag | |
| Let planner decide in research | |

**Decision:** D-08

### Q1-F — Which plans count toward viewer's streak?
| Option | Selected |
|---|---|
| Plans where viewer is creator OR plan_member (Recommended) | ✅ |
| Any plan where ≥2 of viewer's friends went | |
| Only plans where viewer was 'going' | |

**Decision:** D-02

### Q1-G — Does viewer count toward the ≥2?
| Option | Selected |
|---|---|
| Yes — viewer counts (Recommended) | ✅ |
| No — need 2 friends besides viewer | |

**Decision:** D-04

---

## Area 2: StreakCard visual + copy

### Q2-A — Layout?
| Option | Selected |
|---|---|
| Minimal hero card (Recommended) | ✅ |
| Hero card + recent weeks strip | |
| Hero card + call-to-action | |

**Decision:** D-11, D-12

### Q2-B — Zero state?
| Option | Selected |
|---|---|
| "Start your first week!" hero (Recommended) | ✅ |
| Empty-state illustration + copy | |
| Hide the card until streak ≥1 | |

**Decision:** D-13

### Q2-C — Grace week surfacing?
| Option | Selected |
|---|---|
| Hide grace entirely (Recommended) | ✅ |
| Subtle grace indicator | |
| Claude's discretion post-research | |

**Decision:** D-15

### Q2-D — Copy review gate?
| Option | Selected |
|---|---|
| Ship copy in CONTEXT.md, flag as TBD-review (Recommended) | ✅ |
| Strings in dedicated file | |
| Defer review to Phase 5 | |

**Decision:** D-19, D-20

### Q2-E — Tap action?
| Option | Selected |
|---|---|
| Non-interactive (Recommended) | |
| Opens plan-create | ✅ |

**Decision:** D-14 — user overrode recommendation; tap opens plan-create.

### Q2-F — Loading/errors?
| Option | Selected |
|---|---|
| Skeleton card + pull-to-refresh (Recommended) | ✅ |
| Spinner only | |
| Claude's discretion | |

**Decision:** D-16, D-17, D-18

---

## Area 3: Morning time + scheduling lifecycle

### Q3-A — Time picker UX?
| Option | Selected |
|---|---|
| Row opens native datetimepicker modal (Recommended) | ✅ |
| Preset chips (7/8/9/10am) | |
| New settings sub-screen | |

**Decision:** D-29, D-31

### Q3-B — Storage?
| Option | Selected |
|---|---|
| AsyncStorage (Recommended) | ✅ |
| New profiles columns | |
| Hybrid | |

**Decision:** D-34, D-35

### Q3-C — When to (re)schedule?
| Option | Selected |
|---|---|
| On cold launch after auth + when settings change (Recommended) | ✅ |
| Every AppState 'active' | |
| Only on explicit settings changes | |

**Decision:** D-21, D-22

### Q3-D — Skip-if-active mechanics?
| Option | Selected |
|---|---|
| Tap handler no-ops if ALIVE/FADING + valid_until (Recommended) | ✅ |
| Cancel-on-setStatus | |
| Both | |

**Decision:** D-24, D-25 (with the critical refinement that valid_until is derived from `response.notification.date` at tap time, not baked into the static repeating payload)

### Q3-E — Tap action payload (window + tag)?
| Option | Selected |
|---|---|
| Default 'rest_of_day', no tag (Recommended) | ✅ |
| Open MoodPicker pre-selected | |
| Default '3h', no tag | |

**Decision:** D-26

### Q3-F — Toggle off cancels immediately?
| Option | Selected |
|---|---|
| Yes — immediate cancel (Recommended) | ✅ |
| Deferred to next cold launch | |

**Decision:** D-22 (point 3)

### Q3-G — No-permission flow?
| Option | Selected |
|---|---|
| Re-trigger pre-prompt + OS permission (Recommended) | ✅ |
| Silent no-op | |
| Block toggle unless global on | |

**Decision:** D-30

### Q3-H — Expo Go handling?
| Option | Selected |
|---|---|
| Try/catch + silent swallow (Recommended) | ✅ |
| Detect Expo Go and bail | |

**Decision:** D-21, D-39

### Q3-I — Where does the DEAD check live?
| Option | Selected |
|---|---|
| _layout.tsx response handler (Recommended) | ✅ |
| Inside useStatus.setStatus with skipIfAlive flag | |

**Decision:** D-25

---

## User Overrides

Only one recommendation was overridden:
- **Q2-E (StreakCard tap action):** User chose "Opens plan-create" instead of the recommended "Non-interactive". Captured as D-14. Rationale: turns the celebration surface into a soft CTA without violating STREAK-08's no-countdown rule.

## Deferred Ideas Captured

See 04-CONTEXT.md `<deferred>` section. No new deferred ideas surfaced during discussion beyond those already tracked in REQUIREMENTS.md / prior phases.

## Canonical Refs Accumulated

See 04-CONTEXT.md `<canonical_refs>` section. Sources:
- ROADMAP.md Phase 4 section + line-204 planner note
- REQUIREMENTS.md MORN-01..08 + STREAK-01..08
- Phase 1 CONTEXT (iOS category, PrePromptModal, toggle pattern)
- Phase 2 CONTEXT (heartbeat, status store, OVR-01/OVR-04)
- Phase 3 CONTEXT (scheduler pattern, response handler pattern, notify_friend_free toggle)
- Live code: `src/lib/notifications-init.ts`, `src/lib/expiryScheduler.ts`, `src/app/_layout.tsx`, `src/app/(tabs)/squad.tsx`, `src/app/(tabs)/profile.tsx`, `supabase/migrations/0001_init.sql`

---

*Discussion conducted: 2026-04-09*
*Mode: interactive discuss-phase (no advisor, no batch, no auto)*
