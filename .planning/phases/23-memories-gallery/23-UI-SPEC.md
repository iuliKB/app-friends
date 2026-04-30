# Phase 23: Memories Gallery — UI Design Contract

**Generated:** 2026-04-30
**Phase:** 23 — Memories Gallery
**Stack:** React Native (Expo) + theme system (`src/theme/index.ts`)
**Status:** Ready for planning

---

## 1. Component Inventory

| Component | Type | File | Purpose |
|-----------|------|------|---------|
| RecentMemoriesSection | New home widget | `src/components/home/RecentMemoriesSection.tsx` | Horizontal thumbnail strip on Home screen |
| MemoriesScreen | New screen | `src/app/memories.tsx` | Full-screen gallery grouped by plan |
| useAllPlanPhotos | New hook | `src/hooks/useAllPlanPhotos.ts` | Fetches + groups all plan photos cross-plan |
| HomeScreen (modified) | Existing screen | `src/screens/home/HomeScreen.tsx` | Insert RecentMemoriesSection after UpcomingEventsSection |

---

## 2. Design Tokens (All from `src/theme/index.ts`)

### Typography
```
Section header title:  FONT_SIZE.xl + FONT_WEIGHT.semibold + colors.text.primary
"See all" CTA:         FONT_SIZE.md + FONT_WEIGHT.regular + colors.interactive.accent
Plan name caption:     FONT_SIZE.xs (11) + FONT_WEIGHT.regular + colors.text.secondary
Gallery section title: FONT_SIZE.lg + FONT_WEIGHT.semibold + colors.text.primary
Loading / empty text:  FONT_SIZE.md + colors.text.secondary
```

### Spacing
```
Widget horizontal padding:  SPACING.lg (16) — matches UpcomingEventsSection padding
Widget thumbnail size:      72×72px (fixed square — fits within height: 140 container)
Widget thumbnail gap:       SPACING.sm (8) between thumbnails
Widget caption height:      FONT_SIZE.xs + paddingTop: 4 — total widget item height ≈ 100px
Widget FlatList height:     104 (72 thumb + 4 gap + FONT_SIZE.xs caption row) — fits within 140
Gallery section padding:    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl
Gallery section header pad: paddingBottom: SPACING.sm
Gallery grid gap:           SPACING.xs (4) — matches Phase 22 grid gap
Gallery CELL_SIZE formula:  (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.xs * 2) / 3
```

### Colors
```
Screen bg:               colors.surface.base  (#1a1a1a)
Section header row bg:   transparent (inherits screen bg)
Thumbnail bg:            colors.surface.card  (#2a2a2a — placeholder before image loads)
Plan caption text:       colors.text.secondary
"See all" text:          colors.interactive.accent  (#f97316)
Section title text:      colors.text.primary
Gallery section divider: colors.border (1px hairline between plan sections)
Pull-to-refresh tint:    colors.interactive.accent  (#f97316 — matches all other lists)
```

### Radii
```
Widget thumbnails: RADII.sm  (subtle rounding — matches EventCard thumbnail style)
Gallery thumbnails: RADII.sm (matches Phase 22 grid thumbnail rounding)
```

### Shadows
```
No shadows — dark theme; card bg separation via colors.surface.card (#2a2a2a) is sufficient
```

---

## 3. Layout Specifications

### 3.1 RecentMemoriesSection — Home Widget

Rendered inside `HomeScreen`'s outer `ScrollView`, directly after `<UpcomingEventsSection />`. Hidden entirely when `useAllPlanPhotos()` returns an empty photos array (D-03).

```
┌─────────────────────────────────────────────────────┐
│  Recent Memories                      [See all →]   │  ← SectionHeader row
├─────────────────────────────────────────────────────┤
│  [ 72×72 ] [ 72×72 ] [ 72×72 ] [ 72×72 ] → scroll  │  ← horizontal FlatList, height: 104
│  Summer BBQ  Trip '24   Movie Nite  BBQ             │  ← plan name caption (xs, secondary)
└─────────────────────────────────────────────────────┘
```

**Section header row** — reuse `<SectionHeader>` component pattern exactly from `UpcomingEventsSection`:
- `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`
- Left: "Recent Memories" — `FONT_SIZE.xl`, `FONT_WEIGHT.semibold`, `colors.text.primary`
- Right: `<TouchableOpacity onPress={() => router.push('/memories')}>`
  - Label: "See all" — `FONT_SIZE.md`, `colors.interactive.accent`
  - `accessibilityLabel="See all memories"`

**FlatList:**
- `horizontal={true}`, `showsHorizontalScrollIndicator={false}`
- `data`: flat array of most recent 6 photos across all plans (sorted `created_at DESC`)
- `style={{ height: 104 }}` — required when horizontal FlatList is inside outer ScrollView
- `contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.sm }}`
- `keyExtractor`: `photo.id`

