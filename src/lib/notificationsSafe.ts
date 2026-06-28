// Safe accessor for expo-notifications.
//
// expo-notifications removed Android push functionality from Expo Go in SDK 53 and
// THROWS the moment the module is imported there. Because the module is imported at
// startup (via the root layout and useStatus), that throw crashes the whole app in
// Expo Go on Android before any UI renders.
//
// Routing every import through this wrapper lets the app boot in Expo Go on Android
// for UI testing: the real module is loaded in every real environment (iOS, iOS Expo
// Go, and Android/iOS development or production builds), and ONLY Expo Go on Android
// receives a harmless no-op stub. Notifications are therefore inert in Expo Go on
// Android — use a development build to exercise them for real.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const useStub = isExpoGo && Platform.OS === 'android';

function createStub(): typeof import('expo-notifications') {
  const asyncNoop = async () => undefined;
  const permissionResult = async () => ({
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
    expires: 'never',
  });

  // Known members that callers read as values (enums, constants) or whose return
  // shape is destructured. Everything else falls through to a no-op async function.
  const members: Record<string, unknown> = {
    AndroidImportance: { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5, NONE: 0, UNSPECIFIED: -1 },
    AndroidNotificationVisibility: { UNKNOWN: 0, PUBLIC: 1, PRIVATE: 2, SECRET: 3 },
    SchedulableTriggerInputTypes: {
      DATE: 'date',
      TIME_INTERVAL: 'timeInterval',
      DAILY: 'daily',
      WEEKLY: 'weekly',
      MONTHLY: 'monthly',
      YEARLY: 'yearly',
    },
    DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
    getPermissionsAsync: permissionResult,
    requestPermissionsAsync: permissionResult,
    getExpoPushTokenAsync: async () => ({ data: '', type: 'expo' }),
    getDevicePushTokenAsync: async () => ({ data: '', type: 'android' }),
    addNotificationResponseReceivedListener: () => ({ remove() {} }),
    addNotificationReceivedListener: () => ({ remove() {} }),
    addNotificationsDroppedListener: () => ({ remove() {} }),
    setNotificationHandler: () => undefined,
  };

  return new Proxy(members, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return asyncNoop;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

const Notifications: typeof import('expo-notifications') = useStub
  ? createStub()
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('expo-notifications') as typeof import('expo-notifications'));

export default Notifications;
