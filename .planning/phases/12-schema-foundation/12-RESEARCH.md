# Phase 12: Schema Foundation - Research

**Researched:** 2026-04-20
**Domain:** Supabase Postgres migrations, RLS, Storage, TypeScript types
**Confidence:** HIGH

## Summary

Phase 12 delivers a single migration (0018) that additively extends the existing schema to support all chat features in Phases 13–17. Every change must be backwards-compatible: existing `plan`, `dm`, and `group` chat messages must continue to load and send without modification. No UI, hook, or Realtime changes are in scope.

The migration adds four columns to `messages`, creates three poll tables (`polls`, `poll_options`, `poll_votes`), creates the `message_reactions` table, creates two SECURITY DEFINER RPCs (`is_channel_member()` helper and `create_poll()` atomic RPC), creates the `chat-media` Storage bucket, and updates `src/types/chat.ts` with the new fields. The existing `messages_exactly_one_channel` CHECK constraint is not touched — image, poll, and reply messages all still route to exactly one channel.

All patterns for this migration exist in the codebase and have been verified: `is_group_channel_member` (0017) is the direct template for `is_channel_member`, `create_expense` (0015) is the direct template for `create_poll`, and `0014_plan_covers_bucket.sql` is the direct template for the `chat-media` bucket.

**Primary recommendation:** Write migration 0018 as a single, ordered SQL file following the established section structure of 0017. Create the `is_channel_member()` helper before any policy that references it. Update `src/types/chat.ts` as a second task after the migration is verified. No new libraries are required.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `messages.body` made nullable. Drop `NOT NULL`, add CHECK constraint: `body IS NOT NULL` when `message_type = 'text'`.
- **D-02:** Image messages have `body = NULL`. Poll messages have `body = NULL` (question lives in `polls` table).
- **D-03:** `message_type` enum: three values only — `'text' | 'image' | 'poll'`. Reply is NOT a distinct type; a reply is any message (text or image) where `reply_to_message_id IS NOT NULL`.
- **D-04:** `message_type` column with DEFAULT `'text'` so existing rows are unaffected. NOT NULL.
- **D-05:** `is_channel_member(p_channel_type text, p_channel_id uuid) RETURNS boolean` — covers all 3 channel types (`'plan' | 'dm' | 'group'`). Single reusable helper for Phases 14–17 RLS policies.
- **D-06:** SECURITY DEFINER, `SET search_path = ''`, STABLE. Follows `is_not_wish_list_owner` pattern from 0017.
- **D-07:** `reply_to_message_id` FK: `ON DELETE SET NULL`. Replies remain in chat with `reply_to_message_id = NULL` when original is deleted.
- **D-08:** `chat-media` bucket. Public read access. UUID-namespaced paths. Mirrors `plan-covers` pattern from 0014.
- **D-09:** Reactions Realtime delivery strategy deferred to Phase 15. `message_reactions` table is required. Delivery strategy (Postgres Changes vs Broadcast) decided at Phase 15 planning start.

### Claude's Discretion

- Exact column ordering and index choices in migration.
- Whether `message_type` is a Postgres `text CHECK` column or a custom enum type. Project prefers `text CHECK` to avoid `ALTER TYPE` friction during dev.
- `create_poll()` RPC signature details (column names, return type) — follow existing `create_expense()` pattern.

### Deferred Ideas (OUT OF SCOPE)

