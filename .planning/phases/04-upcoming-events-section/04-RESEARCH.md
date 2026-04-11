# Phase 4: Upcoming Events Section - Research

**Researched:** 2026-04-11
**Domain:** React Native UI — horizontal scroll section, image upload (expo-image-picker + Supabase Storage), database migration
**Confidence:** HIGH

## Summary

Phase 4 adds an "Upcoming Events" section at the bottom of the HomeScreen ScrollView, plus optional cover image support on plans (image picker during creation/edit, Supabase Storage hosting). The UI design contract (04-UI-SPEC.md) is already approved and provides pixel-level spec for every component. The section is purely additive — no existing component is removed, only the HomeScreen ScrollView receives a new child at the bottom.

The data layer requires three targeted changes: (1) a `cover_image_url` nullable column on the `plans` table with a matching database migration, (2) Supabase Storage bucket for plan images (first-ever use of Storage in this app), and (3) a new `useUpcomingEvents` hook that filters and limits `usePlans` data client-side rather than adding a new network round-trip. The image upload flow uses `expo-image-picker` (already installed at v55.0.12) and `expo-image` (already installed at v55.0.6).

**Primary recommendation:** Build in four sequential layers — (1) database migration + type update, (2) EventCard + UpcomingEventsSection components, (3) HomeScreen integration, (4) image picker in plan create/edit. Keep image upload logic in a dedicated `uploadPlanCover` utility, not inline in the UI component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card Visual Design**
- D-01: Wide landscape cards (~200px wide, ~140px tall) in a horizontal FlatList. Shows ~1.5 cards at a time to encourage scrolling
- D-02: Cards support optional cover images as background. When an image is set, it fills the card with a dark overlay for text legibility
- D-03: When no cover image is set, card background uses a random pastel color from a fixed palette, deterministically assigned via plan ID hash (consistent color per plan)
- D-04: Each card shows: title, date (e.g. "Mon 15, Aug · in 2 days"), avatar stack of attendees, member count badge (+12), and relative time indicator
- D-05: Extra rounded corners (RADII.xl or 20px) for playful feel, matching card stack cards

**Data Source & Filtering**
- D-06: Show plans where the current user is the creator OR has RSVP status "going". Exclude plans the user is merely invited to or has declined
- D-07: Only future plans (scheduled_for > now). Past plans excluded
- D-08: Limit to 5 events, sorted by scheduled_for ascending (soonest first)

**Section Placement & Header**
- D-09: Section placed below the Radar/Cards view area, at the bottom of the homescreen ScrollView content
- D-10: Section header: "Upcoming events ✨" with a "See all" link that navigates to the Explore tab
- D-11: Uses SectionHeader component pattern for the title

**Empty & Edge States**
- D-12: When no upcoming events exist, show the section header + a placeholder card with "No plans yet — start one!" that links to plan creation
- D-13: Single event still shows in the horizontal scroll — no special case

**Image Upload Flow**
- D-14: Optional cover image picker available during plan creation AND editable later from plan detail screen
- D-15: Uses expo-image-picker (camera roll only, no camera capture) + Supabase Storage for image hosting
- D-16: New `cover_image_url` column on the `plans` table (nullable text)

**Card Tap Behavior**
- D-17: Tapping an event card navigates to the plan detail screen via `router.push` — same pattern as PlanCard in Explore tab

**Date Formatting**
- D-18: Date displayed as combo format: "Mon 15, Aug · in 2 days" — short date plus relative context
- D-19: Reuse/extend the existing `formatPlanTime` utility from `PlanCard.tsx` for relative time, add short date formatting

### Claude's Discretion
- Card shadow/elevation styling
- Horizontal scroll snap behavior and paging
- Avatar stack sizing on the smaller event cards
- Image compression/resize before upload
- Placeholder card visual design
- Dark overlay opacity on image cards

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core Libraries (already installed)

