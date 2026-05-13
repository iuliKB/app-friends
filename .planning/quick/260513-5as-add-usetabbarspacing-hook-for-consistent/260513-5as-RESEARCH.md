# Quick Task 260513-5as: Add `useTabBarSpacing` hook for consistent bottom-nav clearance — Research

**Researched:** 2026-05-13
**Domain:** React Native (Expo SDK 55), Zustand selector, safe-area insets, tab-screen list/scroll containers
**Confidence:** HIGH (all findings VERIFIED in-repo)

## Summary

CONTEXT.md fully specifies the hook formula and target callsites. This research only surfaces implementation-level details the planner needs: project conventions for hook files, the exact Zustand selector idiom (matches CONTEXT.md spec — verified), the test infrastructure (Jest + RTNU + project-specific mock idiom), and an exhaustive map of every scroll container that needs the hook (one missed surface — the Memories tab inside squad).

**Primary recommendation:** Follow `usePendingRequestsCount.ts` shape — single named export, no JSDoc decoration. Use `useNavigationStore((s) => s.currentSurface)` as confirmed in CONTEXT.md (this is the exact idiom CustomTabBar and ChatRoomScreen already use). Mock `react-native-safe-area-context` per-test the same way `CustomTabBar.test.tsx` does. There are **4 squad scroll containers** (not 3), one **MemoriesTabContent** under-padding outside `(tabs)/squad.tsx` itself.

---

## Hook implementation notes

### File location & naming
- Path: `src/hooks/useTabBarSpacing.ts` (matches CONTEXT.md).
- Verified neighbors: `src/hooks/usePendingRequestsCount.ts`, `src/hooks/useInvitationCount.ts`, `src/hooks/useNetworkStatus.ts` — all single-file, camelCase filename matching the export.

### Export style
- **Single named export** (no `default`). Every existing hook in `src/hooks/` uses `export function useXxx(...)` — no default exports anywhere. Confirmed by grep across the directory.
- **No JSDoc block above the function.** `usePendingRequestsCount.ts` has zero comments. A brief 1–2 line header comment (like `useNavigationStore.ts` has) is acceptable and matches the more recent Phase 30 style.

### Return type
- CONTEXT.md locks this: return a single `number`.
- Project precedent: trivially-shaped hooks return primitives directly (`useNetworkStatus` returns `{ isConnected }` only because it has structural intent; for a pure-number derivation, returning `number` is idiomatic).
- Annotate the return type explicitly for strict-TS clarity: `export function useTabBarSpacing(): number { ... }`. Matches the explicit-return-type style of `usePendingRequestsCount` (which annotates `: { count: number; refetch: () => void }`).

### Zustand selector pattern (CONFIRMED IDIOMATIC)
The selector form in CONTEXT.md (`useNavigationStore((s) => s.currentSurface)`) is **already in use at two sites** in the codebase — this is the project pattern, no deviation:
- `src/components/common/CustomTabBar.tsx:124` — `const surface = useNavigationStore((s) => s.currentSurface);`
- `src/screens/chat/ChatRoomScreen.tsx:124` — `const setSurface = useNavigationStore((s) => s.setSurface);`

No `shallow` equality fn is used or needed — both callsites read a single primitive/function reference. Zustand v5 (`"zustand": "^5.0.12"` per package.json) returns referentially stable selector outputs for primitives by default.

### Constants import path
- Tsconfig: `"@/*": ["./src/*"]` (verified `tsconfig.json:6-8`). Path alias confirmed.
- Babel: not inspected, but the alias works repo-wide (every hook above uses `@/lib/supabase`, `@/stores/useAuthStore`, etc.). No relative imports.
- Hook MUST import as: `import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP } from '@/components/common/CustomTabBar';` — these are already exported (`CustomTabBar.tsx:9-10`).
- And: `import { useNavigationStore } from '@/stores/useNavigationStore';`
- And: `import { useSafeAreaInsets } from 'react-native-safe-area-context';`

### `NavigationSurface` type
- Defined at `src/stores/useNavigationStore.ts:19` as `'tabs' | 'chat' | 'plan' | 'modal' | 'auth'` — exported. The hook does not need to import the type; comparing `surface !== 'tabs'` against the inferred selector return is sufficient and matches CustomTabBar's pattern (line 125).

---

## Per-screen application notes

### Home — `src/screens/home/HomeScreen.tsx:203`
- Current: `contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}`
- After: replace the inline `paddingBottom: insets.bottom + 100` with `paddingBottom: bottomSpacing` (where `bottomSpacing = useTabBarSpacing()`). Drop the local `insets.bottom + 100` literal.
- **Zero pixel change** when surface === 'tabs' (formula: `insets.bottom + 64 + 12 + 24 = insets.bottom + 100`).
- `useSafeAreaInsets()` is already called at line ~158 for `paddingTop: insets.top` (line 185) — keep it; the hook calls its own copy but RN-safe-area-context caches per-Provider, so two calls in the same tree is free.

### Squad — `src/app/(tabs)/squad.tsx` (FOUR scroll containers, not three)
The squad screen is an `Animated.ScrollView horizontal pagingEnabled` (line 385) with three pages. Each page has its own scroll container:

