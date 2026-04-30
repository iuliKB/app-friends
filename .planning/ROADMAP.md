# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 UI/UX Design System** — Phases 7-9 (shipped 2026-03-25)
- ✅ **v1.2 Squad & Navigation** — Phases 10-12 (shipped 2026-04-04)
- ✅ **v1.3 Liveness & Notifications** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.3.5 Homescreen Redesign** — Phases 1-4 (shipped 2026-04-11)
- ✅ **v1.4 Squad Dashboard & Social Tools** — Phases 5-11 (shipped 2026-04-17)
- ✅ **v1.5 Chat & Profile** — Phases 12-17 (shipped 2026-04-22)
- 🔄 **v1.6 Places, Themes & Memories** — Phases 18-22 (in progress)

## Archived Milestones

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

<details>
<summary>✅ v1.2 Squad & Navigation (Phases 10-12) — SHIPPED 2026-04-04</summary>

- [x] Phase 10: Squad Tab (2/2 plans) — completed 2026-04-04
- [x] Phase 11: Navigation Restructure (2/2 plans) — completed 2026-04-04
- [x] Phase 12: Profile Simplification (1/1 plan) — completed 2026-04-04

</details>

<details>
<summary>✅ v1.3 Liveness & Notifications (Phases 1-5) — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Push Infrastructure & DM Entry Point (10/10 plans) — completed 2026-04-07
- [x] Phase 2: Status Liveness & TTL (6/6 plans) — completed 2026-04-08
- [x] Phase 3: Friend Went Free Loop (8/8 plans) — completed 2026-04-09
- [x] Phase 4: Morning Prompt + Squad Goals Streak (6/6 plans) — completed 2026-04-10
- [x] Phase 5: Hardware Verification Gate (2/2 plans) — completed 2026-04-10

</details>

<details>
<summary>✅ v1.3.5 Homescreen Redesign (Phases 1-4) — SHIPPED 2026-04-11</summary>

- [x] Phase 1: Status Pill & Bottom Sheet (3/3 plans) — completed 2026-04-10
- [x] Phase 2: Radar View & View Toggle (4/4 plans) — completed 2026-04-11
- [x] Phase 3: Card Stack View (4/4 plans) — completed 2026-04-11
- [x] Phase 4: Upcoming Events Section (4/4 plans) — completed 2026-04-11

</details>

<details>
<summary>✅ v1.4 Squad Dashboard & Social Tools (Phases 5-11) — SHIPPED 2026-04-17</summary>

- [x] Phase 5: Database Migrations (3/3 plans) — completed 2026-04-11
- [x] Phase 6: Birthday Profile Field (2/2 plans) — completed 2026-04-12
- [x] Phase 7: Birthday Calendar Feature (3/3 plans) — completed 2026-04-12
- [x] Phase 8: IOU Create & Detail (4/4 plans) — completed 2026-04-12
- [x] Phase 9: IOU List & Summary (3/3 plans) — completed 2026-04-16
- [x] Phase 10: Squad Dashboard (2/2 plans) — completed 2026-04-16
- [x] Phase 11: Birthday Feature (8/8 plans) — completed 2026-04-17

**Key deliverables:** IOU expense tracking, birthday profiles + wish lists + group gift coordination, birthday group chats, Squad Dashboard scrollable with feature cards, native DateTimePicker, chat attachment menu, group participant sheet, home screen IOU+Birthday widgets, plan cover image upload fix.

</details>

---

<details>
<summary>✅ v1.5 Chat & Profile (Phases 12-17) — SHIPPED 2026-04-22</summary>

- [x] Phase 12: Schema Foundation (2/2 plans) — completed 2026-04-20
- [x] Phase 13: Profile Rework + Friend Profile (3/3 plans) — completed 2026-04-20
- [x] Phase 14: Reply Threading (4/4 plans) — completed 2026-04-20
- [x] Phase 15: Message Reactions (4/4 plans) — completed 2026-04-21
- [x] Phase 16: Media Sharing (4/4 plans) — completed 2026-04-21
- [x] Phase 17: Polls (4/4 plans) — completed 2026-04-21

**Key deliverables:** Migration 0018+0019, profile rework + friend profile screen, reply threading with context menu, message reactions (6-emoji tapback, live counts), media sharing (camera + library, compressed inline bubbles, lightbox), polls (attachment menu, live vote counts).

</details>

---

## v1.6 Places, Themes & Memories (Phases 18-22)

**Milestone goal:** Light/dark theme toggle, map for plan locations + nearby discovery in Explore, and a shared per-plan photo gallery (10 photos per participant).

### Phases

