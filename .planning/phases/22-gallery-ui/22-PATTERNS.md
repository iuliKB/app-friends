# Phase 22: Gallery UI - Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 2 (1 modified, 1 created)
**Analogs found:** 2 / 2

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/screens/plans/PlanDashboardScreen.tsx` | screen (refactor) | request-response + CRUD | `src/screens/plans/PlanDashboardScreen.tsx` (self) + `src/screens/chat/ChatRoomScreen.tsx` (FlatList layout) | self + role-match |
| `src/components/plans/GalleryViewerModal.tsx` | component (modal) | request-response | `src/components/chat/ImageViewerModal.tsx` | exact |

---

## Pattern Assignments

### `src/screens/plans/PlanDashboardScreen.tsx` (screen, request-response + CRUD)

**Primary analog:** `src/screens/plans/PlanDashboardScreen.tsx` (the file being modified — keep all existing patterns intact)
**Secondary analog (FlatList layout):** `src/screens/chat/ChatRoomScreen.tsx` (lines 1-13 imports, FlatList ref pattern) and `src/screens/plans/PlansListScreen.tsx` (lines 1-16 imports, FlatList + useMemo styles)

---

#### Imports pattern — keep all existing, add FlatList and Dimensions (lines 1-31 of current file)

```typescript
// KEEP ALL EXISTING IMPORTS. Add these to the react-native import block:
import {
  Alert,
  Dimensions,       // ADD — needed for cellSize formula
  FlatList,         // ADD — replaces outer ScrollView
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// Add at top of file (already present for cover flow — reuse):
import * as ImagePicker from 'expo-image-picker';
// Add new hook import:
import { usePlanPhotos } from '@/hooks/usePlanPhotos';
// Add new component imports:
import { GalleryViewerModal } from '@/components/plans/GalleryViewerModal';
import { EmptyState } from '@/components/common/EmptyState';
// Add new lib import:
import { showActionSheet } from '@/lib/action-sheet';
```

---

#### StyleSheet.create inside useMemo([colors]) pattern (lines 59-299 of current file)

The existing file already follows this pattern exactly. All new styles for the Photos section must be added inside the **same** `useMemo(() => StyleSheet.create({ ... }), [colors])` block. Do not create a second StyleSheet.

```typescript
// Source: PlanDashboardScreen.tsx lines 59-299 — add these keys inside the existing useMemo block
const styles = useMemo(() => StyleSheet.create({
  // ... ALL EXISTING KEYS UNCHANGED ...

  // NEW: Photos section styles — add inside same useMemo
  photosSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  addPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    // matches addCoverButton pattern (lines 103-110 in current file)
  },
  addPhotoText: {
    fontSize: FONT_SIZE.sm,
    color: colors.text.secondary,
    // matches addCoverButtonText (line 114)
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
}), [colors]);
```

---

#### Section header pattern — copy from existing Details section (lines 515-523 of current file)

```tsx
// Source: PlanDashboardScreen.tsx lines 515-523
// The Photos section header uses the SAME sectionHeaderRow + sectionTitle pattern:
<View style={styles.section}>
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionTitle}>{'Photos'}</Text>
  </View>
  {/* ... Photos section content ... */}
</View>
```

Note: `styles.section` (lines 115-118) already provides `paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl` — reuse it directly for the Photos section wrapper.

---

#### FlatList refactor — ScrollView → FlatList (lines 452-457 and 722 of current file)

**Remove** (lines 452-457 and closing tag line 722):
```tsx
// REMOVE:
<ScrollView
  style={styles.root}
  contentContainerStyle={styles.scrollContent}
  keyboardShouldPersistTaps="handled"
>
  {/* ... all content ... */}