[VERIFIED: npm view in project node_modules]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-image-picker` | 55.0.12 | Camera roll access for cover image selection | Expo-managed, no native config needed beyond plist key |
| `expo-image` | 55.0.6 | Efficient image rendering with caching | Better performance than RN Image for remote URLs |
| `@supabase/supabase-js` | 2.99.2 | Storage upload + database mutation | Already the app's backend; `storage.from().upload()` API |
| `react-native` FlatList | 0.83.2 | Horizontal scrollable card list | Native, already imported project-wide |

### No New Dependencies Required

All libraries this phase needs are already in `package.json`. No `npm install` step needed. [VERIFIED: grep of package.json]

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/home/
│   ├── EventCard.tsx            # NEW — single landscape card
│   └── UpcomingEventsSection.tsx # NEW — section wrapper
├── hooks/
│   └── useUpcomingEvents.ts     # NEW — filters usePlansStore for upcoming events
├── lib/
│   └── uploadPlanCover.ts       # NEW — image pick + upload utility
├── types/
│   └── plans.ts                 # EDIT — add cover_image_url?: string | null to Plan
└── app/
    └── (tabs)/plans.tsx         # NO CHANGE — Explore tab route already exists
```

Database:
```
supabase/migrations/
└── XXXX_add_cover_image_url.sql  # NEW — adds nullable cover_image_url column
```

### Pattern 1: Nested Horizontal FlatList in ScrollView

HomeScreen uses a vertical `ScrollView` (not a FlatList). A horizontal `FlatList` nested inside a `ScrollView` is the established React Native pattern for horizontal card rows.

Key: the outer `ScrollView` handles vertical scroll; the inner `FlatList` handles horizontal only. No `nestedScrollEnabled` prop is needed when scroll axes are perpendicular.

```tsx
// Source: VERIFIED from React Native docs + existing PlanCard FlatList in PlansListScreen
<FlatList
  data={upcomingEvents}
  horizontal
  showsHorizontalScrollIndicator={false}
  keyExtractor={(item) => item.id}
  snapToInterval={200 + 12}        // card width + gap
  decelerationRate="fast"
  contentContainerStyle={styles.listContent}
  renderItem={({ item }) => <EventCard plan={item} />}
/>
```

### Pattern 2: Pastel Color Assignment via Plan ID Hash

[ASSUMED] Deterministic color assignment from string ID using `charCodeAt`:

```tsx
// Source: UI-SPEC.md — confirmed in 04-UI-SPEC.md
const PASTEL_COLORS = ['#F9A8C9', '#FDE68A', '#93C5FD', '#86EFAC', '#C4B5FD'];
// eslint-disable-next-line campfire/no-hardcoded-styles
const bg = PASTEL_COLORS[plan.id.charCodeAt(0) % PASTEL_COLORS.length];
```

The `charCodeAt(0)` approach is stable across renders because UUIDs always start with a hex character. Collision rate (multiple plans same color) is acceptable given the 5-plan cap.

### Pattern 3: Image Overlay for Text Legibility

```tsx
// Source: UI-SPEC.md — 40% opacity overlay confirmed
<View style={StyleSheet.absoluteFill}>
  <Image source={{ uri: plan.cover_image_url }} style={StyleSheet.absoluteFill} />
  <View style={[StyleSheet.absoluteFill, styles.overlay]} />
</View>

// overlay style:
overlay: {
  backgroundColor: 'rgba(0,0,0,0.40)', // eslint-disable-next-line campfire/no-hardcoded-styles
}
```

### Pattern 4: Supabase Storage Upload (First Use in App)

[VERIFIED: @supabase/supabase-js docs — standard Storage pattern]

```tsx
// Source: Supabase JS v2 Storage API
// Upload pattern — use ArrayBuffer not base64 for React Native
const response = await fetch(localUri);
const blob = await response.blob();
const arrayBuffer = await blob.arrayBuffer();

const { data, error } = await supabase.storage
  .from('plan-covers')
  .upload(`${planId}/cover.jpg`, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,          // allow re-upload on edit
  });

if (error) throw error;

const { data: urlData } = supabase.storage
  .from('plan-covers')
  .getPublicUrl(`${planId}/cover.jpg`);

// urlData.publicUrl is the https:// URL to store in cover_image_url
```

Important: `base64-arraybuffer` is already in `package.json` (installed) if needed for alternative encoding approach. The `fetch` + `blob.arrayBuffer()` approach avoids it.

### Pattern 5: useUpcomingEvents Hook

Rather than a new Supabase query, filter the existing Zustand store client-side:

