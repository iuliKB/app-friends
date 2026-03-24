# Phase 4: Plans - Research

**Researched:** 2026-03-18
**Domain:** React Native plans CRUD, Expo Router modal routing, Supabase plans/plan_members, tab badge, URL detection
**Confidence:** HIGH

## Summary

Phase 4 builds the plans feature on top of a well-established foundation (Phases 1–3). The `plans` and `plan_members` tables with their RLS policies are already deployed. The main engineering work is UI: a full-screen modal for Quick Plan creation, a Plans list screen replacing the stub, a Plan Dashboard screen with sections, RSVP interaction, two text area fields (Link Dump and IOU Notes), and a tab badge for invitations.

All patterns needed already exist in the codebase: Zustand store pattern from `useHomeStore`, server-confirmation mutations from Phase 2, `useFocusEffect` polling for badge counts from `usePendingRequestsCount`, FlatList for all lists, and FAB from `HomeScreen`. The plan is additive — no existing files need architectural rewrites, only targeted edits.

The one genuinely new technique is presenting the Quick Plan creation modal from multiple entry points (Home screen FAB and Plans list FAB). Expo Router supports `router.push` to a modal route defined as `presentation: 'modal'` in a Stack.Screen. This is the standard pattern for this codebase.

**Primary recommendation:** Implement as three Expo Router files (plans list tab replaces stub, plan dashboard as a new stack route under `(tabs)/plans/`, and Quick Plan creation modal as a root-level route), backed by a `usePlansStore` Zustand store and a `usePlans` hook following the exact patterns of `useHomeStore` / `useHomeScreen`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Quick Plan Creation Flow**
- Full-screen modal — slides up from bottom, all fields visible at once
- Title: smart pre-fill — "Tonight" if before 6pm, "Tomorrow" if after 6pm. User can change it.
- Time: native date/time picker only (no chips). Default to next round hour (e.g., 3:37 PM → 4:00 PM)
- Location: free text field — "My place", "The park", "TBD". No location APIs.
- Friend selector: checklist with free friends pre-checked — FlatList of all friends with checkboxes, avatar + name + status pill. Friends with status "free" are pre-checked.
- Creator auto-added as plan member with RSVP "going"
- After creation: navigate to the new plan's dashboard
- Home screen FAB updated: "Start Plan" FAB opens Quick Plan creation modal directly (not Plans tab navigation)
- Plans list FAB: same orange FAB pattern as Home screen, opens Quick Plan modal

**Plan Dashboard Layout**
- Sections with headers — 4 sections: "Details", "Who's Going", "Links", "IOU Notes"
- Edit button/mode: "Edit" button switches dashboard to edit mode where title/time/location fields become editable. Any member can edit (matches Phase 1 RLS decision: plans UPDATE open to any plan member)
- "Open Chat" button: prominent full-width button at the bottom of the dashboard. Navigates to Chat tab (stub) — functional chat comes in Phase 5
- Navigation header: plan title as header + back arrow (standard Expo Router stack)
- Delete plan: creator can delete from dashboard, confirmation alert "Delete this plan? This can't be undone." CASCADE deletes plan_members.