</ScrollView>
```

**Replace with:**
```tsx
// Source pattern: RESEARCH.md §Architecture Patterns Pattern 1
// data must be non-empty for ListFooterComponent to render reliably (RESEARCH.md Pitfall 6)
<FlatList
  style={styles.root}
  contentContainerStyle={styles.scrollContent}  // keep existing scrollContent style (paddingBottom: 100)
  keyboardShouldPersistTaps="handled"
  data={[{ key: 'photos' }]}
  renderItem={() => null}
  keyExtractor={(item) => item.key}
  ListHeaderComponent={<>{/* ALL EXISTING JSX FROM SCROLLVIEW CHILDREN */}</>}
  ListFooterComponent={<PhotosSection ... />}
/>
```

---

#### Photo grid — flexWrap View (no nested FlatList/ScrollView)

```tsx
// Source: RESEARCH.md §Architecture Patterns Pattern 2
// Cell size formula — put OUTSIDE component (module-level, no colors dependency)
const { width: screenWidth } = Dimensions.get('window');
const CELL_SIZE = (screenWidth - SPACING.lg * 2 - SPACING.xs * 2) / 3;

// Inside render:
<View style={styles.photoGrid}>
  {photos.map((photo, idx) => (
    <TouchableOpacity
      key={photo.id}
      onPress={() => {
        setViewerInitialIndex(idx);
        setViewerVisible(true);
      }}
      activeOpacity={0.85}
      accessibilityLabel={`Photo by ${photo.uploader.displayName}`}
      style={{ width: CELL_SIZE, height: CELL_SIZE }}
    >
      <Image
        source={{ uri: photo.signedUrl ?? undefined }}
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
        contentFit="cover"
      />
    </TouchableOpacity>
  ))}
