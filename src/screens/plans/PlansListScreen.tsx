import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { usePlans } from '@/hooks/usePlans';
import { PlanCard } from '@/components/plans/PlanCard';
import type { PlanWithMembers } from '@/types/plans';

export function PlansListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plans, error, refreshing, handleRefresh } = usePlans();

  return (
    <View style={styles.root}>
      <FlatList<PlanWithMembers>
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlanCard plan={item} onPress={() => router.push(`/plans/${item.id}` as never)} />
        )}
        ListHeaderComponent={<Text style={styles.heading}>{'Your Plans'}</Text>}
        ListEmptyComponent={
          error ? (
            <Text style={styles.errorText}>{"Couldn't load plans. Pull down to try again."}</Text>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyHeading}>{'No active plans'}</Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.textSecondary}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push('/plan-create')}
        activeOpacity={0.8}
        accessibilityLabel="New Plan"
      >
        <Ionicons name="add" size={24} color={COLORS.dominant} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingTop: 24,
    paddingBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  emptyState: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  separator: {
    height: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
