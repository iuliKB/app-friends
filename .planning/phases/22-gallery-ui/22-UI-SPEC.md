# Phase 22: Gallery UI — UI Design Contract

**Generated:** 2026-04-30
**Phase:** 22 — Gallery UI
**Stack:** React Native (Expo) + theme system (`src/theme/index.ts`)
**Status:** Ready for planning

---

## 1. Component Inventory

| Component | Type | File | Purpose |
|-----------|------|------|---------|
| Photos section (grid + Add button) | In-screen section | `src/screens/plans/PlanDashboardScreen.tsx` | 3-column thumbnail grid + upload entry point |
| GalleryViewerModal | New modal | `src/components/plans/GalleryViewerModal.tsx` | Full-screen swipeable photo viewer |
| PlanDashboardScreen (refactored) | Screen | `src/screens/plans/PlanDashboardScreen.tsx` | ScrollView → FlatList outer layout |

---

## 2. Design Tokens (All from `src/theme/index.ts`)

### Typography
```
Section titles:   FONT_SIZE.xl + FONT_WEIGHT.semibold + colors.text.primary
Body / labels:    FONT_SIZE.md + FONT_FAMILY.body.regular + colors.text.secondary
Viewer name:      FONT_SIZE.md + FONT_FAMILY.body.semibold + colors.text.primary (on dark overlay)
```

### Spacing
```
Section padding:          paddingHorizontal: SPACING.lg (16), paddingTop: SPACING.xl (24)
Grid cell gap:            SPACING.xs (4) — consistent with tight-gap token semantic
Overlay bar padding:      SPACING.lg (16) horizontal, SPACING.md (12) vertical
Button icon touch target: minWidth: 44, minHeight: 44 (lint-exempt, consistent with ImageViewerModal)
```

### Colors
```
Screen bg:            colors.surface.base
Viewer bg:            '#000' (hardcoded, lint-exempt — matches ImageViewerModal pattern)
Overlay bar bg:       'rgba(0,0,0,0.6)' — dark, semi-transparent for readability over any photo
Section title:        colors.text.primary
Secondary text:       colors.text.secondary
Add Photo button tint: colors.interactive.accent
Empty state icon:     colors.border
```

### Radii
```
Thumbnails: RADII.sm (optional subtle rounding — Claude's discretion, match existing card style)
Overlay bar: RADII.none (full-width bar at bottom)
```

### Shadows
```
Overlay bar: no shadow — RGBA transparency provides sufficient separation
```

---

## 3. Layout Specifications

### 3.1 PlanDashboardScreen — FlatList Refactor

**Before:** Single outer `ScrollView` containing all sections

**After:** Single outer `FlatList` with:
- `data`: `[{ key: 'photos' }]` (single item — the photos section)
- `ListHeaderComponent`: All existing plan content (cover image, details, map, members, links, IOU, chat button)
- `ListFooterComponent` or `renderItem`: Photos section (Add Photo button row + grid)
- `keyboardShouldPersistTaps="handled"` — preserve existing keyboard behaviour

**Constraint:** No `ScrollView` inside `FlatList`. Grid uses `flexWrap: 'wrap'` layout inside `ListFooterComponent`, or a non-scrolling multi-column view.

### 3.2 Photos Section

```
┌─────────────────────────────────────────────────────┐
│  Photos                                    [count]  │  ← sectionTitle + optional count label
├─────────────────────────────────────────────────────┤
│  [📷 Add Photo]                                     │  ← Add Photo button row (scrolls with content)
├─────────────────────────────────────────────────────┤
│  [ thumb ] [ thumb ] [ thumb ]                      │  ← Row 1
│  [ thumb ] [ thumb ] [ thumb ]                      │  ← Row 2 (etc.)
└─────────────────────────────────────────────────────┘
```

**Section header:** `<View style={styles.sectionHeaderRow}>` + `<Text style={styles.sectionTitle}>Photos</Text>` — matches existing section pattern exactly.

**Add Photo button row:**
- `flexDirection: 'row'`, `alignItems: 'center'`, `gap: SPACING.sm`
- Icon: `Ionicons name="camera-outline"` size 20, color `colors.interactive.accent`
- Label: "Add Photo", `FONT_SIZE.md`, `colors.interactive.accent`
- `paddingVertical: SPACING.sm`, `paddingHorizontal: SPACING.lg`
- Sits above the grid, below the section header
- Hidden entirely when `photos.filter(p => p.uploaderId === currentUserId).length >= 10`

