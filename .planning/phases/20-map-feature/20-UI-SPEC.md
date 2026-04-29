# Phase 20: Map Feature — UI Design Contract

**Generated:** 2026-04-29
**Stack:** React Native (Expo SDK 55)
**Status:** Ready for planning

---

## 1. Design Context

Phase 20 introduces four new UI surfaces to the existing dark/neon-green Campfire design system:

1. **"Add location" trigger** — replaces the freetext input in PlanCreateModal
2. **LocationPicker Modal** — full-screen map with fixed center pin
3. **Plan Dashboard Map Tile** — static non-interactive map preview with address row
4. **Explore Map View + Header Toggle** — map tab in Explore with list/map toggle

All new components **must** follow the Phase 19 pattern:
- `useTheme()` for all color references — zero raw `COLORS` imports
- `StyleSheet.create` inside `useMemo([colors])` — no module-scope styles

The native `MapView` renders its own basemap (OS-controlled). This spec defines the surrounding chrome, overlays, and controls — not the basemap itself.

---

## 2. Token Reference (from `src/theme/`)

New components reference existing tokens only — no new tokens added.

| Token | Dark value | Light value | Usage in this phase |
|-------|-----------|-------------|---------------------|
| `colors.surface.base` | `#0E0F11` | `#F5F6F8` | Screen backgrounds behind map |
| `colors.surface.card` | `#1D2027` | `#FFFFFF` | Floating cards, confirm bar, address pill |
| `colors.surface.overlay` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` | Overlay elements on map |
| `colors.text.primary` | `#F5F5F5` | `#1A1D23` | Address labels, button text |
| `colors.text.secondary` | `#9CA3AF` | `#64748B` | Inactive toggle icons, placeholder text |
| `colors.interactive.accent` | `#B9FF3B` | `#4D7C00` | Pin icon, active toggle, confirm button |
| `colors.border` | `#1E2128` | `#D1D5DB` | Card borders, dividers |
| `colors.cardElevation` | zero shadow | subtle shadow | Floating cards over map |
| `RADII.md` | 8 | — | Buttons, tags |
| `RADII.lg` | 12 | — | Map tile, cards |
| `RADII.xl` | 16 | — | Confirm bar |
| `RADII.full` | 9999 | — | Icon toggle active indicator |
| `FONT_FAMILY.body.medium` | Plus Jakarta Sans 500 | — | Address label, button text |
| `FONT_FAMILY.body.regular` | Plus Jakarta Sans 400 | — | Secondary / helper text |
| `FONT_SIZE.md` | 14 | — | Address label, button text |
| `FONT_SIZE.sm` | 13 | — | Secondary text, inactive toggle label |

---

## 3. Component Specs

### 3.1 "Add Location" Trigger (PlanCreateModal)

