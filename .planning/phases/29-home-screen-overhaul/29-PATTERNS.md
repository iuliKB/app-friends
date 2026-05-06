# Phase 29: Home Screen Overhaul - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 6 modified files + 3 new test files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/home/RadarBubble.tsx` | component | event-driven (heartbeat state) | self (modify in place) | exact |
| `src/components/home/EventCard.tsx` | component | request-response (display) | self (modify in place) | exact |
| `src/components/home/UpcomingEventsSection.tsx` | component | request-response (display + loading) | self (modify in place) | exact |
| `src/screens/home/HomeScreen.tsx` | screen | request-response | self (modify in place) | exact |
| `src/hooks/useUpcomingEvents.ts` | hook | request-response | `src/hooks/usePlans.ts` | role-match |
| `src/components/home/__tests__/RadarBubble.dead.test.tsx` | test | — | `src/components/plans/__tests__/RSVPButtons.test.tsx` | role-match |
| `src/hooks/__tests__/useViewPreference.test.ts` | test | — | `src/theme/__tests__/animation.test.ts` | role-match |
| `src/components/home/__tests__/EventCard.phase29.test.tsx` | test | — | `src/components/plans/__tests__/RSVPButtons.test.tsx` | role-match |

---

## Pattern Assignments

### `src/components/home/RadarBubble.tsx` (component, event-driven)

**Analog:** self — modify in place

**Current structure to understand** (lines 242–282):
```tsx
// Current render tree (RadarBubble.tsx:242-282):
return (
  <Animated.View                          // outerWrapper — opacity + scale live here
    style={[styles.outerWrapper, { opacity: finalOpacity, transform: [{ scale: finalScale }] }]}
  >
    <Pressable                            // ALIVE/FADING only — becomes View for DEAD
      onPress={handlePress}
      onLongPress={handleLongPress}
      ...
    >
      <Animated.View style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}>
        {isAlive && <PulseRing ... variant="alive" />}
        {heartbeatState === 'fading' && <PulseRing ... variant="fading" />}
        {showGradient && <LinearGradient ... />}
        <AvatarCircle ... />
        {/* D-01: INSERT greyscale overlay here for DEAD */}
      </Animated.View>
    </Pressable>
    <Text style={[styles.nameLabel, ...]} ... />   {/* SIBLING of Pressable — stays here */}
  </Animated.View>
);
```

**DEAD opacity to change** (lines 163–164):
```tsx
// CURRENT (to be changed):
if (heartbeatState === 'dead') {
  baseOpacity = 0.5;  // D-01: change to 0.38
```

**DEAD branch: Pressable → View swap pattern** (new code, based on FADING/ALIVE conditional pattern in file):
```tsx
// PATTERN: replicate the existing isAlive/fading conditional style for the Pressable→View swap
// For DEAD: replace the Pressable wrapper with a plain View (no onPress/onLongPress)
// Keep the same children inside Animated.View(bubbleContainer)

const isDead = heartbeatState === 'dead';

// In JSX:
{isDead ? (
  <View>   {/* no touch handlers */}
    <Animated.View style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}>
      <AvatarCircle size={targetSize} imageUri={friend.avatar_url} displayName={friend.display_name} />
      {/* greyscale overlay — INSIDE bubbleContainer, ABOVE AvatarCircle */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.surface.base,
          opacity: 0.55,
          borderRadius: targetSize / 2,
        }}
        pointerEvents="none"
      />
    </Animated.View>
  </View>
) : (
  <Pressable onPress={handlePress} onLongPress={handleLongPress} ...>
    <Animated.View style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}>
      {isAlive && <PulseRing ... />}
      {heartbeatState === 'fading' && <PulseRing ... />}
      {showGradient && <LinearGradient ... />}
      <AvatarCircle ... />
    </Animated.View>
  </Pressable>
)}
```

**Imports pattern** (lines 5–14) — no new imports needed:
```tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, SPACING } from '@/theme';
// Note: StyleSheet.absoluteFillObject is available from react-native without new import
```

**Theme pattern** (lines 129–145):
```tsx
// Mandatory: useTheme() + useMemo([colors]) wrapping StyleSheet.create
const { colors } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  outerWrapper: { alignItems: 'center' },
  bubbleContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  nameLabel: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.body.regular, ... },
}), []);  // colors not used in current styles — if adding color-dependent styles, add [colors]
```

---

### `src/components/home/EventCard.tsx` (component, request-response)

**Analog:** self — modify in place

**Current card dimensions** (lines 117–128) — the values to change:
```tsx
const styles = StyleSheet.create({
  card: {
    // D-10: change from 200→240 width, 140→160 height
    width: 200,   // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 140,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  ...
});
```

