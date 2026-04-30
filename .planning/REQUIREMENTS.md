# Requirements: v1.6 Places, Themes & Memories

**Defined:** 2026-04-28
**Core Value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must

## v1 Requirements

### Theme

- [ ] **THEME-01**: User can select Light, Dark, or System theme from Profile settings
- [x] **THEME-02**: Selected theme persists across app restarts without re-selecting
- [x] **THEME-03**: App launches with the correct theme immediately — no flash of wrong theme on startup
- [x] **THEME-04**: All existing screens render correctly in both light and dark modes
- [x] **THEME-05**: Theme applies instantly when user selects an option (no save button required)

### Map

- [x] **MAP-01**: User can attach a location (drop pin on map) to a plan when creating or editing it
- [x] **MAP-02**: Plan detail screen shows the plan location on a map with a pin
- [x] **MAP-03**: Plan location is displayed as a human-readable address label (not raw coordinates)
- [x] **MAP-04**: User can browse nearby friend plans as pins on a map in the Explore tab
- [x] **MAP-05**: User can open a plan's location in Google Maps, Waze, or Apple Maps with one tap

### Gallery

- [x] **GALL-01**: Each plan participant can upload photos to the plan gallery from their photo library
- [x] **GALL-02**: Each plan participant can capture and upload a photo using the in-app camera
- [x] **GALL-03**: Each participant is limited to 10 photos per plan (enforced server-side)
- [x] **GALL-04**: User can view all plan photos in a scrollable grid inside the plan detail screen
- [x] **GALL-05**: User can tap any photo to open it full-screen and swipe to browse others
- [x] **GALL-06**: Each photo shows the uploader's avatar or name
- [x] **GALL-07**: User can delete their own photos from the gallery (cannot delete others')
- [x] **GALL-08**: User can save any gallery photo to their device camera roll

---

## Future Requirements

### Map

- **MAP-F01**: Address autocomplete when setting plan location — requires paid Google Places API key, V2
- **MAP-F02**: Radius filter slider on Explore map (10km / 25km / 50km) — V2
- **MAP-F03**: Google Maps provider on iOS — requires paid API key + EAS build config, V2

### Gallery

- **GALL-F01**: Photo count badge on plan card in Explore/Home — nice-to-have, V2
- **GALL-F02**: Upload progress indicator per photo — nice-to-have, V2

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live friend location tracking | Privacy concerns, high complexity — PROJECT.md V2 |
| Video in gallery | Storage cost (1 GB free tier), PROJECT.md explicitly V2 |
| Photo comments | New data model + Realtime; plan group chat covers this need |
| Cluster markers on Explore map | Nice-to-have for 3–15 person groups (few concurrent plans) |
| Content moderation | Not needed for closed friends-only app at this scale |
| Background location permission | Foreground only — "always on" tracking is disproportionate to use case |
| Directions inside the app | Deep link to native Maps app achieves same goal |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| THEME-01 | Phase 18 | Pending |
| THEME-02 | Phase 18 | Complete |
| THEME-03 | Phase 18 | Complete |
| THEME-05 | Phase 18 | Complete |
| THEME-04 | Phase 19 | Complete |
| MAP-01 | Phase 20 | Complete |
| MAP-02 | Phase 20 | Complete |
| MAP-03 | Phase 20 | Complete |
| MAP-04 | Phase 20 | Complete |
| MAP-05 | Phase 20 | Complete |
| GALL-01 | Phase 21 | Complete |
| GALL-02 | Phase 21 | Complete |
| GALL-03 | Phase 21 | Complete |
| GALL-04 | Phase 22 | Complete |
| GALL-05 | Phase 22 | Complete |
| GALL-06 | Phase 22 | Complete |
| GALL-07 | Phase 22 | Complete |
| GALL-08 | Phase 22 | Complete |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-28*
*Last updated: 2026-04-28 — traceability table completed after roadmap creation*