- Reactions Realtime delivery strategy (Postgres Changes vs Broadcast) — Phase 15 planning start.
- Poll votes Realtime strategy — Phase 17 planning start.
- Message deletion feature — V2; `reply_to_message_id SET NULL` ensures schema supports it.
</user_constraints>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| messages column additions (image_url, reply_to_message_id, message_type, poll_id) | Database / Storage | — | Additive ALTER TABLE; no app-tier change needed — existing INSERT paths default correctly |
| messages.body constraint change | Database / Storage | — | DROP NOT NULL + CHECK constraint is pure SQL; existing rows satisfy DEFAULT 'text' rule |
| message_reactions table + RLS | Database / Storage | — | Table + policies only; no app reads until Phase 15 |
| polls / poll_options / poll_votes tables + RLS | Database / Storage | — | Tables + policies only; no app reads until Phase 17 |
| is_channel_member() helper function | Database / Storage | — | SECURITY DEFINER SQL function; consumed by future RLS policies in Phases 14–17 |
| create_poll() RPC | Database / Storage | — | Atomic Postgres function; no app call until Phase 17 |
| chat-media Storage bucket | CDN / Static | Database / Storage | Bucket created in migration; no app upload path until Phase 16 |
| TypeScript types (src/types/chat.ts) | Frontend (build-time) | — | Interface extension; compile check only; no runtime behavior change |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Postgres (migrations) | — | Schema DDL, RLS, RPC functions | Project's sole database; all 17 prior migrations use this pattern |
| TypeScript | 5.x (strict) | Type definitions for new fields | Project constraint: `"strict": true`, `"noUncheckedIndexedAccess": true` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Storage | — | chat-media bucket creation | In-migration INSERT into storage.buckets |
| Supabase CLI | — | Migration apply + type generation | `supabase db push` to apply; `supabase gen types typescript` for regeneration reference |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| text CHECK for message_type | Postgres enum type | Enum requires `ALTER TYPE` to add values — causes table rewrite in older Postgres; text CHECK is forward-safe and project-standard |
| Single `is_channel_member()` helper | Three separate helpers (one per channel type) | Three helpers duplicate logic; single discriminated-union function is cleaner and matches D-05 decision |

**Installation:** No new npm packages required for this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Migration 0018 Apply
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ SECTION 1: messages column additions                         │
│   ALTER TABLE messages DROP CONSTRAINT body NOT NULL         │
│   ALTER TABLE messages ADD COLUMN image_url                  │
│   ALTER TABLE messages ADD COLUMN reply_to_message_id (FK)   │
│   ALTER TABLE messages ADD COLUMN message_type text CHECK    │
│   ALTER TABLE messages ADD COLUMN poll_id (FK)               │
│   ALTER TABLE messages ADD CONSTRAINT messages_body_required │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ SECTION 2: poll tables                                       │
│   CREATE TABLE polls (question, created_by, message_id FK)  │
│   CREATE TABLE poll_options (poll_id FK, label, position)   │
│   CREATE TABLE poll_votes (poll_id FK, option_id FK, user)  │
│   ENABLE RLS on all three + policies                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ SECTION 3: message_reactions table                           │
│   CREATE TABLE message_reactions (message_id, user_id, emoji)│
│   UNIQUE (message_id, user_id, emoji) — one per emoji/user  │
│   ENABLE RLS + policies                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ SECTION 4: is_channel_member() SECURITY DEFINER helper       │
│   Must exist BEFORE any policy that calls it                 │
│   GRANT EXECUTE TO authenticated                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ SECTION 5: create_poll() atomic RPC                          │
│   plpgsql SECURITY DEFINER — INSERT polls + poll_options     │
│   Returns poll_id; sets messages.poll_id in one transaction  │
│   GRANT EXECUTE TO authenticated                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ SECTION 6: chat-media Storage bucket                         │
│   INSERT INTO storage.buckets (id, name, public=true)        │
│   Storage object policies (upload, update, public read)      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
        Migration applied cleanly (zero errors)
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
Existing chat unaffected              src/types/chat.ts update
(body NOT NULL on type='text')        (Message interface + new fields)
```

### Recommended Project Structure
```
supabase/migrations/
└── 0018_chat_v1_5.sql          # all of Phase 12 in one file

src/types/
└── chat.ts                      # extend existing Message + MessageWithProfile
```

### Pattern 1: Additive Column Addition (messages table)
**What:** Add nullable columns and change existing NOT NULL constraint without touching existing data.
**When to use:** When extending a table that already has live data; DEFAULT ensures backward-compat.
**Example:**
```sql
-- Source: 0017_birthday_social_v1_4.sql SECTION 8 (group_channel_id addition)
-- Drop old constraint first, add column, recreate constraint with new branch

-- Step 1: drop body NOT NULL
ALTER TABLE public.messages
  ALTER COLUMN body DROP NOT NULL;

-- Step 2: add new columns (all nullable — existing rows unaffected)
ALTER TABLE public.messages
  ADD COLUMN image_url            text,
  ADD COLUMN reply_to_message_id  uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN message_type         text NOT NULL DEFAULT 'text'
                                  CHECK (message_type IN ('text', 'image', 'poll')),
  ADD COLUMN poll_id              uuid; -- FK to polls added after polls table is created

-- Step 3: conditional body constraint
ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_required
  CHECK (message_type <> 'text' OR body IS NOT NULL);
