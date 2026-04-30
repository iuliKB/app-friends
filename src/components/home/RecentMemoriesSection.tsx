import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useAllPlanPhotos } from '@/hooks/useAllPlanPhotos';
import type { PlanPhotoWithUploader } from '@/types/database';

const THUMB_SIZE = 72;

export function RecentMemoriesSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const { recentPhotos, isLoading } = useAllPlanPhotos();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginBottom: SPACING.lg,
        },
        headerWrapper: {
          paddingHorizontal: SPACING.lg,
        },
        seeAllText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.accent,
        },
        flatList: {
          // REQUIRED — prevents height collapse inside outer ScrollView (RESEARCH.md Pitfall 1)

          height: 104,
        },
        listContent: {
          paddingLeft: SPACING.lg,
          paddingRight: SPACING.sm,
        },
        thumbContainer: {
          alignItems: 'center',
          gap: SPACING.xs,
        },
        thumb: {
          width: THUMB_SIZE,

          height: THUMB_SIZE,
          borderRadius: RADII.sm,
          backgroundColor: colors.surface.card,
        },
        caption: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,

          maxWidth: 80,
        },
        loadingContainer: {
          height: 104,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [colors]
  );

  // D-03: Widget hidden entirely when no photos exist
  if (!isLoading && recentPhotos.length === 0) return null;

  // D-11: "See all" navigates to /memories
  const seeAllAction = (
    <TouchableOpacity
      onPress={() => router.push('/memories')}
      hitSlop={8}
      accessibilityLabel="See all memories"
    >
      <Text style={styles.seeAllText}>See all</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <SectionHeader title="Recent Memories" rightAction={seeAllAction} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.interactive.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <SectionHeader title="Recent Memories" rightAction={seeAllAction} />
      </View>
      <FlatList<PlanPhotoWithUploader & { planTitle?: string }>
        data={recentPhotos as (PlanPhotoWithUploader & { planTitle?: string })[]}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: SPACING.sm }} />}
        style={styles.flatList}
        renderItem={({ item }) => (
          // D-12: Tapping thumbnail navigates to /memories (not inline viewer)
          <TouchableOpacity
            style={styles.thumbContainer}
            onPress={() => router.push('/memories')}
            activeOpacity={0.85}
            accessibilityLabel={`Photo from ${item.planTitle ?? ''}`}
          >
            <Image
              source={{ uri: item.signedUrl ?? undefined }}
              style={styles.thumb}
              contentFit="cover"
            />
            {/* D-02: Plan name caption below thumbnail */}
            <Text style={styles.caption} numberOfLines={1}>
              {item.planTitle ?? ''}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
