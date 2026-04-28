import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function FriendsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface.base },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
      }}
    />
  );
}
