// Phase 30 — Single chat-entry helper.
// Consolidates 13 inline `router.push('/chat/room?...')` callsites and the 8
// duplicate `get_or_create_dm_channel` + push pairs into one signature.
//
// Plan 05 migrates every callsite to this helper. The helper accepts `router`
// as its first arg so it works in both render contexts (useRouter) and
// non-render contexts (top-level router import in src/app/_layout.tsx).
//
// The helper owns: the push URL, the DM create-or-get RPC, and the default
// error alert. It does NOT own: haptics (caller), action-sheet close (caller),
// birthday-group creation RPC (caller, with explicit invalidateChatList side
// effect), or any pre-flight loading-state UI beyond the optional
// onLoadingChange callback.

import { Alert } from 'react-native';
import type { Router } from 'expo-router';
import { supabase } from '@/lib/supabase';

/** Five distinct entry shapes for `/chat/room`. The kind discriminator selects
 * the branch and gates which other params are required. */
export type OpenChatParams =
  | { kind: 'dmChannel'; dmChannelId: string; friendName: string }
  | { kind: 'dmFriend'; friendId: string; friendName: string }
  | { kind: 'plan'; planId: string }
  | { kind: 'group'; groupChannelId: string; friendName: string; birthdayPersonId?: string };

export interface OpenChatOptions {
  /** When true, errors return silently without firing Alert. Used by the
   * notification dispatcher in src/app/_layout.tsx where there is no UI
   * surface to alert against. */
  silentError?: boolean;
  /** Loading-state callback invoked with `true` before any awaited work and
   * `false` after success or error. Used by sheet-based callsites
   * (e.g. squad.tsx) that toggle a `loadingDM` flag. Called exactly twice
   * per invocation when the variant performs an RPC, or not at all for
   * synchronous variants (plan, group, dmChannel). */
  onLoadingChange?: (loading: boolean) => void;
}

/** The alert copy used by 7 of 8 inline DM blocks. Preserved verbatim so the
 * migration is a no-op visually. */
function alertError(silent: boolean | undefined): void {
  if (silent) return;
  Alert.alert('Error', "Couldn't open chat. Try again.");
}

function buildDmUrl(dmChannelId: string, friendName: string): string {
  return `/chat/room?dm_channel_id=${dmChannelId}&friend_name=${encodeURIComponent(friendName)}`;
}

function buildPlanUrl(planId: string): string {
  return `/chat/room?plan_id=${planId}`;
}

function buildGroupUrl(
  groupChannelId: string,
  friendName: string,
  birthdayPersonId: string | undefined
): string {
  const base = `/chat/room?group_channel_id=${groupChannelId}&friend_name=${encodeURIComponent(friendName)}`;
  return birthdayPersonId ? `${base}&birthday_person_id=${birthdayPersonId}` : base;
}

/**
 * Open the chat room for any of the five canonical entry shapes.
 *
 * Accepts `router` rather than calling `useRouter()` inside, because:
 * 1. Two callsites (notification dispatcher in _layout.tsx, action-sheet
 *    handler in squad.tsx after sheet close) live outside the render tree
 *    or in event handlers where the caller already holds a router.
 * 2. Hooks cannot be called conditionally; making this a hook would force
 *    callers to invoke it at the top of their component.
 *
 * Errors:
 * - DM-by-friend-id RPC failure -> Alert (or silent if `silentError`); no push.
 * - All other variants -> no awaited work, no error path.
 */
export async function openChat(
  router: Router,
  params: OpenChatParams,
  options?: OpenChatOptions
): Promise<void> {
  if (params.kind === 'dmChannel') {
    router.push(buildDmUrl(params.dmChannelId, params.friendName) as never);
    return;
  }

  if (params.kind === 'plan') {
    router.push(buildPlanUrl(params.planId) as never);
    return;
  }

  if (params.kind === 'group') {
    router.push(
      buildGroupUrl(params.groupChannelId, params.friendName, params.birthdayPersonId) as never
    );
    return;
  }

  // params.kind === 'dmFriend' — the only branch with a pre-push RPC.
  options?.onLoadingChange?.(true);
  const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
    other_user_id: params.friendId,
  });
  options?.onLoadingChange?.(false);

  if (error || !data) {
    alertError(options?.silentError);
    return;
  }

  router.push(buildDmUrl(data, params.friendName) as never);
}