**Grid layout:**
- 3 columns, equal width: `cellSize = (screenWidth - SPACING.lg * 2 - SPACING.xs * 2) / 3`
- Each cell: `width: cellSize, height: cellSize, aspectRatio: 1`
- Gap between cells: `SPACING.xs` (4px) — `gap` on wrapping View or manual margin
- `expo-image` with `contentFit="cover"` in each cell
- Touch target: entire cell (cell size ≥ 44px on all common devices — iPhone SE 375px → cell ≥ 120px ✓)

### 3.3 Empty State

When `photos.length === 0`:
```
┌─────────────────────────────────────────────────────┐
│           [photos-outline icon, 48px]               │
│           No photos yet                             │
│      Be the first to add a moment 📸               │
│      [ Add Photo ]  ← only if user is a member     │
└─────────────────────────────────────────────────────┘
```

Use `<EmptyState>` component:
```tsx
<EmptyState
  icon="images-outline"
  iconType="ionicons"
  heading="No photos yet"
  body="Add the first photo to this plan"
  ctaLabel={isMember ? "Add Photo" : undefined}
  onCta={isMember ? handleAddPhoto : undefined}
/>
```

### 3.4 GalleryViewerModal Layout

```
┌──────────────────────────────────────────┐
│                                          │  ← Black bg (#000)
│                                          │
│           [Photo — full screen]          │  ← ScrollView (pinch-to-zoom, maximumZoomScale=4)
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ [●] Name              [↓ Save] [🗑 Del] │  ← Bottom overlay bar (rgba 0,0,0,0.6)
└──────────────────────────────────────────┘
        ↑ Close (×) — top-right, absolute positioned (same as ImageViewerModal)
```

**Outer container:**
- `Modal` with `animationType="fade"`, `statusBarTranslucent`, `transparent={false}`
- `flex: 1`, `backgroundColor: '#000'`

**Horizontal pager (FlatList):**
- `horizontal`, `pagingEnabled`, `showsHorizontalScrollIndicator={false}`
- Each page: `width: screenWidth`
- Per page: `ScrollView` with `maximumZoomScale={4}`, `minimumZoomScale={1}`, `centerContent`, `bouncesZoom`
- Inside ScrollView: `expo-image` with `contentFit="contain"`, `width: screenWidth`, `height: screenHeight`

**Close button (top-right, absolute):**
- Position: `top: insets.top + SPACING.xl`, `right: SPACING.lg`
- Icon: `Ionicons name="close"` size 28, color `colors.text.primary` (white on black bg ✓)
- Touch target: `minWidth: 44, minHeight: 44` (lint-exempt, matches ImageViewerModal)

**Bottom overlay bar:**
- `position: 'absolute'`, `bottom: 0`, `left: 0`, `right: 0`
- `paddingBottom: insets.bottom + SPACING.md` (safe area aware)
- `paddingHorizontal: SPACING.lg`, `paddingTop: SPACING.md`
- `backgroundColor: 'rgba(0,0,0,0.6)'`
- `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`

**Left side (uploader attribution):**
- `flexDirection: 'row'`, `alignItems: 'center'`, `gap: SPACING.sm`
- `<AvatarCircle userId={photo.uploaderId} size={32} />` — existing component
- Display name: `FONT_SIZE.md`, `FONT_FAMILY.body.semibold`, `color: '#fff'` (always white — on dark overlay)
- `numberOfLines={1}`, `maxWidth: '50%'` — truncate long names

**Right side (actions):**
- `flexDirection: 'row'`, `alignItems: 'center'`, `gap: SPACING.lg`
- **Save button:** `Ionicons name="download-outline"` size 24, color `'#fff'`, `minWidth: 44, minHeight: 44`
  - Disabled + `opacity: 0.5` while saving
  - `accessibilityLabel="Save to camera roll"`
- **Delete button:** `Ionicons name="trash-outline"` size 24, color `colors.feedback.error` (red — destructive signal)
  - Conditionally rendered: only when `photo.uploaderId === currentUserId`
  - `accessibilityLabel="Delete photo"`
  - Tap → `Alert.alert('Delete Photo', 'Remove this photo?', [{ text: 'Delete', style: 'destructive' }, { text: 'Cancel' }])`
  - On confirm: call `deletePhoto(photo.id)` → close modal on success