```

### Pattern 2: SECURITY DEFINER Cross-Channel Helper
**What:** Single function covering all three channel types using a text discriminant.
**When to use:** RLS policies on tables that join across channel types (message_reactions, future policies in Phases 14–17).
**Example:**
```sql
-- Source: 0017 SECTION 6 is_group_channel_member pattern + D-05 decision
CREATE OR REPLACE FUNCTION public.is_channel_member(
  p_channel_type text,
  p_channel_id   uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_channel_type
    WHEN 'plan' THEN EXISTS (
      SELECT 1 FROM public.plan_members
      WHERE plan_id = p_channel_id
        AND user_id = (SELECT auth.uid())
    )
    WHEN 'dm' THEN EXISTS (
      SELECT 1 FROM public.dm_channels
      WHERE id = p_channel_id
        AND (user_a = (SELECT auth.uid()) OR user_b = (SELECT auth.uid()))
    )
    WHEN 'group' THEN EXISTS (
      SELECT 1 FROM public.group_channel_members
      WHERE group_channel_id = p_channel_id
        AND user_id = (SELECT auth.uid())
    )
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_channel_member(text, uuid) TO authenticated;
```

### Pattern 3: Atomic Poll RPC (following create_expense)
**What:** Atomically insert a poll row + option rows + link the message row in one PL/pgSQL transaction. Return the poll_id.
**When to use:** Any time two or more inserts must succeed together. Network failure between client calls would leave orphan records.
**Example:**
```sql
-- Source: 0015_iou_v1_4.sql create_expense() pattern
CREATE OR REPLACE FUNCTION public.create_poll(
  p_message_id  uuid,
  p_question    text,
  p_options     text[]          -- 2–4 labels
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller  uuid := auth.uid();
  v_poll_id uuid;
  v_label   text;
  v_pos     int := 1;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF array_length(p_options, 1) < 2 OR array_length(p_options, 1) > 4 THEN
    RAISE EXCEPTION 'polls require 2–4 options';
  END IF;

  INSERT INTO public.polls (message_id, question, created_by)
  VALUES (p_message_id, p_question, v_caller)
  RETURNING id INTO v_poll_id;

  FOREACH v_label IN ARRAY p_options LOOP
    INSERT INTO public.poll_options (poll_id, label, position)
    VALUES (v_poll_id, v_label, v_pos);
    v_pos := v_pos + 1;
  END LOOP;

  -- Back-link the message row
  UPDATE public.messages SET poll_id = v_poll_id WHERE id = p_message_id;

  RETURN v_poll_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_poll(uuid, text, text[]) TO authenticated;
```

### Pattern 4: Storage Bucket Creation in Migration
**What:** Insert into `storage.buckets` with `ON CONFLICT DO NOTHING` (idempotent). Add three storage object policies (INSERT, UPDATE, SELECT).
**When to use:** Any new Storage bucket that needs to be version-controlled as part of a migration.
**Example:**
```sql
-- Source: 0014_plan_covers_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated users can update chat media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media');

CREATE POLICY "Public read access for chat media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chat-media');
```

### Pattern 5: TypeScript Interface Extension
**What:** Extend the `Message` and `MessageWithProfile` interfaces with new optional/nullable fields.
**When to use:** After migration applies; field should be optional (`?`) or nullable (`| null`) to not break existing message reads.
**Example:**
```typescript
// Source: src/types/chat.ts — extend existing interface
export type MessageType = 'text' | 'image' | 'poll';

export interface Message {
  id: string;
  plan_id: string | null;
  dm_channel_id: string | null;
  group_channel_id: string | null;
  sender_id: string;
  body: string | null;                        // changed: nullable (D-01)
  created_at: string;
  // Phase 12 v1.5 — new fields
  image_url: string | null;
  reply_to_message_id: string | null;
  message_type: MessageType;
  poll_id: string | null;
  reactions?: MessageReaction[];              // Phase 15 placeholder; optional
  pending?: boolean;
  tempId?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}
```

### Anti-Patterns to Avoid
- **Creating `message_type` as a Postgres enum:** Requires `ALTER TYPE` to add values, which can cause table rewrites. Use `text CHECK (value IN (...))` per project pattern.
- **Creating `is_channel_member()` after policies that reference it:** Postgres will reject the policy creation with a "function does not exist" error. Helper must precede all policies that call it.
- **Dropping and recreating messages RLS policies in this migration:** The existing `messages_select_member_or_participant` and `messages_insert_member_or_participant` policies already cover all three channel types (updated in 0017). Phase 12 does not need to touch them — `is_channel_member()` is created for future phase use only.
- **Making `message_type` nullable:** D-04 requires `NOT NULL` with `DEFAULT 'text'`. A nullable type column means every downstream type-check query must also handle NULL.
- **Adding `poll_id` FK before the `polls` table exists:** SQL DDL is ordered — `polls` table must be created before `poll_id` FK constraint can reference it.
- **Placing poll_id FK in the ADD COLUMN statement before polls table exists:** Split the ALTER into two passes or create polls table first, then add the FK column.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic poll creation | Client-side: INSERT polls, then INSERT poll_options, then UPDATE messages | `create_poll()` RPC | Two or more client round-trips risk orphan rows on network failure |
| Channel membership check in RLS | Inline EXISTS subquery in every future policy | `is_channel_member()` SECURITY DEFINER helper | Inline subqueries cause RLS recursion when policies call themselves; SECURITY DEFINER helper sidesteps this |
| Ensuring one-reaction-per-emoji-per-user | Client-side dedup | Composite UNIQUE constraint on `(message_id, user_id, emoji)` | DB-enforced uniqueness is the only safe guarantee |

**Key insight:** Every complex multi-step write in this codebase uses an atomic SECURITY DEFINER RPC. Client-side multi-step writes are not the pattern here.

---

## Common Pitfalls

### Pitfall 1: poll_id FK defined before polls table
**What goes wrong:** `ALTER TABLE messages ADD COLUMN poll_id uuid REFERENCES public.polls(id)` fails if the `polls` table hasn't been created yet in the same migration.
**Why it happens:** SQL DDL is evaluated top-to-bottom; forward references are not allowed for FK targets.
**How to avoid:** Create `polls`, `poll_options`, `poll_votes` tables first. Add the `poll_id` FK column to `messages` in a second `ALTER TABLE` statement after the polls tables exist.
**Warning signs:** Migration fails with "relation 'polls' does not exist".

### Pitfall 2: Forgetting GRANT EXECUTE on SECURITY DEFINER functions
**What goes wrong:** Authenticated clients receive "permission denied for function" errors at runtime.
**Why it happens:** SECURITY DEFINER functions run as the function owner (postgres); the calling role (authenticated) needs explicit EXECUTE permission.
**How to avoid:** Add `GRANT EXECUTE ON FUNCTION ... TO authenticated;` after every SECURITY DEFINER function. Verified pattern: all existing helpers in 0015, 0016, 0017 include this.
**Warning signs:** Function exists in `pg_proc` but SELECT returns "permission denied".

### Pitfall 3: is_channel_member() called in policies before it exists
**What goes wrong:** `CREATE POLICY ... USING (public.is_channel_member(...))` fails with "function does not exist".
**Why it happens:** SQL migration is sequential; the function must exist at the time the policy is parsed.
**How to avoid:** Create `is_channel_member()` in an early migration section (before any tables that use it in policies). This is the established pattern from 0017 (is_group_channel_member created in SECTION 6 before the policies in SECTION 7 that reference it).
**Warning signs:** Migration fails on the policy CREATE statement.

### Pitfall 4: body NOT NULL drop breaks existing INSERT paths
**What goes wrong:** Existing app code inserts messages with `body: string` — this continues to work fine. But if the constraint change is wrong, a `message_type = 'text'` row could be inserted with `body = NULL`.
**Why it happens:** Constraint `messages_body_required` must be `CHECK (message_type <> 'text' OR body IS NOT NULL)` — this is the correct conditional logic. A simpler `CHECK (body IS NOT NULL)` would restore the old behavior and break poll/image messages.
**How to avoid:** Verify constraint logic in migration review: `message_type <> 'text' OR body IS NOT NULL` evaluates as: "either not a text message, OR body must be set".
**Warning signs:** Inserting a poll message (type='poll', body=NULL) causes a CHECK constraint violation.

### Pitfall 5: message_reactions RLS needing channel membership check without is_channel_member
**What goes wrong:** If `message_reactions` policies are written with inline EXISTS subqueries across all three channel types, they become very complex (25+ line policies) and risk recursion.
**Why it happens:** `message_reactions` doesn't directly know the channel — it only knows `message_id`. A join is needed to find which channel the message belongs to.
**How to avoid:** `message_reactions` SELECT/INSERT policies can use a simpler approach: join to `messages` and then call `is_channel_member()` with the appropriate channel type and id. This is exactly what `is_channel_member()` is designed for.
**Warning signs:** Policy fails to compile, or policy causes recursion (infinite loop detected by Postgres).

### Pitfall 6: Existing chat SELECT queries break after body becomes nullable
**What goes wrong:** TypeScript code that treats `message.body` as `string` (non-nullable) will produce type errors after the interface change.
**Why it happens:** `Message.body` changes from `string` to `string | null`.
**How to avoid:** Update `src/types/chat.ts` first, then fix any TypeScript compilation errors in existing components. Existing messages all have `body IS NOT NULL` (text messages) so runtime behavior is unchanged — only type-checking changes.
**Warning signs:** `tsc --strict` produces "Type 'null' is not assignable to type 'string'" on existing chat rendering code.

---

## Code Examples

### New tables: polls, poll_options, poll_votes
```sql
-- Source: pattern derived from iou_groups/iou_members in 0015_iou_v1_4.sql
CREATE TABLE public.polls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  question     text NOT NULL,
  created_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_options (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label    text NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 4)
);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_votes (
  poll_id   uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)  -- one vote per user per poll (enforces single-choice)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
```

### message_reactions table
```sql
-- Source: project pattern — composite PK per wish_list_claims in 0017
CREATE TABLE public.message_reactions (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)  -- one reaction per emoji per user per message
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
```

### RLS policy for message_reactions using is_channel_member
```sql
-- Channel membership check via join through messages table
CREATE POLICY "message_reactions_select_channel_member"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND (
          (m.plan_id IS NOT NULL AND public.is_channel_member('plan', m.plan_id))
          OR (m.dm_channel_id IS NOT NULL AND public.is_channel_member('dm', m.dm_channel_id))
          OR (m.group_channel_id IS NOT NULL AND public.is_channel_member('group', m.group_channel_id))
        )
    )
  );
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `messages.body NOT NULL` | `body` nullable + CHECK `(message_type <> 'text' OR body IS NOT NULL)` | Migration 0018 | Enables image and poll messages with no body; existing text messages unaffected via DEFAULT 'text' |
| No message types | `message_type text CHECK ('text'\|'image'\|'poll')` | Migration 0018 | Downstream phases branch on this value to render correct bubble type |
| No self-referencing FK on messages | `reply_to_message_id uuid REFERENCES messages(id) ON DELETE SET NULL` | Migration 0018 | Enables Phase 14 reply threading; SET NULL preserves reply chain visibility |