| Page | Component | Container | Current padding | Line(s) |
|------|-----------|-----------|-----------------|---------|
| 0 — Friends | `SectionList` (inline) | `contentContainerStyle={styles.listContent}` | `flexGrow: 1` only — **no bottomPadding at all** | 454 / styles 272-274 |
| 1 — Memories | `<MemoriesTabContent />` (separate file) | Inner `SectionList contentContainerStyle` | `paddingBottom: insets.bottom + SPACING.lg` (too small) | **`src/components/squad/MemoriesTabContent.tsx:286-289`** |
| 2 — Activity | `ScrollView` (inline) | `contentContainerStyle={[styles.activityContent, { paddingBottom: insets.bottom + SPACING.xxl }]}` | `insets.bottom + 32` (too small) | 473-476 |

**All three pages need the hook applied.** CONTEXT.md mentions only the Activity tab; the planner should explicitly include:
1. The **Friends tab SectionList** at line 454 — add `paddingBottom: bottomSpacing` (currently it relies on `flexGrow: 1` only, so the last friend row hides under the bar).
2. The **Activity tab ScrollView** at line 473-476 — replace `insets.bottom + SPACING.xxl` with `bottomSpacing`.
3. The **MemoriesTabContent SectionList** at `src/components/squad/MemoriesTabContent.tsx:286-289` — replace `insets.bottom + SPACING.lg` with `bottomSpacing`. This is a separate file, easy to miss.

Note: `squad.tsx` already calls `useSafeAreaInsets()` at the top of the component; the hook works alongside that call.

### Plans — actually `src/screens/plans/PlansListScreen.tsx`
- `src/app/(tabs)/plans.tsx` is a 5-line shim that just renders `<PlansListScreen />` — CONTEXT.md's reference to "`plans.tsx:82`" actually means **`PlansListScreen.tsx:82`** where the offending `paddingBottom: 100` (with an eslint-disable above it) lives.
- The `listContent` style is consumed at `PlansListScreen.tsx:437` as `contentContainerStyle={styles.listContent}`.
- **Recommended pattern:** drop the `paddingBottom` line from `listContent` styles (and delete the `eslint-disable-next-line campfire/no-hardcoded-styles` comment above it). At the JSX site (line 437), use array-style: `contentContainerStyle={[styles.listContent, { paddingBottom: bottomSpacing }]}`. Matches the HomeScreen pattern.
- `ListFooterComponent` spacer is **NOT** the right place — `contentContainerStyle` is correct, matches every other FlatList in the repo.

