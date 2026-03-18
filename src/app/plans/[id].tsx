import { useLocalSearchParams } from 'expo-router';
import { PlanDashboardScreen } from '@/screens/plans/PlanDashboardScreen';

export default function PlanDashboardRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <PlanDashboardScreen planId={id} />;
}
