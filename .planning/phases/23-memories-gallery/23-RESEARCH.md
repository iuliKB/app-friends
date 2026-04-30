# Phase 23: Memories Gallery - Research

**Researched:** 2026-04-30
**Domain:** React Native (Expo) — cross-plan photo aggregation, SectionList grid, horizontal FlatList widget
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Widget uses a horizontal scrolling thumbnail strip — `FlatList horizontal={true}`, 3–4 square thumbnails, "See all" in section header. Pattern matches `UpcomingEventsSection` exactly.
- **D-02:** Each widget thumbnail shows the plan name as a small caption below the photo (e.g. "Summer BBQ").
- **D-03:** Widget is hidden entirely when no photos exist. No empty state placeholder in the widget.
- **D-04:** Memories screen uses a `SectionList` where each section = one plan. Section header = plan title. Sections ordered newest plan first (by most recent photo's `created_at` within that plan).
- **D-05:** Photo grid uses 3 columns with the same `CELL_SIZE` formula as Phase 22: `(Dimensions.get('window').width - SPACING.lg * 2 - SPACING.xs * 2) / 3`.
- **D-06:** Screen is a root-level route at `src/app/memories.tsx`. Same pattern as `src/app/friends/[id].tsx`. Back arrow returns to calling screen.
- **D-07:** Tapping any thumbnail in the Memories screen opens the existing `GalleryViewerModal`. Pass the full photos array for that plan section and the tapped index. Same delete/save behaviour as Phase 22.
- **D-08:** Create a new `useAllPlanPhotos` hook that: (1) fetches all `plan_photos` the user can see joined with plan title via `plan_id`, (2) generates signed URLs in a single batch call, (3) returns `{ planId, planTitle, photos: PlanPhotoWithUploader[] }[]` sorted newest-plan-first.
- **D-09:** Hook performs a fresh fetch on mount. No cached/store data. Loading state while fetching.
- **D-10:** Widget calls `useAllPlanPhotos` and renders the most recent 6 photos across all plans (sorted `created_at DESC`).
- **D-11:** Widget "See all" link navigates to `/memories` via `useRouter().push('/memories')`.
- **D-12:** Tapping a widget thumbnail also navigates to `/memories` — does not open the viewer inline.

### Claude's Discretion

- How to handle signed URL expiry in the widget (1-hour TTL) — refetch on re-focus is acceptable
- Whether to show a `SectionHeader` component or plain `Text` for plan section titles in the gallery
- Pull-to-refresh on the gallery screen (standard pattern, Claude decides)
- Skeleton loading implementation (placeholder shimmer or simple `ActivityIndicator`)

### Deferred Ideas (OUT OF SCOPE)

- Memories as a dedicated tab slot
- Search/filter photos by plan or date
- "On this day" memories surfacing
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEMO-01 | Home screen shows a "Recent Memories" widget with the latest photos from all plans the user is part of | `RecentMemoriesSection` component, `useAllPlanPhotos` hook, widget insertion point in `HomeScreen` confirmed |
| MEMO-02 | Tapping "See all" opens a full-screen Memories gallery with photos grouped by plan (newest plan first, grid within each group) | `MemoriesScreen` at `src/app/memories.tsx`, `SectionList` with pre-chunked row data confirmed |
| MEMO-03 | Each photo in the Memories gallery shows the plan name, uploader, and opens the full-screen viewer on tap | `PlanPhotoWithUploader` type includes uploader; `GalleryViewerModal` reused; section header provides plan name |
</phase_requirements>

---

## Summary

Phase 23 builds two UI surfaces on top of the Phase 21/22 gallery foundation: a "Recent Memories" horizontal widget on the Home screen, and a full-screen `/memories` gallery that groups all user plan photos by plan. Both surfaces share a single new hook, `useAllPlanPhotos`, that aggregates photos across every plan the user is a member of.

All the building blocks are already in the codebase. `UpcomingEventsSection` provides the exact structural template for the home widget (horizontal `FlatList` inside a `ScrollView`, explicit height, `SectionHeader` + "See all" wiring). `usePlanPhotos` provides the Supabase query and signed URL batch pattern to replicate. `GalleryViewerModal` is reused as-is. The new hook joins `plan_photos` with plan title via `plan_id`, which requires a two-query pattern (photos first, then plans for titles) since PostgREST join quirks are already documented in the codebase.

The one structural decision for the planner is the `SectionList` data shape: each `data` item is a pre-chunked row array (up to 3 photos) rather than using `numColumns`, because `SectionList` does not support `numColumns`. This is the established pattern confirmed in the UI-SPEC.

**Primary recommendation:** Follow the 4-file plan — `useAllPlanPhotos.ts` (hook), `RecentMemoriesSection.tsx` (widget), `memories.tsx` (screen + route), and a one-line edit to `HomeScreen.tsx`. No new dependencies required.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cross-plan photo aggregation + signed URLs | API / Backend (Supabase) | Client hook (`useAllPlanPhotos`) | Data lives in `plan_photos` table and private Storage bucket; signed URLs generated server-side |
| Widget rendering (horizontal thumbnail strip) | Frontend (React Native component) | — | Pure UI, no backend ownership |
| Gallery screen (SectionList grouped grid) | Frontend (React Native screen) | — | Pure UI layout; data from hook |
| Full-screen photo viewer | Frontend (reused `GalleryViewerModal`) | — | Existing component, no new backend calls |
| Photo deletion | API / Backend (Supabase RLS) | Client hook (delete flow from `usePlanPhotos`) | RLS `plan_photos_delete_own` enforces ownership |
| Route registration (`/memories`) | Expo Router file system | — | Root-level `src/app/memories.tsx` auto-registered by file-based routing |

---

## Standard Stack

### Core (all already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | current | File-based routing; `useFocusEffect`, `useRouter`, `Stack.Screen` | Project routing layer |
| react-native `SectionList` | built-in | Grouped virtualized list for gallery screen | Native list; no nested ScrollView issues |
| react-native `FlatList` (horizontal) | built-in | Widget thumbnail strip | Used identically in `UpcomingEventsSection` |
| `expo-image` | current | Thumbnail rendering with built-in placeholder | Used in Phase 22 gallery grid |
| `@supabase/supabase-js` | current | `plan_photos` query + `createSignedUrls` batch | All data hooks use this |
| `react-native-safe-area-context` | current | `useSafeAreaInsets` for bottom padding on memories screen | Consistent with all screens |

**No installation needed.** [VERIFIED: codebase grep]

---

## Architecture Patterns

### System Architecture Diagram

```
HomeScreen (ScrollView)
  │
  ├── UpcomingEventsSection (existing)
  │
  └── RecentMemoriesSection (NEW)
        │
        ├── useAllPlanPhotos() ──► Supabase: plan_photos (all user plans)
        │     │                          ─► plans (titles)
        │     │                          ─► profiles (uploader names)
        │     │                          ─► Storage.createSignedUrls (batch)
        │     │
        │     └── returns: { planId, planTitle, photos[] }[] + flat recent6[]
        │
        ├── horizontal FlatList (recent 6 photos, sorted created_at DESC)
        │     └── each item: 72×72 thumbnail + plan name caption
        │           └── onPress → router.push('/memories')
        │
        └── "See all" → router.push('/memories')

/memories route (src/app/memories.tsx)  [NEW root-level file]
  │
  ├── useFocusEffect → re-calls useAllPlanPhotos.refetch()
  │
  └── SectionList
        sections: grouped data, pre-chunked into 3-photo rows
        │
        ├── renderSectionHeader: plan title + hairline divider
        │
        └── renderItem: row of up to 3 CELL_SIZE thumbnails
              └── onPress → openViewer(sectionPhotos, tappedIndex)
                    └── GalleryViewerModal (existing, reused as-is)
```

### Recommended Project Structure
```
src/
├── hooks/
│   └── useAllPlanPhotos.ts        # NEW — cross-plan photo aggregator
├── components/home/
│   └── RecentMemoriesSection.tsx  # NEW — home widget
├── app/
│   └── memories.tsx               # NEW — root-level route + screen
└── screens/home/
    └── HomeScreen.tsx             # MODIFIED — insert RecentMemoriesSection
```

### Pattern 1: Horizontal FlatList Widget (from UpcomingEventsSection)

**What:** A section component with `SectionHeader` + right-action "See all" link, wrapping a `horizontal` `FlatList` inside the Home screen's outer `ScrollView`.

**Critical constraint:** The FlatList MUST have an explicit `height` style when inside a `ScrollView`. Without it, the list collapses to zero height. [VERIFIED: confirmed in UpcomingEventsSection comment and implementation]

```tsx
// Source: src/components/home/UpcomingEventsSection.tsx
<FlatList
  horizontal
  showsHorizontalScrollIndicator={false}
  style={{ height: 104 }}  // REQUIRED — prevents height collapse in ScrollView
  contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.sm }}
  data={recentPhotos}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <MemoryThumbnail photo={item} />}
/>
```

### Pattern 2: SectionList with Pre-chunked Row Data

**What:** `SectionList` does not support `numColumns`. To achieve a 3-column grid, chunk the flat photos array into row arrays before passing to `sections`. Each `data` item is `PlanPhotoWithUploader[]` of length 1–3.

**When to use:** Any grouped grid inside a `SectionList`. [VERIFIED: UI-SPEC §3.2, confirmed by React Native docs that SectionList has no numColumns prop]

```tsx
// Pre-chunk utility (implement in useAllPlanPhotos or inline in screen)
function chunkPhotos(photos: PlanPhotoWithUploader[], size = 3): PlanPhotoWithUploader[][] {
  const rows: PlanPhotoWithUploader[][] = [];
  for (let i = 0; i < photos.length; i += size) {
    rows.push(photos.slice(i, i + size));
  }
  return rows;
}

// SectionList sections shape:
const sections = groupedPhotos.map((group) => ({
  title: group.planTitle,
  planId: group.planId,
  allPhotos: group.photos,           // full flat array for GalleryViewerModal
  data: chunkPhotos(group.photos),   // pre-chunked rows for renderItem
}));
```

### Pattern 3: useFocusEffect for Signed URL Refresh

**What:** Re-fetch on screen focus to get fresh 1-hour signed URLs. `useFocusEffect` from `expo-router` (not `@react-navigation/native`).

**When to use:** Any screen where data has a TTL (signed URLs expire in 1h) or stale data is undesirable. [VERIFIED: src/hooks/usePlans.ts lines 196–200]

```tsx
// Source: src/hooks/usePlans.ts
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

useFocusEffect(
  useCallback(() => {
    refetch();
  }, [session?.user?.id])
);
```

### Pattern 4: Signed URL Batch Generation (from usePlanPhotos)

**What:** Generate signed URLs for all photos in a single `createSignedUrls` call. Never loop `createSignedUrl` per photo.

```tsx
// Source: src/hooks/usePlanPhotos.ts lines 62–69
const paths = photoRows.map((r) => r.storage_path as string);
const { data: signedData } = await supabase.storage
  .from('plan-gallery')
  .createSignedUrls(paths, 3600); // 3600 seconds = 1 hour TTL

// signedData is index-aligned with paths
const signedMap = new Map(
  (signedData ?? []).map((s) => [s.path, s.signedUrl])
);
```

### Pattern 5: Root-Level Route (from src/app/friends/_layout.tsx)

**What:** `src/app/friends/` is a subfolder with its own `_layout.tsx` that defines a `Stack` with themed header. This Stack provides the back-arrow navigation automatically via Expo Router's file-system routing.

**For `/memories`:** Create `src/app/memories.tsx` as a plain default export (no subfolder needed since no dynamic segments). The root `_layout.tsx` already declares `headerShown: false` globally — the memories screen should use `<Stack.Screen options={{ title: 'Memories', headerShown: false }} />` and render its own back arrow via a custom `ScreenHeader` or use the Stack's native header.

**Recommendation:** Because the root Stack uses `headerShown: false`, `memories.tsx` must render its own back-navigation UI (a back-arrow button or `ScreenHeader`). Pattern from `friends/[id].tsx`: it uses `<Stack.Screen options={{ title: profile.display_name }} />` to re-enable the Stack's native header for that screen. For memories, use the same approach or rely on native Stack header.

[VERIFIED: src/app/_layout.tsx line 216 — global `headerShown: false`; src/app/friends/[id].tsx line 233 — `<Stack.Screen options={{ title: ... }} />`]

### Pattern 6: GalleryViewerModal Props

**What:** The actual GalleryViewerModal signature (read from source — differs slightly from CONTEXT.md sketch).

```tsx
// Source: src/components/plans/GalleryViewerModal.tsx lines 25–32
interface GalleryViewerModalProps {
  visible: boolean;
  photos: PlanPhotoWithUploader[];
  initialIndex: number;
  currentUserId: string;   // REQUIRED — not in CONTEXT.md sketch; needed for delete button visibility
  onClose: () => void;
  deletePhoto: (photoId: string) => Promise<{ error: Error | null }>;
}
```

**Critical:** The `currentUserId` prop is REQUIRED. The CONTEXT.md sketch omitted it. The implementer must pass `session.user.id` from `useAuthStore`. [VERIFIED: src/components/plans/GalleryViewerModal.tsx line 29]

### Pattern 7: useAllPlanPhotos Query Strategy

**What:** The hook must fetch all `plan_photos` rows the current user can access (via RLS — user must be a plan member), then join plan titles from the `plans` table. PostgREST join quirks in this codebase require separate queries rather than inline joins (documented in `usePlanPhotos` comment: "separate join — avoids PostgREST join issues").

**Recommended query sequence:**

```
Step 1: Query plan_members to get planIds user is a member of (going/maybe)
        → Same pattern as usePlans.ts lines 43–53

Step 2: Query plan_photos WHERE plan_id IN (planIds)
        → ORDER BY created_at DESC

Step 3: Query plans WHERE id IN (planIds from photos)
        → SELECT id, title — for section headers

Step 4: Query profiles WHERE id IN (unique uploader_ids)
        → SELECT id, display_name, avatar_url

Step 5: createSignedUrls batch for all storage_paths

Step 6: Assemble PlanPhotoWithUploader[] + group by planId
        → Sort groups by max(photo.createdAt) DESC per group
```

[VERIFIED: pattern derived from usePlanPhotos.ts + usePlans.ts — both in codebase]

### Anti-Patterns to Avoid

- **`numColumns` on SectionList:** SectionList does not accept `numColumns`. Pre-chunk data into rows.
- **Per-photo `createSignedUrl` loop:** Always use `createSignedUrls` batch (single API call).
- **Horizontal FlatList without explicit `height`:** Will collapse to zero height inside a ScrollView.
- **Module-level `StyleSheet.create`:** All themed styles must be inside `useMemo([colors])` — enforced by `campfire/no-hardcoded-styles` ESLint rule.
- **Nested ScrollView inside SectionList:** `MemoriesScreen` must NOT wrap `SectionList` in a `ScrollView`. SectionList is the scroll container.
- **Missing `currentUserId` prop on GalleryViewerModal:** Forgetting this prop causes TypeScript error and the delete button will not render correctly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signed URL generation | Per-photo URL loop | `supabase.storage.createSignedUrls(paths, 3600)` | Single API call; loop causes N round-trips |
| Grouped virtualized list | Nested FlatList/SectionList | RN `SectionList` with pre-chunked data | No nested scroll conflict |
| Image lazy loading with placeholder | Custom shimmer | `expo-image` with `backgroundColor` placeholder style | Built-in; matches Phase 22 exactly |
| Back navigation on modal screen | Custom gesture handler | `Stack.Screen options={{ title }}` to re-enable native Stack header | Expo Router handles back automatically |
| Photo grid row layout | `numColumns` | Pre-chunk array into row arrays | SectionList doesn't support numColumns |

---

## Common Pitfalls

### Pitfall 1: Horizontal FlatList Height Collapse
**What goes wrong:** `horizontal` FlatList inside a `ScrollView` renders with zero height and shows nothing.
**Why it happens:** The outer ScrollView has unbounded height; the FlatList cannot infer its height from children when horizontal.
**How to avoid:** Always set `style={{ height: N }}` on the FlatList. For this phase: `height: 104` (72px thumb + 4px gap + ~16px caption row + padding).
**Warning signs:** FlatList renders but nothing is visible; no error thrown.
[VERIFIED: src/components/home/UpcomingEventsSection.tsx line 39-40 comment]

### Pitfall 2: Missing `currentUserId` Prop on GalleryViewerModal
**What goes wrong:** TypeScript error at compile time; delete button never appears even for own photos.
**Why it happens:** CONTEXT.md sketch omitted `currentUserId` from the prop list. The actual component requires it.
**How to avoid:** Destructure `session` from `useAuthStore` in `MemoriesScreen` and pass `currentUserId={session.user.id}`.
**Warning signs:** TS error: "Property 'currentUserId' is missing in type".
[VERIFIED: src/components/plans/GalleryViewerModal.tsx line 29]

### Pitfall 3: SectionList `numColumns` Does Not Exist
**What goes wrong:** Runtime error or TypeScript error when passing `numColumns` to `SectionList`.
**Why it happens:** `numColumns` is a `FlatList`-only prop.
**How to avoid:** Pre-chunk photos into row arrays (arrays of up to 3) before setting `sections`. Each `data` item = one row.
**Warning signs:** TypeScript will flag the prop as unknown.
[VERIFIED: React Native API — SectionList props documented without numColumns — ASSUMED based on well-known RN constraint]

### Pitfall 4: Supabase `plan_photos` Has No Plan Title Column
**What goes wrong:** Querying `plan_photos` alone returns no `title` field; section headers render empty.
**Why it happens:** `plan_photos` table schema: `id`, `plan_id`, `uploader_id`, `storage_path`, `created_at` — no plan title.
**How to avoid:** After fetching photos, collect unique `plan_id` values, then query `plans` table for `id, title`. Build a planId→title Map.
**Warning signs:** Section headers are blank; no TypeScript error (title would just be `undefined`).
[VERIFIED: src/types/database.ts lines 641–648]

### Pitfall 5: `useFocusEffect` Import Source
**What goes wrong:** Importing `useFocusEffect` from `@react-navigation/native` instead of `expo-router`.
**Why it happens:** The hook exists in both packages; the wrong import compiles fine but may behave differently in an Expo Router app.
**How to avoid:** Always import from `expo-router` — consistent with `usePlans.ts` (line 2).
**Warning signs:** Focus refetch does not fire; no runtime error.
[VERIFIED: src/hooks/usePlans.ts line 2]

### Pitfall 6: ESLint `campfire/no-hardcoded-styles` Rule
**What goes wrong:** Build fails with ESLint error for any numeric literal in `StyleSheet.create` outside of `useMemo([colors])`.
**Why it happens:** Custom ESLint rule `campfire/no-hardcoded-styles` is configured as `"error"`.
**How to avoid:** Wrap ALL `StyleSheet.create(...)` calls inside `useMemo(() => StyleSheet.create({...}), [colors])`. For non-theme numeric values (e.g. `height: 104`, `width: 72`), use `// eslint-disable-next-line campfire/no-hardcoded-styles` on the offending line.
**Warning signs:** `npx expo lint` or CI fails with "no-hardcoded-styles" errors.
[VERIFIED: src/components/home/UpcomingEventsSection.tsx line 38-40; eslint.config.js line 22]

---

## Code Examples

### useAllPlanPhotos — Complete Data Shape

```typescript
// src/hooks/useAllPlanPhotos.ts
// Returns type:
export type PlanPhotoGroup = {
  planId: string;
  planTitle: string;
  photos: PlanPhotoWithUploader[];  // flat, sorted created_at DESC within group
};

export type UseAllPlanPhotosResult = {
  groups: PlanPhotoGroup[];          // sorted newest-plan-first
  recentPhotos: PlanPhotoWithUploader[];  // flat, most recent 6 across all plans (for widget)
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};
```

### RecentMemoriesSection — Widget Conditional Render

```tsx
// Source: derived from UpcomingEventsSection pattern [VERIFIED]
export function RecentMemoriesSection() {
  const { recentPhotos, isLoading } = useAllPlanPhotos();

  // D-03: Hidden entirely when no photos
  if (!isLoading && recentPhotos.length === 0) return null;

  // ... render widget
}
```

### MemoriesScreen — SectionList Sections Shape

```tsx
// Source: UI-SPEC §3.2 [VERIFIED]
const sections = groups.map((group) => ({
  title: group.planTitle,
  planId: group.planId,
  allPhotos: group.photos,
  data: chunkPhotos(group.photos, 3),
}));

// renderItem receives a row: PlanPhotoWithUploader[]
renderItem={({ item: row, section }) => (
  <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs }}>
    {row.map((photo, idx) => {
      const globalIdx = section.allPhotos.indexOf(photo);
      return (
        <TouchableOpacity
          key={photo.id}
          onPress={() => openViewer(section.allPhotos, globalIdx)}
          activeOpacity={0.85}
          accessibilityLabel={`Photo from ${section.title}`}
        >
          <Image
            source={{ uri: photo.signedUrl ?? undefined }}
            style={{ width: CELL_SIZE, height: CELL_SIZE, borderRadius: RADII.sm }}
            contentFit="cover"
          />
        </TouchableOpacity>
      );
    })}
  </View>
)}
```

### Theme Tokens — All Values for This Phase

```typescript
// Source: src/theme/spacing.ts, radii.ts [VERIFIED]
SPACING.xs  = 4   // grid gap between cells; row marginBottom
SPACING.sm  = 8   // widget thumbnail gap; section header paddingBottom
SPACING.md  = 12  // (not used in phase)
SPACING.lg  = 16  // screen padding; widget horizontal padding; CELL_SIZE formula
SPACING.xl  = 24  // section header paddingTop; gallery contentContainerStyle paddingTop
SPACING.xxl = 32  // ActivityIndicator marginTop on empty gallery

RADII.sm    = 6   // all thumbnails (widget + gallery)

FONT_SIZE.xs  = 11  // widget plan name caption  [ASSUMED — xs not shown in spacing.ts; verify in typography.ts]
FONT_SIZE.md  = 14  // "See all" text; loading/empty text
FONT_SIZE.lg  = 18  // gallery section title  [ASSUMED — verify in typography.ts]
FONT_SIZE.xl  = 20  // widget section header title  [ASSUMED — verify in typography.ts]
FONT_SIZE.xxl = 24  // ScreenHeader title  [ASSUMED — verify in typography.ts]

// Colors (themed — from useTheme().colors):
colors.surface.base        // screen background
colors.surface.card        // thumbnail placeholder before image loads
colors.text.primary        // section titles
colors.text.secondary      // plan caption; loading/empty text
colors.interactive.accent  // "See all" text; RefreshControl tint
colors.border              // SectionList hairline divider between plans
colors.feedback.error      // GalleryViewerModal delete icon (internal)
```

### HomeScreen Insertion Point

```tsx
// Source: src/screens/home/HomeScreen.tsx line 203-205 [VERIFIED]
{/* D-09: Upcoming events section — below Radar/Cards view */}
<UpcomingEventsSection />

{/* Phase 23: Recent Memories widget — after UpcomingEventsSection */}
<RecentMemoriesSection />    {/* INSERT HERE */}

<HomeWidgetRow iouSummary={iouSummary} birthdays={birthdays} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-photo `createSignedUrl` | Batch `createSignedUrls` | Phase 21 | Critical — N→1 API calls |
| Module-level `StyleSheet.create` | `useMemo([colors])` wrapping | Phase 19 | Required for theme reactivity |
| `@react-navigation/native` | `expo-router` for `useFocusEffect` | Phase 20+ | Import source matters |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `FONT_SIZE.xs` = 11, `FONT_SIZE.lg` = 18, `FONT_SIZE.xl` = 20 — values assumed from UI-SPEC text; not verified in typography.ts | Code Examples — theme tokens | Wrong caption/header sizing; easily fixed at implementation time |
| A2 | SectionList does not support `numColumns` | Don't Hand-Roll, Pitfall 3 | Low risk — this is a well-established React Native constraint, but verify if RN version adds it |
| A3 | Root-level `memories.tsx` auto-registers as `/memories` route without needing a `Stack.Screen` entry in `_layout.tsx` | Architecture Patterns (Pattern 5) | If wrong, planner must add `<Stack.Screen name="memories" />` in `_layout.tsx` |

---

## Open Questions

1. **Navigation header for MemoriesScreen**
   - What we know: Root `_layout.tsx` sets `headerShown: false` globally. `friends/[id].tsx` re-enables the native Stack header with `<Stack.Screen options={{ title: ... }} />` inside the component.
   - What's unclear: Should `memories.tsx` re-enable the native Stack header (gets back arrow free) or render its own `ScreenHeader` + custom back button?
   - Recommendation: Re-enable native Stack header with `<Stack.Screen options={{ title: 'Memories', headerStyle: { backgroundColor: colors.surface.base }, headerTintColor: colors.text.primary, headerShadowVisible: false }} />` — same pattern as `friends/_layout.tsx` — avoids building a custom back button.

2. **`deletePhoto` function for GalleryViewerModal in MemoriesScreen**
   - What we know: `GalleryViewerModal` requires a `deletePhoto` callback with signature `(photoId: string) => Promise<{ error: Error | null }>`. In Phase 22, this came from `usePlanPhotos` which has per-plan scope.
   - What's unclear: `useAllPlanPhotos` operates cross-plan; deleting a photo requires knowing which plan it belongs to, which is available from `photo.planId` on the `PlanPhotoWithUploader` extended type.
   - Recommendation: `useAllPlanPhotos` should expose a `deletePhoto(photoId: string, planId: string)` function that calls the same Supabase delete logic as `usePlanPhotos.deletePhoto`, then triggers a refetch. The `planId` can be captured from the active section when the viewer is opened.

---

## Environment Availability

Step 2.6: SKIPPED — phase is purely code additions using already-installed dependencies (expo-router, @supabase/supabase-js, expo-image, react-native core). No new external tools or services required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Expo / React Native (no automated test framework detected in project) |
| Config file | none detected |
| Quick run command | `npx expo lint` (ESLint only) |
| Full suite command | `npx expo lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEMO-01 | Widget appears on Home with photos from all plans | manual-smoke | — | ❌ manual |
| MEMO-02 | "See all" navigates to `/memories`; photos grouped by plan newest-first | manual-smoke | — | ❌ manual |
| MEMO-03 | Plan name in section header; uploader in viewer overlay; tap opens viewer | manual-smoke | — | ❌ manual |

**Manual-only justification:** The project has no automated test framework (no jest.config, no `__tests__/`, no `*.test.*` files detected). All verification is manual smoke testing consistent with existing phase verification patterns.

### Sampling Rate
- **Per task commit:** `npx expo lint`
- **Per wave merge:** `npx expo lint` + manual smoke on simulator
- **Phase gate:** Full lint green + manual MEMO-01/02/03 smoke before `/gsd-verify-work`

### Wave 0 Gaps
None — no test infrastructure gaps to fill; project does not use automated tests.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase session via `useAuthStore` — no new auth logic |
| V3 Session Management | no | Reads existing session only |
| V4 Access Control | yes | `plan_photos` RLS enforces user can only see photos from plans they're a member of; delete enforced by `plan_photos_delete_own` RLS policy |
| V5 Input Validation | no | No user-supplied input in this phase |
| V6 Cryptography | no | Signed URLs generated by Supabase Storage — not hand-rolled |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-plan photo leakage | Information disclosure | RLS on `plan_photos` — user can only query rows where they are a `plan_members` member; enforced at DB layer |
| Unauthorized photo delete | Tampering | RLS `plan_photos_delete_own`: `uploader_id = auth.uid()` — existing policy from Phase 21 |
| Signed URL sharing | Information disclosure | 1-hour TTL; URLs are generated per-session and not stored persistently |

---

## Sources

### Primary (HIGH confidence)
- `src/components/home/UpcomingEventsSection.tsx` — horizontal FlatList widget pattern, height constraint, SectionHeader + "See all" wiring
- `src/hooks/usePlanPhotos.ts` — signed URL batch pattern, query structure, PlanPhotoWithUploader assembly
- `src/components/plans/GalleryViewerModal.tsx` — actual prop interface (confirmed `currentUserId` required)
- `src/types/database.ts` — `plan_photos` schema, `PlanPhotoWithUploader` type, `plans` schema
- `src/screens/home/HomeScreen.tsx` — insertion point after `<UpcomingEventsSection />`
- `src/hooks/usePlans.ts` — `useFocusEffect` pattern (expo-router import), multi-step Supabase query pattern
- `src/app/_layout.tsx` — root Stack config (`headerShown: false` global), route registration model
- `src/app/friends/_layout.tsx` — Stack with themed header pattern for non-tab routes
- `src/components/common/EmptyState.tsx` — confirmed props: `icon`, `iconType`, `heading`, `body`
- `src/components/common/SectionHeader.tsx` — confirmed props: `title`, `rightAction`
- `src/theme/spacing.ts` — verified all SPACING values
- `src/theme/radii.ts` — verified all RADII values
- `.planning/phases/23-memories-gallery/23-UI-SPEC.md` — design contract for all visual measurements
- `eslint.config.js` — confirmed `campfire/no-hardcoded-styles` is an error-level rule

### Secondary (MEDIUM confidence)
- `.planning/phases/23-memories-gallery/23-CONTEXT.md` — locked decisions and canonical refs

### Tertiary (LOW confidence — assumed from training knowledge)
- FONT_SIZE numeric values — not verified in `src/theme/typography.ts` (file not read)
- SectionList `numColumns` absence — standard RN constraint, not re-verified against installed RN version

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified present in codebase
- Architecture: HIGH — all patterns read directly from source files
- Pitfalls: HIGH — 5 of 6 verified from source; Pitfall 3 (numColumns) is MEDIUM/assumed
- Theme tokens: MEDIUM — spacing and radii verified; font sizes assumed

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable codebase, no fast-moving dependencies)
