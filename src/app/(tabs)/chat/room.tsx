import { useEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ChatRoomScreen } from '@/screens/chat/ChatRoomScreen';

export default function ChatRoomRoute() {
  const { plan_id, dm_channel_id, friend_name } = useLocalSearchParams<{
    plan_id?: string;
    dm_channel_id?: string;
    friend_name?: string;
  }>();
  const navigation = useNavigation();

  useEffect(() => {
    if (friend_name) {
      navigation.setOptions({ title: friend_name });
    }
  }, [friend_name, navigation]);

  return (
    <ChatRoomScreen
      planId={plan_id}
      dmChannelId={dm_channel_id}
      friendName={friend_name}
    />
  );
}
