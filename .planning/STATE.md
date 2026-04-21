---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Chat & Profile
status: verifying
stopped_at: Phase 17 context gathered
last_updated: "2026-04-21T19:26:52.874Z"
last_activity: 2026-04-21
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 17
  completed_plans: 17
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Phase 16 — media-sharing

## Current Position

Milestone: v1.5 Chat & Profile
Phase: 17
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-21

Progress: [░░░░░░░░░░] 0%

## Phase Structure

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 12 | Schema Foundation | (infrastructure) | Not started |
| 13 | Profile Rework + Friend Profile | PROF-01–05 | Not started |
| 14 | Reply Threading | CHAT-07, CHAT-08 | Not started |
| 15 | Message Reactions | CHAT-01, CHAT-02, CHAT-03 | Not started |
| 16 | Media Sharing | CHAT-04, CHAT-05, CHAT-06 | Not started |
| 17 | Polls | CHAT-09, CHAT-10, CHAT-11 | Not started |

## Performance Metrics

Plans executed this milestone: 0
Phases completed: 0/6
Requirements covered: 16/16 mapped

## Accumulated Context

### Decisions

- [v1.3.5]: Bottom sheet must be custom implementation — @gorhom/bottom-sheet broken on Reanimated v4
- [v1.4]: fetch().arrayBuffer() for Supabase Storage uploads (FormData + file:// URI fails)
- [v1.4]: Squad Dashboard: single outer FlatList with feature cards in ListFooterComponent
- [v1.5]: Reactions Realtime strategy — JSONB on messages row OR Broadcast; NOT Postgres Changes on message_reactions (free-tier budget risk). Decide at Phase 15 planning start.
- [v1.5]: Poll votes Realtime — same constraint; decide at Phase 17 planning start.
- [v1.5]: Friend profile route at root level `/friends/[id]` — do NOT duplicate into tab folders (back nav breaks)
- [v1.5]: expo-image-manipulator compression is mandatory before upload (not optional) — raw iPhone photos exhaust 1GB storage in days
- [Phase 12]: Migration 0018: messages.body nullable with conditional CHECK; is_channel_member() SECURITY DEFINER helper for Phases 14-17 RLS; create_poll() atomic RPC; chat-media bucket
- [Phase 12-schema-foundation]: D-01 reflected in TypeScript: Message.body is string | null; stale database.ts requires row cast to any at useChatRoom.ts mapping site
- [Phase 13]: eslint-disable for useFocusEffect empty-dep array in profile.tsx — intentional run-on-focus pattern, matches squad.tsx precedent
- [Phase 13]: ScreenHeader does not accept onBack prop; wish-list.tsx uses title-only ScreenHeader relying on native back gesture
- [Phase 13]: statusDot uses SPACING.sm (8px) not SPACING.xs (4px) — plan had wrong token name for the 8px UI-SPEC intent
- [Phase 14]: Migration 0019: drop+recreate messages_message_type_check to include 'deleted'; add messages_soft_delete_own UPDATE RLS policy with USING+WITH CHECK sender_id guard
- [Phase 14-reply-threading]: expo-clipboard installed via npx expo install (SDK-matched ~55.0.13); not previously in package.json
- [Phase 14-reply-threading]: MessageBubble context menu: contextMenu extracted as JSX variable to share isOwn/handlers without prop drilling
- [Phase 14-reply-threading]: body: null cast to any in deleteMessage .update() — Supabase generated types mark body as non-nullable; DB column is nullable since 0018; same any-cast pattern as fetch mapping site
- [Phase 14-reply-threading]: ReplyContext exported from SendBar.tsx co-located with the component that owns it
- [Phase 14-reply-threading]: scrollToMessage sets highlightedId then clears after 1200ms; onScrollToIndexFailed shows toast (out-of-window D-11)
- [Phase 16]: contentType forced to image/jpeg in uploadChatMedia — client cannot upload executable disguised as image (T-16-02)
- [Phase 16]: upsert: false in uploadChatMedia — each messageId is UUID, no re-upload needed
- [Phase 16]: crypto.randomUUID() as shared storage/DB key in sendImage — body=null breaks body+sender dedup guard; id-based dedup is the clean alternative
- [Phase 16]: requestPermissionsAsync(true) not ({writeOnly:true}) — actual expo-media-library SDK signature takes boolean not object
- [Phase 16]: showToast extended with optional message param; reset to default text on animation end preserves existing scroll-toast behaviour
- [Phase 16-media-sharing]: showToast extended with optional message param that resets to default on animation end — preserves existing scroll-to-original toast behaviour without duplicating animation logic

### Pending Todos

(none)

### Blockers/Concerns

(none active)

## Session Continuity

Last session: 2026-04-21T19:26:52.867Z
Stopped at: Phase 17 context gathered