**Deprecated/outdated:**
- `messages.body NOT NULL` constraint: replaced by conditional constraint in 0018. Any code that relied on body always being non-null must be updated in TypeScript types.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `poll_votes` PRIMARY KEY of `(poll_id, user_id)` is sufficient to enforce single-choice votes | Code Examples | If wrong, a second vote by same user on a different option would insert a new row; use UPSERT in create_poll or Phase 17 vote RPC to change vote |
| A2 | `poll_options.position` as smallint 1–4 is the right data type for ordering | Code Examples | Low risk — position is display-order only; could use integer if range is too tight in future |
| A3 | `message_reactions` policies can safely JOIN through `messages` without hitting RLS recursion | Common Pitfalls | If the messages SELECT policy causes recursion when called from a message_reactions policy, SECURITY DEFINER on the policy helper is the fix — same pattern as other helpers |

---

## Open Questions

1. **Does `poll_id` FK need an `ON DELETE` clause?**
   - What we know: `polls` row has `message_id FK ON DELETE CASCADE` — so deleting the message deletes the poll. But the reverse isn't true: there's no built-in cascade from `polls` deletion to `messages.poll_id`.
   - What's unclear: If a poll is somehow deleted without deleting the message, `messages.poll_id` would become a dangling FK unless `ON DELETE SET NULL` is added.
   - Recommendation: Add `ON DELETE SET NULL` to `messages.poll_id` FK. This mirrors the `reply_to_message_id ON DELETE SET NULL` decision (D-07) and is the safe default.

