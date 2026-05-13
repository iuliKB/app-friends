---
phase: 33-friend-profile-redesign
plan: "04"
subsystem: ui-components
tags: [ui, components, grouped-inset, info-row, bio, friend-profile, phase-33]
dependency_graph:
  requires: []
  provides:
    - src/components/friends/friendIconPalette.ts
    - src/components/friends/GroupedInsetSection.tsx
    - src/components/friends/ProfileInfoRow.tsx
    - src/components/friends/BioRow.tsx
  affects:
    - src/app/friends/[id].tsx (Plan 06 consumer)
tech_stack:
  added: []
  patterns:
    - Messenger-style 8-tone leading-icon palette with light/dark switching via accent token detection
    - Telegram-style grouped-inset section wrapper with React.Children.toArray isLast injection
    - Pressable row with surface.overlay flash on press
    - LayoutAnimation.configureNext BEFORE setState (Pitfall 9 convention)
key_files:
  created:
    - src/components/friends/friendIconPalette.ts
    - src/components/friends/GroupedInsetSection.tsx
    - src/components/friends/ProfileInfoRow.tsx
    - src/components/friends/BioRow.tsx
  modified: []
decisions:
  - "getIconPalette detects light vs dark via colors.interactive.accent token value (#B9FF3B = dark, #4D7C00 = light) — avoids requiring a separate mode argument"
  - "GroupedInsetSection uses React.Children.toArray + map to inject isLast onto final child; both ProfileInfoRow and BioRow accept this prop to suppress their bottom hairline"
  - "BioRow has lineHeight: 24 with eslint-disable comment — not a theme token; UI-SPEC §Typography specifies 24px line height for bio paragraph explicitly"
  - "LayoutAnimation.configureNext is called BEFORE setExpanded in BioRow.handleToggle — required by Pitfall 9 (configureNext configures the NEXT render, must precede setState)"
metrics:
  duration_seconds: 212
  completed_date: "2026-05-13"
  tasks_completed: 4
  files_created: 4
  files_modified: 0
---

# Phase 33 Plan 04: Row + Section Primitives Summary

Four primitives locking the visual contract for the redesigned friend profile grouped-inset layer: the 8-tone leading-icon palette, the section wrapper, the standard info row, and the bio-specific expanding row.

## One-Liner

Grouped-inset row + section primitives with Messenger-style 8-tone leading-icon palette, LayoutAnimation expand/collapse for bio, and hairline auto-suppression via React.Children isLast injection.

## Component APIs

### `ProfileInfoRowProps` (Plan 06 consumes this)

```typescript
interface ProfileInfoRowProps {
  iconTint: IconTint; // 'bio' | 'friendsSince' | 'birthday' | 'timezone' | 'mutualPlans' | 'mutualFriends' | 'sharedPhotos' | 'iou'
  label: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  isLast?: boolean; // injected by GroupedInsetSection; suppresses bottom hairline
}
```

### `BioRowProps` (Plan 06 consumes this)

```typescript
interface BioRowProps {
  bio: string; // non-empty; parent gates null bio — don't render BioRow at all
  isLast?: boolean; // injected by GroupedInsetSection
}
```

### `GroupedInsetSectionProps`

```typescript
interface GroupedInsetSectionProps {
  title: string;
  children: React.ReactNode;
  style?: { marginTop?: number }; // optional outer margin override
}
```

## isLast Contract

`GroupedInsetSection` uses `React.Children.toArray` + `map` to clone the final child with `isLast={true}`. Both `ProfileInfoRow` and `BioRow` accept this optional prop — when `true`, the bottom hairline `View` is not rendered. This is the canonical separator suppression contract for Plan 06 to rely on.

## Ionicon Names Wired Through `friendIconPalette`

Plan 06 does NOT need to import Ionicons names for these rows directly — `getIconPalette(tint, colors)` returns the `ionicon` key alongside `bg` and `glyph`.

| Tint | Ionicon |
|------|---------|
| `bio` | `chatbubble-ellipses-outline` |
| `friendsSince` | `people-outline` |
| `birthday` | `gift-outline` |
| `timezone` | `globe-outline` |
| `mutualPlans` | `calendar-outline` |
| `mutualFriends` | `people-circle-outline` |
| `sharedPhotos` | `images-outline` |
| `iou` | `wallet-outline` |

## ESLint Disable Comments

Two `// eslint-disable-next-line campfire/no-hardcoded-styles` comments were added:

1. **`GroupedInsetSection.tsx` — `textTransform: 'uppercase'`**: The `textTransform` CSS property is not a design token; this is the only way to render small-caps titles. Precedent at `ChatListScreen.tsx:211`.
2. **`GroupedInsetSection.tsx` — `letterSpacing: 0.5`**: UI-SPEC §Typography line 117 mandates this exact value; no token equivalent exists. Precedent at `ChatListScreen.tsx:213`.
3. **`BioRow.tsx` — `lineHeight: 24`**: UI-SPEC §Typography specifies 24px line height for bio paragraph; no line-height token exists in the theme.

## No Existing Component Modified

The four new files are additions only. The following pre-existing `src/components/friends/` files were NOT touched:
- `FriendActionSheet.tsx`
- `FriendCard.tsx`
- `FriendProfileBlurredWash.tsx` (Plan 03)
- `FriendProfileHeader.tsx` (Plan 03)
- `QRCodeDisplay.tsx`
- `QRScanView.tsx`
- `RequestCard.tsx`
- `SearchResultCard.tsx`
- `StatusPill.tsx`

## Deviations from Plan

None — plan executed exactly as written. All 8 tints encoded with UI-SPEC-locked rgba values. All acceptance criteria verified (grep counts + tsc + jest 275/275).

## Known Stubs

None — these are pure presentational primitives with no data fetching. All palette values are hardcoded per UI-SPEC. No stubs or placeholders.

## Self-Check: PASSED

- `src/components/friends/friendIconPalette.ts` — FOUND
- `src/components/friends/GroupedInsetSection.tsx` — FOUND
- `src/components/friends/ProfileInfoRow.tsx` — FOUND
- `src/components/friends/BioRow.tsx` — FOUND
- Commits: 2b7a9d5, f891df5, 5c203d2, 03cb42c — all verified in git log
- tsc: zero errors in the 4 new files
- Jest: 275/275 tests passing