- [x] **Phase 18: Theme Foundation** - ThemeProvider context, DARK/LIGHT color split, useTheme() hook, app.config.ts fix, compat shim, ThemeSegmentedControl + Profile APPEARANCE section
- [x] **Phase 19: Theme Migration** - Migrate all ~98 COLORS import files to useTheme(); Profile APPEARANCE toggle; remove compat shim (completed 2026-04-28)
- [x] **Phase 20: Map Feature** - Migration 0020 lat/lng columns, react-native-maps + expo-location install, LocationPicker, plan map view, Explore map (completed 2026-04-29)
- [x] **Phase 21: Gallery Foundation** - plan_photos table + RLS + add_plan_photo RPC + plan-gallery Storage bucket, upload pipeline, usePlanPhotos hook (completed 2026-04-30)
- [ ] **Phase 22: Gallery UI** - PlanDashboardScreen ScrollView→FlatList refactor, photo grid, full-screen lightbox, camera capture, delete own, save to roll

## Phase Details

### Phase 18: Theme Foundation
**Goal**: The app has a functioning theme system — ThemeProvider wraps the tree, DARK and LIGHT color palettes exist, useTheme() hook is available, and app.config.ts allows automatic system-level chrome — but no screen has been migrated yet (compat shim keeps everything working)
**Depends on**: Nothing (first v1.6 phase)
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-05
**Success Criteria** (what must be TRUE):
  1. Importing useTheme() in a new component returns a colors object with the same semantic structure as COLORS (text, surface, interactive, feedback, border, etc.)
  2. Toggling isDark in a test component causes the colors object to swap between DARK and LIGHT palettes without a reload
  3. The selected theme is persisted to AsyncStorage and survives a full app restart — the correct palette is active before the splash screen disappears
  4. app.config.ts has userInterfaceStyle set to 'automatic' so the OS status bar and system chrome track the active theme
  5. All existing screens continue to render correctly via the COLORS compat shim — zero visual regression from this phase alone
**Plans**: 3 plans
Plans:
- [x] 18-01-PLAN.md — LIGHT palette + ThemeContext.tsx + barrel export extension
- [x] 18-02-PLAN.md — Wire ThemeProvider into _layout.tsx + app.config.ts automatic chrome
- [x] 18-03-PLAN.md — ThemeSegmentedControl component + Profile APPEARANCE section
**UI hint**: yes

### Phase 19: Theme Migration
**Goal**: Every screen and component in the app reads colors through useTheme() instead of the static COLORS import; the Profile tab has an APPEARANCE section with a Light/Dark/System toggle; the compat shim is removed
**Depends on**: Phase 18
**Requirements**: THEME-04
**Success Criteria** (what must be TRUE):
  1. User can tap the theme toggle in Profile settings and the entire app switches between light and dark mode instantly, with no screens left in the wrong theme
  2. Opening any screen (Home, Squad, Explore, Chats, Profile, Plan Dashboard, Chat Room, Friend Profile, etc.) in light mode shows a white/light background with dark text — not the dark palette
  3. The COLORS compat shim is absent from src/theme/index.ts — no file in the codebase imports the bare COLORS symbol
  4. Theme preference set to Light or Dark survives an app restart and takes effect before the splash screen clears
**Plans**: 3 plans
Plans:
- [x] 19-01-PLAN.md — Migrate shared/auth/status/friends/notifications components (30 files)
- [x] 19-02-PLAN.md — Migrate feature components: chat/home/iou/plans/squad (39 files)
- [x] 19-03-PLAN.md — Migrate app routes + screens (31 files) + remove compat shim
**UI hint**: yes

### Phase 20: Map Feature
**Goal**: Users can attach a map location to a plan and view it on a map; users can browse nearby friend plans as pins on a map in the Explore tab; plan locations display as human-readable address labels; tapping a map location opens the native maps app for navigation
**Depends on**: Phase 19
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05
**Success Criteria** (what must be TRUE):
  1. When creating or editing a plan, tapping "Add location" opens a full-screen map where the user can drag a pin; confirming saves the coordinates and displays a human-readable address label (not raw lat/lng) on the plan
  2. The Plan Dashboard shows a map tile with a pin at the plan's location when a location has been attached; the tile is absent when no location is set
  3. In the Explore tab, a map/list toggle is visible; switching to map view shows pins for all friend plans that have a location; tapping a pin navigates to that plan's dashboard
  4. Tapping the location label on a plan (or a "Get directions" action) opens the user's preferred native maps app (Apple Maps / Google Maps / Waze) with the destination pre-filled
  5. Plans created before this phase (without lat/lng) are unaffected — no crashes, no blank map tiles