Replaces the existing freetext location `TextInput`. Shows location label when a location is already set.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  📍 [icon]  Add location          ›         │
└─────────────────────────────────────────────┘
```
When location is set:
```
┌─────────────────────────────────────────────┐
│  📍 [icon]  123 Main St, Toronto   [×]      │
└─────────────────────────────────────────────┘
```

**Spec:**
| Property | Value |
|----------|-------|
| Height | 48pt (touch target) |
| Background | `colors.surface.card` |
| Border | 1pt `colors.border`, `RADII.lg` |
| Icon | `Ionicons "location-outline"`, 20pt, `colors.interactive.accent` |
| Text (empty) | "Add location", `FONT_SIZE.md`, `colors.text.secondary` |
| Text (set) | address string, `FONT_SIZE.md`, `colors.text.primary` |
| Clear icon | `Ionicons "close-circle"`, 18pt, `colors.text.secondary` |
| Chevron | `Ionicons "chevron-forward"`, 16pt, `colors.text.secondary` (hidden when set) |
| Touch feedback | `opacity: 0.7` on press |

---

### 3.2 LocationPicker Modal

Full-screen `<Modal>` with a `MapView` that fills the entire screen. A fixed pin overlay is positioned at screen center. A confirm bar floats at the bottom.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [×]  Choose location              [close]  │  ← Header bar (safe area)
├─────────────────────────────────────────────┤
│                                             │
│              [ MAP VIEW ]                  │  ← fills flex: 1
│               (full screen)                │
│                    │                        │
│               ─────┼─────  ← fixed center  │
│                    ▼ pin                    │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │ 📍 123 Main St, Toronto               │  │  ← address label (updates live)
│  │ [          Confirm Location          ]│  │  ← primary CTA
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Spec:**

| Element | Property | Value |
|---------|----------|-------|
| Modal | `presentationStyle` | `fullScreen` |
| Header bar | height | 52pt + top safe area |
| Header bar | background | `colors.surface.card` |
| Header bar | border-bottom | 1pt `colors.border` |
| Header title | text | "Choose location" |
| Header title | style | `FONT_FAMILY.body.semibold`, `FONT_SIZE.lg`, `colors.text.primary` |
| Close button | icon | `Ionicons "close"`, 24pt |
| Close button | touch target | 44×44pt |
| Close button | color | `colors.text.secondary` |
| MapView | `style` | `StyleSheet.absoluteFillObject` |
| MapView | `initialRegion` | GPS position or Toronto fallback |
| MapView | `onRegionChangeComplete` | `(r, { isGesture }) => isGesture && setRegion(r)` |
| MapView iOS | `userInterfaceStyle` | `"dark"` (iOS 13+, Apple Maps only) |
| Fixed pin | position | `absolute`, centered (top: 50%, left: 50%, marginLeft: -18, marginTop: -36) |
| Fixed pin | icon | `Ionicons "location"`, 36pt, `colors.interactive.accent` |
| Fixed pin | `pointerEvents` | `"none"` (on wrapping View) |
| Confirm bar | position | `absolute`, bottom: 0 |
| Confirm bar | background | `colors.surface.card` |
| Confirm bar | padding | 16pt horizontal, 12pt top, 24pt bottom (+ bottom safe area) |
| Confirm bar | borderRadius | `RADII.xl` top-left, top-right only |
| Confirm bar | `...colors.cardElevation` | spread (subtle shadow in light mode) |
| Address label | icon | `Ionicons "location-outline"`, 16pt, `colors.interactive.accent` |
| Address label | text | live address string (loading spinner while geocoding) |
| Address label | style | `FONT_SIZE.md`, `FONT_FAMILY.body.medium`, `colors.text.primary` |
| Address label | loading | `ActivityIndicator` in accent color while reverseGeocodeAsync runs |
| Confirm button | height | 48pt |
| Confirm button | background | `colors.interactive.accent` |
| Confirm button | text color | dark mode: `#0E0F11` / light mode: `#FFFFFF` |
| Confirm button | text | "Confirm Location" |
| Confirm button | font | `FONT_FAMILY.body.semibold`, `FONT_SIZE.lg` |
| Confirm button | borderRadius | `RADII.md` |
| Confirm button | disabled | when geocoding is in progress (opacity 0.5) |

**Accessibility:**
- Close button: `accessibilityLabel="Close location picker"`
- Fixed pin overlay: `accessibilityLabel="Drag map to move pin"` (announceOnMount)
- Confirm button: `accessibilityLabel="Confirm selected location"` + `accessibilityState={{ disabled: isGeocoding }}`

---

### 3.3 Plan Dashboard Map Tile

Displayed below the existing location label row when `plan.latitude && plan.longitude` is truthy. Absent (not hidden, not a placeholder) when lat/lng is null.

**Layout (within PlanDashboardScreen ScrollView):**
```
┌─────────────────────────────────────────────┐
│                                             │
│           [ STATIC MAP TILE ]              │  ← 160pt height
│        (scrollEnabled/zoomEnabled=false)   │
│                    🟢                       │  ← accent-color Marker
│                                             │
│─────────────────────────────────────────────│
│  📍  123 Main St, Toronto   [Directions ›] │  ← address + action row
└─────────────────────────────────────────────┘
```

**Spec:**