```tsx
// Source: ASSUMED — mirrors usePlansStore pattern
import { usePlansStore } from '@/stores/usePlansStore';
import { useAuthStore } from '@/stores/useAuthStore';

export function useUpcomingEvents() {
  const plans = usePlansStore((s) => s.plans);
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const upcoming = plans
    .filter((p) => {
      if (!p.scheduled_for) return false;
      if (new Date(p.scheduled_for) <= new Date()) return false;
      // D-06: creator OR going
      const isCreator = p.created_by === userId;
      const isGoing = p.members.some((m) => m.user_id === userId && m.rsvp === 'going');
      return isCreator || isGoing;
    })
    .sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime())
    .slice(0, 5); // D-08: cap at 5

  return upcoming;
}
```

This avoids a separate network fetch. The store is already populated by `usePlans` (called via `useFocusEffect` in the plans hook mounted from HomeScreen or the Explore tab).

**Risk:** `usePlansStore` may be empty on cold launch if `usePlans` hook hasn't mounted yet. The hook resolves this — the section renders empty/placeholder while the store populates.

### Pattern 6: expo-image-picker Usage

[VERIFIED: expo-image-picker v55 installed — standard Expo managed workflow API]

```tsx
import * as ImagePicker from 'expo-image-picker';

async function pickCoverImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],       // D-15: camera roll only
    allowsEditing: true,
    aspect: [200, 140],           // match card aspect ratio
    quality: 0.8,                 // Claude's discretion — compress before upload
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}
```

**iOS Info.plist key required:** `NSPhotoLibraryUsageDescription`. [ASSUMED — check if already present in app.json/app.config.ts]

### Anti-Patterns to Avoid

- **Separate Supabase query for upcoming events:** Filter `usePlansStore` client-side (Pattern 5). Adding a new query creates a loading race with the existing hook and wastes a network round-trip.
- **Using `Image` from react-native for cover images:** Use `expo-image` — it handles caching, progressive loading, and avoids flicker on scroll.
- **Storing base64 in the DB:** Never store image data in the `cover_image_url` column — only the Storage public URL.
- **Mutating `usePlans` hook directly:** The existing hook's `createPlan` doesn't accept `cover_image_url`. Upload first, get URL, then either (a) pass URL to `createPlan` after the fact via a separate `updatePlanDetails` call, or (b) extend `createPlan` to accept `coverImageUrl?: string`.
- **Hardcoded card dimensions without lint comments:** Use `// eslint-disable-next-line campfire/no-hardcoded-styles` for the 200px width, 140px height, and 20px border radius per project convention.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image caching for cover images | Custom cache layer | `expo-image` with `contentFit="cover"` | Handles memory pressure, progressive decode, disk cache automatically |
| Camera roll access | Native module bridge | `expo-image-picker` | Already installed; handles iOS/Android permission UI |
| Storage upload | Custom multipart form | `supabase.storage.from().upload()` | Handles chunking, retry, content-type header |
| Date locale formatting | Custom date-to-string | `Date.prototype.toLocaleDateString()` | Handles locale, month names, weekday names natively |

---

## Key Integration Points

### 1. HomeScreen ScrollView — Where to Insert

Current HomeScreen structure (from code inspection):
```
ScrollView
├── ScreenHeader ("Campfire")
├── OwnStatusCard
├── [error text]
├── RadarViewToggle
└── View (viewSwitcher) — RadarView / CardStackView crossfade
```

New section goes after `viewSwitcher`, inside the `ScrollView`, before the closing tag. The existing `paddingBottom: 100` on `scrollContent` provides clearance for the FAB. [VERIFIED: read HomeScreen.tsx]

### 2. Explore Tab Route

The "See all" action navigates to the Explore tab. Route is `/(tabs)/plans` (the `plans` tab screen maps to `title: 'Explore'`). [VERIFIED: read app/(tabs)/_layout.tsx]

```tsx
router.push('/(tabs)/plans');
```

### 3. Plan Detail Route

Card tap uses the existing pattern from PlanCard/PlansListScreen:
```tsx
router.push(`/plans/${plan.id}` as never);
```
[VERIFIED: read src/app/plans/[id].tsx route exists]

### 4. Plan Creation Route

FAB and empty-state placeholder card both navigate to:
```tsx
router.push('/plan-create');
```
[VERIFIED: read HomeScreen.tsx FAB onPress]

### 5. Database: plans Table

`cover_image_url` column does NOT exist yet in `database.ts` Row type. [VERIFIED: read src/types/database.ts lines 132-175]

Required changes:
1. Supabase migration: `ALTER TABLE plans ADD COLUMN cover_image_url text;`
2. Update `src/types/database.ts` — add `cover_image_url: string | null` to `plans.Row`, `Insert`, `Update`
3. Update `src/types/plans.ts` — add `cover_image_url?: string | null` to `Plan` interface