**Current AvatarStack call** (line 106) — props to update:
```tsx
// CURRENT (to be changed per D-12):
<AvatarStack members={plan.members} size={24} maxVisible={3} />
// NEW:
<AvatarStack members={plan.members} size={28} maxVisible={5} />
// Note: AvatarStack already has overflow chip at size/height with borderRadius=size/2
// No changes needed to AvatarStack.tsx itself
```

**Date pill insertion pattern** — new element inside Animated.View, ABOVE styles.content:
```tsx
// Animated.View already wraps all card content (lines 71–113):
<Animated.View style={{ transform: [{ scale: cardScaleAnim }], flex: 1, justifyContent: 'flex-end' }}>
  {/* Background layer — no change */}
  ...

  {/* D-11: NEW date pill — absolutely positioned, SIBLING of styles.content (not inside it) */}
  {dateLabel ? (
    <View
      style={{
        position: 'absolute',
        top: SPACING.sm,
        left: SPACING.sm,
        backgroundColor: isDark
          ? 'rgba(185,255,59,0.15)'   // UI-SPEC dark mode
          : 'rgba(77,124,0,0.12)',    // UI-SPEC light mode
        borderRadius: RADII.sm,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
      }}
    >
      <Text style={{ fontSize: FONT_SIZE.xs, color: colors.interactive.accent, lineHeight: 12 }}>
        {dateLabel}
      </Text>
    </View>
  ) : null}

  {/* Content layer — existing, no change to structure */}
  <View style={styles.content}>
    ...
  </View>
</Animated.View>
```

**isDark access pattern** — already available from useTheme():
```tsx
// HomeScreen.tsx line 35 shows the pattern:
const { colors, isDark } = useTheme();
// EventCard currently only destructures colors (line 20) — add isDark:
const { colors, isDark } = useTheme();
```

**Existing inline date text** (lines 98–102) — retire per D-11 (pill replaces it):
```tsx
// CURRENT (to be removed — pill becomes the only date display):
{dateLabel ? (
  <Text style={[styles.date, { color: textColor }]} numberOfLines={1}>
    {dateLabel}
  </Text>
) : null}
```

---

### `src/components/home/UpcomingEventsSection.tsx` (component, request-response + loading)

**Analog:** self — modify in place; loading prop pattern from `src/screens/home/HomeScreen.tsx`

**Current constants and FlatList height** (lines 17–20, 37–41):
```tsx
// D-10: change CARD_WIDTH from 200→240; update flatList height from 140→160
const CARD_WIDTH = 200;  // → 240
const CARD_GAP = SPACING.md;

flatList: {
  height: 140,  // → 160  (matches new EventCard height)
},
```

**Placeholder card dimensions** (lines 51–55) — must also update:
```tsx
placeholderCard: {
  // D-10 + Pitfall 3: NOT using CARD_WIDTH constant — must update raw values too
  width: 200,   // → 240
  height: 140,  // → 160
  ...
},
```

**Loading skeleton insertion pattern** — add `isLoading` prop, render SkeletonPulse:
```tsx
// STEP 1: Add isLoading prop to component interface
interface UpcomingEventsSectionProps {
  isLoading?: boolean;
}
export function UpcomingEventsSection({ isLoading = false }: UpcomingEventsSectionProps) {

// STEP 2: Add SkeletonPulse import at top:
import { SkeletonPulse } from '@/components/common/SkeletonPulse';

// STEP 3: Skeleton row — show when isLoading=true (replaces the empty/list branch):
{isLoading ? (
  <View style={{ flexDirection: 'row', paddingLeft: SPACING.lg, gap: CARD_GAP }}>
    <SkeletonPulse width={240} height={160} />
    <SkeletonPulse width={240} height={160} />
  </View>
) : upcomingEvents.length === 0 ? (
  // existing placeholder card
) : (
  // existing FlatList
)}
```

**Loading prop thread from HomeScreen** — `usePlans()` returns `loading` boolean (line 43 HomeScreen.tsx):
```tsx
// HomeScreen.tsx already calls usePlans() at line 43:
usePlans(); // currently fires-and-forgets the return value
// Change to:
const { loading: plansLoading } = usePlans();
// Then thread to UpcomingEventsSection:
<UpcomingEventsSection isLoading={plansLoading} />
```

**CRITICAL: usePlansStore has no loading field** — confirmed at `src/stores/usePlansStore.ts:4-9`:
```tsx
// PlansState interface has: plans, lastFetchedAt, setPlans, removePlan — NO loading flag
// Therefore Option A (prop threading from HomeScreen) is REQUIRED for D-09
```