| Element | Property | Value |
|---------|----------|-------|
| Container | background | `colors.surface.card` |
| Container | borderRadius | `RADII.lg` |
| Container | borderWidth | 1pt |
| Container | borderColor | `colors.border` |
| Container | overflow | `"hidden"` |
| Container | `...colors.cardElevation` | spread |
| MapView | height | 160pt |
| MapView | `scrollEnabled` | `false` |
| MapView | `zoomEnabled` | `false` |
| MapView | `rotateEnabled` | `false` |
| MapView | `pitchEnabled` | `false` |
| MapView | `pointerEvents` | `"none"` on wrapper View |
| MapView iOS | `userInterfaceStyle` | `"dark"` |
| MapView | `initialRegion` | `{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }` |
| Marker | `pinColor` | use `colors.interactive.accent` hex string |
| Address row | paddingHorizontal | 12pt |
| Address row | paddingVertical | 10pt |
| Address row | borderTop | 1pt `colors.border` |
| Address icon | `Ionicons "location-outline"`, 14pt, `colors.interactive.accent` |
| Address text | `FONT_SIZE.sm`, `FONT_FAMILY.body.regular`, `colors.text.primary` |
| Address text | numberOfLines | 1 |
| Directions button | text | "Directions" |
| Directions button | style | `FONT_SIZE.sm`, `FONT_FAMILY.body.medium`, `colors.interactive.accent` |
| Directions button | touch target | min 44pt height (expand padding) |
| Directions button | icon | `Ionicons "navigate-outline"`, 14pt |

**Accessibility:**
- `accessibilityLabel={`Map showing ${plan.location ?? 'plan location'}`}` on the MapView wrapper
- Directions button: `accessibilityLabel="Get directions to ${plan.location}"`
- Map tile is decorative — `accessibilityElementsHidden={true}` on the MapView itself; the address row is the meaningful content

---

### 3.4 Explore Tab Header Toggle

A list/map icon pair added to the `ScreenHeader` right slot in `PlansListScreen`. The active mode icon is highlighted; the inactive one is dimmed.

**Layout (ScreenHeader right slot):**
```
                          [☰] [🗺]   ← right slot
```

**Spec:**

| Element | Property | Value |
|---------|----------|-------|
| Toggle container | flexDirection | `"row"` |
| Toggle container | gap | 4pt |
| Toggle container | alignItems | `"center"` |
| Each icon button | width, height | 36×36pt (touch target via padding) |
| Each icon button | borderRadius | `RADII.md` |
| Active icon background | `colors.interactive.accent` at 15% opacity: dark `rgba(185,255,59,0.15)` / light `rgba(77,124,0,0.12)` |
| Active icon | `colors.interactive.accent` |
| Inactive icon | `colors.text.secondary` |
| List icon | `Ionicons "list"`, 20pt |
| Map icon | `Ionicons "map-outline"`, 20pt |
| Transition | none (instant switch — no animation complexity needed) |

**Accessibility:**
- List button: `accessibilityLabel="List view"` + `accessibilityState={{ selected: mode === 'list' }}`
- Map button: `accessibilityLabel="Map view"` + `accessibilityState={{ selected: mode === 'map' }}`
- Container: `accessibilityRole="radiogroup"`

---

### 3.5 ExploreMapView

