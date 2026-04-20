# Requirements: v1.5 Chat & Profile

## Overview

Milestone goal: Elevate chat with reactions, media, threading, and polls while cleaning up a cluttered profile into a coherent, friend-focused UX.

**Total requirements:** 13
**Categories:** Chat Enhancements (CHAT), Profile Rework (PROF)

---

## v1 Requirements

### Chat Reactions

- [ ] **CHAT-01**: User can react to any message with one of 6 preset emojis (tapback style)
- [ ] **CHAT-02**: User can remove their own reaction by tapping it again (toggle off)
- [ ] **CHAT-03**: Reaction counts display inline below the message bubble, grouped by emoji

### Media Sharing

- [ ] **CHAT-04**: User can attach a photo from their library to a chat message
- [ ] **CHAT-05**: User can take a photo with the in-app camera and send it in chat
- [ ] **CHAT-06**: Sent images display inline in the chat bubble (compressed, not as a link)

### Reply Threading

- [ ] **CHAT-07**: User can reply to a specific message; the reply shows a quoted preview of the original
- [ ] **CHAT-08**: Tapping the quoted preview scrolls to the original message (within loaded window only)

### Polls

- [ ] **CHAT-09**: User can create a poll (2–4 options, single-choice) via the chat attachment menu
- [ ] **CHAT-10**: User can vote on a poll; their selection is shown; they can change their vote
- [ ] **CHAT-11**: Poll shows live vote counts visible to all participants

### Profile Rework

- [ ] **PROF-01**: Status display removed from profile screen (home screen is the only status entry point)
- [ ] **PROF-02**: Notification toggles grouped under a single "Notifications" section header
- [ ] **PROF-03**: Edit profile details (display name, username) accessible separately from photo edit

### Friend Profile Page

- [ ] **PROF-04**: Tapping a friend's name/avatar opens a full friend profile screen
- [ ] **PROF-05**: Friend profile shows avatar, display name, current status, birthday, and wish list

---

## Future Requirements

- Message read receipts — V2 (requires presence tracking)
- Video sharing in chat — V2 (1GB free-tier storage risk)
- Open emoji picker for reactions — V2 (curated set sufficient for small groups)
- Multi-choice polls — V2 (single-choice covers 95% of use cases)
- Threaded reply view (separate screen) — V2 (inline reply sufficient for 3–15 person groups)
- Message editing / deletion — V2
- Rich media (files, GIFs) — V2
- Poll expiry / closing — V2

---

## Out of Scope

- Anonymous poll voting — Friends-only context; showing who voted is a feature not a risk
- Separate thread view — WhatsApp inline pattern correct for small groups; full thread view is V2
- Push notification for reactions — V2; avoid notification fatigue
- Profile discoverability / public profiles — Friends-only by design

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| CHAT-01 | TBD | TBD |
| CHAT-02 | TBD | TBD |
| CHAT-03 | TBD | TBD |
| CHAT-04 | TBD | TBD |
| CHAT-05 | TBD | TBD |
| CHAT-06 | TBD | TBD |
| CHAT-07 | TBD | TBD |
| CHAT-08 | TBD | TBD |
| CHAT-09 | TBD | TBD |
| CHAT-10 | TBD | TBD |
| CHAT-11 | TBD | TBD |
| PROF-01 | TBD | TBD |
| PROF-02 | TBD | TBD |
| PROF-03 | TBD | TBD |
| PROF-04 | TBD | TBD |
| PROF-05 | TBD | TBD |