---

### `src/screens/home/HomeScreen.tsx` (screen, request-response)

**Analog:** self — modify in place

**OnboardingHintSheet removal — all 6 sites** (Pitfall 4 from RESEARCH.md):
```tsx
// Site 1: import (line 22) — REMOVE:
import { OnboardingHintSheet } from '@/components/onboarding/OnboardingHintSheet';

// Site 2: ONBOARDING_FLAG_KEY constant (line 56) — REMOVE:
const ONBOARDING_FLAG_KEY = '@campfire/onboarding_hint_shown';

// Site 3: useState (line 57) — REMOVE:
const [onboardingVisible, setOnboardingVisible] = useState(false);

// Site 4: handleOnboardingDismiss function (lines 72–75) — REMOVE:
function handleOnboardingDismiss() {
  AsyncStorage.setItem(ONBOARDING_FLAG_KEY, 'true').catch(() => {});
  setOnboardingVisible(false);
}

// Site 5: useEffect (lines 61–70) — REMOVE:
useEffect(() => {
  if (loading) return;
  AsyncStorage.getItem(ONBOARDING_FLAG_KEY)
    .then((value) => {
      if (!value && friends.length === 0) { setOnboardingVisible(true); }
    })
    .catch(() => {});
}, [loading, friends.length, ONBOARDING_FLAG_KEY]);

// Site 6: JSX render (lines 259–262) — REMOVE:
<OnboardingHintSheet
  visible={onboardingVisible}
  onDismiss={handleOnboardingDismiss}
/>
```

**AsyncStorage import** — check if still needed after removal:
```tsx
// Line 11: import AsyncStorage from '@react-native-async-storage/async-storage';
// After removing all onboarding code, no other usage of AsyncStorage remains in HomeScreen.tsx
// REMOVE this import too — prevents ESLint unused-import warning
```

**EmptyState props update** (lines 235–244):
```tsx
// CURRENT:
<EmptyState
  icon="people-outline"
  iconType="ionicons"
  heading="No friends yet"
  body="Add a friend to see where they're at and make plans."
  ctaLabel="Add a friend"
  onCta={handleNavigateToSquad}
/>

// D-06/D-07: NEW (update all 5 changed props):
<EmptyState
  icon="👥"
  iconType="emoji"
  heading="Invite your crew"
  body="Add friends to see who's free and make plans"
  ctaLabel="Invite friends"
  onCta={() => router.push('/friends/add')}
/>
// Note: handleNavigateToSquad function (line 40-42) becomes dead code — remove it
```

**usePlans loading thread pattern** (line 43):
```tsx
// CURRENT (ignores return value):
usePlans();

// NEW (thread loading to UpcomingEventsSection):
const { loading: plansLoading } = usePlans();
// Then in JSX (line 247):
// CURRENT: <UpcomingEventsSection />
// NEW:     <UpcomingEventsSection isLoading={plansLoading} />
```

---

### `src/hooks/useUpcomingEvents.ts` (hook, request-response)

**Analog:** `src/hooks/usePlans.ts` — hook that reads from store and returns loading state

**Current signature** (line 15):
```tsx
// CURRENT — no loading signal:
export function useUpcomingEvents(): PlanWithMembers[]

// Phase 29 does NOT change this hook — the loading signal is threaded as a prop from HomeScreen
// instead (see UpcomingEventsSection pattern above). No modification needed.
```

---

### `src/components/home/__tests__/RadarBubble.dead.test.tsx` (test)

**Analog:** `src/components/plans/__tests__/RSVPButtons.test.tsx`

**Test file structure pattern** (lines 1–63 of RSVPButtons.test.tsx):
```tsx
/**
 * RadarBubble.dead test — Phase 29, HOME-05.
 * Tests verify DEAD bubble renders without Pressable, without PulseRing,
 * and with correct opacity (0.38 on outer Animated.View).
 *
 * Run: npx jest --testPathPattern="RadarBubble" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { RadarBubble } from '../RadarBubble';

// Mock computeHeartbeatState to control DEAD state
jest.mock('@/lib/heartbeat', () => ({
  computeHeartbeatState: jest.fn(),
}));
import { computeHeartbeatState } from '@/lib/heartbeat';

// Mock supabase (RadarBubble imports it for DM navigation)
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

// Mock expo-router
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const DEAD_FRIEND = {
  friend_id: 'abc',
  display_name: 'Jane',
  avatar_url: null,
  status: 'free',
  status_expires_at: null,
  last_active_at: null,
};

function renderBubble(heartbeatOverride: 'alive' | 'fading' | 'dead' = 'dead') {
  (computeHeartbeatState as jest.Mock).mockReturnValue(heartbeatOverride);
  return render(
    <ThemeProvider>
      <RadarBubble friend={DEAD_FRIEND as any} />
    </ThemeProvider>
  );
}

describe('RadarBubble DEAD state (HOME-05)', () => {
  it('renders display name as text', () => {
    const { getByText } = renderBubble('dead');
    expect(getByText('Jane')).toBeTruthy();
  });

  it('DEAD bubble is not a Pressable (no accessibilityRole=button on bubble)', () => {
    const { queryAllByRole } = renderBubble('dead');
    // Pressable has accessibilityRole="button" in the current code
    // DEAD branch uses View instead — expect 0 button roles
    expect(queryAllByRole('button')).toHaveLength(0);
  });
  // Add: opacity test, no PulseRing test
});
```