Fills the screen below the ScreenHeader when map mode is active. Shows Marker pins for each friend plan with a lat/lng. Tapping a pin navigates directly to that plan's dashboard.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ [ScreenHeader]   Friends     [☰] [🗺]       │
├─────────────────────────────────────────────┤
│                                             │
│         [ INTERACTIVE MAP VIEW ]           │
│                 flex: 1                     │
│                                             │
│      🟢    🟢       🟢                      │  ← plan pins
│                 🟢                          │
│                                             │
└─────────────────────────────────────────────┘
```

**Spec:**

| Element | Property | Value |
|---------|----------|-------|
| MapView | `style` | `flex: 1` |
| MapView | `showsUserLocation` | `true` (blue dot — OS-managed) |
| MapView | `showsMyLocationButton` | `false` (no stock recenter button; implement custom if needed in V2) |
| MapView iOS | `userInterfaceStyle` | `"dark"` |
| Plan Marker | `pinColor` | `colors.interactive.accent` hex |
| Plan Marker | `onPress` | `router.push('/plans/${plan.id}')` — direct navigation, no callout |
| Plan Marker | `tracksViewChanges` | `false` (performance — pins are static) |
| Initial region | when GPS granted | user location, `latitudeDelta: 0.15, longitudeDelta: 0.15` (≈15km view) |
| Initial region | when GPS denied | show all plan pins bounding box, or Toronto default if none |
| Empty state | when no friend plans have lat/lng | `EmptyState` component: "No nearby plans yet" |
| Loading state | while fetching plans | `ActivityIndicator` centered over map |

**Persistence decision (Claude's discretion):**
The list/map toggle selection is **not persisted** across sessions. Map view is always the default when the Explore tab opens (D-15). State is local to `PlansListScreen` component lifetime.

---

## 4. Layout & Spacing Summary

| Measurement | Value | Where |
|-------------|-------|-------|
| Map tile height | 160pt | PlanDashboardScreen |
| Confirm bar horizontal padding | 16pt | LocationPicker |
| Confirm bar bottom padding | 12pt + bottom safe area inset | LocationPicker |
| Header bar height | 52pt + top safe area | LocationPicker |
| Address row vertical padding | 10pt | Map tile address row |
| Toggle button size | 36×36pt | Explore header |
| Touch target minimum | 44×44pt | All interactive elements |
| Min gap between touch targets | 8pt | Toggle buttons |

---

## 5. Accessibility Contract

| Rule | Requirement |
|------|-------------|
| Touch targets | All tappable elements ≥ 44×44pt (apply via `hitSlop` or padding) |
| Map tiles | `accessibilityElementsHidden={true}` on `<MapView>` — the view is decorative; the address label is the accessible content |
| Location picker pin | Announce "Drag map to adjust pin location" on modal open |
| Screen reader order | LocationPicker: header → map announcement → confirm bar |
| Dynamic text | All labels use theme font sizes — no fixed pixel overrides that break Dynamic Type |
| Color only | Never use accent color as the **only** distinction — pair with icon or label |

---

## 6. Dark Mode Map Basemap

The OS controls the map basemap. To request a dark basemap:

**iOS (Apple Maps — PROVIDER_DEFAULT):**
```tsx
<MapView userInterfaceStyle="dark" ... />
```
Supported since iOS 13. Falls back to light on older devices.

**Android (Google Maps):**
```tsx
import { PROVIDER_GOOGLE } from 'react-native-maps';
<MapView provider={PROVIDER_GOOGLE} customMapStyle={DARK_MAP_STYLE} ... />
```
Where `DARK_MAP_STYLE` is the standard Google Maps dark style JSON array (available from Google Maps Styling Wizard). **The planner must include the dark style JSON constant in `src/lib/maps.ts`.**

Both cases: if dark basemap cannot be applied (permission, version, error), the light basemap is an acceptable fallback — the surrounding chrome still matches the app theme.

---

## 7. Anti-Patterns (Must Not Appear)

| Anti-Pattern | Why Forbidden |
|---|---|
| `import { COLORS } from '@/theme'` in map components | Must use `useTheme()` — Phase 19 migration rule |
| `StyleSheet.create` at module scope | Freezes colors to initial palette |
| `region` (controlled) prop on LocationPicker `MapView` | Causes infinite update loop — use `initialRegion` only |
| `Marker` as draggable pin in LocationPicker | Use fixed overlay View — map-drag-not-pin-drag pattern |
| Calling `reverseGeocodeAsync` before permission check | App hangs indefinitely on Android |
| `MapView` inside `ScrollView` without `pointerEvents="none"` | Map intercepts scroll events on PlanDashboard |
| Hardcoded hex colors in map components | Use `colors.*` from `useTheme()` |
| `iosGoogleMapsApiKey` in plugin config | Breaks EAS build on SDK 55 (D-04) |
| Callout bubble on Explore map pin tap | Decided against per D-18 — direct navigation |
| Empty placeholder when plan has no location | Silent absence per D-13 |

---

## 8. React Native Implementation Rules

| Rule | Requirement |
|------|-------------|
| StyleSheet memoization | `useMemo([colors], () => StyleSheet.create({...}))` |
| Touch targets | Minimum 44×44pt; use `hitSlop` for small icons |
| Screen reader | `accessibilityLabel` on all icon-only buttons |
| `pointerEvents="none"` | Required on fixed pin View overlay (LocationPicker) and MapView wrapper (map tile) |
| `tracksViewChanges={false}` | Required on all `<Marker>` elements for performance |
| Safe area | Use `useSafeAreaInsets()` in LocationPicker confirm bar and header |
| Animation | Not applicable for this phase (toggle is instant; no complex animations) |

---

*Phase: 20-map-feature*
*UI spec generated: 2026-04-29 via ui-ux-pro-max*