### 6. usePlanDetail.updatePlanDetails

The `updatePlanDetails` function in `usePlanDetail.ts` takes a typed `updates` object. The `cover_image_url` field must be added to its `updates` parameter type to support editing from PlanDashboardScreen. [VERIFIED: read usePlanDetail.ts lines 114-130]

---

## Common Pitfalls

### Pitfall 1: ScrollView + Horizontal FlatList Height Collapse

**What goes wrong:** Horizontal `FlatList` inside `ScrollView` collapses to 0 height when no explicit height is set on the FlatList or its container.
**Why it happens:** React Native flex layout — `ScrollView` children default to `flexShrink` behavior; the FlatList has no intrinsic height.
**How to avoid:** Set a fixed height on the `FlatList` wrapper View: `height: 140` (card height). The `FlatList` itself inherits it.
**Warning signs:** Cards render but are invisible; section header visible but blank space below.

### Pitfall 2: expo-image-picker iOS Permissions

**What goes wrong:** `launchImageLibraryAsync` silently returns cancelled on iOS if `NSPhotoLibraryUsageDescription` is missing from `app.json`.
**Why it happens:** iOS blocks library access without the usage description string.
**How to avoid:** Verify `app.json` has `"infoPlist": { "NSPhotoLibraryUsageDescription": "..." }` under the `ios` config.
**Warning signs:** picker opens briefly then dismisses with `canceled: true` on physical device; works fine in Simulator.

### Pitfall 3: Supabase Storage Bucket Not Public

**What goes wrong:** Uploaded images return a public URL but the URL returns 400 or the image doesn't load.
**Why it happens:** Supabase Storage buckets are private by default — `getPublicUrl` returns a URL but the bucket policy blocks unauthenticated reads.
**How to avoid:** Create the `plan-covers` bucket with `public: true`, OR configure a storage policy allowing anonymous reads (SELECT) on the bucket.
**Warning signs:** Cover image URL is valid-looking string but `expo-image` renders nothing; network request to the URL returns 400.

### Pitfall 4: usePlansStore Empty on HomeScreen Cold Launch

**What goes wrong:** `useUpcomingEvents` returns `[]` on first render because `usePlansStore` hasn't been populated yet (store starts empty).
**Why it happens:** `usePlans` fetches data via `useFocusEffect` — which fires after the screen mounts. On cold launch, there's a brief window where the store is empty.
**How to avoid:** This is expected behavior — show the loading/placeholder card state while the store is empty. Don't treat empty store as "no events". Add a `loading` state from `usePlans` to distinguish "loading" from "genuinely empty".
**Warning signs:** Section flickers from placeholder to cards on first app open.

### Pitfall 5: cover_image_url Type Mismatch After Migration

**What goes wrong:** After applying the DB migration, `supabase.from('plans').select('*')` returns rows with `cover_image_url` field, but TypeScript `PlanWithMembers` assembly in `usePlans.ts` doesn't copy it — the field is dropped.
**Why it happens:** `usePlans.ts` manually assembles `PlanWithMembers` objects from raw rows (lines 127-139). New columns are not automatically forwarded.
**How to avoid:** After updating `database.ts` and `plans.ts` types, update the assembly step in `usePlans.ts` to include `cover_image_url: p.cover_image_url as string | null`.
**Warning signs:** cover images never appear on event cards despite successful upload; `plan.cover_image_url` is always `undefined`.

### Pitfall 6: Image Upload Race on Plan Create

**What goes wrong:** User picks image, taps "Create Plan", plan is created, but image upload fails silently — plan exists in DB with `cover_image_url: null`.
**Why it happens:** Upload is async; if done after `createPlan`, a network error leaves the plan coverless with no retry path.
**How to avoid:** Upload image first (get URL), then create plan with `cover_image_url` set in the insert. If upload fails, show error before creating the plan. For edit flow (post-creation), `upsert: true` on the Storage upload allows safe retry.
**Warning signs:** Plan appears in list without cover image after creation even though user selected one.

---

## Code Examples

### EventCard Skeleton

