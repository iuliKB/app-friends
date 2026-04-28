import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function SquadLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface.base },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="expenses/create" options={{ title: 'New Expense' }} />
      <Stack.Screen name="expenses/[id]" options={{ title: 'Expense Detail' }} />
      <Stack.Screen name="expenses/index" options={{ title: 'Balances' }} />
      <Stack.Screen name="expenses/friend/[id]" options={{ title: 'Expenses' }} />
      <Stack.Screen name="birthday/[id]" options={{ title: 'Birthday' }} />
    </Stack>
  );
}
