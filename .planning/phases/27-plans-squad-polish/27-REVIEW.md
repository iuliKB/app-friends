---
phase: 27-plans-squad-polish
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - jest.config.js
  - src/__mocks__/async-storage.js
  - src/__mocks__/expo-haptics.js
  - src/__mocks__/jest-setup.js
  - src/__mocks__/react-native.js
  - src/__mocks__/reanimated.js
  - src/__mocks__/theme.js
  - src/app/(tabs)/squad.tsx
  - src/components/maps/ExploreMapView.tsx
  - src/components/plans/PlanCardSkeleton.tsx
  - src/components/plans/RSVPButtons.tsx
  - src/components/plans/__tests__/RSVPButtons.test.tsx
  - src/components/squad/WishListItem.tsx
  - src/components/squad/__tests__/WishListItem.test.tsx
  - src/hooks/useExpenseDetail.ts
  - src/screens/friends/FriendRequests.tsx
  - src/screens/plans/PlanCreateModal.tsx
  - src/screens/plans/PlansListScreen.tsx
  - src/theme/__tests__/animation.test.ts
  - src/theme/animation.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

This phase introduces animation tokens, RSVP bounce interactions, skeleton loading states for the plans list, a map view, wish-list claim interactions, and wires up the squad Activity tab entrance animations. The code is well-structured overall. No security or data-loss issues were found. The four warnings below are logic and reliability issues that could produce silent failures or incorrect UI states at runtime; the five info items are dead code and minor quality improvements.

---

## Warnings

### WR-01: `handleCreate` navigates away before cover upload completes — race on slow networks

**File:** `src/screens/plans/PlanCreateModal.tsx:148-169`

**Issue:** `router.back()` and `router.push(...)` are called unconditionally after `createPlan` succeeds (line 169), while the cover image upload block (lines 148–166) runs _after_ those navigation calls. On a slow connection the screen is already dismissed by the time `uploadingCover` flips back to `false`, so the loading state never surfaces to the user and the plan may briefly render without its cover image. More critically, the `usePlansStore` call inside the upload block (line 159) accesses store state that may have been replaced by a subsequent `fetchPlans` triggered by the push destination screen.

