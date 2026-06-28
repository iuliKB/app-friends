import { useLocalSearchParams } from 'expo-router';
import { DmInfoScreen } from '@/screens/chat/DmInfoScreen';

export default function DmInfoRoute() {
  const { dm_channel_id, friend_name, avatar_url } = useLocalSearchParams<{
    dm_channel_id?: string;
    friend_name?: string;
    avatar_url?: string;
  }>();

  if (!dm_channel_id) return null;

  return (
    <DmInfoScreen
      dmChannelId={dm_channel_id}
      friendName={friend_name ?? ''}
      avatarUrl={avatar_url}
    />
  );
}
