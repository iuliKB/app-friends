import { useLocalSearchParams } from 'expo-router';
import { ChatRoomScreen } from '@/screens/chat/ChatRoomScreen';

export default function ChatRoomRoute() {
  const { plan_id, dm_channel_id, group_channel_id, friend_name, avatar_url, birthday_person_id } =
    useLocalSearchParams<{
      plan_id?: string;
      dm_channel_id?: string;
      group_channel_id?: string;
      friend_name?: string;
      avatar_url?: string;
      birthday_person_id?: string;
    }>();

  // Header title (DM avatar+name / group avatar+name) is owned by ChatRoomScreen
  // so all three chat types set their header in one place.
  return (
    <ChatRoomScreen
      planId={plan_id}
      dmChannelId={dm_channel_id}
      groupChannelId={group_channel_id}
      friendName={friend_name}
      avatarUrl={avatar_url}
      birthdayPersonId={birthday_person_id}
    />
  );
}
