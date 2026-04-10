// Phase 4 v1.3 — Morning prompt on-device scheduler (MORN-01..06).
// Mirrors src/lib/expiryScheduler.ts but uses a STABLE literal identifier
// because the prompt is daily-repeating and cancel-by-id must be idempotent
// across cold launches without AsyncStorage round-trips.
//
// D-21: exports scheduleMorningPrompt / cancelMorningPrompt / ensureMorningPromptScheduled
// D-23: fixed content — title "☀️ What's your status today?", body empty
// D-24: payload data carries ONLY { kind: 'morning_prompt' } — expiry derived
//       at tap time from response.notification.date, NOT from payload
// D-34: AsyncStorage defaults enabled='true', hour='9', minute='0'
// D-39: this module does NOT modify notifications-init.ts

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SCHEDULE_ID = 'campfire:morning_prompt';
const K_ENABLED = 'campfire:morning_prompt_enabled';
const K_HOUR = 'campfire:morning_prompt_hour';
const K_MINUTE = 'campfire:morning_prompt_minute';

export async function scheduleMorningPrompt(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(SCHEDULE_ID);
  } catch {
    // No-op: id not scheduled or OS cleared.
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: SCHEDULE_ID,
      content: {
        title: "☀️ What's your status today?",
        body: '',
        categoryIdentifier: 'morning_prompt',
        data: { kind: 'morning_prompt' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trigger: {
        hour,
        minute,
        repeats: true,
        channelId: 'morning_prompt',
      } as any,
    });
  } catch {
    // Expo Go may not support scheduled notifications with categories — swallow.
  }
}

export async function cancelMorningPrompt(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(SCHEDULE_ID);
  } catch {
    // Not scheduled — ignore.
  }
}

export async function ensureMorningPromptScheduled(): Promise<void> {
  if (Platform.OS === 'web') return;

  let enabled: string | null = null;
  let hourStr: string | null = null;
  let minuteStr: string | null = null;
  try {
    enabled = await AsyncStorage.getItem(K_ENABLED);
    hourStr = await AsyncStorage.getItem(K_HOUR);
    minuteStr = await AsyncStorage.getItem(K_MINUTE);
  } catch {
    return;
  }

  const resolvedEnabled = enabled ?? 'true';
  if (resolvedEnabled !== 'true') {
    await cancelMorningPrompt();
    return;
  }

  const hour = Number(hourStr ?? '9');
  const minute = Number(minuteStr ?? '0');
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;

  await scheduleMorningPrompt(hour, minute);
}
