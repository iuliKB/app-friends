// Module-scope notification setup. Imported once from src/app/_layout.tsx.
// MUST be imported before any component renders so iOS categories are bound
// to the APNs registration at the first requestPermissionsAsync call.
// See .planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md D-20, D-21.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // Foreground presentation handler — SDK 55 shape (shouldShowBanner/shouldShowList).
  // shouldShowAlert is deprecated in SDK 53+; do not reintroduce.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // iOS category for the morning prompt — Free / Busy / Maybe.
  // Action handlers run inside the authenticated app (D-20) — no public Edge Function.
  // Wave 1 of v1.3 only registers the category; Phase 4 wires the response handler.
  Notifications.setNotificationCategoryAsync('morning_prompt', [
    { identifier: 'free', buttonTitle: 'Free', options: { opensAppToForeground: true } },
    { identifier: 'busy', buttonTitle: 'Busy', options: { opensAppToForeground: true } },
    { identifier: 'maybe', buttonTitle: 'Maybe', options: { opensAppToForeground: true } },
  ]).catch(() => {
    // Categories are not supported in Expo Go on iOS — safe to swallow during dev.
  });

  // Phase 3 D-17 — friend_free category: body-only, no action buttons.
  // Tap dispatches to the response listener in _layout.tsx which routes to DM.
  Notifications.setNotificationCategoryAsync('friend_free', []).catch(() => {
    // Not supported in Expo Go; safe to swallow
  });

  // Phase 3 D-17, D-18 — expiry_warning category: [Keep it] / [Heads down] actions.
  // Action identifiers are stable strings used by the response listener.
  Notifications.setNotificationCategoryAsync('expiry_warning', [
    { identifier: 'KEEP_IT', buttonTitle: 'Keep it', options: { opensAppToForeground: true } },
    {
      identifier: 'HEADS_DOWN',
      buttonTitle: 'Heads down',
      options: { opensAppToForeground: true },
    },
  ]).catch(() => {
    // Not supported in Expo Go; safe to swallow
  });

  // Android channels — D-18.
  // Existing 'default' channel from v1.0 stays dormant (Android channel IDs are immutable).
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('plan_invites', {
      name: 'Plan invites',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
    Notifications.setNotificationChannelAsync('friend_free', {
      name: 'Friend availability',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    Notifications.setNotificationChannelAsync('morning_prompt', {
      name: 'Daily status check-in',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    Notifications.setNotificationChannelAsync('system', {
      name: 'System',
      importance: Notifications.AndroidImportance.LOW,
    });
    // Phase 3 L-02 — Dedicated Android channel for expiry_warning so Android notification
    // settings show a semantically correct label ("Status expiry warnings") rather than
    // reusing the misleading "Daily status check-in" (morning_prompt) channel.
    Notifications.setNotificationChannelAsync('expiry_warning', {
      name: 'Status expiry warnings',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}
