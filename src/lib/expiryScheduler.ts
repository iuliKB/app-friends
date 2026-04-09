// Phase 3 v1.3 — Client-side EXPIRY-01 local notification scheduler.
// Self-notification: user's own status expiring. Client-side per CONTEXT D-01.
// Cancel previous + schedule new on every setStatus (D-02). Android Doze-mode
// delay up to ~15min accepted (D-04).
//
// Persistence rule: scheduled notification id lives in AsyncStorage so a
// cold-launched setStatus can cancel the previously-scheduled notification.
// In-memory state is lost across process kills.
//
// Consumers:
//   - src/hooks/useStatus.ts (Plan 03-05) calls scheduleExpiryNotification
//     on every setStatus and cancelExpiryNotification on signout.
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'campfire:expiry_notification_id';
const WARNING_OFFSET_MS = 30 * 60 * 1000; // 30 minutes
const MIN_LEAD_MS = 60 * 1000; // 1 minute safety margin

/**
 * Cancel any currently-scheduled expiry notification, then schedule a new one
 * at `statusExpiresAt - 30min` with categoryIdentifier='expiry_warning'.
 *
 * No-ops when:
 *   - Platform is web (no expo-notifications)
 *   - (statusExpiresAt - 30min) is within MIN_LEAD_MS of now — the Phase 2
 *     ReEngagementBanner already covers that case
 *
 * Called from useStatus.setStatus on every commit (Plan 03-05).
 */
export async function scheduleExpiryNotification(
  statusExpiresAt: Date,
  currentMoodLabel: string
): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel previous (T-03-23 mitigation: try/catch around stale id)
  const prev = await AsyncStorage.getItem(STORAGE_KEY);
  if (prev) {
    try {
      await Notifications.cancelScheduledNotificationAsync(prev);
    } catch {
      // Previously-scheduled id may be stale after OS-level clear; ignore.
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  const fireAt = new Date(statusExpiresAt.getTime() - WARNING_OFFSET_MS);
  if (fireAt.getTime() <= Date.now() + MIN_LEAD_MS) {
    // Too close — ReEngagementBanner already covers this
    return;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Still ${currentMoodLabel}?`,
      body: 'Your status expires in 30 minutes',
      categoryIdentifier: 'expiry_warning', // iOS action buttons (Plan 03-06)
      sound: 'default',
      data: { kind: 'expiry_warning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      // Phase 3 L-02 — Use the dedicated 'expiry_warning' Android channel registered
      // by Plan 03-06 in src/lib/notifications-init.ts. Runtime ordering is safe because
      // notifications-init.ts is imported at module scope from src/app/_layout.tsx (Phase 1
      // import order) before any setStatus → scheduleExpiryNotification call can fire.
      channelId: 'expiry_warning',
    },
  });
  await AsyncStorage.setItem(STORAGE_KEY, id);
}

/**
 * Cancel any currently-scheduled expiry notification. Called on signout and
 * as a defensive cleanup from scheduleExpiryNotification before reschedule.
 */
export async function cancelExpiryNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  const prev = await AsyncStorage.getItem(STORAGE_KEY);
  if (!prev) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(prev);
  } catch {
    // Stale id — ignore
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}