**Each widget item** (`renderItem`):
```
┌──────────────┐
│              │  ← TouchableOpacity → router.push('/memories')
│   72×72 img  │
│              │
└──────────────┘
  Summer BBQ      ← Text, xs, secondary, numberOfLines={1}, maxWidth: 80
```
- `TouchableOpacity` `onPress={() => router.push('/memories')}` (D-12)
- `expo-image` `contentFit="cover"` `width={72}` `height={72}` `borderRadius={RADII.sm}`
- Caption: `<Text numberOfLines={1} style={styles.caption}>{photo.planTitle}</Text>`
- `accessibilityLabel={`Photo from ${photo.planTitle}`}`

**Loading state:** `ActivityIndicator` centered at height 104 while `isLoading` is true.

---

### 3.2 MemoriesScreen — Full Gallery

Root-level route at `src/app/memories.tsx`. Uses `SectionList` — no outer `ScrollView`.

```
┌─────────────────────────────────────────────────────┐
│  ← Memories                                         │  ← ScreenHeader (back arrow)
├─────────────────────────────────────────────────────┤
│  Summer BBQ                                         │  ← Section header (plan title, lg, semibold)
│  ─────────────────────────────────────────────────  │  ← 1px border divider below title
│  [ cell ] [ cell ] [ cell ]                         │  ← Row 1 of plan's photos
│  [ cell ] [ cell ] [ cell ]                         │  ← Row 2 (etc.)
│                                                     │
│  Trip 2024                                          │  ← Next section header
│  ─────────────────────────────────────────────────  │
│  [ cell ] [ cell ]                                  │  ← 2 photos left-aligned in 3-col grid
└─────────────────────────────────────────────────────┘
```

**Screen header:** `<ScreenHeader title="Memories" />` — back arrow navigates to calling screen. No right action slot.

