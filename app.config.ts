import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Campfire',
  slug: 'campfire',
  scheme: 'campfire',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    backgroundColor: '#ff6b35',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.campfire.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#ff6b35',
    },
    package: 'com.campfire.app',
  },
  plugins: ['expo-router', '@react-native-community/datetimepicker', 'expo-notifications'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'YOUR_EAS_PROJECT_UUID',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
