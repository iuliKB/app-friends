# Phase 20: Map Feature - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 20-map-feature
**Areas discussed:** Build setup, Database schema, Location picker UX, Explore map + Nearby

---

## Build Setup

| Option | Description | Selected |
|--------|-------------|----------|
| EAS / custom build | Already using EAS Build or local custom dev client | ✓ |
| Still on Expo Go | Would need custom dev client setup as part of phase | |
| expo run:ios/android | Local custom build | |

**User's choice:** EAS / custom build

---

| Option | Description | Selected |
|--------|-------------|----------|
| iOS only | Apple Maps, no API key needed | |
| Both iOS + Android | Android requires Google Maps API key | ✓ |

**User's choice:** Both iOS + Android

---

| Option | Description | Selected |
|--------|-------------|----------|
| I have a key already | Wire into app.config.ts, no setup step | |
| Need to set one up | Plan should include Google Cloud Console key setup step | ✓ |

**User's choice:** Need to set one up — plan should include key creation + restriction to Android + env var wiring

---

## Database Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Keep location, add lat/lng | Add latitude FLOAT8 + longitude FLOAT8 alongside existing location TEXT | ✓ |
| Rename location → address, add lat/lng | Column rename + add coordinates | |

**User's choice:** Keep existing location column, add lat/lng alongside it

---

| Option | Description | Selected |
|--------|-------------|----------|
| Address always from reverse geocoding | location text auto-generated from pin; no freetext-without-coords | ✓ |
| Allow freetext without coordinates | Keep text input alongside map picker | |

**User's choice:** Address always from reverse geocoding — location text is always generated from the pin

---

## Location Picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen map modal | Tapping "Add location" opens full-screen modal; user drags map under fixed center pin | ✓ |
| Current location + adjust | Drop pin at GPS position immediately, then drag | |

**User's choice:** Full-screen map modal with map-drag-under-fixed-pin pattern

---

| Option | Description | Selected |
|--------|-------------|----------|
| User's current location (Recommended) | Center on GPS position; requires expo-location permission | ✓ |
| Last dropped pin / city center | Static fallback; no permission needed | |

**User's choice:** Center on user's current location

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to default region | Sensible default region/zoom if permission denied; user can still pick | ✓ |
| Show permission prompt then cancel | Alert then close picker if denied | |

**User's choice:** Fall back to default region

---

| Option | Description | Selected |
|--------|-------------|----------|
| expo-location reverseGeocodeAsync | OS geocoder, free, no API key | ✓ |
| Google Geocoding API | Paid, high quality globally | |

**User's choice:** expo-location reverseGeocodeAsync

---

## Explore Map + Nearby

| Option | Description | Selected |
|--------|-------------|----------|
| Icon toggle in ScreenHeader | List/map icon buttons in header top-right | ✓ |
| Segmented control below header | Two-option control like Squad Friends/Goals tabs | |

**User's choice:** Icon toggle in ScreenHeader

---

| Option | Description | Selected |
|--------|-------------|----------|
| List view default | Keeps existing Explore behavior | |
| Map view default | Map-first; users land on map view immediately | ✓ |

**User's choice:** Map view is the default

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 25km radius | Filter friend plans within 25km of user's position | ✓ |
| Show all plans with a location | No distance filter; show every friend plan pin | |

**User's choice:** Fixed 25km radius

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show all friend plan pins (no filter) | If no location permission, show all plans with lat/lng | ✓ |
| Empty state with permission prompt | Empty map + message to allow location access | |

**User's choice:** Show all friend plan pins when location permission denied

---

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to plan dashboard directly | Tapping pin pushes to plan dashboard | ✓ |
| Show callout bubble first | Preview bubble above pin, then tap to navigate | |

**User's choice:** Direct navigation on pin tap

---

## Claude's Discretion

- Exact default region/zoom when location permission is denied in LocationPicker
- String format of the reverse-geocoded address label
- Visual styling of PlanDashboard map tile (height, border radius, pin color)
- Pin marker style for friend plans on Explore map
- Whether to persist list/map view preference across Explore tab sessions

## Deferred Ideas

- Address autocomplete — V2 (MAP-F01)
- Radius filter slider — V2 (MAP-F02)
- Google Maps on iOS — V2 (MAP-F03)
- Cluster markers — out of scope
- Callout bubble on pin — decided against
