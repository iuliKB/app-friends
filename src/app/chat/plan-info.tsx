import { useLocalSearchParams } from 'expo-router';
import { PlanInfoScreen } from '@/screens/chat/PlanInfoScreen';

export default function PlanInfoRoute() {
  const { plan_id } = useLocalSearchParams<{ plan_id?: string }>();

  if (!plan_id) return null;

  return <PlanInfoScreen planId={plan_id} />;
}