**RSVP Interaction**
- 3 separate buttons in a row: Going / Maybe / Out
- Colors: reuse status colors — Going = green (#22c55e), Maybe = yellow (#eab308), Out = red (#ef4444)
- Server confirmation (not optimistic) — wait for Supabase response, brief loading state on button
- Member list grouped by RSVP: "Going (3)", "Maybe (1)", "Invited (2)", "Not Going (1)" sections
- "Not Going" members shown at bottom, dimmed but visible
- Creator badge: small "Creator" label next to creator's name in member list

**Plans List Screen**
- Card per plan: title, time (smart label + relative), location, RSVP summary ("3 going, 1 maybe"), stacked avatar row (overlapping circles, max 5 + "+N")
- Sorted by scheduled time (ascending — nearest plan first)
- Only active/upcoming plans — plans with `scheduled_for` in the past are hidden
- Empty state: minimal — "No active plans" text only
- FAB: orange "+" button, same pattern as Home screen, opens Quick Plan modal
- Plans tab badge: shows count of new invitations (plans where user's RSVP is "invited")

**Time Display**
- Plan cards: relative + absolute — "In 2 hours • 7:00 PM"
- Smart date labels: "Today 7 PM", "Tomorrow 2 PM", "Sat, Mar 21" for further dates
- Dashboard: full date/time display

**Link Dump Behavior**
- Auto-detect URLs and make tappable — parse URLs in text and render as tappable links
- Plain text input (TextInput multiline), save on blur, last-write-wins per PROJECT.md constraint
- Expandable section — collapsed by default, tap header to expand

**Loading & Error States**
- Standard pattern: ActivityIndicator for loading, error text with retry button for errors
- Same patterns as Phase 2/3 — no skeleton screens in V1

**Invite Flow**
- Selected friends inserted as plan_members with RSVP "invited"
- Plans tab badge shows count of new invitations — friends see it on next app open
- No push notification in Phase 4 (comes in Phase 6)

### Claude's Discretion
- Exact modal animation and presentation style
- Edit mode toggle UI (button placement, save/cancel flow)
- Expandable section animation
- Avatar stack overlap amount and "+N" badge styling
- Exact card spacing and typography
- URL detection regex/library choice
- Plan creation form validation (empty title handling, past time prevention)
- Delete button placement within dashboard

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-01 | User can create a Quick Plan with title (pre-filled "Tonight"), time picker, location, and friend selector | Modal routing pattern, DateTimePicker native component, useFriends hook for friend list |
| PLAN-02 | Friend selector pre-checks friends with status "free" | useFriends.fetchFriends() returns FriendWithStatus with status field; filter for status === 'free' to pre-check |
| PLAN-03 | User can view list of active plans sorted by scheduled time | Supabase query on plans+plan_members, filter scheduled_for > now(), order ascending |
| PLAN-04 | Plan dashboard shows event details (title, time, location) editable by creator | Edit mode toggle pattern, Supabase UPDATE on plans table, RLS allows any member to update |
| PLAN-05 | User can RSVP to a plan: Going, Maybe, or Out | Supabase UPDATE on plan_members WHERE plan_id=X AND user_id=auth.uid(), server-confirmation pattern |
| PLAN-06 | Plan dashboard shows member list with RSVP status indicators | Query plan_members + profiles join, group by rsvp field, reuse AvatarCircle + StatusPill pattern |
| PLAN-07 | Plan dashboard has a Link Dump text field (saves on blur, last-write-wins) | TextInput multiline onBlur → Supabase UPDATE plans SET link_dump=X, URL parsing for tappable links |
| PLAN-08 | Plan dashboard has IOU Notes text field (saves on blur, last-write-wins) | Same pattern as Link Dump — TextInput multiline onBlur → Supabase UPDATE plans SET iou_notes=X |
| PLAN-09 | Plan dashboard has "Open Chat" button linking to plan's chat room | router.push to chat tab with plan_id param; chat is a stub in Phase 4, functional in Phase 5 |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~55.0.5 (installed) | File-based routing, modal presentation, stack navigation | Project constraint; already drives all navigation |
| @supabase/supabase-js | ^2.99.2 (installed) | plans + plan_members CRUD, RLS enforcement | Project constraint; all data access |
| zustand | ^5.0.12 (installed) | Plans list cache (usePlansStore) | Project constraint; existing store pattern |
| react-native (core) | 0.83.2 (installed) | TextInput, FlatList, Modal, TouchableOpacity, StyleSheet | Project constraint; no UI libraries |
| @expo/vector-icons / Ionicons | bundled with expo | Icons (calendar, add, chevron, trash) | Already used across all screens |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-safe-area-context | ~5.6.2 (installed) | Bottom inset for FAB positioning | Same as Home screen FAB pattern |
| expo-haptics | ~55.0.9 (installed) | Optional tactile feedback on RSVP buttons | Claude's discretion — nice-to-have |
| DateTimePickerAndroid / @react-native-community/datetimepicker | Need to verify below | Native date/time picker | Required for time selection in Quick Plan modal |

**DateTimePicker note (MEDIUM confidence):** The locked decision calls for a native date/time picker. React Native's built-in `DatePickerIOS` is deprecated. The standard Expo-compatible solution is `@react-native-community/datetimepicker` which ships as `expo-datetime-picker` in newer Expo SDK versions. However, this package requires checking Expo SDK 55 compatibility. An alternative available without extra install is using the `Platform.OS` approach with `DatePickerAndroid` / `DatePickerIOS` — but those are deprecated. The safest approach for Expo Go managed workflow is `@react-native-community/datetimepicker` which is included in Expo's managed dependencies.

**Verify before planning:**
```bash
# Check if already bundled or needs install
npm view @react-native-community/datetimepicker version
# Check expo SDK 55 bundled packages
npx expo install --check @react-native-community/datetimepicker
```

If `@react-native-community/datetimepicker` requires native build, the fallback is a custom modal with TextInput accepting time string — but this defeats the "native picker" requirement. The component `DateTimePicker` from `@react-native-community/datetimepicker` is in Expo's managed dependency list and should not require prebuild.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native DateTimePicker | Custom time chips | Chips are faster to tap but locked decision explicitly rejects them |
| URL regex (hand-rolled) | linkifyjs or similar | linkifyjs is 12KB, reliable; simple regex covers 95% of cases with less overhead; Claude's discretion |
| Supabase query with join | Two separate queries + client join | Server-side join is more efficient; single round-trip |

**Installation (if DateTimePicker not bundled):**
```bash
npx expo install @react-native-community/datetimepicker
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (tabs)/
│   │   └── plans.tsx              # Plans list tab (replace stub)
│   ├── plans/
│   │   ├── _layout.tsx            # Stack layout for plan routes
│   │   └── [id].tsx               # Plan dashboard screen
│   └── plan-create.tsx            # Quick Plan creation modal (root-level)
├── screens/
│   └── plans/
│       ├── PlansListScreen.tsx    # Plans list UI
│       ├── PlanDashboardScreen.tsx # Plan dashboard UI
│       └── PlanCreateModal.tsx    # Quick Plan creation form
├── hooks/
│   ├── usePlans.ts                # Fetch plans list, manage subscription lifecycle
│   └── usePlanDetail.ts           # Fetch single plan + members
├── stores/
│   └── usePlansStore.ts           # Zustand cache for plans list
├── components/
│   └── plans/
│       ├── PlanCard.tsx           # Card for plans list
│       ├── AvatarStack.tsx        # Stacked overlapping avatar row
│       ├── RSVPButtons.tsx        # Going/Maybe/Out 3-button row
│       ├── MemberList.tsx         # Grouped member list by RSVP
│       ├── LinkDumpField.tsx      # Multiline TextInput + URL tappable render
│       └── IOUNotesField.tsx      # Multiline TextInput, save on blur
└── types/
    └── plans.ts                   # Plan, PlanMember, PlanWithMembers types
```

### Pattern 1: Quick Plan Modal Entry Points

The modal must be reachable from two tabs (Home and Plans). In Expo Router, a root-level screen with `presentation: 'modal'` is the correct pattern — it can be pushed from any tab without resetting tab state.

**Route file:** `src/app/plan-create.tsx`

Register in root `_layout.tsx` inside the authenticated `Stack.Protected` block:
```typescript
// In src/app/_layout.tsx — add to the Stack.Protected (authenticated) block
<Stack.Screen
  name="plan-create"
  options={{ presentation: 'modal', headerShown: false }}
/>
```

**Navigation from any screen:**
```typescript
import { useRouter } from 'expo-router';
const router = useRouter();
// From Home FAB or Plans FAB:
router.push('/plan-create');
```

**Home screen FAB update** — change `onPress` from `router.push('/(tabs)/plans')` to `router.push('/plan-create')`.

### Pattern 2: Plan Dashboard as Nested Stack Route

Plan dashboard needs a back arrow and plan title in the header. Expo Router nested stack under `(tabs)/plans/` works with a `_layout.tsx`.

**Route:** `src/app/plans/[id].tsx`
**Layout:** `src/app/plans/_layout.tsx`

```typescript
// src/app/plans/_layout.tsx
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function PlansStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.dominant },
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
      }}
    />
  );
}
```

```typescript
// src/app/plans/[id].tsx
import { Stack, useLocalSearchParams } from 'expo-router';
import { PlanDashboardScreen } from '@/screens/plans/PlanDashboardScreen';

export default function PlanDashboardRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: '' }} />  {/* title set dynamically from plan data */}
      <PlanDashboardScreen planId={id} />
    </>
  );
}
```

**Navigate to dashboard after creation or from list card:**
```typescript
router.push(`/plans/${plan.id}`);
```

### Pattern 3: usePlansStore (Zustand cache — mirrors useHomeStore)

```typescript
// src/stores/usePlansStore.ts
import { create } from 'zustand';
import type { PlanWithMembers } from '@/types/plans';

interface PlansState {
  plans: PlanWithMembers[];
  lastFetchedAt: number | null;
  setPlans: (plans: PlanWithMembers[]) => void;
}

export const usePlansStore = create<PlansState>((set) => ({
  plans: [],
  lastFetchedAt: null,
  setPlans: (plans) => set({ plans, lastFetchedAt: Date.now() }),
}));
```

### Pattern 4: Supabase Plans Query

The plans table uses RLS `plans_select_member` — only plan members can read. The query must join plan_members and profiles.

```typescript
// Fetch active plans for current user (upcoming only)
const now = new Date().toISOString();
const { data, error } = await supabase
  .from('plan_members')
  .select(`
    rsvp,
    plans (
      id,
      title,
      scheduled_for,
      location,
      link_dump,
      iou_notes,
      created_by,
      created_at,
      plan_members (
        user_id,
        rsvp,
        profiles ( id, display_name, avatar_url )
      )
    )
  `)
  .eq('user_id', session.user.id)
  .filter('plans.scheduled_for', 'gte', now)
  .order('plans(scheduled_for)', { ascending: true });
```

**Note:** Supabase nested select with filters on nested tables may require adjustment. Alternative: two queries — one for plan IDs the user is a member of, then fetch plan details.

```typescript
// Safer two-query approach (avoids nested filter issues)
// Step 1: get plan IDs user is member of
const { data: memberRows } = await supabase
  .from('plan_members')
  .select('plan_id')
  .eq('user_id', session.user.id);

const planIds = memberRows?.map(r => r.plan_id) ?? [];

// Step 2: fetch plan details with scheduled_for >= now
const { data: plans } = await supabase
  .from('plans')
  .select('id, title, scheduled_for, location, created_by, created_at')
  .in('id', planIds)
  .gte('scheduled_for', new Date().toISOString())
  .order('scheduled_for', { ascending: true });

// Step 3: fetch all members for these plans
const { data: members } = await supabase
  .from('plan_members')
  .select('plan_id, user_id, rsvp, profiles ( id, display_name, avatar_url )')
  .in('plan_id', planIds);
```

### Pattern 5: Plan Creation Mutation

```typescript
// Create plan and insert members atomically (two inserts, creator first)
async function createPlan(input: {
  title: string;
  scheduledFor: Date;
  location: string;
  invitedFriendIds: string[];
}): Promise<{ planId: string | null; error: Error | null }> {
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      title: input.title,
      scheduled_for: input.scheduledFor.toISOString(),
      location: input.location || null,
      created_by: session.user.id,
    })
    .select('id')
    .single();

  if (planError || !plan) return { planId: null, error: planError };

  // Insert creator as "going" + invited friends
  const memberInserts = [
    { plan_id: plan.id, user_id: session.user.id, rsvp: 'going' },
    ...input.invitedFriendIds.map(friendId => ({
      plan_id: plan.id,
      user_id: friendId,
      rsvp: 'invited',
    })),
  ];

  const { error: membersError } = await supabase
    .from('plan_members')
    .insert(memberInserts);

  if (membersError) {
    // Plan created but members failed — surface error, plan exists in DB
    return { planId: plan.id, error: membersError };
  }

  return { planId: plan.id, error: null };
}
```

### Pattern 6: RSVP Update (server confirmation)

Follows Phase 2/3 server confirmation pattern exactly.

```typescript
// In RSVPButtons component
const [saving, setSaving] = useState(false);

async function handleRSVP(newRsvp: 'going' | 'maybe' | 'out') {
  setSaving(true);
  const { error } = await supabase
    .from('plan_members')
    .update({ rsvp: newRsvp })
    .eq('plan_id', planId)
    .eq('user_id', session.user.id);
  setSaving(false);
  if (error) {
    Alert.alert('Error', "Couldn't update RSVP. Try again.");
  } else {
    onRsvpChanged(newRsvp); // callback to update local state
  }
}
```

### Pattern 7: Link Dump / IOU Notes (save on blur)

```typescript
// In LinkDumpField component
const [localText, setLocalText] = useState(initialValue ?? '');
const [saving, setSaving] = useState(false);

async function handleBlur() {
  if (localText === initialValue) return; // no change, skip save
  setSaving(true);
  await supabase
    .from('plans')
    .update({ link_dump: localText })
    .eq('id', planId);
  setSaving(false);
  onSaved(localText);
}
```

### Pattern 8: Tab Badge for Invitations (mirrors usePendingRequestsCount)

```typescript
// src/hooks/useInvitationCount.ts
export function useInvitationCount(): { count: number } {
  const session = useAuthStore((s) => s.session);
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!session?.user) { setCount(0); return; }
    const { count: result } = await supabase
      .from('plan_members')
      .select('plan_id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('rsvp', 'invited');
    setCount(result ?? 0);
  }, [session]);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  return { count };
}
```

Then in `(tabs)/_layout.tsx`:
```typescript
const { count: invitationCount } = useInvitationCount();
// On the Plans tab:
tabBarBadge={invitationCount > 0 ? invitationCount : undefined}
```

### Pattern 9: Smart Time Label

```typescript
function formatPlanTime(scheduledFor: string): string {
  const date = new Date(scheduledFor);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return 'Past'; // should not appear (filtered out)
  if (diffHours < 1) return `In ${Math.round(diffMs / 60000)} min`;
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `In ${hours}h • ${timeStr}`;
  }

  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${timeStr}`;
}
```

### Pattern 10: Smart Title Pre-fill and Default Time

```typescript
function getDefaultTitle(): string {
  const hour = new Date().getHours();
  return hour < 18 ? 'Tonight' : 'Tomorrow';
}

function getNextRoundHour(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours());
  return next;
}
```

### Pattern 11: Delete Plan

```typescript
async function handleDelete() {
  Alert.alert(
    'Delete this plan?',
    "This can't be undone.",
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('plans')
            .delete()
            .eq('id', planId)
            .eq('created_by', session.user.id); // extra safety; RLS handles enforcement
          if (!error) router.back();
        },
      },
    ]
  );
}
```

**Note:** The RLS policy `plans_update_member` allows any member to update, but there is no DELETE policy for plans beyond the creator's implicit CASCADE. Verify the schema — there is `plans_insert_own` (created_by = auth.uid()) but no explicit DELETE policy. With no DELETE policy and RLS enabled, DELETE is blocked for all users. A `plans_delete_creator` policy is needed or the planner must add a migration. This is a gap.

### Anti-Patterns to Avoid

- **ScrollView + map for lists:** Use FlatList. Project constraint.
- **Optimistic RSVP updates:** Wait for server response per Phase 2/3 convention.
- **SELECT * queries:** Always specify columns. Free-tier budget concern.
- **Navigating to chat tab with router.push('/(tabs)/chat'):** Use `router.navigate` or `router.push` to the chat tab; confirm the exact path in Phase 5 context.
- **Nested DateTimePicker inside FlatList:** Keep picker state at modal root, not inside list items.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal slide-up from bottom | Custom Animated modal | Expo Router `presentation: 'modal'` | Built-in, handles keyboard avoidance, back gesture, status bar |
| Date/time picker | Custom time chips or text input | `@react-native-community/datetimepicker` | Platform-native UX, accessibility, complex edge cases (DST, locale) |
| Badge count on tab | Custom tab bar | Expo Router `tabBarBadge` prop | Already used for pending friend requests; exact same pattern |
| URL detection in text | Manual regex | Simple URL regex or `linkifyjs` | Regex approach is sufficient; hand-rolled regex misses edge cases like query strings with special chars |
| Plan member RLS enforcement | Client-side filtering | Supabase RLS policies (already written) | RLS is already deployed and correct; trust it |
| Avatar stack overlap | Custom layout engine | Absolute positioning with `marginLeft: -N` | Simple and works; no library needed |

**Key insight:** The hardest part of this phase is not any individual feature — it's integrating the modal routing so both FABs open the same modal without duplicating code or resetting tab state. Expo Router's root-level modal screen solves this cleanly.

---

## Common Pitfalls

### Pitfall 1: Plans DELETE Policy Missing
**What goes wrong:** Delete plan button silently fails — Supabase returns `{}` success (0 rows affected) without error because no DELETE RLS policy exists.
**Why it happens:** The migration has `plans_insert_own` and `plans_update_member` but no DELETE policy.
**How to avoid:** Add `plans_delete_creator` policy in Wave 0 setup task, or confirm the planner includes a migration step.
**Warning signs:** Delete returns no error but plan still appears in list.

### Pitfall 2: Nested Select with Filters on Related Tables
**What goes wrong:** `supabase.from('plan_members').select('plans(...)').filter('plans.scheduled_for', 'gte', now)` may not work as expected — Supabase PostgREST filtering on nested resources is limited.
**Why it happens:** PostgREST nested filters work differently than top-level filters.
**How to avoid:** Use the two-query approach (fetch plan_ids, then fetch plans with filter) as documented in Pattern 4.
**Warning signs:** All plans returned including past ones, or no plans returned at all.

### Pitfall 3: Modal Breaking Tab State
**What goes wrong:** Pushing to `/(tabs)/plans` from Home FAB navigates away from Home tab and resets Plans tab scroll position.
**Why it happens:** Tab navigation replaces the current tab; there is no "go back to Home tab" from Plans.
**How to avoid:** Use a root-level modal route `/plan-create` instead of tab navigation. This is what the locked decision specifies.
**Warning signs:** Back button on modal returns to wrong screen, or Home tab appears deactivated.

### Pitfall 4: plan_members_insert_creator RLS Mismatch
**What goes wrong:** Inserting invited friends as plan_members fails with RLS violation.
**Why it happens:** `plan_members_insert_creator` policy checks `EXISTS (SELECT 1 FROM plans WHERE id = plan_id AND created_by = auth.uid())`. This is correct — only the creator can add members. But this only works AFTER the plan row is inserted. If member inserts race with plan insert (or plan insert fails silently), members insert fails.
**How to avoid:** Always insert the plan first with `.select('id').single()`, confirm success, then insert members. Do not use parallel inserts.
**Warning signs:** Members not appearing in plan after creation.

### Pitfall 5: DateTimePicker Platform Differences
**What goes wrong:** iOS shows DateTimePicker inline; Android shows it as a dialog. Layout breaks on one platform.
**Why it happens:** `@react-native-community/datetimepicker` has different `mode` behavior per platform.
**How to avoid:** Wrap in a Platform.OS check — use `display="spinner"` on iOS, `display="default"` on Android. Test on both. Or use `display="compact"` on iOS 14+ which is inline.
**Warning signs:** Picker not showing on Android, or layout overflow on iOS.

### Pitfall 6: useFocusEffect for Invitation Badge
**What goes wrong:** Badge count does not update when user accepts a plan invitation from another screen.
**Why it happens:** `useFocusEffect` only fires when the Plans tab comes into focus. If user is already on Plans tab and an invitation arrives, badge does not update without a refetch.
**How to avoid:** This is acceptable for Phase 4 per the spec (no realtime for plans). Badge updates on next tab focus. Document this as expected behavior.
**Warning signs:** Stale badge count — acceptable per spec.

### Pitfall 7: TypeScript Strict Mode with Supabase Nested Selects
**What goes wrong:** `data.plans.title` causes TS error because the nested select type is `Plan[] | Plan | null` depending on relationship cardinality.
**Why it happens:** Supabase JS types for nested selects reflect the relationship type (array for one-to-many, object for many-to-one).
**How to avoid:** Use explicit type assertions or narrow with Array.isArray. Or use two-query approach which gives cleaner types.
**Warning signs:** `noUncheckedIndexedAccess` strict errors, or `plan` typed as `Plan[] | Plan | null`.

---

## Code Examples

Verified patterns from existing codebase:

### Existing FAB Pattern (from HomeScreen.tsx)
```typescript
// Absolute-positioned FAB with Ionicons + label
<TouchableOpacity
  style={[styles.fab, { bottom: 24 + insets.bottom }]}
  onPress={() => router.push('/plan-create')}   // Updated from router.push('/(tabs)/plans')
  activeOpacity={0.8}
  accessibilityLabel="Start Plan"
