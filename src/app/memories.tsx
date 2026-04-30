import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { GalleryViewerModal } from '@/components/plans/GalleryViewerModal';
import { EmptyState } from '@/components/common/EmptyState';
import { useAllPlanPhotos } from '@/hooks/useAllPlanPhotos';
import type { PlanPhotoWithUploader } from '@/types/database';
import type { PlanPhotoGroup } from '@/hooks/useAllPlanPhotos';

const CELL_SIZE = (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.xs * 2) / 3;

function chunkPhotos(photos: PlanPhotoWithUploader[], size = 3): PlanPhotoWithUploader[][] {
  const rows: PlanPhotoWithUploader[][] = [];
  for (let i = 0; i < photos.length; i += size) {
    rows.push(photos.slice(i, i + size));
  }
  return rows;
}

type MemorySection = {
  title: string;
  planId: string;
  allPhotos: PlanPhotoWithUploader[];
  data: PlanPhotoWithUploader[][];
};

export default function MemoriesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const { groups, isLoading, refetch, deletePhoto } = useAllPlanPhotos();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<PlanPhotoWithUploader[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activePlanId, setActivePlanId] = useState('');

  // useFocusEffect — re-fetch signed URLs on screen focus
  // Import MUST be from 'expo-router', not '@react-navigation/native'
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id])
  );

  function openViewer(sectionPhotos: PlanPhotoWithUploader[], index: number, planId: string) {
    setViewerPhotos(sectionPhotos);
    setViewerIndex(index);
    setActivePlanId(planId);
    setViewerVisible(true);
  }

  const sections: MemorySection[] = useMemo(
    () =>
      groups.map((group: PlanPhotoGroup) => ({
        title: group.planTitle,
        planId: group.planId,
        allPhotos: group.photos,
        data: chunkPhotos(group.photos, 3),
      })),
    [groups]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        sectionHeaderContainer: {
          paddingTop: SPACING.xl,
          paddingBottom: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          backgroundColor: colors.surface.base,
        },
        sectionTitle: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          marginBottom: SPACING.sm,
        },
        sectionDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
        },
        row: {
          flexDirection: 'row',
          gap: SPACING.xs,
          marginBottom: SPACING.xs,
          paddingHorizontal: SPACING.lg,
        },
        cell: {
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: RADII.sm,
          backgroundColor: colors.surface.card,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface.base,
        },
      }),
    [colors]
  );

  const stackScreenOptions = useMemo(
    () => ({
      title: 'Memories',
      headerStyle: { backgroundColor: colors.surface.base },
      headerTintColor: colors.text.primary,
      headerShadowVisible: false,
    }),
    [colors]
  );

  if (isLoading && groups.length === 0) {
    return (
      <>
        <Stack.Screen options={stackScreenOptions} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.interactive.accent} />
        </View>
      </>
    );
  }

  if (!isLoading && groups.length === 0) {
    return (
      <>
        <Stack.Screen options={stackScreenOptions} />
        <View style={styles.container}>
          <EmptyState
            icon="images-outline"
            iconType="ionicons"
            heading="No memories yet"
            body="Photos from your plans will appear here"
          />
        </View>
      </>
    );
  }

  return (
    <>
      {/* Re-enables native Stack header with back arrow — same pattern as friends/[id].tsx */}
      <Stack.Screen options={stackScreenOptions} />

      <SectionList<PlanPhotoWithUploader[], MemorySection>
        sections={sections}
        keyExtractor={(row, i) => `${(row[0] as PlanPhotoWithUploader | undefined)?.id ?? i}`}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: SPACING.xl,
          paddingBottom: insets.bottom + SPACING.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.interactive.accent}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {section.title}
            </Text>
            <View style={styles.sectionDivider} />
          </View>
        )}
        renderItem={({ item: row, section }) => (
          <View style={styles.row}>
            {row.map((photo) => {
              const globalIdx = section.allPhotos.indexOf(photo);
              return (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => openViewer(section.allPhotos, globalIdx, section.planId)}
                  activeOpacity={0.85}
                  accessibilityLabel={`Photo from ${section.title}`}
                >
                  <Image
                    source={{ uri: photo.signedUrl ?? undefined }}
                    style={styles.cell}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      {/* GalleryViewerModal — same component as Phase 22, reused as-is */}
      <GalleryViewerModal
        visible={viewerVisible}
        photos={viewerPhotos}
        initialIndex={viewerIndex}
        currentUserId={session?.user?.id ?? ''}
        onClose={() => setViewerVisible(false)}
        deletePhoto={(photoId) => deletePhoto(photoId, activePlanId)}
      />
    </>
  );
}
