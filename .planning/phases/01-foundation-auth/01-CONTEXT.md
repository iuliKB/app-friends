# Phase 1: Foundation + Auth - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Expo scaffold with TypeScript strict mode, Supabase cloud project with all V1 schema (single migration), RLS on every table, three auth methods (email/password, Google OAuth, Apple Sign-In), session persistence, profile creation, and 5-tab navigation shell. No friend system, no status, no plans — just the foundation everything else builds on.

</domain>

<decisions>
## Implementation Decisions

### Auth Screen Flow
- Combined auth screen with Login / Sign Up tabs above the email form
- Email form on top, Google + Apple OAuth buttons below with divider ("or continue with")
- Branded header: Campfire logo + campfire emoji + tagline ("Your friends, one app" or similar)
- Password requirements: min 8 chars, at least one number + one letter — validated client-side before submit
- Auth errors shown inline below the relevant field (red text, standard form validation)
- Splash screen (Campfire logo, warm background) shown while checking for existing session on cold start
- No email verification in V1 — skip entirely
- Forgot password flow deferred to Phase 6

### Profile Creation
- Email signup users: mandatory profile creation screen immediately after signup (username + display name + optional avatar)
- OAuth users (Google/Apple): auto-create display name from OAuth data, auto-generate username from display name (e.g. "john_smith_42"), user can change later in settings
- Username: real-time availability check as user types (debounced Supabase query)
- Display name: minimal validation (non-empty, up to ~50 chars)
- Avatar: initials circle by default + optional "Add photo" button that opens device gallery → uploads to Supabase Storage

### Session Storage
- Plain AsyncStorage as specified in the original spec — Supabase's anon key + RLS is the security layer
- If session dies offline, user re-logs in (simple retry, no complex recovery)
- Offline banner: small bar at top "No connection — some features may not work" when network unavailable
- AppState listener: pause Supabase auto-refresh when app backgrounds, resume on foreground

### Dev Environment
- Supabase cloud project only (no local CLI setup)
- Single initial migration file with all V1 schema (enums, tables, triggers, RLS, RPC functions)
- Existing seed.sql at project root — use as-is, move to supabase/seed.sql directory
- .env.local + .env.example pattern (template committed with placeholders, .env.local gitignored)
- TypeScript: strict: true, noUncheckedIndexedAccess: true, standard Expo tsconfig
- ESLint + Prettier configured from day one in Phase 1 scaffold

### Claude's Discretion
- Exact splash screen design and animation
- ESLint/Prettier rule configuration specifics
- Exact auto-generated username algorithm (as long as it's lowercase, URL-safe, and unique)
- Offline banner styling and positioning
- Keyboard handling patterns in auth forms

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: INFR-01–06, AUTH-01–05, PROF-01–02, NAV-01–02
- `.planning/ROADMAP.md` — Phase 1 plans structure (01-01, 01-02, 01-03)

### Research
- `.planning/research/STACK.md` — Expo SDK 55, library versions, Expo Go compatibility table
- `.planning/research/ARCHITECTURE.md` — Expo Router auth guard pattern, Supabase singleton, project structure
- `.planning/research/PITFALLS.md` — RLS discipline, Google OAuth browser-redirect approach, session handling

### Schema & Seed Data
- `seed.sql` (project root) — Existing seed data file to use for development

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes all foundational patterns

### Integration Points
- Supabase cloud project (to be created) — URL and anon key via EXPO_PUBLIC_* env vars
- Expo Router file-based routing — app/ directory structure from spec
- Zustand store — lib/store.ts with session + status + friends slices from spec

</code_context>

<specifics>
## Specific Ideas

- Auth screen should feel warm and inviting — matches "cozy, not corporate" design philosophy
- The spec provides exact SQL for all schema including triggers, RLS policies, and RPC functions — implement verbatim
- The spec provides exact Supabase client initialization code in lib/supabase.ts — use as-is
- Zustand store structure is defined in spec (SessionSlice, StatusSlice, FriendsSlice) — implement as specified
- Status colours from spec: Free=#22c55e, Busy=#ef4444, Maybe=#eab308 — define as constants in Phase 1 for use across all phases

</specifics>

<deferred>
## Deferred Ideas

- Forgot password flow — Phase 6 (polish)
- Email verification — not in V1
- SecureStore hybrid session storage — consider for V2 if security audit needed

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-03-17*
