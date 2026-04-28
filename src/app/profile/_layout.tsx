import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function ProfileLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface.base },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="edit" options={{ headerShown: false }} />
      <Stack.Screen name="wish-list" options={{ headerShown: false }} />
    </Stack>
  );
}
