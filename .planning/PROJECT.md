# Campfire

## What This Is

Campfire is a "friendship OS" — an all-in-one social coordination app for close friend groups of 3–15 people. It replaces the fragmentation of duct-taping WhatsApp + Splitwise + Apple Notes + Instagram together with a single app that combines availability status, event planning, group chat, and lightweight expense tracking. Built as a React Native + Expo mobile app backed by Supabase.

## Core Value

The daily availability status ("Free / Busy / Maybe") drives daily active use and makes it effortless for friends to see who's around and spin up spontaneous plans. If nothing else works, this must.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Auth flow with email/password and Google OAuth
- [ ] Profile creation (username, display name, avatar)
- [ ] Session persistence across app restarts
- [ ] Friend system (add by username, accept/reject requests)
- [ ] Daily status toggle (Free/Busy/Maybe) with emoji context tags
- [ ] "Who's Free" home screen with realtime updates
- [ ] Nudge friends via in-app DM message
- [ ] Quick Plan creation (title, time, location, invite friends)
- [ ] Plan dashboard with RSVP, link dump, IOU notes
- [ ] Chat system (plan group chats + DMs)
- [ ] Realtime messaging
- [ ] Profile editing and settings
- [ ] QR code for adding friends
- [ ] Push notifications for nudges
- [ ] Squad Goals "Coming soon" stub tab
- [ ] Seed data for development

### Out of Scope

- Interactive social map — V2 feature, high complexity
- Calendar sync — V2, requires native calendar APIs
- OCR receipt scanning — V2, needs camera + ML
- Venue booking / B2B integrations — V3
- AI social suggestions — V3
- Media/image sharing in chat — V2
- Read receipts, message reactions — V2
- Public profiles or discoverability — friends-only by design
- Web app / PWA — mobile only for V1
- Real-time chat (beyond basic nudge) push notifications — V2
- Group size pagination — unnecessary for 3–15 person groups

## Context

- **Target users:** Close friend groups of 3–15 people. Not a public social network.
- **Retention hook:** Low-friction daily availability status drives daily active use. Event planning tools activate when needed.
- **Design aesthetic:** Warm, social, emoji-forward. Cozy, not corporate. Campfire emoji in header.
- **Status colours:** Free = #22c55e, Busy = #ef4444, Maybe = #eab308 — used consistently.
- **Home screen is king:** Must feel instant. Render from Zustand cache immediately, revalidate from Supabase in background.
- **Quick Plan < 10 seconds:** Title auto-filled, time pre-set, free friends pre-selected.
- **No onboarding tour:** UI is self-explanatory. Empty states explain features inline.
- **Supabase project:** Needs to be created from scratch (free tier).
- **Seed data:** Include pre-loaded test users, friendships, and sample plans for dev iteration.

## Constraints

- **Tech stack:** React Native + Expo (managed workflow), TypeScript strict, Supabase, Zustand — non-negotiable
- **Expo Go:** Every library must work in Expo Go managed workflow without custom native modules. No `expo prebuild` or native linking.
- **No backend server:** All server logic via Supabase RPC functions (Postgres). No Express, Node.js server, MongoDB, Firebase.
- **No UI libraries:** No NativeBase, Tamagui, Gluestack. React Native StyleSheet only.
- **No Redux, React Query:** Zustand for state. Direct Supabase queries in hooks.
- **TypeScript strict:** `"strict": true`, `"noUncheckedIndexedAccess": true`. No `any`. No `as unknown as X`.
- **RLS is security:** Never rely on client-side filtering. Every table has RLS.
- **UUIDs everywhere:** No sequential integer IDs exposed.
- **Free tier budget:** 500MB DB, 1GB Storage, 50K MAU, 2M Realtime messages/month. Filter Realtime to friend IDs. No `SELECT *`.
- **Realtime on statuses only in V1:** Only home screen gets live updates until Phase 6.
- **Link dump / IOU notes:** Plain text, last-write-wins. No CRDT/locking.
- **Chat text-only in V1:** No images, files, reactions, read receipts.
- **FlatList for all lists:** No ScrollView + map.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Firebase | Single SDK for Postgres, Auth, Realtime, Storage. Free tier generous. | — Pending |
| Zustand over Redux | Lightweight, no boilerplate. Only for ephemeral UI state. | — Pending |
| Expo managed workflow | Expo Go testing without dev accounts. Platform-agnostic. | — Pending |
| Email + Google OAuth from Phase 1 | User wants both auth methods available from day one | — Pending |
| Status defaults to "maybe" | Ambiguous enough to prompt curiosity, prevents false "free" signals | — Pending |
| least()/greatest() for symmetric relationships | Prevents duplicate friendship/DM pairs regardless of direction | — Pending |
| Seed data included | Pre-loaded test users and sample data for faster dev iteration | — Pending |

---
*Last updated: 2026-03-17 after initialization*
