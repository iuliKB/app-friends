import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const NOTIFICATIONS_ENABLED_KEY = 'campfire:notifications_enabled';

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  // Check user preference — default on (null means enabled)
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  if (stored === 'false') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Plan invites',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants?.easConfig?.projectId ?? Constants?.expoConfig?.extra?.eas?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: 'user_id,token' });
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  // null means not set — default is enabled
  return stored !== 'false';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
}