---

### `src/hooks/__tests__/useViewPreference.test.ts` (test)

**Analog:** `src/theme/__tests__/animation.test.ts` (simple unit test) + AsyncStorage mock pattern

**AsyncStorage mock** — already available at `src/__mocks__/async-storage.js`:
```js
// src/__mocks__/async-storage.js (full file — use as-is via jest moduleNameMapper):
const AsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  ...
};
module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
```

**Test structure pattern:**
```tsx
// src/hooks/__tests__/useViewPreference.test.ts
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useViewPreference } from '../useViewPreference';

// AsyncStorage is auto-mocked via jest.config.js moduleNameMapper

describe('useViewPreference (HOME-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to return null (first-run default)
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('defaults to radar on first run', async () => {
    const { result } = renderHook(() => useViewPreference());
    // loading=true initially — wait for effect
    await act(async () => {});
    const [view] = result.current;
    expect(view).toBe('radar');
  });

  it('restores persisted "cards" preference on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('cards');
    const { result } = renderHook(() => useViewPreference());
    await act(async () => {});
    const [view] = result.current;
    expect(view).toBe('cards');
  });

  it('persists new value on setView call', async () => {
    const { result } = renderHook(() => useViewPreference());
    await act(async () => {});
    const [, setView] = result.current;
    act(() => { setView('cards'); });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('campfire:home_view', 'cards');
  });
});
```

---

### `src/components/home/__tests__/EventCard.phase29.test.tsx` (test)

**Analog:** `src/components/plans/__tests__/RSVPButtons.test.tsx`

**Test structure pattern:**
```tsx
/**
 * EventCard phase29 test — HOME-08.
 * Verifies new 240×160 dimensions, date pill presence, AvatarStack prop changes.
 *
 * Run: npx jest --testPathPattern="EventCard.phase29" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { EventCard } from '../EventCard';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-image', () => ({ Image: 'Image' }));

const PLAN_BASE = {
  id: 'abcdef00',  // charCodeAt(0) = 97 → PASTEL_COLORS[97 % 5 = 2] = '#93C5FD'
  title: 'Beach day',
  scheduled_for: new Date(Date.now() + 86400000).toISOString(),
  members: [],
  cover_image_url: null,
  created_by: 'user1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  location: null,
  link_dump: null,
  general_notes: null,
  latitude: null,
  longitude: null,
};

function renderCard(props = {}) {
  return render(
    <ThemeProvider>
      <EventCard plan={{ ...PLAN_BASE, ...props } as any} />
    </ThemeProvider>
  );
}

describe('EventCard Phase 29 (HOME-08)', () => {
  it('renders plan title', () => {
    const { getByText } = renderCard();
    expect(getByText('Beach day')).toBeTruthy();
  });
  // Add: date pill presence test, dimension snapshot, AvatarStack size prop test
});
```

---

## Shared Patterns

### Theme Access (all modified components)
**Source:** `src/components/home/RadarBubble.tsx` lines 129–145 and `src/screens/home/HomeScreen.tsx` line 35
**Apply to:** All modified component and screen files
```tsx
// Mandatory pattern — useTheme() + useMemo([colors]) for styled sheets:
const { colors, isDark } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  // ... style definitions using colors.* tokens
}), [colors]);
```

### Design Token Imports
**Source:** `src/components/home/EventCard.tsx` line 6
**Apply to:** All component files with new style properties
```tsx
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS, ANIMATION } from '@/theme';
// Never use raw pixel values — always use tokens
// Exception: eslint-disable-next-line campfire/no-hardcoded-styles when raw values are locked by spec
```