**Fix:** Move `router.back()` / `router.push(...)` to _after_ the cover upload block resolves:
```typescript
async function handleCreate() {
  if (!title.trim()) return;
  setCreating(true);
  const { planId, error } = await createPlan({ ... });
  setCreating(false);

  if (error || !planId) {
    Alert.alert('Error', `Couldn't create plan. ${error?.message ?? 'Unknown error'}`);
    return;
  }

  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

  if (coverImageUri && planId) {
    setUploadingCover(true);
    const publicUrl = await uploadPlanCover(planId, coverImageUri);
    if (publicUrl) {
      await supabase.from('plans').update({ cover_image_url: publicUrl }).eq('id', planId);
      const store = usePlansStore.getState();
      store.setPlans(store.plans.map((p) => p.id === planId ? { ...p, cover_image_url: publicUrl } : p));
    }
    setUploadingCover(false);
  }

  // Navigate only after all async work is done
  router.back();
  router.push(`/plans/${planId}` as never);
}
```

---

### WR-02: `handleDecline` does not call `fetchPlans` — invitation count stays stale after decline

**File:** `src/screens/plans/PlansListScreen.tsx:61-68`

**Issue:** `handleAccept` (line 57) calls `await fetchPlans()` after a successful accept so the plans list refreshes. `handleDecline` (line 61) only updates invitation state and closes the modal when empty, but never calls `fetchPlans`. If a user was listed as a member with RSVP `invited` on the plan, the plan card will continue to appear in the list (or the list will be stale) until the next manual refresh.

**Fix:**
```typescript
async function handleDecline(planId: string) {
  const { error: err } = await decline(planId);
  if (err) {
    Alert.alert('Error', "Couldn't decline invitation. Try again.");
    return;
  }
  await fetchPlans();  // keep plans list consistent with invitation state
  if (invitations.length <= 1) setModalVisible(false);
}
```

---

### WR-03: `useExpenseDetail` — `settle` callback captures stale `detail` ref, risks overwriting concurrent updates

**File:** `src/hooks/useExpenseDetail.ts:136-178`

**Issue:** The `settle` callback lists `detail` in its dependency array (line 177). If the user presses two settle buttons in rapid succession before the first `refetch()` resolves, the second invocation captures the `detail` value from before the first settle was reflected, and the subsequent `refetch()` from the first call may race against the second call's Supabase update. In practice this is unlikely but the dependency is also architecturally incorrect: `settle` only needs `detail` to short-circuit when `detail` is null. It does not read any field from `detail` other than the nullability guard.

**Fix:** Remove `detail` from the dependency array and use a ref or functional check instead:
```typescript
const settle = useCallback(
  async (participantUserId: string) => {
    if (!userId || !expenseId) return;
    // Use functional state update — no need to close over detail
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: prev.participants.map((p) =>
          p.userId === participantUserId ? { ...p, settleLoading: true } : p
        ),
      };
    });
    // ... rest of settle logic unchanged
  },
  [userId, expenseId, refetch]  // remove `detail`
);
```

---

### WR-04: `getDefaultTitle` returns wrong value — `'Tonight'` when hour >= 18

**File:** `src/screens/plans/PlanCreateModal.tsx:31-34`

**Issue:** The function is documented as "returns 'Tonight' before 6pm, 'Tomorrow' after", but the implementation returns `'Tonight'` when `hour < 18` (before 6 PM) and `'Tomorrow'` when `hour >= 18` (at or after 6 PM). The logic is inverted: if it is currently evening (≥18:00) a plan is typically for tonight, not tomorrow.

```typescript
function getDefaultTitle(): string {
  const hour = new Date().getHours();
  return hour < 18 ? 'Tonight' : 'Tomorrow';
  //     ^^^^^^^^^ returns 'Tonight' for 00:00–17:59, 'Tomorrow' for 18:00–23:59
}
```

Based on the comment intent ("Tonight" vs "Tomorrow"), evenings (18:00+) should map to `'Tonight'` and earlier hours to `'Tomorrow'`. If the intended behaviour is the opposite (an event planned during the day defaults to tonight, one planned at night defaults to tomorrow), the comment needs updating. Either way the code and comment are inconsistent.

**Fix (matching evening = tonight):**
```typescript
function getDefaultTitle(): string {
  const hour = new Date().getHours();
  return hour >= 18 ? 'Tonight' : 'Tomorrow';
}
```

---

## Info

### IN-01: `theme.js` mock — `ANIMATION.easing` functions are plain identity returns, not lazy factories

**File:** `src/__mocks__/theme.js:28-33`

**Issue:** The real `ANIMATION.easing.standard/decelerate/accelerate` are lazy factory functions (`() => (t) => t`) matching the real API. The mock returns them correctly as factories. However, `spring` is an object `{ damping: 15, stiffness: 120 }` in both mock and source — but the mock wraps it as `spring: { damping: 15, stiffness: 120 }` correctly. This is fine as-is; calling code spreads the object directly. No functional issue, but worth a comment that `spring` is data (not a function) to match the inline comment in `animation.ts`.

**Fix:** Add a comment for clarity:
```javascript
// Note: standard/decelerate/accelerate are lazy easing factories; spring is raw config data.
easing: {
  standard: () => (t) => t,
  decelerate: () => (t) => t,
  accelerate: () => (t) => t,
  spring: { damping: 15, stiffness: 120 },
},
```

---

### IN-02: `RSVPButtons.test.tsx` — `onRsvp` assertion does not `await` async handler

**File:** `src/components/plans/__tests__/RSVPButtons.test.tsx:46-50`

**Issue:** The test at line 46 uses `async` but only calls `fireEvent.press` and then immediately asserts `toHaveBeenCalledWith`. The `handlePress` function in `RSVPButtons` calls `await onRsvp(value)`, so the mock is called synchronously before the await, which is why the assertion passes. However, the `savingRsvp` state transition that occurs after the `await` is not tested (no assertion that it resets to `null`). The test also passes without needing `async` — the `async` keyword is unused dead weight.

**Fix:** Either remove `async` from the test, or add a `waitFor` assertion to verify `savingRsvp` resets:
```typescript
it('calls onRsvp with "going" when Going is pressed', () => {
  const { getByText, onRsvp } = renderRSVP();
  fireEvent.press(getByText('Going'));
  expect(onRsvp).toHaveBeenCalledWith('going');
});
```

---

### IN-03: `squad.tsx` — `AnimatedCard` component defined inside render function

**File:** `src/app/(tabs)/squad.tsx:186-199`

**Issue:** `AnimatedCard` is declared as a function inside `SquadScreen` (line 186). React creates a new function reference on every render, which means reconciliation sees a new component type each render cycle. This forces the child subtree to unmount and remount rather than update — especially visible if `SquadScreen` re-renders frequently (e.g. during scroll). This also prevents React DevTools from showing a stable component name.

**Fix:** Move `AnimatedCard` outside `SquadScreen`:
```typescript
function AnimatedCard({ anim, children }: { anim: Animated.Value; children: React.ReactNode }) {
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function SquadScreen() { ... }
```

---

### IN-04: `animation.ts` — potential `NaN` in `getTForX` when denominator is zero

**File:** `src/theme/animation.ts:47`

**Issue:** The expression `(sampleValues[currentSample + 1] ?? 0) - (sampleValues[currentSample] ?? 0)` is used as a divisor. When two adjacent sample values are equal (a flat portion of the bezier curve), this evaluates to `0`, and `dist` becomes `Infinity` or `NaN`. The guard fallback (`?? 0`) was intended to handle out-of-bounds access, but it does not guard against the case where both values are legitimately equal. In practice this only occurs for degenerate bezier inputs (e.g., `bezier(0,0,0,0)`), but the code should be defensive.

**Fix:**
```typescript
const denominator = (sampleValues[currentSample + 1] ?? 0) - (sampleValues[currentSample] ?? 0);
const dist = denominator !== 0
  ? (aX - (sampleValues[currentSample] ?? 0)) / denominator
  : 0;
```

---

### IN-05: `PlansListScreen.tsx` — `error` check in `ListEmptyComponent` is always falsy at that point

**File:** `src/screens/plans/PlansListScreen.tsx:408-418`

**Issue:** The outer render (lines 314–323) returns an `<ErrorDisplay>` component early when `error` is truthy. This means the `FlatList` is only rendered when `error` is falsy. The `ListEmptyComponent` at line 408 therefore contains a dead branch — `error` can never be truthy inside the `FlatList` render path. The fallback `"Couldn't load plans."` error text is unreachable.

**Fix:** Remove the dead error branch from `ListEmptyComponent`:
```typescript
ListEmptyComponent={
  <EmptyState
    icon="calendar-outline"
    iconType="ionicons"
    heading="No plans yet"
    body="Tap the + button to create a quick plan and invite your free friends."
  />
}
```

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