>
  <Ionicons name="add" size={20} color={COLORS.dominant} />
  <Text style={styles.fabLabel}>{'Start Plan'}</Text>
</TouchableOpacity>

// styles.fab:
fab: {
  position: 'absolute',
  right: 24,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 16,
  borderRadius: 28,
  backgroundColor: COLORS.accent,
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
},
```

### Existing Tab Badge Pattern (from _layout.tsx)
```typescript
// Plans tab — add invitation badge same as Profile's pending count badge
<Tabs.Screen
  name="plans"
  options={{
    title: 'Plans',
    tabBarBadge: invitationCount > 0 ? invitationCount : undefined,
    tabBarIcon: ({ color, focused }) => (
      <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
    ),
  }}
/>
```

### Existing useFocusEffect Pattern (from usePendingRequestsCount.ts)
```typescript
useFocusEffect(
  useCallback(() => {
    refetch();
  }, [refetch])
);
```

### AvatarStack Component Pattern
```typescript
// Overlapping avatars — absolute positioning with marginLeft offset
function AvatarStack({ members, maxVisible = 5 }: { members: PlanMember[]; maxVisible?: number }) {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;
  const OVERLAP = 10; // pixels each subsequent avatar overlaps previous

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <View key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -OVERLAP, zIndex: maxVisible - i }}>
          <AvatarCircle
            size={28}
            imageUri={m.profiles.avatar_url}
            displayName={m.profiles.display_name}
          />
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.overflowBadge, { marginLeft: -OVERLAP }]}>
          <Text style={styles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
```

### RSVP Colors (using existing COLORS)
```typescript
// Reuse COLORS.status for RSVP
const RSVP_COLORS = {
  going: COLORS.status.free,    // #22c55e
  maybe: COLORS.status.maybe,   // #eab308
  out: COLORS.status.busy,      // #ef4444
  invited: COLORS.textSecondary, // dimmed for unresponded
} as const;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `router.push('/(tabs)/plans')` in Home FAB | `router.push('/plan-create')` to modal | Phase 4 | Home FAB now opens creation modal directly |
| Plans stub screen | Full plans list with FAB | Phase 4 | Plans tab becomes functional |
| No DELETE policy on plans | Needs `plans_delete_creator` policy | Phase 4 | Creator can delete plans |

**Deprecated/outdated:**
- Home FAB navigating to Plans tab — replace with modal route navigation in Phase 4.

---

## Open Questions

1. **DateTimePicker in Expo Go managed workflow**
   - What we know: `@react-native-community/datetimepicker` is listed in Expo's bundled packages for SDK 55
   - What's unclear: Whether it is already in `node_modules` (not in package.json) or requires `npx expo install`
   - Recommendation: Planner should add `npx expo install @react-native-community/datetimepicker` as a Wave 0 setup step; if it is already bundled it will be a no-op

2. **Plans DELETE RLS policy**
   - What we know: No DELETE policy exists in `0001_init.sql`; with RLS enabled, delete is blocked for all users
   - What's unclear: Whether a new migration is needed or it was an intentional omission
   - Recommendation: Wave 0 plan should include a Supabase migration `0002_plans_delete_policy.sql` with `CREATE POLICY "plans_delete_creator" ON public.plans FOR DELETE TO authenticated USING (created_by = (SELECT auth.uid()));`

3. **Supabase nested select type safety**
   - What we know: TypeScript strict mode + `noUncheckedIndexedAccess` can make nested select types verbose
   - What's unclear: Whether the existing `src/types/database.ts` has generated types for plans tables
   - Recommendation: Check `database.ts` before writing types; manually write `Plan`, `PlanMember`, `PlanWithMembers` types in `src/types/plans.ts` following existing `app.ts` pattern

4. **"Open Chat" navigation target in Phase 4**
   - What we know: Chat is a stub tab in Phase 4; functional in Phase 5
   - What's unclear: Whether `router.push('/(tabs)/chat')` with a plan_id param is sufficient stub, or if the chat tab needs a route that accepts plan_id
   - Recommendation: For Phase 4, `router.push('/(tabs)/chat')` is sufficient (chat tab shows "Coming in Phase 5"); Phase 5 will update this to `router.push(`/chat/${planId}`)` or similar

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files or test directories found |
| Config file | None — see Wave 0 |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Quick Plan creation inserts plan row + creator member row | unit | `jest src/hooks/usePlans.test.ts -t "createPlan"` | ❌ Wave 0 |
| PLAN-02 | Friend selector pre-checks free friends | unit | `jest src/screens/plans/PlanCreateModal.test.ts -t "free friends precheck"` | ❌ Wave 0 |
| PLAN-03 | Plans list filters past plans, sorts ascending | unit | `jest src/hooks/usePlans.test.ts -t "active plans filter"` | ❌ Wave 0 |
| PLAN-04 | Edit mode saves title/time/location | unit | `jest src/hooks/usePlanDetail.test.ts -t "update plan details"` | ❌ Wave 0 |
| PLAN-05 | RSVP update persists correct status | unit | `jest src/hooks/usePlanDetail.test.ts -t "updateRsvp"` | ❌ Wave 0 |
| PLAN-06 | Member list groups by RSVP | unit | `jest src/screens/plans/PlanDashboardScreen.test.ts -t "member grouping"` | ❌ Wave 0 |
| PLAN-07 | Link dump saves on blur | unit | `jest src/components/plans/LinkDumpField.test.ts -t "save on blur"` | ❌ Wave 0 |
| PLAN-08 | IOU notes saves on blur | unit | `jest src/components/plans/IOUNotesField.test.ts -t "save on blur"` | ❌ Wave 0 |
| PLAN-09 | Open Chat button navigates to chat tab | unit | `jest src/screens/plans/PlanDashboardScreen.test.ts -t "Open Chat"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** No automated command until framework installed
- **Per wave merge:** No automated command until framework installed
- **Phase gate:** Manual smoke test on device before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Test framework not installed — no `jest`, `vitest`, or `@testing-library/react-native` in package.json
- [ ] No test directory exists
- [ ] `plans_delete_creator` RLS policy migration needed (`supabase/migrations/0002_plans_delete_policy.sql`)
- [ ] Verify `@react-native-community/datetimepicker` availability: `npx expo install @react-native-community/datetimepicker`

**Practical note:** Given no test framework is installed in this project and the project spec does not mention testing setup, Wave 0 for Phase 4 should focus on the migration and the DateTimePicker dependency check. Adding a full test framework mid-project is out of scope for Phase 4.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/app/(tabs)/_layout.tsx`, `src/screens/home/HomeScreen.tsx`, `src/hooks/useHomeScreen.ts`, `src/stores/useHomeStore.ts`, `src/hooks/usePendingRequestsCount.ts`, `src/components/common/*.tsx`, `src/constants/colors.ts`
- `supabase/migrations/0001_init.sql` — definitive RLS policy source, confirms plans/plan_members schema
- `package.json` — confirmed installed dependencies and versions
- `.planning/phases/04-plans/04-CONTEXT.md` — locked user decisions

### Secondary (MEDIUM confidence)
- Expo Router docs pattern for `presentation: 'modal'` — inferred from existing `friends/` stack pattern + Expo Router v3 conventions
- Supabase PostgREST nested filter limitation — inferred from known PostgREST behavior, recommend two-query approach as safe path

### Tertiary (LOW confidence)
- `@react-native-community/datetimepicker` Expo SDK 55 bundle status — not confirmed against Expo SDK 55 bundled package list; requires `npx expo install` verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in package.json
- Architecture: HIGH — follows directly from existing codebase patterns
- Supabase queries: MEDIUM — two-query approach recommended over nested filters
- Pitfalls: HIGH — sourced from actual migration SQL and codebase inspection
- DateTimePicker: MEDIUM — requires installation verification

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable Expo ecosystem, 30-day window)
