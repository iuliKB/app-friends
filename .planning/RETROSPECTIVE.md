# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-24
**Phases:** 6 | **Plans:** 17 | **Commits:** 145

### What Was Built
- Full auth system (email/password, Google OAuth, Apple Sign-In) with session persistence
- Friend system with username search, QR code scanning, accept/reject flow
- Realtime "Who's Free" home screen with status toggle and emoji context tags
- Quick Plan creation (<10s) with RSVP, link dump, IOU notes, plan dashboard
- Chat system with plan group chats, 1:1 DMs, and Supabase Realtime
- Push notifications for plan invites with cold-start deep linking
- Profile editing, empty states, loading indicators, and UI consistency pass

### What Worked
- Supabase as single backend: Auth + Postgres + Realtime + Storage eliminated integration complexity
- Phase dependency chain (auth → friends → home → plans → chat → polish) meant each phase had a solid foundation
- Zustand stores with useFocusEffect refresh pattern worked consistently across all screens
- Server confirmation pattern for status updates prevented optimistic UI bugs
- Single Realtime channel with user_id filter stayed well within free-tier limits

### What Was Inefficient
- RLS policy debugging consumed significant time — recursive policies on plan_members needed SECURITY DEFINER workaround
- Profile joins on chat messages caused failures — had to split into separate queries
- Plan invitation flow required multiple iterations (RLS update recursion, broken profile joins, stale state)

### Patterns Established
- `router.push('...' as never)` for forward-reference routes in Expo Router
- `useFocusEffect` for data refresh on tab/screen focus
- Server confirmation (not optimistic) for writes that affect shared state
- EmptyState and LoadingIndicator shared components for consistent UX
- COLORS.status tokens for status-coloured elements across screens

### Key Lessons
1. RLS policies need careful testing for recursive table relationships — use SECURITY DEFINER helpers early
2. Separate queries beat joins when RLS is involved — avoids silent failures from policy-blocked joins
3. Realtime channel filters must be re-subscribed when the filter set changes (e.g., friend list updates)
4. Cold-start deep links need a small delay (150ms) for the navigation tree to mount

### Cost Observations
- Model mix: balanced profile (sonnet for planning/execution, opus for orchestration)
- Notable: 7-day MVP delivery for a full-featured social coordination app

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 145 | 6 | Initial MVP — established all patterns |

### Top Lessons (Verified Across Milestones)

1. (First milestone — lessons above will be cross-validated in future milestones)
