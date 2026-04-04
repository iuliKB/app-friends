# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 UI/UX Design System** — Phases 7-9 (shipped 2026-03-25)
- 🚧 **v1.2 Squad & Navigation** — Phases 10-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-24</summary>

- [x] Phase 1: Foundation + Auth (4/4 plans) — completed 2026-03-17
- [x] Phase 2: Friends + Status (3/3 plans) — completed 2026-03-17
- [x] Phase 3: Home Screen (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Plans (3/3 plans) — completed 2026-03-18
- [x] Phase 5: Chat (2/2 plans) — completed 2026-03-18
- [x] Phase 6: Notifications + Polish (3/3 plans) — completed 2026-03-19

</details>

<details>
<summary>✅ v1.1 UI/UX Design System (Phases 7-9) — SHIPPED 2026-03-25</summary>

- [x] Phase 7: Design Tokens (2/2 plans) — completed 2026-03-24
- [x] Phase 8: Shared Components (3/3 plans) — completed 2026-03-24
- [x] Phase 9: Screen Consistency Sweep (6/6 plans) — completed 2026-03-25

</details>

### 🚧 v1.2 Squad & Navigation (In Progress)

**Milestone Goal:** Relocate friend management into a dedicated Squad tab and restructure bottom navigation for better information architecture.

- [x] **Phase 10: Squad Tab** - Convert Squad screen into a top-tab layout with Friends and Goals sub-tabs; relocate friend management from Profile (completed 2026-04-04)
- [x] **Phase 11: Navigation Restructure** - Reorder bottom nav, rename Plans to Explore and Chat to Chats, move pending badge to Squad tab; update Playwright tests (completed 2026-04-04)
- [ ] **Phase 12: Profile Simplification** - Remove friend-related sections from Profile tab now that Squad is the canonical home

## Phase Details

### Phase 10: Squad Tab
**Goal**: Users can access all friend management from the Squad tab via a Friends / Goals segmented top-tab layout
**Depends on**: Nothing (first phase of milestone; Squad tab exists as a stub)
**Requirements**: SQAD-01, SQAD-02, SQAD-03, SQAD-04, SQAD-05, SQAD-06, SQAD-07, SQAD-08, SQAD-09
**Success Criteria** (what must be TRUE):
  1. User can see a Friends tab and a Goals tab at the top of the Squad screen, and switch between them
  2. User can see their friends list with Free/Busy/Maybe status indicators in the Friends tab
  3. User can tap the FAB in the Friends tab to navigate to the Add Friend screen
  4. User can see a "Friend Requests (N)" row in the Friends tab when requests exist, and tap it to open the requests screen
  5. User can see a "Coming soon" placeholder in the Goals tab; the pending requests badge appears on the Squad tab icon (not Profile)
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Build SquadTabSwitcher, rewrite squad.tsx with Friends/Goals tabs, migrate badge to Squad
- [ ] 10-02-PLAN.md — Visual and functional verification checkpoint

### Phase 11: Navigation Restructure
**Goal**: Bottom navigation reflects the correct order and naming; all existing routes work; Playwright baselines are updated
**Depends on**: Phase 10 (Squad tab must be verified working before nav is restructured around it)
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. Bottom nav displays in order: Home | Squad | Explore | Chats | Profile
  2. Tapping Explore shows the Plans screen with all existing functionality intact
  3. Tapping Chats shows the Chat screen with all existing functionality intact
  4. All deep links and router.push calls that previously pointed to /plans or /chat resolve correctly after rename
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Reorder tabs, rename Plans to Explore and Chat to Chats with new icons in _layout.tsx
- [x] 11-02-PLAN.md — Update Playwright locators, regenerate snapshots, visual device verification

### Phase 12: Profile Simplification
**Goal**: Profile tab is clean — shows only account/settings content; all friend entry points have been removed
**Depends on**: Phase 10 (Squad must be confirmed working as the sole friend management entry point before Profile entry points are deleted)
**Requirements**: PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. Profile tab shows no friend list, no friend requests row, and no pending badge on its tab icon
  2. All friend management flows (view friends, add friend, manage requests) still work exclusively from the Squad tab after Profile cleanup
  3. No orphaned hook imports or lint errors remain in profile.tsx after removal
**Plans**: TBD

Plans:
- [ ] 12-01: Remove friend sections, imports, and hooks from profile.tsx; verify with full regression

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Auth | v1.0 | 4/4 | Complete | 2026-03-17 |
| 2. Friends + Status | v1.0 | 3/3 | Complete | 2026-03-17 |
| 3. Home Screen | v1.0 | 2/2 | Complete | 2026-03-18 |
| 4. Plans | v1.0 | 3/3 | Complete | 2026-03-18 |
| 5. Chat | v1.0 | 2/2 | Complete | 2026-03-18 |
| 6. Notifications + Polish | v1.0 | 3/3 | Complete | 2026-03-19 |
| 7. Design Tokens | v1.1 | 2/2 | Complete | 2026-03-24 |
| 8. Shared Components | v1.1 | 3/3 | Complete | 2026-03-24 |
| 9. Screen Consistency Sweep | v1.1 | 6/6 | Complete | 2026-03-25 |
| 10. Squad Tab | 2/2 | Complete    | 2026-04-04 | - |
| 11. Navigation Restructure | 2/2 | Complete    | 2026-04-04 | - |
| 12. Profile Simplification | v1.2 | 0/1 | Not started | - |