### Profile — `src/app/(tabs)/profile.tsx:455`
- Current: `contentContainerStyle={[styles.scrollContent, { paddingTop: SPACING.lg }]}` — has zero bottom padding (CONTEXT.md correct).
- After: `contentContainerStyle={[styles.scrollContent, { paddingTop: SPACING.lg, paddingBottom: bottomSpacing }]}`.
- Scroll container is the top-level `<ScrollView style={{ flex: 1 }}>` at line 453-457. There is no nested list — single application point.
- Header/QR button at line 459-470 stays unaffected (it's content, not chrome).

---

## Testing notes

### Infrastructure: PRESENT and well-developed
- `jest.config.js` exists with babel-jest, full RN mock (`src/__mocks__/react-native.js`), theme mock, async-storage mock, reanimated mock, expo-haptics mock.
- `@testing-library/react-native` is in use — verified at `src/hooks/__tests__/useViewPreference.test.ts:10` (`import { renderHook, act } from '@testing-library/react-native'`).
- Existing hook tests live at `src/hooks/__tests__/` — 5 files: `useChatTodos`, `useHabits`, `useSpotlight`, `useTodos`, `useViewPreference`.

### Recommended test file: `src/hooks/__tests__/useTabBarSpacing.test.ts`

### Pattern to follow (compose two existing patterns)
Use `renderHook` from `useViewPreference.test.ts` for the call shape, and the `jest.mock('react-native-safe-area-context', ...)` block from `CustomTabBar.test.tsx:27-29`:

```ts
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));
```

For Zustand surface manipulation, the existing `CustomTabBar.test.tsx` precedent (line 60) shows the idiom — drive the real store via `useNavigationStore.getState().setSurface('chat')` between assertions. No mock of `useNavigationStore` itself.

### Minimum test coverage (per CONTEXT.md "at minimum a unit test that asserts the formula for both surface states")
1. `surface === 'tabs'` → returns `insets.bottom + 100` (i.e. `34 + 100 = 134` with a typical iPhone X bottom inset).
2. `surface === 'chat'` (or any non-`tabs`) → returns `insets.bottom` only (i.e. `34`).
3. Optionally: assert hook re-renders when `setSurface` flips (rerender via `useNavigationStore.getState().setSurface(...)` between `act`s).

### Test command (matches project convention)
`npx jest --testPathPatterns="useTabBarSpacing" --no-coverage` (mirrors the comment header in `useViewPreference.test.ts:6`).

---

## Pitfalls & gotchas

### 1. Don't pull `setSurface` AND `currentSurface` in the same selector
Already documented as a project-wide decision (STATE.md Phase 30 Plan 04 note) — the hook selector returns only `currentSurface`. **Following this rule by spec.** No action needed; just don't deviate.

### 2. No `useMemo` needed — primitive return
A `number` is referentially compared by value, so consumers that pass it into `contentContainerStyle={[styles.x, { paddingBottom: n }]}` create a new style object each render anyway. Memoizing the primitive would not stabilize the downstream array. Skip it (CONTEXT.md already locks this).

### 3. Surface flip during navigation transition (cosmetic)
When pushing into `/chat/room`, ChatRoomScreen's `useFocusEffect` sets surface to `'chat'` on focus. Any tab screen still mounted (Expo Router keeps tabs alive) will re-render with `bottomSpacing = insets.bottom` while the push animation is mid-flight. Visually this means the bottom of the previous-tab content briefly extends an extra ~100px into the safe area as the chat screen slides up. It's invisible to the user because the chat screen is covering it during the slide — **no fix needed**, but worth noting if QA reports "the previous screen flashes longer at the bottom."

### 4. `RefreshControl` + reduced `paddingBottom` interaction
None expected. `RefreshControl` is anchored at the **top** of the scroll content (`refreshing` triggers from the top edge); changing `paddingBottom` doesn't affect it. Verified by reading HomeScreen's existing use (`HomeScreen.tsx:204-210`), Squad's friends/activity refresh controls, and PlansListScreen's pull-to-refresh.

### 5. `KeyboardAvoidingView` interactions
None of the four target screens use `KeyboardAvoidingView` at the top level — Profile, Squad, Plans, Home all use plain `View` containers. The hook can be applied without keyboard considerations.

### 6. `flexGrow: 1` on Friends tab's `listContent`
The Friends-tab SectionList currently has `listContent: { flexGrow: 1 }` (squad.tsx:272-274). When adding `paddingBottom`, **keep `flexGrow: 1`** in the style block (or pass it via the array form) so `ListEmptyComponent` still vertically centers when the list is empty. Drop only the padding-related concerns.

### 7. PlansListScreen lint comment
`PlansListScreen.tsx:81` has `// eslint-disable-next-line campfire/no-hardcoded-styles` above `paddingBottom: 100`. When that line is removed (because padding moves to the hook), delete the eslint-disable comment too — otherwise it dangles and lint will flag it on the next change.

### 8. Memories tab file is outside `(tabs)/squad.tsx`
Don't grep only inside `(tabs)/` for callsites — `MemoriesTabContent.tsx` lives at `src/components/squad/MemoriesTabContent.tsx` and has its own `useSafeAreaInsets()` call. Easy to miss; the planner should make this an explicit task line.

### 9. PlansListScreen `modalList` style (line 142-145) is for the invite-modal `FlatList`, NOT the main feed
Don't apply the hook there — the modal is full-screen presentation and lives above the tab bar in the stack. Leave `modalList`'s `paddingBottom: SPACING.xxl` alone.

---

## Sources

### Primary (HIGH confidence — all VERIFIED in-repo)
- `src/stores/useNavigationStore.ts` (full file) — store shape, NavigationSurface union
- `src/components/common/CustomTabBar.tsx:9-10, 124` — exported constants + canonical selector idiom
- `src/components/common/__tests__/CustomTabBar.test.tsx:27-29, 60` — RN-safe-area-context test mock + Zustand store driving idiom
- `src/hooks/usePendingRequestsCount.ts` — hook filename/export convention
- `src/hooks/useInvitationCount.ts` — secondary hook convention reference
- `src/hooks/__tests__/useViewPreference.test.ts` — `renderHook`/`act` test idiom
- `src/screens/home/HomeScreen.tsx:201-211` — current padding target (visual baseline)
- `src/screens/plans/PlansListScreen.tsx:79-83, 437` — actual location of `paddingBottom: 100` (NOT `(tabs)/plans.tsx`)
- `src/app/(tabs)/squad.tsx:272-274, 329-333, 384-495` — pager + per-page scroll containers
- `src/app/(tabs)/profile.tsx:451-457` — scroll container site
- `src/components/squad/MemoriesTabContent.tsx:286-289` — fourth scroll container (CONTEXT.md missed)
- `tsconfig.json:6-8` — `@/` path alias verified
- `package.json` — `"zustand": "^5.0.12"` verified (selector idiom matches v5 default behavior)

---

## Metadata

**Confidence breakdown:**
- Hook implementation conventions: HIGH — every claim verified against two or more existing hook files
- Zustand selector idiom: HIGH — identical to two production callsites + an existing passing test
- Test infrastructure: HIGH — jest.config.js inspected, test files read, mock files enumerated
- Per-screen callsites: HIGH — every line number and file path opened and read
- Pitfalls: HIGH for items 1–3 and 6–9 (verified in-repo); MEDIUM for items 4–5 (negative claims based on absence of keyboard/refresh-pull interactions)

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable codebase — Phase 30 just landed, Phase 31 not yet started)
