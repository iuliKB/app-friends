import { Stack } from 'expo-router';
import { FriendRequests } from '@/screens/friends/FriendRequests';

export default function FriendRequestsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Friend Requests' }} />
      <FriendRequests />
    </>
  );
}