2. **Should `poll_options` have RLS or be public within the channel?**
   - What we know: poll_options has no direct user-ownership concept — any channel member should be able to read all options.
   - What's unclear: Does RLS on poll_options need a policy, or should it inherit via a join on polls?
   - Recommendation: Add a SELECT policy joining through polls → messages → channel membership check. Same approach as message_reactions. INSERT is blocked for direct client writes (only `create_poll()` RPC inserts options).

---

## Environment Availability

Step 2.6: SKIPPED (no external tools required — phase is SQL migration + TypeScript file edit only; Supabase CLI is used for apply but is already established on this machine from prior migrations 0001–0017).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No automated test framework detected for SQL migrations |
| Config file | None |
| Quick run command | Manual: `supabase db push` + send existing chat message |
| Full suite command | Manual: verify all 5 success criteria from ROADMAP.md |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | Migration 0018 applies with zero errors | smoke | `supabase db push` (exit code 0) | — |
| SC-2 | Existing messages load and send after migration | smoke | Manual: open any chat, send message | — |
| SC-3 | `types/chat.ts` compiles with strict TypeScript including all 5 new fields | unit | `npx tsc --noEmit` | ❌ Wave 0 |
| SC-4 | `chat-media` bucket exists with public read | smoke | Supabase dashboard or `SELECT * FROM storage.buckets WHERE id = 'chat-media'` | — |
| SC-5 | All new DB objects exist with correct RLS | smoke | Manual psql/Supabase SQL editor verification query | — |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (TypeScript compile check)
- **Per wave merge:** `supabase db push` + TypeScript compile
- **Phase gate:** All 5 success criteria manually verified before `/gsd-verify-work`

