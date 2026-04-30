# Phase 22: Gallery UI — Research

**Researched:** 2026-04-30
**Domain:** React Native (Expo) — photo grid UI, full-screen modal viewer, FlatList refactor
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Uploader attribution shown only in the full-screen viewer overlay bar, not on grid thumbnails.
- **D-02:** Viewer overlay bar: `[avatar] [display name]` on left, `[Save] [Delete]` on right. Delete conditionally rendered (`photo.uploaderId === currentUserId`).
- **D-03:** Build a new `GalleryViewerModal` at `src/components/plans/GalleryViewerModal.tsx`. `ImageViewerModal` remains untouched.
- **D-04:** Horizontal `FlatList` with `pagingEnabled` for swipe navigation. Photos in upload order (ASC).
- **D-05:** Per-page pinch-to-zoom via `ScrollView` with `maximumZoomScale={4}` wrapping each `expo-image` — same pattern as `ImageViewerModal`.
- **D-06:** Save-to-camera-roll: copy `handleSave` pattern from `ImageViewerModal` (`expo-media-library`, same permissions flow).
- **D-07:** Modal opens to the tapped photo's index — thumbnail passes `initialIndex` and full `photos` array.
- **D-08:** Delete button lives only in the viewer overlay bar — no delete affordance on thumbnails.
- **D-09:** Delete button visible only when `photo.uploaderId === currentUserId`.
- **D-10:** After `deletePhoto()` resolves, close the viewer; grid refetches. No optimistic removal.
- **D-11:** "Add Photo" button row sits above the photo grid, scrolls with plan content.
- **D-12:** "Add Photo" opens ActionSheet (or `Alert.alert` fallback) with Photo Library and Camera options.
- **D-13:** When current user has ≥ 10 own photos, "Add Photo" button hidden entirely (not greyed). Count from `photos.filter(p => p.uploaderId === currentUserId).length`.
- **D-14:** Upload uses `usePlanPhotos.uploadPhoto(localUri)` returning `{ error: 'photo_cap_exceeded' | 'upload_failed' | null }`.
- **D-15:** PlanDashboardScreen refactored from outer `ScrollView` to outer `FlatList`. All existing content in `ListHeaderComponent`. Photos section in `ListFooterComponent` or as `renderItem`. No `ScrollView` inside `FlatList`.
- **D-16:** Photo grid: `flexWrap: 'wrap'` View or non-scrolling multi-column view. No nested ScrollView.
- **D-17:** When `photos.length === 0`, show `EmptyState` component. Non-members see same empty state without "Add Photo" button.

### Claude's Discretion

- Whether to use `showActionSheet` from `src/lib/action-sheet.ts` (preferred — already in codebase) or `Alert.alert` for the photo picker choice sheet.
- Thumbnail aspect ratio: square via `aspectRatio: 1` flex approach.
- Gap between thumbnail cells: `SPACING.xs` (4px) per UI-SPEC.
- Whether the Photos section header uses the existing `sectionTitle` style or a separate `SectionHeader` component — match existing pattern in PlanDashboardScreen.
- `GalleryViewerModal` file path: `src/components/plans/GalleryViewerModal.tsx`.

### Deferred Ideas (OUT OF SCOPE)

