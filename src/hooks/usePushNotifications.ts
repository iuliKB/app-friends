import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const NOTIFICATIONS_ENABLED_KEY = 'campfire:notifications_enabled';
const PUSH_PROMPT_ELIGIBLE_KEY = 'campfire:push_prompt_eligible';
const PUSH_PRE_PROMPT_SEEN_KEY = 'campfire:push_pre_prompt_seen';

function getDeviceId(): string {
  // D-14: stable per-install identifier.
  // Reinstalls produce a fresh device_id; the old row is reaped via
  // last_seen_at staleness or DeviceNotRegistered ticket error (Plan 07).
  return (
    Device.osInternalBuildId ??
    Constants.installationId ??
    `fallback:${Constants.sessionId ?? 'unknown'}`
  );
}

export async function markPushPromptEligible(): Promise<void> {
  await AsyncStorage.setItem(PUSH_PROMPT_ELIGIBLE_KEY, 'true');
}

export async function isPushPromptEligible(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_PROMPT_ELIGIBLE_KEY)) === 'true';
}

export async function markPushPrePromptSeen(): Promise<void> {
  await AsyncStorage.setItem(PUSH_PRE_PROMPT_SEEN_KEY, 'true');
}

export async function hasPushPrePromptSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_PRE_PROMPT_SEEN_KEY)) === 'true';
}

export type RegisterResult =
  | 'registered'
  | 'skipped'
  | 'not_eligible'
  | 'needs_pre_prompt'
  | 'permission_denied';

/**
 * Register the device's Expo push token. Idempotent — safe to call on every
 * session-ready transition and every AppState 'active' event (PUSH-01, PUSH-02).
 *
 * Gate ordering (D-01..D-03, PUSH-08):
 *   1. Device.isDevice → else 'skipped'
 *   2. Local opt-out flag → else 'skipped'
 *   3. OS permission already granted → proceed to upsert, return 'registered'
 *   4. skipEligibilityCheck === true → call requestPermissionsAsync directly
 *      (caller is the pre-prompt Accept path or the Profile toggle ON path)
 *   5. Eligibility flag not set → 'not_eligible' (no prompts of any kind)
 *   6. Eligibility flag set BUT pre-prompt not yet seen → 'needs_pre_prompt'
 *      (caller must render <PrePromptModal>; DOES NOT call requestPermissionsAsync)
 *   7. Pre-prompt already seen (e.g. user previously declined and is in a
 *      re-entry path) → call requestPermissionsAsync directly
 */
export async function registerForPushNotifications(
  userId: string,
  opts: { skipEligibilityCheck?: boolean } = {}
): Promise<RegisterResult> {
  if (!Device.isDevice) return 'skipped';

  // Per-device opt-out (D-12)
  const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  if (enabled === 'false') return 'skipped';

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    if (!opts.skipEligibilityCheck) {
      // D-01: only ask when user has earned a meaningful moment
      if (!(await isPushPromptEligible())) {
        return 'not_eligible';
      }
      // D-02: value-led pre-prompt MUST be shown before the native iOS prompt.
      // If we haven't shown it yet, bail out and let the caller render the modal.
      if (!(await hasPushPrePromptSeen())) {
        return 'needs_pre_prompt';
      }
    }
    // Either skipEligibilityCheck is true (pre-prompt Accept / Profile toggle ON)
    // OR the pre-prompt has already been seen. Safe to fire the native prompt.
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return 'permission_denied';

  const projectId = Constants?.easConfig?.projectId ?? Constants?.expoConfig?.extra?.eas?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const deviceId = getDeviceId();

  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      device_id: deviceId,
      token,
      platform: Platform.OS,
      last_seen_at: new Date().toISOString(),
      invalidated_at: null,
    },
    { onConflict: 'user_id,device_id' }
  );

  return 'registered';
}

/**
 * Hard-delete the device's token row server-side (D-12) and set the local opt-out flag.
 */
export async function unregisterForPushNotifications(userId: string): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
  const deviceId = getDeviceId();
  await supabase.from('push_tokens').delete().eq('user_id', userId).eq('device_id', deviceId);
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return stored !== 'false';
}

export async function setNotificationsEnabledFlag(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
}