---

## 4. Interaction States

### 4.1 Thumbnail (Grid)
| State | Visual |
|-------|--------|
| Default | Photo at full opacity |
| Pressed | `opacity: 0.85` (via `activeOpacity` on TouchableOpacity) |
| Loading | `expo-image` built-in placeholder (grey bg until loaded) |

### 4.2 Add Photo Button Row
| State | Visual |
|-------|--------|
| Default | `colors.interactive.accent` icon + text |
| Pressed | `opacity: 0.7` (activeOpacity) |
| Hidden (10-photo cap) | Removed from tree entirely |

### 4.3 GalleryViewerModal Actions
| Action | State | Visual |
|--------|-------|--------|
| Save button | Saving | `opacity: 0.5` + `disabled` |
| Save button | Done | Haptic feedback (`*Haptics.impactAsync`) + `Alert` or toast |
| Delete button | Pressed | Brief opacity flash before Alert |
| Delete success | — | Modal closes, grid refetches |

### 4.4 Swipe Navigation
- `FlatList` `pagingEnabled` handles physics — no custom gesture needed
- No custom indicator dots (not in CONTEXT.md decisions — out of scope)

---

## 5. Animation & Motion

| Element | Animation | Spec |
|---------|-----------|------|
| Viewer open | `Modal animationType="fade"` | ~300ms (system default) |
| Viewer close | Same fade | ~300ms |
| Page swipe | FlatList native momentum | System physics |
| Thumbnail press | `activeOpacity={0.85}` | Instant (system) |
| Save button disable | `opacity: 0.5` | Instant (state sync) |

No custom animation libraries. All motion via React Native built-ins — consistent with existing codebase (ImageViewerModal uses no custom animations).

**Reduced motion:** React Native respects system accessibility settings via `Platform`; no extra `useReducedMotion` hook needed for this component.

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Touch targets ≥ 44×44pt | `minWidth: 44, minHeight: 44` on all action buttons; grid cells ≥ 120×120 |
| Accessible labels | `accessibilityLabel` on every `TouchableOpacity` icon button |
| Thumbnail labels | `accessibilityLabel={`Photo by ${uploaderName}`}` on grid cells |
| Delete confirmation | `Alert.alert` with destructive style — prevents accidental deletion |
| Safe area | `useSafeAreaInsets()` for viewer overlay bar bottom padding |
| Screen reader | `accessibilityRole="button"` on Add Photo row |
| Color not sole indicator | Delete button uses both trash icon AND red color (redundant coding) |

---

## 7. Photo Grid — Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| 0 photos | EmptyState component (D-17) |
| 1–2 photos | Left-aligned cells with gaps; remaining columns empty |
| Very long uploader name | Truncated at `maxWidth: '50%'` in overlay bar |
| Large photo (slow load) | expo-image lazy loading; `placeholder` colour token |
| 10+ photos (own cap) | Add Photo button hidden; grid still renders all photos |
| Network failure | `usePlanPhotos` error state — grid shows empty; error surfaced by existing hook |

---

## 8. Patterns to Match (Canonical)

| Pattern | Source file | Used for |
|---------|------------|---------|
| Section `<View style={styles.section}>` | `PlanDashboardScreen.tsx:515` | Photos section wrapper |
| `sectionTitle` text style | `PlanDashboardScreen.tsx:125` | "Photos" section heading |
| Modal + ScrollView pinch-to-zoom | `ImageViewerModal.tsx` | Viewer per-page zoom |
| `handleSave` + `expo-media-library` | `ImageViewerModal.tsx:33` | Save to camera roll |
| Button top inset: `insets.top + SPACING.xl` | `ImageViewerModal.tsx:31` | Close button position |
| `StyleSheet.create` inside `useMemo([colors])` | All themed components | All new styled components |
| `AvatarCircle` component | `src/components/common/AvatarCircle.tsx` | Uploader avatar in viewer |
| `EmptyState` component | `src/components/common/EmptyState.tsx` | No-photos state |

---

## 9. Out of Scope (V2 / Deferred)

- Photo count badge on plan cards (GALL-F01)
- Upload progress indicator (GALL-F02)
- Multi-photo picker (Phase 21 deferral)
- Indicator dots on swipe viewer
- Long-press delete from grid
- Photo comments

---

*UI-SPEC generated: 2026-04-30 via /ui-ux-pro-max*
*Phase: 22-gallery-ui*
