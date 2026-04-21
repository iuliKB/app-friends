---
phase: 16-media-sharing
plan: "02"
subsystem: chat-media
tags: [hooks, optimistic-ui, upload, chat]
dependency_graph:
  requires:
    - uploadChatMedia (src/lib/uploadChatMedia.ts — Plan 01)
  provides:
    - sendImage() function in useChatRoom hook
  affects:
    - src/hooks/useChatRoom.ts
tech_stack:
  added: []
  patterns:
    - Optimistic insert with local URI → upload → DB insert with client UUID → Realtime dedup via id match
    - crypto.randomUUID() as shared key between storage path and DB message id
    - body: null as any cast pattern (matches deleteMessage precedent, DB nullable since migration 0018)
key_files:
  created: []
  modified:
    - src/hooks/useChatRoom.ts (added sendImage to interface, body, and return statement)
decisions:
  - crypto.randomUUID() used for messageId (not Date.now()) — body=null breaks the body+sender Realtime dedup guard; id-based dedup is the clean alternative
  - Upload-first ordering (unlike text sendMessage which inserts first) — CDN URL must exist before DB insert
  - reactions:[] included in optimistic message — required by MessageWithProfile type (Phase 15 addition)
  - body: null as any cast — Supabase generated types mark body non-nullable; DB column nullable since migration 0018; same pattern as deleteMessage
metrics:
  duration: "10 minutes"
  completed: "2026-04-21"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 16 Plan 02: sendImage() Hook Extension Summary

**One-liner:** Extended useChatRoom with sendImage() using crypto.randomUUID() as shared storage/DB key, optimistic local-URI insert, upload-first pipeline, and id-based Realtime dedup.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add sendImage() to UseChatRoomResult interface and hook body | 9672ca6 | src/hooks/useChatRoom.ts |

## Verification Results

- `npx tsx tests/unit/useChatRoom.imageUpload.test.ts` → 4 passed, 0 failed (exit 0)
- `npx tsc --noEmit` → no new errors (3 pre-existing errors in friends/[id].tsx, out-of-scope)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new threat surface beyond what the plan's threat model covered. T-16-05 (sender_id spoofing), T-16-06 (message_type tampering), T-16-07 (DoS via large upload — deferred to Plan 04 compression), T-16-08 (client-supplied UUID id) all handled per plan dispositions.

## Self-Check: PASSED

- [x] src/hooks/useChatRoom.ts contains `sendImage: (localUri: string, replyToId?: string)` in UseChatRoomResult interface
- [x] src/hooks/useChatRoom.ts contains `import { uploadChatMedia }` at the top
- [x] src/hooks/useChatRoom.ts return statement includes `sendImage`
- [x] sendImage body uses `crypto.randomUUID()`, `image_url: localUri`, calls `uploadChatMedia`, inserts with `id: messageId` and `body: null as any`
- [x] Commit 9672ca6 exists
- [x] 4 tests pass, exit 0
- [x] No new TypeScript errors
