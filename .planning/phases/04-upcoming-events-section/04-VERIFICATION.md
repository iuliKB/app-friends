---
phase: 04-upcoming-events-section
verified: 2026-04-11T21:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Upcoming Events section renders in running app"
    expected: "Section header 'Upcoming events ✨' appears below Radar/Cards switcher with 'See all' on the right; either a placeholder card or event cards render correctly"
    why_human: "Visual layout and scroll behavior cannot be verified programmatically without running the app"
  - test: "Event card tap navigates to plan detail"
    expected: "Tapping an EventCard opens the plan detail screen for that plan"
    why_human: "Navigation behavior requires a running app instance"
  - test: "Placeholder card tap navigates to plan creation"
    expected: "When no upcoming events exist, tapping the placeholder card opens the plan creation modal"
    why_human: "Navigation behavior requires a running app instance"
  - test: "See all tap navigates to Explore tab"
    expected: "Tapping 'See all' navigates to the Plans/Explore tab"
    why_human: "Navigation behavior requires a running app instance"
  - test: "Cover image picker in PlanCreateModal"
    expected: "Tapping the cover image field opens camera roll; selected image shows as preview thumbnail; image uploads after plan creation; EventCard shows the cover image"
    why_human: "Image picker, upload flow, and EventCard image rendering require a running app with a real device/simulator"
  - test: "Cover image edit in PlanDashboardScreen"
    expected: "Creator sees a camera-outline button on existing cover or 'Add cover image' row when no cover; non-creator sees image but no edit controls"
    why_human: "Creator vs non-creator conditional UI requires running app with authenticated session"
---

# Phase 4: Upcoming Events Section Verification Report