```tsx
// Source: [ASSUMED] — based on verified UI-SPEC.md + existing PlanCard.tsx pattern
import { Image } from 'expo-image'; // not react-native Image
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII, SHADOWS } from '@/theme';

const PASTEL_COLORS = ['#F9A8C9', '#FDE68A', '#93C5FD', '#86EFAC', '#C4B5FD'];

export function EventCard({ plan, onPress }: { plan: PlanWithMembers; onPress: () => void }) {
  // eslint-disable-next-line campfire/no-hardcoded-styles
  const pastelBg = PASTEL_COLORS[plan.id.charCodeAt(0) % PASTEL_COLORS.length];
  const hasImage = Boolean(plan.cover_image_url);
  const textColor = hasImage ? COLORS.text.primary : '#1a1a1a'; // eslint-disable-next-line campfire/no-hardcoded-styles

  return (
    <TouchableOpacity
      style={[styles.card, SHADOWS.card]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}, ${formatEventCardDate(plan.scheduled_for)}`}
    >
      {hasImage ? (
        <>
          <Image
            source={{ uri: plan.cover_image_url! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: pastelBg }]} />
      )}
      {/* Title, date, avatar row rendered above image layers */}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 200,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 140,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    borderRadius: 20, // D-05 calls for RADII.xl or 20px; use 20 for more playful feel
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.40)', // eslint-disable-next-line campfire/no-hardcoded-styles
  },
});
```

### formatEventCardDate Utility

```tsx
// Source: UI-SPEC.md Date Format Contract — extends existing formatPlanTime pattern
export function formatEventCardDate(scheduledFor: string | null): string {
  if (!scheduledFor) return '';
  const date = new Date(scheduledFor);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Short date: "Mon 15, Aug"
  const shortDate = date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Relative context
  let relative: string;
  if (diffHours < 1) relative = `in ${Math.max(1, Math.round(diffMs / 60000))} min`;
  else if (diffHours < 24) relative = `in ${Math.floor(diffHours)}h`;
  else if (diffDays === 1) relative = 'tomorrow';
  else relative = `in ${diffDays} days`;

  return `${shortDate} \u00B7 ${relative}`;
}
```

### Supabase Storage: uploadPlanCover Utility

```tsx
// Source: [ASSUMED] — based on verified @supabase/supabase-js v2 Storage API pattern
export async function uploadPlanCover(planId: string, localUri: string): Promise<string | null> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const path = `${planId}/cover.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('plan-covers')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    console.error('Cover upload failed:', uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from('plan-covers').getPublicUrl(path);
  return data.publicUrl;
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `react-native` `<Image>` | `expo-image` `<Image>` | Expo Image handles disk cache, progressive decode, avoids flicker on scroll |
| `mediaTypes: ImagePicker.MediaTypeOptions.Images` | `mediaTypes: ['images']` | New string array API in expo-image-picker v15+; old enum deprecated |

**Note on `mediaTypes`:** The deprecated `ImagePicker.MediaTypeOptions.Images` enum still works in v55 but will be removed. Use `mediaTypes: ['images']` (string array). [ASSUMED — verify against expo-image-picker changelog if TS shows a deprecation warning]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useUpcomingEvents` filtering `usePlansStore` client-side avoids a new network request | Architecture Patterns | If usePlansStore is frequently stale between sessions, a dedicated fetch may be needed |
| A2 | `charCodeAt(0)` on UUID is stable enough for deterministic pastel assignment | Pastel Color Pattern | UUIDs start with hex chars (0-9, a-f) → only 16 possible first chars → first 5 map to indices 0-4, next 5 to 0-4 again. Distribution not perfectly even but acceptable for ≤5 cards |
| A3 | `fetch(localUri) → blob.arrayBuffer()` works for Expo local file URIs on both iOS/Android | Supabase Storage Upload | If this fails, fallback to base64 decode via `base64-arraybuffer` (already installed) |
| A4 | `NSPhotoLibraryUsageDescription` may need to be added to app.json | Image Picker iOS | If already present (from expo-camera setup), no action needed; verify before writing migration plan |
| A5 | `mediaTypes: ['images']` string array syntax is correct for expo-image-picker v55 | State of the Art | If v55 still requires the enum, switch back — TypeScript will catch the error at compile time |

---

## Environment Availability

All dependencies already installed. No new packages required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `expo-image-picker` | Cover image selection | Yes | 55.0.12 | — |
| `expo-image` | Remote image rendering | Yes | 55.0.6 | `react-native` Image (no caching) |
| `@supabase/supabase-js` Storage | Cover image hosting | Yes (SDK installed) | 2.99.2 | — |
| Supabase Storage bucket `plan-covers` | Image hosting | Must be created | — | Create in migration/setup task |
| `base64-arraybuffer` | Alt upload encoding | Yes | in package.json | — |

