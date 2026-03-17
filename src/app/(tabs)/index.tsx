import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useStatus } from '@/hooks/useStatus';
import { SegmentedControl } from '@/components/status/SegmentedControl';
import type { StatusValue } from '@/types/app';

export default function HomeScreen() {
  const { status, loading, saving, updateStatus } = useStatus();

  async function handleStatusChange(newStatus: StatusValue) {
    const { error } = await updateStatus(newStatus);
    if (error) Alert.alert('Error', "Couldn't update status. Try again.");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toggleContainer}>
        {loading ? (
          <ActivityIndicator color={COLORS.textSecondary} />
        ) : (
          <SegmentedControl value={status} onValueChange={handleStatusChange} saving={saving} />
        )}
      </View>

      {/* Who's Free feed placeholder — Phase 3 */}
      <View style={styles.feedPlaceholder}>
        <Text style={styles.feedHeading}>{"Who's free?"}</Text>
        <Text style={styles.feedBody}>{"Friends' statuses will appear here"}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  toggleContainer: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  feedPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  feedBody: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
