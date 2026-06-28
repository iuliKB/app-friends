import { useLocalSearchParams } from 'expo-router';
import { GroupInfoScreen } from '@/screens/chat/GroupInfoScreen';

export default function GroupInfoRoute() {
  const { group_channel_id, birthday_person_id } = useLocalSearchParams<{
    group_channel_id?: string;
    birthday_person_id?: string;
  }>();

  if (!group_channel_id) return null;

  return (
    <GroupInfoScreen groupChannelId={group_channel_id} birthdayPersonId={birthday_person_id} />
  );
}
