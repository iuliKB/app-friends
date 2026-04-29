---
plan: 20-06
phase: 20-map-feature
status: deferred
deferred_to: end-of-milestone
requirements: [MAP-01, MAP-02, MAP-03, MAP-04, MAP-05]
---

## Summary

EAS build and device verification deferred to end of v1.6 milestone hardware gate.

`react-native-maps` and `expo-location` native modules are included in plans 20-01 through 20-05. A new EAS development build is required before any map UI can be tested on device — this is consistent with the project's hardware gate deferral pattern.

## What was deferred

- EAS development build (`npx eas build --profile development --platform all`)
- MAP-01: Location picker device verification
- MAP-02: Plan dashboard map tile device verification
- MAP-03: Human-readable address label device verification
- MAP-04: Explore map view device verification
- MAP-05: Directions deep-link device verification

## Pre-conditions for verification

- `EXPO_PUBLIC_GOOGLE_MAPS_KEY` is set in `.env.local` ✓
- EAS secret created for CI builds (optional — recommended before build)
- All five map components implemented and committed in plans 20-01 through 20-05 ✓

## Self-Check: DEFERRED