**SectionList:**
- `sections`: `useAllPlanPhotos()` grouped data — `{ title: planTitle, data: [row arrays for grid] }`
- Each `data` item is a **row** of up to 3 photos (pre-chunked before passing to SectionList) — avoids nested FlatList/ScrollView
- `stickySectionHeadersEnabled={false}` — section headers scroll with content
- `showsVerticalScrollIndicator={false}`
- `contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl }}`
- `refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.interactive.accent} />}` — pull-to-refresh (Claude's discretion, standard pattern)

**Section header** (`renderSectionHeader`):
```tsx
<View style={styles.sectionHeaderContainer}>
  <Text style={styles.sectionTitle}>{section.title}</Text>
  <View style={styles.sectionDivider} />
</View>
```
- `paddingTop: SPACING.xl` (24) — visual breathing room between sections
- `paddingBottom: SPACING.sm` (8) — tight gap to first photo row
- Divider: `height: StyleSheet.hairlineWidth`, `backgroundColor: colors.border`

**Photo grid row** (`renderItem`): each item = `[photo, photo?, photo?]` (up to 3):
```
┌──────────────────────────────────────────────────┐
│ [ CELL_SIZE×CELL_SIZE ] gap [ ... ] gap [ ... ]  │
└──────────────────────────────────────────────────┘
```
- `flexDirection: 'row'`, `gap: SPACING.xs` (4)
- `marginBottom: SPACING.xs` (4) — consistent row gap
- Each cell: `<TouchableOpacity onPress={() => openViewer(sectionPhotos, photoIndex)}`
  - `expo-image` `contentFit="cover"` `width={CELL_SIZE}` `height={CELL_SIZE}` `borderRadius={RADII.sm}`
  - `accessibilityLabel={`Photo from ${section.title}`}`
  - `activeOpacity={0.85}`

**CELL_SIZE formula** (matches Phase 22 exactly):
```ts
const CELL_SIZE = (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.xs * 2) / 3
```

**GalleryViewerModal** (D-07): on thumbnail tap, open with:
```tsx
<GalleryViewerModal
  visible={viewerVisible}
  photos={activeSectionPhotos}      // full PlanPhotoWithUploader[] for that section
  initialIndex={tappedIndex}
  deletePhoto={deletePhoto}
  onClose={() => setViewerVisible(false)}
/>
```

---

### 3.3 Empty States

**Widget — no photos:** Component not rendered (hidden entirely — D-03). No placeholder UI.

**Gallery screen — no photos:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│         [images-outline icon, 48px, border]         │
│              No memories yet                        │
│     Photos from your plans will appear here         │
│                                                     │
└─────────────────────────────────────────────────────┘
```
```tsx
<EmptyState
  icon="images-outline"
  iconType="ionicons"
  heading="No memories yet"
  body="Photos from your plans will appear here"
/>
```
No CTA — upload lives in individual plan screens (Phase 22).

**Gallery screen — loading:**
```tsx
<ActivityIndicator size="large" color={colors.interactive.accent} style={{ marginTop: SPACING.xxl }} />
```

---

## 4. Interaction States

### 4.1 Widget Thumbnail
| State | Visual |
|-------|--------|
| Default | Photo at full opacity, plan caption below |
| Pressed | `activeOpacity={0.85}` — brief dim |
| Loading | `ActivityIndicator` in place of FlatList |
| No photos | Widget not rendered |

### 4.2 Gallery Thumbnail
| State | Visual |
|-------|--------|
| Default | Full opacity, square crop |
| Pressed | `activeOpacity={0.85}` |
| Loading (image) | `expo-image` built-in placeholder (`backgroundColor: colors.surface.card`) |

### 4.3 Pull-to-Refresh
| State | Visual |
|-------|--------|
| Pulling | RefreshControl shows (orange tint) |
| Refreshing | Spinner stays visible while `useAllPlanPhotos` re-fetches |
| Complete | List updates, spinner dismisses |

---

## 5. Animation & Motion

| Element | Animation | Spec |
|---------|-----------|------|
| Gallery viewer open | `Modal animationType="fade"` (D-07 reuses GalleryViewerModal) | ~300ms system default |
| Widget thumbnail press | `activeOpacity={0.85}` | Instant (system) |
| Gallery thumbnail press | `activeOpacity={0.85}` | Instant (system) |
| Pull-to-refresh | `RefreshControl` native spinner | System default |
| Route transition `/memories` | Expo Router default stack slide | System default |

No custom animation libraries. React Native built-ins only — consistent with existing codebase.

**Reduced motion:** No custom animation hooks added (React Native respects system settings; no `useReducedMotion` needed for these built-in interactions).

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Touch targets ≥ 44×44pt | Widget thumbnails 72×72 ✓; gallery cells ≥ 120×120 on 375px screen ✓ |
| "See all" touch target | Ensure `TouchableOpacity` around "See all" has `minHeight: 44` |
| Accessible labels | `accessibilityLabel` on every thumbnail and the "See all" link |
| Section headers | Plain `Text` — readable by screen reader in order |
| Screen header back | `ScreenHeader` provides `accessibilityLabel="Go back"` (existing component) |
| Color not sole indicator | "See all" uses both orange color AND text label |
| Safe area | `MemoriesScreen` uses `useSafeAreaInsets()` for bottom padding |
| Pull-to-refresh | `RefreshControl` has `accessibilityLabel="Pull to refresh"` (RN default) |

---

## 7. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| 0 photos total | Widget hidden; gallery shows EmptyState |
| 1–2 photos in a section | Left-aligned cells; remaining column slots empty (flex row, no placeholders) |
| Very long plan title | `numberOfLines={1}` on widget caption; section header truncates with `numberOfLines={1}` |
| Slow network / image load | `expo-image` placeholder (`backgroundColor: colors.surface.card`) fills cell until loaded |
| Signed URL expiry (1h TTL) | `useAllPlanPhotos` re-fetches on screen focus via `useFocusEffect` — fresh signed URLs |
| Many plans, many photos | `SectionList` virtualizes rows — no performance concern |
| Single-photo plan | Section shows 1 photo left-aligned in 3-col row |

---

## 8. Patterns to Match (Canonical)

| Pattern | Source file | Used for |
|---------|------------|---------|
| Horizontal FlatList widget + SectionHeader | `src/components/home/UpcomingEventsSection.tsx` | RecentMemoriesSection layout, height constraint |
| `height: 140` on horizontal FlatList | `UpcomingEventsSection.tsx` | Widget FlatList must declare explicit height inside ScrollView |
| `StyleSheet.create` inside `useMemo([colors])` | All themed components | All new styled components in this phase |
| `usePlanPhotos` signed URL batch pattern | `src/hooks/usePlanPhotos.ts` | `useAllPlanPhotos` signed URL generation |
| `GalleryViewerModal` props | `src/components/plans/GalleryViewerModal.tsx` | Tap-to-view on gallery thumbnails |
| CELL_SIZE formula | Phase 22 grid (22-UI-SPEC §3.2) | Gallery 3-column grid cell sizing |
| `RefreshControl` + orange tint | `usePlans`-driven list screens | Pull-to-refresh on MemoriesScreen |
| Root-level route (no tab folder) | `src/app/friends/[id].tsx` | `src/app/memories.tsx` file placement |
| `useFocusEffect` for re-fetch | Various hooks | Re-fetch signed URLs on screen focus |

---

## 9. Out of Scope (V2 / Deferred)

- Memories as a dedicated tab slot
- Search or filter by plan / date
- "On this day" surfacing
- Photo count badge per plan in section header
- Pagination / infinite scroll (all photos loaded fresh on mount)
- Per-photo comments

---

*UI-SPEC generated: 2026-04-30 via /ui-ux-pro-max*
*Phase: 23-memories-gallery*
