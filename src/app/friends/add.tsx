import { Stack } from 'expo-router';
import { AddFriend } from '@/screens/friends/AddFriend';

export default function AddFriendScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Add Friend' }} />
      <AddFriend />
    </>
  );
}
