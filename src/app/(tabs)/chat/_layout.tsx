import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function ChatStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface.base },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Chats' }} />
    </Stack>
  );
}
