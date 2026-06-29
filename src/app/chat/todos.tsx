import { useLocalSearchParams } from 'expo-router';
import { ChatTodosScreen } from '@/screens/chat/ChatTodosScreen';

export default function ChatTodosRoute() {
  const { group_channel_id, dm_channel_id, plan_id } = useLocalSearchParams<{
    group_channel_id?: string;
    dm_channel_id?: string;
    plan_id?: string;
  }>();

  if (!group_channel_id && !dm_channel_id && !plan_id) return null;

  return (
    <ChatTodosScreen
      groupChannelId={group_channel_id}
      dmChannelId={dm_channel_id}
      planId={plan_id}
    />
  );
}