</View>
```

---

#### Add Photo button — matches existing addCoverButton pattern (lines 500-512 of current file)

```tsx
// Source: PlanDashboardScreen.tsx lines 500-512 (addCoverButton pattern)
// "Add Photo" row mirrors the "Add cover image" touchable row:
{ownPhotoCount < 10 && (
  <TouchableOpacity
    style={styles.addCoverButton}   // reuse existing style — same visual weight
    onPress={handleAddPhoto}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel="Add photo"
  >
    <Ionicons name="camera-outline" size={20} color={colors.text.secondary} />
    <Text style={styles.addCoverButtonText}>Add Photo</Text>
  </TouchableOpacity>
)}
```

---

#### ImagePicker pattern — copy from existing pickAndUploadCoverImage (lines 383-407 of current file)

```tsx
// Source: PlanDashboardScreen.tsx lines 383-407 — pickAndUploadCoverImage
// Copy the launchImageLibraryAsync call; adapt for uploadPhoto hook:
async function pickFromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    // NOTE: no allowsEditing/aspect — gallery photos are uploaded as-is
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
  const result = await ImagePicker.launchCameraAsync({
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
```

---

#### showActionSheet pattern (src/lib/action-sheet.ts)

```tsx
// Source: src/lib/action-sheet.ts lines 11-42 — showActionSheet signature
import { showActionSheet } from '@/lib/action-sheet';

function handleAddPhoto() {
  showActionSheet('Add Photo', [
    { label: 'Photo Library', onPress: pickFromLibrary },
    { label: 'Camera', onPress: pickFromCamera },
  ]);
}
```

---

#### Empty state pattern — EmptyState component (src/components/common/EmptyState.tsx lines 7-13)

```tsx
// Source: src/components/common/EmptyState.tsx lines 7-13 (props interface)
// isMember = currentUserRsvp !== 'invited' (see RESEARCH.md Open Questions Q1)
{photos.length === 0 && (
  <EmptyState
    icon="images-outline"
    iconType="ionicons"
    heading="No photos yet"
    body="Add the first photo to this plan"
    ctaLabel={isMember ? 'Add Photo' : undefined}
    onCta={isMember ? handleAddPhoto : undefined}
  />
)}
```

---

#### New local state to add (alongside existing state block, lines 47-57 of current file)

```tsx
// Add inside PlanDashboardScreen component body, after existing useState declarations:
const [viewerVisible, setViewerVisible] = useState(false);
const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

// Add hook call (after existing hook calls):
const { photos, uploadPhoto, deletePhoto } = usePlanPhotos(planId);

// Derived values:
const currentUserId = session?.user?.id ?? '';
const isMember = currentUserRsvp !== 'invited';   // plan const is already defined before return
const ownPhotoCount = photos.filter((p) => p.uploaderId === currentUserId).length;
```

Note: `currentUserRsvp` is already computed at line 426 of current file. The derived values block must be placed **after** `currentUserRsvp` is defined (i.e., after line 428 of current file).

---

### `src/components/plans/GalleryViewerModal.tsx` (component, request-response)

**Primary analog:** `src/components/chat/ImageViewerModal.tsx` (exact role — same Modal wrapper, same save flow, same button style, same theme/spacing imports)

**File does not exist yet.** Create at `src/components/plans/GalleryViewerModal.tsx`.

---

#### Imports pattern — extend from ImageViewerModal (lines 1-17 of analog)

```typescript
// Source: src/components/chat/ImageViewerModal.tsx lines 1-17
// Start from these imports; add FlatList, useRef, useCallback:
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { PlanPhotoWithUploader } from '@/types/database';
```

---

#### Props interface — extend beyond ImageViewerModal's single-image props (lines 19-23 of analog)

```typescript
// Source: ImageViewerModal.tsx lines 19-23 — extend for multi-photo + delete
interface GalleryViewerModalProps {
  visible: boolean;
  photos: PlanPhotoWithUploader[];
  initialIndex: number;
  currentUserId: string;
  onClose: () => void;
  deletePhoto: (photoId: string) => Promise<{ error: Error | null }>;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
```

---

#### Modal wrapper — copy exactly from ImageViewerModal (lines 57-64 of analog)

```tsx
// Source: src/components/chat/ImageViewerModal.tsx lines 57-64
<Modal
  visible={visible}
  animationType="fade"
  statusBarTranslucent
  onRequestClose={onClose}
  transparent={false}
>
  <View style={styles.container}>
    {/* ... content ... */}
  </View>
</Modal>
```

---

#### Horizontal FlatList pager (new — no analog; pattern from RESEARCH.md Pattern 3)

```tsx
// CRITICAL: initialScrollIndex requires getItemLayout — see RESEARCH.md Pitfall 1
const flatListRef = useRef<FlatList<PlanPhotoWithUploader>>(null);

<FlatList
  ref={flatListRef}
  data={photos}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  initialScrollIndex={initialIndex}
  getItemLayout={(_, index) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  })}
  keyExtractor={(item) => item.id}
  onViewableItemsChanged={onViewableItemsChanged}
  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
  renderItem={({ item }) => (
    <ScrollView
      style={{ width: screenWidth, height: screenHeight }}
      contentContainerStyle={styles.scrollContent}
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
/>
```

---

#### Current index tracking via onViewableItemsChanged (no analog — standard RN pattern)

```tsx
// Source: RESEARCH.md Open Questions Q2
const [currentIndex, setCurrentIndex] = useState(initialIndex);

const onViewableItemsChanged = useCallback(
  ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const first = viewableItems[0];
    if (first?.index != null) setCurrentIndex(first.index);
  },
  [],
);

const currentPhoto = photos[currentIndex];
```

---

#### Close button — copy from ImageViewerModal (lines 99-105 of analog)

```tsx
// Source: src/components/chat/ImageViewerModal.tsx lines 99-105
// In GalleryViewerModal: close button moves to top-RIGHT (ImageViewerModal has it top-right too)
const insets = useSafeAreaInsets();
const btnTop = insets.top + SPACING.xl;  // lines 31-32 of analog

<TouchableOpacity
  style={[styles.btnTopRight, { top: btnTop }]}
  onPress={onClose}
  accessibilityLabel="Close photo viewer"
>
  <Ionicons name="close" size={28} color={colors.text.primary} />
</TouchableOpacity>
```

---

#### handleSave — copy verbatim from ImageViewerModal (lines 33-55 of analog)

```tsx
// Source: src/components/chat/ImageViewerModal.tsx lines 33-55 — COPY VERBATIM, adapt variable
const [saving, setSaving] = useState(false);

async function handleSave() {
  if (!currentPhoto?.signedUrl || saving) return;
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

Note: `ImageViewerModal` does not call Haptics — add it in GalleryViewerModal per RESEARCH.md Code Examples.

---

#### Delete flow — Alert.alert confirm pattern (matches handleDeletePress in PlanDashboardScreen lines 364-381)

```tsx
// Source: PlanDashboardScreen.tsx lines 364-381 — Alert.alert confirm pattern
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
  if (!currentPhoto) return;
  const { error } = await deletePhoto(currentPhoto.id);
  if (error) {
    Alert.alert('Error', 'Could not delete photo.');
    return;
  }
  onClose(); // D-10: close viewer; hook's refetch() handles grid update
}
```

---

#### Bottom overlay bar — new layout (no analog for this exact bar; use absolute positioning pattern from ImageViewerModal buttons)

```tsx
// Source: ImageViewerModal.tsx lines 88-105 (absolute positioned buttons) — extend to a full bar
// Overlay bar is absolute at the bottom; uses insets for safe area
<View style={[styles.overlayBar, { paddingBottom: insets.bottom + SPACING.md }]}>
  {/* Left: uploader attribution */}
  <View style={styles.overlayLeft}>
    <AvatarCircle
      size={32}
      imageUri={currentPhoto.uploader.avatarUrl}
      displayName={currentPhoto.uploader.displayName}
    />
    <Text numberOfLines={1} style={styles.uploaderName}>
      {currentPhoto.uploader.displayName}
    </Text>
  </View>
  {/* Right: Save + conditional Delete */}
  <View style={styles.overlayRight}>
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      style={[styles.overlayBtn, saving && styles.btnDisabled]}
      accessibilityLabel="Save to camera roll"
    >
      <Ionicons name="download-outline" size={24} color="#fff" />
    </TouchableOpacity>
    {currentPhoto.uploaderId === currentUserId && (
      <TouchableOpacity
        onPress={handleDeletePress}
        style={styles.overlayBtn}
        accessibilityLabel="Delete photo"
      >
        <Ionicons name="trash-outline" size={24} color={colors.feedback.error} />
      </TouchableOpacity>
    )}
  </View>
</View>
```

---

#### StyleSheet.create inside useMemo([colors]) — follows EmptyState.tsx and AvatarCircle.tsx pattern

```tsx
// Source: src/components/common/EmptyState.tsx lines 25-55 — useMemo StyleSheet pattern
// Source: src/components/common/AvatarCircle.tsx lines 23-40 — same pattern
// GalleryViewerModal must follow the same pattern (NOT module-level StyleSheet):
const { colors } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: '#000',
  },
  scrollContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTopRight: {
    position: 'absolute',
    right: SPACING.lg,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minWidth: 44,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  overlayBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    marginRight: SPACING.md,
  },
  uploaderName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    color: '#fff',
    flex: 1,
  },
  overlayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  overlayBtn: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minWidth: 44,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
}), [colors]);
```

Note: `ImageViewerModal` uses a **module-level** `StyleSheet.create` (lines 111-145 of analog) — this is an exception because it has no `colors.*` references. `GalleryViewerModal` has `colors.feedback.error` in the delete button, so it **must** use `useMemo`. The lint rule `campfire/no-hardcoded-styles` applies to `'#000'` and `'rgba(0,0,0,0.55)'` and `'#fff'` — add the eslint-disable comment inline as shown in the analog file.

---

## Shared Patterns

### StyleSheet.create inside useMemo([colors])
**Source:** `src/components/common/EmptyState.tsx` lines 25-55; `src/components/common/AvatarCircle.tsx` lines 23-40; `src/screens/plans/PlanDashboardScreen.tsx` lines 59-299
**Apply to:** `GalleryViewerModal.tsx` (new file must follow this); `PlanDashboardScreen.tsx` (already follows — add new keys inside same useMemo block)
**Rule:** Any `StyleSheet` key that references `colors.*` must live inside `useMemo(() => StyleSheet.create({...}), [colors])`. Module-level StyleSheet is acceptable only when zero `colors.*` references exist (ImageViewerModal is the exception, not the rule).

---

### Ionicons + 44pt touch target
**Source:** `src/components/chat/ImageViewerModal.tsx` lines 122-144
**Apply to:** All icon buttons in `GalleryViewerModal.tsx`
```tsx
// Source: ImageViewerModal.tsx lines 126-131
// eslint-disable-next-line campfire/no-hardcoded-styles
minWidth: 44,
// eslint-disable-next-line campfire/no-hardcoded-styles
minHeight: 44,
```

---

### expo-image with null-safe URI
**Source:** `src/components/chat/ImageViewerModal.tsx` line 82; RESEARCH.md Pitfall 5
**Apply to:** All `<Image>` calls displaying `PlanPhotoWithUploader.signedUrl`
```tsx
// signedUrl is string | null — coerce null to undefined so expo-image shows placeholder
source={{ uri: photo.signedUrl ?? undefined }}
```

---

### Alert.alert destructive confirm
**Source:** `src/screens/plans/PlanDashboardScreen.tsx` lines 364-381 (handleDeletePress)
**Apply to:** `GalleryViewerModal.tsx` delete confirmation
**Pattern:** Two-button Alert with `style: 'destructive'` on the confirm action and `style: 'cancel'` on the cancel action.

---

### showActionSheet cross-platform
**Source:** `src/lib/action-sheet.ts` lines 11-42
**Apply to:** `PlanDashboardScreen.tsx` "Add Photo" action sheet
**Import:** `import { showActionSheet } from '@/lib/action-sheet';`

---

### useSafeAreaInsets for absolute overlays
**Source:** `src/components/chat/ImageViewerModal.tsx` lines 16, 31
**Apply to:** `GalleryViewerModal.tsx` (close button top offset, overlay bar bottom padding)
```tsx
const insets = useSafeAreaInsets();
const btnTop = insets.top + SPACING.xl;
// bottom overlay: paddingBottom: insets.bottom + SPACING.md
```

---

## No Analog Found

None. Both files have strong analogs in the codebase. `GalleryViewerModal` maps directly to `ImageViewerModal`. `PlanDashboardScreen` is a self-refactor with secondary FlatList layout patterns available in `ChatRoomScreen` and `PlansListScreen`.

---

## Critical Anti-Patterns (from RESEARCH.md)

| Anti-Pattern | Where It Would Appear | Correct Pattern |
|---|---|---|
| Nested ScrollView inside FlatList | Photo grid in `PlanDashboardScreen` | `flexWrap: 'wrap'` View with `TouchableOpacity` cells |
| `userId` prop on `AvatarCircle` | `GalleryViewerModal` overlay bar | Pass `imageUri={photo.uploader.avatarUrl}` and `displayName={photo.uploader.displayName}` |
| `photo.signedUrl` passed directly as URI | Any `<Image source={{ uri: photo.signedUrl }}>` | Always `uri: photo.signedUrl ?? undefined` |
| `initialScrollIndex` without `getItemLayout` | Viewer FlatList | Provide `getItemLayout={(_, i) => ({ length: screenWidth, offset: screenWidth * i, index: i })}` |
| Module-level StyleSheet with colors references | `GalleryViewerModal` | All color-dependent styles inside `useMemo([colors])` |
| `data={[]}` on outer FlatList | `PlanDashboardScreen` FlatList | Always `data={[{ key: 'photos' }]}` with `renderItem={() => null}` |
| Calling `refetch()` after `deletePhoto()` or `uploadPhoto()` | `PlanDashboardScreen` / `GalleryViewerModal` | Both hook methods call `refetch()` internally — no manual call needed |
| `getPublicUrl()` for gallery photos | Any photo display | Use `photo.signedUrl` — gallery bucket is private |

---

## Metadata

**Analog search scope:** `src/screens/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/theme/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-04-30