### Animated.spring Press Scale Pattern
**Source:** `src/components/home/EventCard.tsx` lines 34–54
**Apply to:** EventCard (already uses this — no change needed)
```tsx
// Pattern: spring scale on pressIn/pressOut with isInteraction: false
Animated.spring(cardScaleAnim, {
  toValue: 0.96,
  useNativeDriver: true,
  damping: ANIMATION.easing.spring.damping,
  stiffness: ANIMATION.easing.spring.stiffness,
  isInteraction: false,
}).start();
```

### ThemeProvider Wrapper in Tests
**Source:** `src/components/plans/__tests__/RSVPButtons.test.tsx` lines 26–31
**Apply to:** All three new test files
```tsx
// Mandatory: wrap component renders in ThemeProvider for useTheme() to work
import { ThemeProvider } from '@/theme';
render(
  <ThemeProvider>
    <ComponentUnderTest {...props} />
  </ThemeProvider>
);
```

### expo-router Mock in Tests
**Source:** `src/components/plans/__tests__/RSVPButtons.test.tsx` pattern (inferred — RSVPButtons doesn't use router, but RadarBubble and EventCard do)
**Apply to:** RadarBubble test, EventCard test
```tsx
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
```

### SkeletonPulse Explicit Width Pattern
**Source:** `src/components/common/SkeletonPulse.tsx` lines 16–59
**Apply to:** UpcomingEventsSection skeleton branch
```tsx
// ALWAYS use explicit pixel width for card skeletons — NOT '100%'
// '100%' in a horizontal FlatList/Row context measures incorrectly
<SkeletonPulse width={240} height={160} />
```

### StyleSheet.absoluteFillObject for Overlays
**Source:** `src/components/home/RadarBubble.tsx` lines 260, 266 and `src/components/home/EventCard.tsx` lines 77, 81
**Apply to:** DEAD bubble greyscale overlay
```tsx
// Pattern for absolutely-positioned overlay fills:
<View
  style={[
    StyleSheet.absoluteFillObject,   // shorthand for { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
    { backgroundColor: colors.surface.base, opacity: 0.55, borderRadius: size / 2 }
  ]}
  pointerEvents="none"   // always set — prevents overlay from consuming touches
/>
```

---

## No Analog Found

All modified files exist in the codebase. No files need to be created from scratch — even the test files have close analogs in `src/components/plans/__tests__/` and `src/theme/__tests__/`.

| File | Status |
|------|--------|
| `src/components/home/__tests__/RadarBubble.dead.test.tsx` | New file — pattern from `RSVPButtons.test.tsx` |
| `src/hooks/__tests__/useViewPreference.test.ts` | New file — pattern from `animation.test.ts` + AsyncStorage mock |
| `src/components/home/__tests__/EventCard.phase29.test.tsx` | New file — pattern from `RSVPButtons.test.tsx` |

---

## Key Findings for Planner

### Loading Signal Resolution (Open Question from RESEARCH.md)
`usePlansStore` (confirmed at `src/stores/usePlansStore.ts`) has NO `loading` field — the interface is `{ plans, lastFetchedAt, setPlans, removePlan }`. Therefore **Option A is required**: thread `loading` from `usePlans()` in `HomeScreen` down to `UpcomingEventsSection` as an `isLoading` prop. Plan 04 (UpcomingEventsSection skeleton) must also touch `HomeScreen.tsx` to extract and thread the loading flag.

### AvatarStack defaults are already size=28, maxVisible=5
`src/components/plans/AvatarStack.tsx` line 13 shows the component defaults: `maxVisible = 5, size = 28`. The current EventCard call at line 106 uses `size={24} maxVisible={3}` — overriding both defaults. D-12 means removing these overrides (or explicitly setting `size={28} maxVisible={5}`), not changing AvatarStack itself.

### OnboardingHintSheet removal unblocks AsyncStorage import removal
After removing all 6 OnboardingHintSheet-related sites from `HomeScreen.tsx`, the `AsyncStorage` import on line 11 becomes unused. Remove it to prevent ESLint error. No other call site remains in HomeScreen.

### Greyscale overlay uses targetSize, not sizeAnim
The `borderRadius` on the overlay must be `targetSize / 2` (static number), not `sizeAnim / 2` (Animated.Value). Using an Animated.Value as borderRadius would require `useNativeDriver: false` and is not supported for overlay styling. The existing resize animation runs on `sizeAnim`; the overlay's borderRadius stays in sync by deriving from `targetSize`.

---

## Metadata

**Analog search scope:** `src/components/home/`, `src/screens/home/`, `src/hooks/`, `src/stores/`, `src/components/common/`, `src/components/plans/`, `src/theme/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-05-06