**Plans**: 6 plans
Plans:
- [x] 20-01-PLAN.md — Foundation: packages, app.config.ts, migration 0020, types, src/lib/maps.ts
- [x] 20-02-PLAN.md — Data layer: usePlans + usePlanDetail lat/lng wiring
- [x] 20-03-PLAN.md — LocationPicker modal + PlanCreateModal integration
- [x] 20-04-PLAN.md — PlanDashboard map tile + directions button + edit mode picker
- [x] 20-05-PLAN.md — ExploreMapView + Explore tab list/map toggle
- [x] 20-06-PLAN.md — EAS dev build + device verification checkpoint
**UI hint**: yes

### Phase 21: Gallery Foundation
**Goal**: The database schema, storage bucket, and upload pipeline for plan photos are in place and security-hardened — a developer can upload a photo to a plan and have it stored correctly, capped at 10 per participant, and readable only by plan members
**Depends on**: Phase 20
**Requirements**: GALL-01, GALL-02, GALL-03
**Success Criteria** (what must be TRUE):
  1. A plan participant can select one or more photos from their photo library and upload them to the plan gallery; each upload appears in the plan_photos table with the correct plan_id and uploader_id
  2. A plan participant can capture a photo using the in-app camera and upload it to the plan gallery in the same flow
  3. Attempting to upload an 11th photo (after 10 are already uploaded by the same user for the same plan) is rejected by the server with a 'photo_cap_exceeded' error — the client shows an appropriate message and the photo is not stored
  4. A user who is not a member of the plan cannot read or write plan_photos rows or storage objects for that plan — RLS and bucket policies enforce this
**Plans**: 3 plans
Plans:
- [x] 21-01-PLAN.md — Test scaffolds + migration 0021 SQL + plan_photos database types
- [x] 21-02-PLAN.md — Schema push (BLOCKING) + uploadPlanPhoto.ts upload library
- [x] 21-03-PLAN.md — usePlanPhotos hook (fetch + signed URLs + upload + delete mutations)

### Phase 22: Gallery UI
**Goal**: Users can see all plan photos in a scrollable grid inside the plan dashboard, tap any photo to view it full-screen and swipe through others, see who uploaded each photo, delete their own photos, and save any photo to their device camera roll — and PlanDashboardScreen uses FlatList throughout
**Depends on**: Phase 21
**Requirements**: GALL-04, GALL-05, GALL-06, GALL-07, GALL-08
**Success Criteria** (what must be TRUE):
  1. The Plan Dashboard shows a photo grid section (3-column) below the existing plan content; all plan members can see all uploaded photos in the grid; the section is absent (or shows an "Add the first photo" empty state) when no photos exist
  2. Tapping any thumbnail opens a full-screen photo viewer; the user can swipe left/right to browse all photos in the plan without returning to the grid
  3. Each photo in the grid and in the full-screen viewer shows the uploader's avatar or display name
  4. A user can delete their own photos (a delete button is visible only on their own photos); the photo disappears from the grid immediately and is removed from storage; no user can delete another participant's photo
  5. Tapping "Save to Camera Roll" on any photo in the full-screen viewer saves a copy to the device's camera roll; a confirmation or haptic confirms success
  6. PlanDashboardScreen uses a single outer FlatList with ListHeaderComponent for plan content — no ScrollView wrapping a FlatList
**Plans**: 3 plans
Plans:
- [x] 22-01-PLAN.md — Wave 0 test stubs + PlanDashboardScreen ScrollView→FlatList refactor
- [x] 22-02-PLAN.md — GalleryViewerModal component (swipe pager, pinch-to-zoom, attribution overlay, save + delete)
- [ ] 22-03-PLAN.md — Photos section integration (grid, Add Photo button, upload flow, empty state, Playwright assertions)
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Schema Foundation | v1.5 | 2/2 | Complete | 2026-04-20 |
| 13. Profile Rework + Friend Profile | v1.5 | 3/3 | Complete | 2026-04-20 |
| 14. Reply Threading | v1.5 | 4/4 | Complete | 2026-04-20 |
| 15. Message Reactions | v1.5 | 4/4 | Complete | 2026-04-21 |
| 16. Media Sharing | v1.5 | 4/4 | Complete | 2026-04-21 |
| 17. Polls | v1.5 | 4/4 | Complete | 2026-04-21 |
| 18. Theme Foundation | v1.6 | 3/3 | Complete    | 2026-04-28 |
| 19. Theme Migration | v1.6 | 3/3 | Complete   | 2026-04-29 |
| 20. Map Feature | v1.6 | 6/6 | Complete    | 2026-04-29 |
| 21. Gallery Foundation | v1.6 | 3/3 | Complete    | 2026-04-30 |
| 22. Gallery UI | v1.6 | 2/3 | In Progress|  |

---

*Roadmap updated: 2026-04-30 — v1.6 Phase 22 Gallery UI planned (3 plans, 3 waves)*