### Wave 0 Gaps
- TypeScript compile verification: `npx tsc --noEmit` — already works if tsconfig.json exists (established project)
- No migration test harness: manual SQL verification is the established pattern for this project

*(No new test files needed — TypeScript compile covers SC-3; migration apply covers SC-1; manual covers SC-2, SC-4, SC-5)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A — no new auth flows |
| V3 Session Management | No | N/A — no session changes |
| V4 Access Control | Yes | RLS on all new tables; SECURITY DEFINER helpers |
| V5 Input Validation | Yes | CHECK constraints on message_type, poll_options.position |
| V6 Cryptography | No | N/A — no cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accessing message_reactions for a channel you're not a member of | Information Disclosure | `is_channel_member()` in RLS SELECT policy |
| Inserting a reaction on a message in a channel you're not a member of | Tampering | `is_channel_member()` in RLS INSERT WITH CHECK |
| Inserting poll options directly (bypassing RPC) | Tampering | No INSERT policy on poll_options for authenticated; only `create_poll()` SECURITY DEFINER can insert |
| Creating a poll on a message you don't own | Tampering | `create_poll()` RPC validates `auth.uid()` is the message sender before proceeding |
| Storage path traversal on chat-media uploads | Tampering | UUID-namespaced paths (`{user_uuid}/{resource_uuid}.ext`); storage policy checks bucket_id only (matches plan-covers pattern — acceptable for this app scale) |

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0001_init.sql` — messages table original definition, base RLS policy text, SECURITY DEFINER function pattern
- `supabase/migrations/0017_birthday_social_v1_4.sql` — is_group_channel_member SECURITY DEFINER helper (direct template for is_channel_member), messages constraint drop/recreate pattern, GRANT EXECUTE pattern
- `supabase/migrations/0015_iou_v1_4.sql` — create_expense() atomic plpgsql RPC (direct template for create_poll), SECURITY DEFINER RPC structure
- `supabase/migrations/0014_plan_covers_bucket.sql` — storage bucket creation pattern (direct template for chat-media)
- `src/types/chat.ts` — existing Message interface to extend
- `.planning/phases/12-schema-foundation/12-CONTEXT.md` — all locked decisions (D-01 through D-09)

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md` — project constraints (TypeScript strict, RLS is security, UUIDs everywhere, text CHECK over enum)
- `.planning/STATE.md` — accumulated decisions including Realtime budget constraint (D-09 deferral rationale)

### Tertiary (LOW confidence)
- None — all claims verified against codebase source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Supabase + TypeScript are the established stack; no new libraries
- Architecture: HIGH — all patterns directly verified in existing migration files 0014, 0015, 0017
- Pitfalls: HIGH — most pitfalls derived from observed migration patterns in the codebase (FK ordering, GRANT EXECUTE, function-before-policy ordering)

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable Postgres/Supabase patterns; no fast-moving dependencies)