**Missing dependencies with no fallback:**
- Supabase Storage bucket `plan-covers` must be created (either via Supabase dashboard or `supabase storage create` CLI). This is a one-time setup step, not a package install.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (found `playwright.config.ts` in project root) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --grep "@smoke"` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

Phase 4 has no formal REQ-XX IDs (requirement IDs are TBD per the phase input). The functional behaviors map as:

| Behavior | Test Type | Automated? | Notes |
|----------|-----------|-----------|-------|
| UpcomingEventsSection renders with plan data | visual smoke | Manual (Expo Go screenshot) | No DOM; Playwright tests are screenshot-based |
| Empty state placeholder renders when no events | visual smoke | Manual | Same |
| EventCard taps navigate to plan detail | integration | Manual | Requires real Supabase data |
| Cover image appears on card when set | visual smoke | Manual | Requires Storage bucket + upload |
| Image picker launches on iOS | manual | Manual | Requires physical device or Simulator |
| "See all" navigates to Explore tab | smoke | Manual | Tab navigation |

**Note:** This project uses Playwright for screenshot-based visual tests (pattern from `design-system.spec.ts`). No unit test framework (Jest/Vitest) is present. Phase 4 components are visual-only; behavioral coverage is via manual smoke test on device.

### Wave 0 Gaps
- [ ] No new test files needed — visual regression via Playwright screenshot is the existing pattern; screenshot test for UpcomingEventsSection can be added to the existing design-system spec if desired (optional, not blocking).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | Yes (Storage) | Supabase Storage bucket RLS — public read, authenticated write |
| V5 Input Validation | Yes (image upload) | Validate file type is image before upload; enforce size limit |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Arbitrary file upload (non-image) | Tampering | `expo-image-picker` with `mediaTypes: ['images']` restricts to images at the OS level; additionally verify MIME type server-side via Storage bucket content-type policy |
| Storage path traversal | Tampering | Use `planId` (UUID) as path prefix — no user-controlled path segments |
| Unauthorized cover image overwrite | Elevation | Supabase Storage INSERT/UPDATE policy: `auth.uid() = (SELECT created_by FROM plans WHERE id = [planId])` — only the plan creator can upload |
| Public URL leakage | Info Disclosure | Cover images are intentionally public (no sensitive content expected). If a plan is deleted, its Storage object should be deleted too — add to `deletePlan` cleanup. |

---

## Sources

### Primary (HIGH confidence)
- Project source files (read directly): `HomeScreen.tsx`, `PlanCard.tsx`, `usePlans.ts`, `usePlanDetail.ts`, `AvatarStack.tsx`, `SectionHeader.tsx`, `PlanCreateModal.tsx`, `PlanDashboardScreen.tsx`
- Project theme files: `colors.ts`, `spacing.ts`, `typography.ts`, `radii.ts`, `shadows.ts`
- `src/types/database.ts` — confirmed plans table schema (no cover_image_url yet)
- `src/types/plans.ts` — Plan/PlanMember/PlanWithMembers interfaces
- `src/stores/usePlansStore.ts` — Zustand store shape
- `package.json` — all dependency versions verified
- `04-UI-SPEC.md` — approved UI design contract (all visual decisions locked)
- `04-CONTEXT.md` — locked decisions D-01 through D-19

### Secondary (MEDIUM confidence)
- `@supabase/supabase-js` v2 Storage API: standard `storage.from().upload()` pattern consistent with v2.99.2 SDK
- `expo-image-picker` v55: `mediaTypes: ['images']` syntax (string array API introduced in v15+)

### Tertiary (LOW confidence — Assumptions Log)
- `fetch(localUri)` → `blob.arrayBuffer()` for Supabase Storage upload on Expo (A3)
- `charCodeAt(0)` UUID distribution sufficiency (A2)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in node_modules
- Architecture: HIGH — patterns derived from reading existing codebase + UI-SPEC
- Pitfalls: MEDIUM-HIGH — Pitfall 2 (iOS permissions) and 3 (Storage bucket public) are known Expo/Supabase patterns; others derived from code reading
- Database: HIGH — read database.ts directly, confirmed column is absent

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable ecosystem — Expo SDK 55, Supabase v2)