- Photo count badge on plan cards (GALL-F01)
- Upload progress indicator per photo (GALL-F02)
- Multi-photo picker (Phase 21 deferral, still out of scope)
- Indicator dots on swipe viewer
- Long-press delete from grid
- Photo comments
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GALL-04 | User can view all plan photos in a scrollable grid inside the plan detail screen | FlatList refactor + flexWrap grid in ListFooterComponent |
| GALL-05 | User can tap any photo to open it full-screen and swipe to browse others | GalleryViewerModal with horizontal FlatList + pagingEnabled |
| GALL-06 | Each photo shows the uploader's avatar or name | AvatarCircle + uploader.displayName in viewer overlay bar |
| GALL-07 | User can delete their own photos from the gallery (cannot delete others') | deletePhoto(photoId) via usePlanPhotos + RLS enforced server-side |
| GALL-08 | User can save any gallery photo to their device camera roll | handleSave pattern from ImageViewerModal using expo-media-library |
</phase_requirements>

---

## Summary

Phase 22 is a pure UI phase — all data infrastructure (Supabase bucket, signed URLs, `add_plan_photo` RPC, `usePlanPhotos` hook) was completed in Phase 21. The work is three coordinated tasks: (1) refactor `PlanDashboardScreen` from a single outer `ScrollView` to a `FlatList` with existing content in `ListHeaderComponent` and the new Photos section in `ListFooterComponent`, (2) build a `GalleryViewerModal` modelled closely on the existing `ImageViewerModal` but extended with a horizontal FlatList pager, uploader attribution overlay bar, and delete flow, and (3) wire the photo grid section with the "Add Photo" entry point into the refactored screen.

All canonical patterns are already established in the codebase. `ImageViewerModal` provides the exact template for Modal setup, pinch-to-zoom ScrollView, save flow, and button positioning. `showActionSheet` from `src/lib/action-sheet.ts` is the cross-platform action sheet utility (no new dependency). `AvatarCircle` and `EmptyState` are drop-in components. The `usePlanPhotos` hook surface is fully typed and verified.

The most complex implementation risk is the FlatList refactor of `PlanDashboardScreen`: the screen has significant state (edit mode, date picker, location picker, map tile) and all of it must move into `ListHeaderComponent` without breaking existing behaviour. The grid itself must use `flexWrap: 'wrap'` (not a nested FlatList or ScrollView) to comply with the no-scroll-in-scroll rule.

**Primary recommendation:** Implement in three sequential tasks — (1) FlatList refactor of PlanDashboardScreen, (2) GalleryViewerModal component, (3) Photos section integration (grid + Add Photo + empty state) wired into the refactored screen.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Photo grid display | Frontend (React Native screen) | — | Pure UI rendering of pre-fetched signed URLs |
| Thumbnail tap → viewer | Frontend (React Native screen) | — | Navigation/modal state local to screen |
| Full-screen viewer with swipe | Frontend (new modal component) | — | Stateless viewer that receives photos array + initialIndex |
| Pinch-to-zoom | Frontend (ScrollView per page) | — | React Native ScrollView built-in; no native module |
| Save to camera roll | Frontend (expo-media-library) | Device OS | Permission flow + MediaLibrary API |
| Delete own photo | Frontend + Supabase RLS | — | Client calls deletePhoto(); RLS enforces ownership |
| Upload new photo | Frontend (expo-image-picker) | Supabase Storage | Picker → uploadPhoto(localUri) → hook handles rest |
| Per-user photo cap | Frontend UI hint | Supabase RPC (authoritative) | Client hides button at 10; RPC enforces with P0001 |
| FlatList scroll layout | Frontend (screen layout) | — | Outer FlatList replaces ScrollView; no data implications |

---

## Standard Stack

### Core (all already installed — verified against package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-image` | ~55.0.9 | Display thumbnails and viewer photos | Already used for all image display in codebase; `contentFit` prop; built-in placeholder [VERIFIED: package.json] |
| `expo-image-picker` | ~55.0.19 | Launch camera / photo library for upload | Already imported in PlanDashboardScreen for cover image flow [VERIFIED: package.json] |
| `expo-media-library` | ~55.0.15 | Save photo to camera roll | Already used in ImageViewerModal; `saveToLibraryAsync` [VERIFIED: package.json] |
| `expo-haptics` | ~55.0.14 | Haptic feedback on save success | Already installed [VERIFIED: package.json] |
| `react-native` `FlatList` | (built-in) | Photo grid (flexWrap), viewer pager, outer screen layout | Core RN primitive; no dependency |
| `@expo/vector-icons` `Ionicons` | (built-in) | camera-outline, download-outline, trash-outline, close | Already used universally in codebase |

### Supporting (utility — already in codebase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/action-sheet.ts` | — | Cross-platform ActionSheet for photo picker | Already exists; use `showActionSheet()` — no new npm dependency [VERIFIED: file read] |
| `react-native-safe-area-context` `useSafeAreaInsets` | (built-in) | Safe area padding for viewer overlay bar bottom | Already used in ImageViewerModal [VERIFIED: ImageViewerModal.tsx] |
| `src/components/common/AvatarCircle` | — | Uploader avatar in viewer overlay | Props: `size`, `imageUri`, `displayName` [VERIFIED: file read] |
| `src/components/common/EmptyState` | — | No-photos empty state | Props: `icon`, `iconType`, `heading`, `body`, `ctaLabel?`, `onCta?` [VERIFIED: file read] |

### No New npm Dependencies Required

All libraries needed are already installed. No `npm install` step needed for this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
PlanDashboardScreen
│
├── FlatList (outer, scrollable)
│   ├── ListHeaderComponent
│   │   ├── InviteBanner (conditional)
│   │   ├── CoverImage / AddCoverButton
│   │   ├── Details Section (edit mode, date picker, location picker, map tile)
│   │   ├── Who's Going Section (RSVPButtons, MemberList)
│   │   ├── Links Section
│   │   ├── IOU Notes Section
│   │   └── Open Chat Button
│   │
│   └── ListFooterComponent
│       └── Photos Section
│           ├── Section header row ("Photos" title)
│           ├── Add Photo button row (hidden when own count ≥ 10)
│           ├── [photos.length > 0] flexWrap View grid (3 columns)
│           │   └── TouchableOpacity thumbnails (expo-image, contentFit="cover")
│           └── [photos.length === 0] EmptyState component
│
├── GalleryViewerModal (Modal, visible when thumbnail tapped)
│   ├── Horizontal FlatList (pagingEnabled, one photo per page)
│   │   └── Per page: ScrollView (pinch-to-zoom) → expo-image (contentFit="contain")
│   ├── Close button (absolute, top-right)
│   └── Bottom overlay bar (absolute, bottom)
│       ├── Left: AvatarCircle + displayName
│       └── Right: Save button + Delete button (conditional)
│
└── usePlanPhotos(planId) hook
    ├── photos: PlanPhotoWithUploader[]
    ├── uploadPhoto(localUri) → { error }
    ├── deletePhoto(photoId) → { error }
    └── refetch()
```

### Recommended File Structure

```
src/
├── screens/plans/
│   └── PlanDashboardScreen.tsx     — refactor ScrollView → FlatList, add Photos section
└── components/plans/
    └── GalleryViewerModal.tsx      — new file; full-screen swipeable viewer
```

No new directories. No new hooks. No new lib functions.

### Pattern 1: FlatList Outer Layout (PlanDashboardScreen Refactor)

**What:** Replace the single outer `<ScrollView>` with a `<FlatList>`. All existing content (cover, details, map, RSVP, links, IOU, chat button) moves into `ListHeaderComponent`. Photos section goes in `ListFooterComponent`.

**When to use:** Any screen that needs a scrollable list with heterogeneous header content and a footer section — avoids ScrollView-inside-FlatList violations.

**Critical detail:** `data` prop must be non-null/non-empty for `ListFooterComponent` to render reliably on all RN versions. Use `data={[{ key: 'photos' }]}` with a no-op `renderItem={() => null}` — confirmed in UI-SPEC.

```tsx
// Source: 22-UI-SPEC.md §3.1, PlanDashboardScreen.tsx (existing patterns)
<FlatList
  style={styles.root}
  keyboardShouldPersistTaps="handled"
  data={[{ key: 'photos' }]}
  renderItem={() => null}
  ListHeaderComponent={<PlanDashboardHeader ... />}
  ListFooterComponent={<PhotosSection ... />}
/>
```

**Style migration:** Replace `scrollContent` style (had `paddingBottom: 100`) with equivalent on `contentContainerStyle` of the FlatList.

### Pattern 2: flexWrap Grid (Photo Thumbnails)

**What:** Three-column equal-width grid without a nested FlatList or ScrollView.

**Why not nested FlatList:** React Native warns and can silently break scrolling when FlatList is inside another FlatList's scrollable area.

**Cell size formula:** `cellSize = (screenWidth - SPACING.lg * 2 - SPACING.xs * 2) / 3`

```tsx
// Source: 22-UI-SPEC.md §3.2
const { width: screenWidth } = Dimensions.get('window');
const cellSize = (screenWidth - SPACING.lg * 2 - SPACING.xs * 2) / 3;

// Grid container:
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
  {photos.map((photo, idx) => (
    <TouchableOpacity
      key={photo.id}
      onPress={() => openViewer(idx)}
      activeOpacity={0.85}
      accessibilityLabel={`Photo by ${photo.uploader.displayName}`}
      style={{ width: cellSize, height: cellSize }}
    >
      <Image
        source={{ uri: photo.signedUrl ?? undefined }}
        style={{ width: cellSize, height: cellSize }}
        contentFit="cover"
      />
    </TouchableOpacity>
  ))}
</View>
```

### Pattern 3: GalleryViewerModal Structure

**What:** Horizontal paging FlatList for swipe navigation, per-page ScrollView for pinch-to-zoom, absolute overlay bar at bottom.

**Key difference from ImageViewerModal:** Outer structure is a horizontal `FlatList` (not a single `ScrollView`). The per-page `ScrollView` handles zoom only, not swipe. The swipe gesture is handled by the outer FlatList's `pagingEnabled` momentum.

```tsx
// Source: 22-CONTEXT.md D-03 through D-06, 22-UI-SPEC.md §3.4
// Mirror of ImageViewerModal pattern for per-page ScrollView + expo-image

<Modal
  visible={visible}
  animationType="fade"
  statusBarTranslucent
  onRequestClose={onClose}
  transparent={false}
>
  <View style={{ flex: 1, backgroundColor: '#000' }}>
    {/* Horizontal pager */}
    <FlatList
      ref={flatListRef}
      data={photos}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={initialIndex}
      getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
      renderItem={({ item }) => (
        <ScrollView
          style={{ width: screenWidth, height: screenHeight }}
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri: item.signedUrl ?? undefined }}
            style={{ width: screenWidth, height: screenHeight }}
            contentFit="contain"
          />
        </ScrollView>
      )}
      keyExtractor={(item) => item.id}
    />

    {/* Close button — absolute top-right */}
    <TouchableOpacity
      style={[styles.btnTopRight, { top: insets.top + SPACING.xl }]}
      onPress={onClose}
      accessibilityLabel="Close photo viewer"
    >
      <Ionicons name="close" size={28} color="#fff" />
    </TouchableOpacity>

    {/* Bottom overlay bar — absolute */}
    <View style={[styles.overlayBar, { paddingBottom: insets.bottom + SPACING.md }]}>
      {/* Left: uploader attribution */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <AvatarCircle
          size={32}
          imageUri={currentPhoto.uploader.avatarUrl}
          displayName={currentPhoto.uploader.displayName}
        />
        <Text numberOfLines={1} style={styles.uploaderName}>
          {currentPhoto.uploader.displayName}
        </Text>
      </View>
      {/* Right: actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[{ minWidth: 44, minHeight: 44 }, saving && { opacity: 0.5 }]}
          accessibilityLabel="Save to camera roll"
        >
          <Ionicons name="download-outline" size={24} color="#fff" />
        </TouchableOpacity>
        {currentPhoto.uploaderId === currentUserId && (
          <TouchableOpacity
            onPress={handleDeletePress}
            style={{ minWidth: 44, minHeight: 44 }}
            accessibilityLabel="Delete photo"
          >
            <Ionicons name="trash-outline" size={24} color={colors.feedback.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  </View>
</Modal>
```

### Pattern 4: showActionSheet for Photo Picker

**What:** Existing `src/lib/action-sheet.ts` utility provides cross-platform action sheet (iOS: native ActionSheetIOS; Android: Alert with buttons). No new npm package needed.

```tsx
// Source: src/lib/action-sheet.ts [VERIFIED: file read]
import { showActionSheet } from '@/lib/action-sheet';

function handleAddPhoto() {
  showActionSheet('Add Photo', [
    { label: 'Photo Library', onPress: () => pickFromLibrary() },
    { label: 'Camera', onPress: () => pickFromCamera() },
  ]);
}
```

### Pattern 5: AvatarCircle Usage

**What:** AvatarCircle renders either an image or initials fallback. Props are explicit — `userId` prop does NOT exist; pass `imageUri` and `displayName` from `photo.uploader`.

```tsx
// Source: src/components/common/AvatarCircle.tsx [VERIFIED: file read]
// Props: size?: number, imageUri?: string | null, displayName: string, onPress?: () => void
<AvatarCircle
  size={32}
  imageUri={photo.uploader.avatarUrl}
  displayName={photo.uploader.displayName}
/>
```

**Critical:** The UI-SPEC references `<AvatarCircle userId={photo.uploaderId} size={32} />` but this is WRONG — `userId` is not a prop. The correct props are `imageUri` and `displayName`, both sourced from `photo.uploader`.

### Pattern 6: EmptyState for No-Photos State

```tsx
// Source: src/components/common/EmptyState.tsx [VERIFIED: file read]
// Props: icon, iconType?, heading, body, ctaLabel?, onCta?
<EmptyState
  icon="images-outline"
  iconType="ionicons"
  heading="No photos yet"
  body="Add the first photo to this plan"
  ctaLabel={isMember ? 'Add Photo' : undefined}
  onCta={isMember ? handleAddPhoto : undefined}
/>
```

### Anti-Patterns to Avoid

- **Nested ScrollView inside FlatList:** Grid MUST use `flexWrap: 'wrap'` View. No ScrollView or FlatList inside the outer FlatList's scroll area.
- **`userId` prop on AvatarCircle:** Component does not accept `userId`. Must pass `imageUri` and `displayName` from `photo.uploader`.
- **`getPublicUrl()` for photos:** Gallery bucket is private. Always use `photo.signedUrl` (pre-generated by hook). Never call `getPublicUrl()`.
- **Per-photo `createSignedUrl` loop:** Already handled in the hook as a batch call. Never call `createSignedUrl` for individual photos in UI code.
- **Optimistic removal on delete:** D-10 explicitly prohibits this. Call `deletePhoto()`, then close modal; hook's internal `refetch()` handles grid update.
- **Module-level StyleSheet.create:** All new styled components must use `StyleSheet.create` inside `useMemo([colors])` — project-wide requirement from accumulated decisions.
- **`initialScrollIndex` without `getItemLayout`:** FlatList with `initialScrollIndex` requires `getItemLayout` to avoid warnings/incorrect scroll position. Always provide it for the viewer FlatList.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform action sheet | Custom modal/bottom sheet | `showActionSheet` from `src/lib/action-sheet.ts` | Already in codebase; iOS native sheet + Android Alert |
| Camera roll save + permission | Custom MediaLibrary wrapper | `expo-media-library` + `handleSave` pattern from ImageViewerModal | Permission retry flow, Settings deep link already handled |
| Image compression | Manual blob manipulation | Already done inside `uploadPlanPhoto.ts` (called by hook) | `expo-image-manipulator` pipeline already exists |
| Cross-platform image picker | Platform switches | `expo-image-picker` | Unified API; already imported in PlanDashboardScreen |
| Uploader avatar with fallback | Custom avatar | `AvatarCircle` component | Already handles image + initials fallback |
| Empty state layout | Custom empty view | `EmptyState` component | Consistent design; CTA button built-in |

**Key insight:** Phase 22 is intentionally a "glue" phase — all hard problems were solved in Phase 21 and previous phases. The planner should resist adding any new infrastructure.

---

## Common Pitfalls

### Pitfall 1: FlatList `initialScrollIndex` without `getItemLayout`

**What goes wrong:** The viewer FlatList opens at the wrong photo or logs a yellow warning about `getItemLayout`.
**Why it happens:** FlatList cannot compute the scroll offset for `initialScrollIndex` without knowing item dimensions ahead of time.
**How to avoid:** Always provide `getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}` alongside `initialScrollIndex`.
**Warning signs:** Viewer always opens at photo 0 regardless of which thumbnail was tapped.

### Pitfall 2: Pinch-to-zoom conflicts with horizontal swipe

**What goes wrong:** Zoomed-in photo cannot be panned; or pinch gesture triggers page swipe.
**Why it happens:** The outer horizontal FlatList and the inner per-page ScrollView both compete for horizontal pan gestures.
**How to avoid:** The `ScrollView` with `maximumZoomScale={4}` scopes zoom to the active page — same as ImageViewerModal. Keep ScrollView inside each page's renderItem. Do NOT put the outer FlatList inside a ScrollView.
**Warning signs:** Swipe to next photo works when zoomed out but fails when zoomed in (this is expected and acceptable behaviour — matches native iOS Photos app).

### Pitfall 3: AvatarCircle `userId` prop (doesn't exist)

**What goes wrong:** TypeScript error or runtime crash if `userId` prop is passed.
**Why it happens:** The UI-SPEC §3.4 incorrectly shows `userId={photo.uploaderId}` — but the actual component interface has `imageUri` and `displayName`, not `userId`.
**How to avoid:** Always pass `imageUri={photo.uploader.avatarUrl}` and `displayName={photo.uploader.displayName}`.
**Warning signs:** TypeScript compile error on `AvatarCircle` props.

### Pitfall 4: StyleSheet.create at module scope

**What goes wrong:** Theme colors don't update when user switches themes (light/dark).
**Why it happens:** Module-level StyleSheet is computed once at import time, before `useTheme()` provides the current palette.
**How to avoid:** All `StyleSheet.create` calls with `colors.*` references must be inside `useMemo([colors])` inside the component body.
**Warning signs:** Styles in GalleryViewerModal look correct in dark mode but wrong in light mode (or vice versa).

### Pitfall 5: `signedUrl: null` for failed URL generation

**What goes wrong:** `expo-image` renders a broken/placeholder image if passed a null source URI.
**Why it happens:** `usePlanPhotos` returns `signedUrl: string | null` — null when Supabase URL generation fails for an individual photo.
**How to avoid:** Pass `source={{ uri: photo.signedUrl ?? undefined }}` — coerce null to undefined so `expo-image` skips the broken URL and shows its placeholder.
**Warning signs:** Grid shows grey squares for some photos even when they should be visible.

### Pitfall 6: `ListFooterComponent` not rendering with empty `data`

**What goes wrong:** Photos section never appears if `data={[]}` is passed to the outer FlatList.
**Why it happens:** Some RN versions silently suppress `ListFooterComponent` when `data` is empty.
**How to avoid:** Always use `data={[{ key: 'photos' }]}` with `renderItem={() => null}`. The data array always has exactly one item.
**Warning signs:** Screen scrolls to bottom and photos section is invisible.

### Pitfall 7: Delete without closing the viewer

**What goes wrong:** After `deletePhoto()`, the viewer stays open showing a missing/broken photo at the deleted index.
**Why it happens:** Hook calls `refetch()` internally, which removes the photo from `photos` array, but the viewer's local `currentIndex` is stale.
**How to avoid:** D-10 decision: after `deletePhoto()` resolves successfully, call `onClose()` immediately. No need to advance to next photo.
**Warning signs:** Viewer shows blank page or wrong photo after delete.

---

## Code Examples

### handleSave pattern (verbatim from ImageViewerModal — copy to GalleryViewerModal)

```tsx
// Source: src/components/chat/ImageViewerModal.tsx:33-55 [VERIFIED: file read]
async function handleSave() {
  if (!currentPhoto.signedUrl || saving) return;
  setSaving(true);
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Access Needed',
        'Allow Campfire to access your photos in Settings.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    await MediaLibrary.saveToLibraryAsync(currentPhoto.signedUrl);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    Alert.alert('Error', 'Could not save photo.');
  } finally {
    setSaving(false);
  }
}
```

### Delete flow (GalleryViewerModal)

```tsx
// Source: 22-CONTEXT.md D-10, 22-UI-SPEC.md §3.4
function handleDeletePress() {
  Alert.alert(
    'Delete Photo',
    'Remove this photo?',
    [
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}

async function confirmDelete() {
  const { error } = await deletePhoto(currentPhoto.id);
  if (error) {
    Alert.alert('Error', 'Could not delete photo.');
    return;
  }
  onClose(); // D-10: close viewer; grid refetches via hook's internal refetch()
}
```

### Upload flow (Photos section in PlanDashboardScreen)

```tsx
// Source: PlanDashboardScreen.tsx cover image pattern + 22-CONTEXT.md D-12-D-14
import { showActionSheet } from '@/lib/action-sheet';

function handleAddPhoto() {
  showActionSheet('Add Photo', [
    { label: 'Photo Library', onPress: pickFromLibrary },
    { label: 'Camera', onPress: pickFromCamera },
  ]);
}

async function pickFromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return;
  const { error } = await uploadPhoto(asset.uri);
  if (error === 'photo_cap_exceeded') {
    Alert.alert('Limit Reached', 'You can upload up to 10 photos per plan.');
  } else if (error === 'upload_failed') {
    Alert.alert('Error', 'Could not upload photo. Try again.');
  }
}

async function pickFromCamera() {
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return;
  const { error } = await uploadPhoto(asset.uri);
  if (error === 'photo_cap_exceeded') {
    Alert.alert('Limit Reached', 'You can upload up to 10 photos per plan.');
  } else if (error === 'upload_failed') {
    Alert.alert('Error', 'Could not upload photo. Try again.');
  }
}
```

---

## usePlanPhotos Hook API (Verified)

**Source:** `src/hooks/usePlanPhotos.ts` [VERIFIED: file read]

```typescript
// Return type (verified):
{
  photos: PlanPhotoWithUploader[];   // ordered by created_at ASC; empty array when none
  loading: boolean;                  // true during initial fetch and refetch
  error: string | null;              // error message string; null on success
  uploadPhoto: (localUri: string) => Promise<{ error: 'photo_cap_exceeded' | 'upload_failed' | null }>;
  deletePhoto: (photoId: string) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

// PlanPhotoWithUploader shape (verified from src/types/database.ts):
type PlanPhotoWithUploader = {
  id: string;
  planId: string;
  uploaderId: string;
  storagePath: string;
  signedUrl: string | null;        // null when signed URL generation failed for this photo
  createdAt: string;
  uploader: {
    displayName: string;
    avatarUrl: string | null;
  };
};
```

**Note:** `deletePhoto` internally calls `refetch()` before returning, so the `photos` array is already updated when `deletePhoto()` resolves. No additional `refetch()` call needed after delete.

**Note:** `uploadPhoto` also calls `refetch()` internally. No additional `refetch()` call needed after upload.

---

## ActionSheet Confirmed: Use `src/lib/action-sheet.ts`

**Finding:** `@expo/react-native-action-sheet` is NOT installed. The codebase uses a custom `src/lib/action-sheet.ts` utility that wraps `ActionSheetIOS` (iOS) and `Alert.alert` (Android). [VERIFIED: package.json scan, file read]

This utility is already used in:
- `src/components/home/HomeFriendCard.tsx`
- `src/components/home/RadarBubble.tsx`

**Recommendation (Claude's Discretion):** Use `showActionSheet` from `src/lib/action-sheet.ts`. This is the established project pattern, not `Alert.alert` directly.

---

## Environment Availability

Step 2.6: No new external dependencies. All required packages are already installed. No environment audit needed — this is a UI-only phase using packages confirmed present in `package.json`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Node built-in assert via `npx tsx` (no jest/vitest installed) |
| Visual framework | Playwright (`@playwright/test` ^1.58.2) |
| Unit config | None — run directly: `npx tsx tests/unit/<file>.test.ts` |
| Visual config | `playwright.config.ts` — `testDir: ./tests/visual`, base URL: `http://localhost:8081` |
| Unit quick run | `npx tsx tests/unit/<file>.test.ts` |
| Visual quick run | `npx playwright test tests/visual/<spec>.spec.ts` |
| Full suite | `npx playwright test` (requires Expo web server running on 8081) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GALL-04 | Photo grid renders in plan dashboard | Visual (Playwright) | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ Wave 0 |
| GALL-05 | Tap thumbnail → viewer opens; swipe works | Visual (Playwright) | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ Wave 0 |
| GALL-06 | Uploader name/avatar visible in viewer | Visual (Playwright) | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ Wave 0 |
| GALL-07 | Delete own photo hides it from grid | Visual (Playwright) | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ Wave 0 |
| GALL-08 | Save button triggers camera roll save | Manual only — MediaLibrary is a native API not testable in web/Playwright | N/A | N/A |
| Photo cap UI hide | Add button disappears at 10 own photos | Unit (pure logic) | `npx tsx tests/unit/gallery.photoCap.test.ts` | ❌ Wave 0 |
| FlatList refactor regression | Existing PlanDashboardScreen content still renders | Visual (Playwright) | `npx playwright test tests/visual/plan-gallery.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx tsx tests/unit/gallery.photoCap.test.ts` (if unit test file created)
- **Per wave merge:** `npx playwright test tests/visual/plan-gallery.spec.ts`
- **Phase gate:** Full Playwright suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/gallery.photoCap.test.ts` — unit tests for "hide Add button at ≥ 10 own photos" logic, photo cap derived count logic
- [ ] `tests/visual/plan-gallery.spec.ts` — Playwright visual tests for GALL-04, GALL-05, GALL-06, GALL-07; includes FlatList refactor regression check

**GALL-08 (save to camera roll):** Manual-only. `expo-media-library` is a native API; Playwright runs on web/Chromium and cannot access the device camera roll. Flag for hardware smoke test (consistent with project's Hardware Verification Gate deferral policy in memory).

---

## Security Domain

Gallery bucket is private (signed URLs) — established in Phase 21. No new security controls needed for Phase 22 (UI-only). Existing controls:

| Control | Where Enforced |
|---------|---------------|
| Ownership enforcement on delete | Supabase RLS `plan_photos_delete_own` (uploader_id = auth.uid()) |
| Photo cap enforcement | Supabase RPC `add_plan_photo` with P0001 on cap exceeded |
| Private photo access | Signed URLs with 1-hour TTL from `plan-gallery` private bucket |
| Content type lock | `image/jpeg` forced in upload (prevents executable disguise) |

No new ASVS categories introduced by Phase 22. V4 (Access Control) is already handled by RLS from Phase 21.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `data={[{ key: 'photos' }]}` + `renderItem={() => null}` pattern ensures `ListFooterComponent` renders reliably on Expo SDK 55 / RN 0.76 | Architecture Patterns (Pattern 1) | Photos section invisible; need to put content in `renderItem` instead |
| A2 | `expo-haptics` `impactAsync` is the right call for save success feedback | Code Examples | Minor: different haptic feel; functionally correct |

**All other claims verified against source files in this session.**

---

## Open Questions

1. **`isMember` availability in PlanDashboardScreen**
   - What we know: `currentUserRsvp` is derived from `plan.members.find(m => m.user_id === session?.user?.id)?.rsvp`. An `invited` status means not yet accepted.
   - What's unclear: Should `isMember` for gallery purposes mean "accepted going/maybe" or "any member including invited"? D-17 says "non-members (invited-but-not-accepted) see empty state without Add Photo button" — but the current screen already allows invited users to see all plan content. The `isMember` check for "Add Photo" button visibility may need `currentUserRsvp !== 'invited'`.
   - Recommendation: Define `const isMember = currentUserRsvp !== 'invited'` — only accepted members (going/maybe/out) can add photos. Invited users can view but not add.

2. **`currentPhoto` tracking in GalleryViewerModal**
   - What we know: The viewer uses a horizontal FlatList with `initialScrollIndex`. The overlay bar shows the current photo's uploader.
   - What's unclear: How to track which page is currently visible to update the overlay bar. `onViewableItemsChanged` with `viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}` is the standard FlatList approach.
   - Recommendation: Use `useState(initialIndex)` for `currentIndex`, updated via `onViewableItemsChanged`. Derive `currentPhoto = photos[currentIndex]`.

---

## Sources

### Primary (HIGH confidence)

- `src/screens/plans/PlanDashboardScreen.tsx` — full ScrollView structure, section patterns, styles, existing imports [VERIFIED: file read]
- `src/components/chat/ImageViewerModal.tsx` — Modal setup, pinch-to-zoom ScrollView, save flow, button positions [VERIFIED: file read]
- `src/hooks/usePlanPhotos.ts` — complete hook API, return types, upload/delete flow [VERIFIED: file read]
- `src/components/common/AvatarCircle.tsx` — exact props interface [VERIFIED: file read]
- `src/components/common/EmptyState.tsx` — exact props interface [VERIFIED: file read]
- `src/lib/action-sheet.ts` — showActionSheet API, cross-platform pattern [VERIFIED: file read]
- `src/types/database.ts:868` — PlanPhotoWithUploader type definition [VERIFIED: file read]
- `.planning/phases/22-gallery-ui/22-CONTEXT.md` — all locked decisions D-01 through D-17 [VERIFIED: file read]
- `.planning/phases/22-gallery-ui/22-UI-SPEC.md` — design tokens, layout specs, component inventory [VERIFIED: file read]
- `package.json` — installed packages (expo-image, expo-media-library, expo-image-picker, expo-haptics, no action-sheet package) [VERIFIED: file read]
- `playwright.config.ts` — visual test framework config [VERIFIED: file read]

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` accumulated decisions — crypto.randomUUID unavailable in Hermes, fetch().arrayBuffer() for uploads, StyleSheet.create in useMemo pattern [VERIFIED: file read]

### Tertiary (LOW confidence)

None — all claims verified from source files.

---

## Metadata

**Confidence breakdown:**
- Hook API: HIGH — verified by reading the actual source file
- AvatarCircle/EmptyState props: HIGH — verified by reading actual source files
- ActionSheet pattern: HIGH — showActionSheet utility verified in codebase
- FlatList refactor pattern: HIGH — based on UI-SPEC + existing RN patterns + confirmed by decisions
- initialScrollIndex + getItemLayout requirement: HIGH — well-known React Native behaviour [ASSUMED from training, but standard documented RN behaviour]
- Test infrastructure: HIGH — verified package.json + test file scan

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable Expo SDK 55; no fast-moving dependencies in this phase)

---

*Phase: 22-gallery-ui*
*Researched: 2026-04-30*
