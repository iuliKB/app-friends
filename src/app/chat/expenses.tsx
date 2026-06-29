import { useLocalSearchParams } from 'expo-router';
import { ChatExpensesScreen } from '@/screens/chat/ChatExpensesScreen';

export default function ChatExpensesRoute() {
  const { group_channel_id, plan_id, friend_id } = useLocalSearchParams<{
    group_channel_id?: string;
    plan_id?: string;
    friend_id?: string;
  }>();

  if (!group_channel_id && !plan_id && !friend_id) return null;

  return (
    <ChatExpensesScreen groupChannelId={group_channel_id} planId={plan_id} friendId={friend_id} />
  );
}
