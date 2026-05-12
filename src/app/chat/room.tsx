import { useEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ChatRoomScreen } from '@/screens/chat/ChatRoomScreen';

export default function ChatRoomRoute() {
  const { plan_id, dm_channel_id, group_channel_id, friend_name, birthday_person_id } = useLocalSearchParams<{
    plan_id?: string;
    dm_channel_id?: string;
    group_channel_id?: string;
    friend_name?: string;
    birthday_person_id?: string;
  }>();
  const navigation = useNavigation();

  useEffect(() => {
    if (friend_name) {
      navigation.setOptions({ title: friend_name });
    }
  }, [friend_name, navigation]);

  return <ChatRoomScreen planId={plan_id} dmChannelId={dm_channel_id} groupChannelId={group_channel_id} friendName={friend_name} birthdayPersonId={birthday_person_id} />;
}
