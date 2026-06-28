import { useLocalSearchParams } from 'expo-router';
import { ChatMembersScreen } from '@/screens/chat/ChatMembersScreen';

export default function ChatMembersRoute() {
  const { group_channel_id, plan_id } = useLocalSearchParams<{
    group_channel_id?: string;
    plan_id?: string;
  }>();

  if (!group_channel_id && !plan_id) return null;

  return <ChatMembersScreen groupChannelId={group_channel_id} planId={plan_id} />;
}
