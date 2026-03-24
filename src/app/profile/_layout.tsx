import { Stack } from 'expo-router';
import { COLORS } from '@/theme';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface.base },
        headerTintColor: COLORS.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="edit" options={{ title: 'Edit Profile' }} />
    </Stack>
  );
}
