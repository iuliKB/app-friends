import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Campfire',
  slug: 'campfire',
  scheme: 'campfire',
  version: '1.2.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#ff6b35',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.campfire.app',
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'Campfire uses your photo library to set a cover image for your plans.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#ff6b35',
    },
    package: 'com.campfire.app',
  },
  plugins: [
    'expo-router',
    '@react-native-community/datetimepicker',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#ff6b35',
        mode: 'production',
      },
    ],
  ],
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