**Phase Goal:** Users see a horizontally scrollable row of upcoming event cards below the Radar/Cards view on the homescreen, and can optionally add a cover image to any plan
**Verified:** 2026-04-11T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Homescreen shows "Upcoming events" section below Radar/Cards with horizontal scroll of event cards (future plans user created or RSVP'd going, max 5, soonest first) | VERIFIED | `UpcomingEventsSection` inserted at line 136 of HomeScreen.tsx after the viewSwitcher View. `useUpcomingEvents` hook filters by `isCreator \|\| isGoing`, future-only (`> new Date()`), sorted ascending, `.slice(0, 5)`. |
| SC-2 | Each event card shows title, formatted date ("Mon 15, Aug · in 2 days"), avatar stack of attendees, and a cover image or deterministic pastel background | VERIFIED | `EventCard.tsx` renders title, `formatEventCardDate(plan.scheduled_for)` (returns middle-dot composite string), `AvatarStack size={24}`, expo-image cover or pastel background from 5-color palette via `plan.id.charCodeAt(0) % 5`. |
| SC-3 | Tapping an event card navigates to the plan detail screen; tapping "See all" navigates to the Explore tab | VERIFIED | `EventCard` calls `router.push('/plans/${plan.id}' as never)` on press. `UpcomingEventsSection` calls `router.push('/(tabs)/plans')` from the "See all" button. |
| SC-4 | When no upcoming events exist, a placeholder card shows with a CTA to create a plan | VERIFIED | `UpcomingEventsSection` renders a `TouchableOpacity` with `calendar-outline` icon, "No plans yet", "Start one and invite your crew", calling `router.push('/plan-create')`. |
| SC-5 | Users can add a cover image to a plan from the creation form and edit it from the plan detail screen | VERIFIED | `PlanCreateModal` has image picker with `launchImageLibraryAsync`, preview, and upload-after-create flow calling `uploadPlanCover`. `PlanDashboardScreen` shows `pickAndUploadCoverImage` with creator guard (`session.user.id === plan.created_by`). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0013_cover_image_url.sql` | DB migration adding cover_image_url column | VERIFIED | Contains `ALTER TABLE plans ADD COLUMN IF NOT EXISTS cover_image_url text` |
| `src/types/database.ts` | Updated Supabase types for plans table | VERIFIED | `cover_image_url: string \| null` in Row; `cover_image_url?: string \| null` in Insert and Update |
| `src/types/plans.ts` | Plan interface with cover_image_url field | VERIFIED | `cover_image_url?: string \| null` present in Plan interface |
| `src/lib/formatEventCardDate.ts` | Date format utility for event cards | VERIFIED | Exports `formatEventCardDate`; uses `\u00B7` middle dot; `toLocaleDateString` with weekday/day/month; relative ladder (now, min, h, tomorrow, days) |
| `src/hooks/useUpcomingEvents.ts` | Filtered upcoming events from Zustand store | VERIFIED | Exports `useUpcomingEvents`; imports `usePlansStore` and `useAuthStore`; filters by isCreator/isGoing, future-only, sorts asc, `.slice(0, 5)` |
| `src/components/home/EventCard.tsx` | Single landscape event card component | VERIFIED | Exports `EventCard`; `width: 200`, `height: 140`; PASTEL_COLORS 5-color palette; expo-image for cover; `formatEventCardDate`; `AvatarStack size={24}`; `router.push` to plan detail; `accessibilityRole="button"` |
| `src/components/home/UpcomingEventsSection.tsx` | Section wrapper with header, FlatList, empty state | VERIFIED | Exports `UpcomingEventsSection`; imports `useUpcomingEvents`; SectionHeader with "Upcoming events ✨"; "See all" with accent color; horizontal FlatList with `snapToInterval`; `height: 140` on FlatList style; placeholder card with `calendar-outline` |
| `src/screens/home/HomeScreen.tsx` | HomeScreen with UpcomingEventsSection wired | VERIFIED | Imports `usePlans` and `UpcomingEventsSection`; calls `usePlans()` in component body; `<UpcomingEventsSection />` at line 136, after viewSwitcher closing tag, before `</ScrollView>` |
| `app.config.ts` | iOS photo library permission | VERIFIED | `ios.infoPlist.NSPhotoLibraryUsageDescription` set to non-empty description string |
| `src/lib/uploadPlanCover.ts` | Image upload utility for Supabase Storage | VERIFIED | Exports `uploadPlanCover`; uses `fetch → blob → arrayBuffer` pattern; `supabase.storage.from('plan-covers').upload(path, arrayBuffer, { upsert: true })`; returns `data.publicUrl` |
| `src/hooks/usePlanDetail.ts` | updatePlanDetails with cover_image_url support | VERIFIED | `cover_image_url?: string \| null` in updates type; `cover_image_url` in refetch assembly (bug-fixed during plan 04) |
| `src/screens/plans/PlanCreateModal.tsx` | Plan creation form with optional cover image picker | VERIFIED | Imports `ImagePicker`; `launchImageLibraryAsync` with `mediaTypes: ['images']`, `allowsEditing: true`, `aspect: [200, 140]`; `uploadPlanCover` called after createPlan; Create button `disabled={!title.trim() \|\| uploadingCover}` |
| `src/screens/plans/PlanDashboardScreen.tsx` | Plan detail screen with cover image edit for creators | VERIFIED | Imports `ImagePicker`; `pickAndUploadCoverImage` function present; `isCreator` guard (`session.user.id === plan.created_by`) controls edit UI; calls `updatePlanDetails({ cover_image_url: publicUrl })` then `refetch()` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useUpcomingEvents.ts` | `src/stores/usePlansStore.ts` | `usePlansStore((s) => s.plans)` | WIRED | Import and selector call confirmed |
| `src/hooks/usePlans.ts` | `cover_image_url column` | `cover_image_url: p.cover_image_url as string \| null` | WIRED | Line 138 in assembly map step |
| `src/components/home/EventCard.tsx` | `src/lib/formatEventCardDate.ts` | `import { formatEventCardDate }` | WIRED | Line 8; used at line 31 |
| `src/components/home/UpcomingEventsSection.tsx` | `src/hooks/useUpcomingEvents.ts` | `import { useUpcomingEvents }` | WIRED | Line 14; called at line 24 |
| `src/components/home/EventCard.tsx` | `/plans/[id]` | `router.push('/plans/${plan.id}')` | WIRED | Line 35 |
| `src/screens/home/HomeScreen.tsx` | `src/components/home/UpcomingEventsSection.tsx` | `import { UpcomingEventsSection }` | WIRED | Line 25; JSX at line 136 |
| `src/screens/home/HomeScreen.tsx` | `src/hooks/usePlans.ts` | `usePlans()` called to populate store | WIRED | Line 24 import; line 31 call |
| `src/screens/plans/PlanCreateModal.tsx` | `src/lib/uploadPlanCover.ts` | `uploadPlanCover(planId, localUri)` | WIRED | Line 22 import; line 138 call |
| `src/screens/plans/PlanDashboardScreen.tsx` | `src/lib/uploadPlanCover.ts` | `uploadPlanCover(plan.id, asset.uri)` | WIRED | Line 20 import; line 140 call |
| `src/lib/uploadPlanCover.ts` | `supabase storage plan-covers bucket` | `supabase.storage.from('plan-covers').upload()` | WIRED | Lines 23-26 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `UpcomingEventsSection` | `upcomingEvents` | `useUpcomingEvents()` → `usePlansStore((s) => s.plans)` → populated by `usePlans()` in HomeScreen | Yes — `usePlans` fetches real Supabase data; `useUpcomingEvents` filters the populated store | FLOWING |
| `EventCard` | `plan` prop | Passed from `UpcomingEventsSection` FlatList `renderItem` | Yes — sourced from the store populated via Supabase query | FLOWING |
| `EventCard` | `dateLabel` | `formatEventCardDate(plan.scheduled_for)` | Yes — real computation on actual plan date field | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for UI components (require running Expo app; cannot test without simulator/device). TypeScript check substituted:

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| TypeScript clean across all modified files | `npx tsc --noEmit` | Exit 0, no errors | PASS |
| Migration file exists with correct SQL | `cat supabase/migrations/0013_cover_image_url.sql` | Contains `ALTER TABLE plans ADD COLUMN IF NOT EXISTS cover_image_url text` | PASS |
| useUpcomingEvents applies all three filters | Grep for `isCreator`, `isGoing`, `slice(0, 5)`, future check | All present in hook | PASS |
| formatEventCardDate middle-dot separator | Grep for `\u00B7` | Present in formatEventCardDate.ts | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| EVT-01 | "Upcoming events" section below Radar/Cards, horizontally scrollable event cards | SATISFIED | `UpcomingEventsSection` in HomeScreen.tsx line 136; horizontal FlatList with `snapToInterval` |
| EVT-02 | Event cards show title, formatted date, attendee avatar stack, optional cover image or pastel background | SATISFIED | `EventCard.tsx` renders all four elements |
| EVT-03 | Section only shows plans where user is creator or RSVP'd "going"; future plans only; capped at 5, soonest first | SATISFIED | `useUpcomingEvents` applies all three filters in order |
| EVT-04 | Tapping an event card navigates to the plan detail screen | SATISFIED | `router.push('/plans/${plan.id}' as never)` in EventCard `handlePress` |
| EVT-05 | When no upcoming events exist, a placeholder card shows with a CTA to create a plan | SATISFIED | Placeholder card with "No plans yet" / "Start one and invite your crew" linking to `/plan-create` (text differs from exact requirement quote but intent is met) |
| EVT-06 | Users can optionally add a cover image during creation or from plan detail screen; camera roll only; stored in Supabase Storage | SATISFIED | `PlanCreateModal` image picker + upload-after-create; `PlanDashboardScreen` creator edit UI; `uploadPlanCover` uploads to `plan-covers` bucket |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `UpcomingEventsSection.tsx` lines 60-61 | "No plans yet" / "Start one..." text | Info | Intentional design — this is the D-12 empty-state placeholder card, not a code stub |

No blocking or warning-level anti-patterns found. All "placeholder" occurrences are intentional UI empty-state design.

### Human Verification Required

#### 1. Visual Layout of Upcoming Events Section

**Test:** Launch the app in Expo Go, navigate to the Home tab, and scroll below the Radar/Cards view.
**Expected:** "Upcoming events ✨" section header appears with "See all" text in accent orange on the right. Either a placeholder card (if no upcoming plans) or event cards are visible. Cards are horizontally scrollable and snap to card boundaries.
**Why human:** Visual appearance, scroll behavior, and snap-to-card responsiveness cannot be verified without a running app.

#### 2. Event Card Navigation

**Test:** With at least one future plan you created or RSVP'd "going", tap an EventCard in the section.
**Expected:** App navigates to the plan detail screen for that specific plan.
**Why human:** Navigation requires a running app instance.

#### 3. Placeholder Card Navigation

**Test:** With no upcoming events, tap the placeholder card in the section.
**Expected:** App navigates to the plan creation screen.
**Why human:** Navigation and empty-state rendering require a running app.

#### 4. "See all" Navigation

**Test:** Tap the "See all" text in the section header.
**Expected:** App navigates to the Explore/Plans tab.
**Why human:** Navigation requires a running app instance.

#### 5. Cover Image: PlanCreateModal

**Test:** Open plan creation modal, tap the cover image field, select a photo from camera roll.
**Expected:** Selected image appears as a thumbnail preview in the form. After tapping "Create", the image uploads to Supabase Storage and the newly created plan's EventCard shows the cover image.
**Why human:** Image picker, Supabase Storage upload, and EventCard image rendering require a running app with a connected Supabase project.

#### 6. Cover Image: PlanDashboardScreen (Creator vs Non-Creator)

**Test (creator):** Open a plan you created. Verify a camera-outline button appears on the cover image (or "Add cover image" row if no cover). Tap it, select a photo, confirm the cover updates.
**Test (non-creator):** Open a plan you were invited to. Verify you see the cover image (if set) but no edit controls.
**Why human:** Creator identity check and conditional UI rendering require an authenticated session in a running app.

### Gaps Summary

No automated gaps found. All artifacts exist, are substantive (not stubs), are wired to their consumers, and data flows through the chain from Supabase to the UI. TypeScript is clean. 6 human verification items remain for visual, navigation, and image-picker behavior that cannot be confirmed without the running app.

Note: The REQUIREMENTS.md traceability table still shows EVT-01 through EVT-06 as "Planned" rather than "Complete" — this is a documentation gap only (the table was not updated after execution). The actual implementation is verified complete.

---

_Verified: 2026-04-11T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
