import { Stack } from 'expo-router';
import { COLORS } from '@/theme';

export default function SquadLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface.base },
        headerTintColor: COLORS.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="expenses/create" options={{ title: 'New Expense' }} />
      <Stack.Screen name="expenses/[id]" options={{ title: 'Expense Detail' }} />
    </Stack>
  );
}
