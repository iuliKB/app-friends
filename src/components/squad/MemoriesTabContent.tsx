import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { GalleryViewerModal } from '@/components/plans/GalleryViewerModal';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
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

export function MemoriesTabContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const { groups, isLoading, error, refetch, deletePhoto } = useAllPlanPhotos();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<PlanPhotoWithUploader[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activePlanId, setActivePlanId] = useState('');

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

  if (isLoading && groups.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.interactive.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay
          mode="screen"
          message="Couldn't load memories."
          onRetry={refetch}
        />
      </View>
    );
  }

  if (!isLoading && groups.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="images-outline"
          iconType="ionicons"
          heading="No memories yet"
          body="Photos from your plans will appear here"
        />
      </View>
    );
  }

  return (
    <>
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
        renderItem={({ item: row, section }) => {
          const rowIdx = section.data.indexOf(row);
          const rowStart = rowIdx * 3;
          return (
            <View style={styles.row}>
              {row.map((photo, cellIdx) => {
                const globalIdx = rowStart + cellIdx;
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
          );
        }}
      />

      <GalleryViewerModal
        visible={viewerVisible}
        photos={viewerPhotos}
        initialIndex={viewerIndex}
        currentUserId={session?.user?.id ?? ''}
        onClose={() => setViewerVisible(false)}
        deletePhoto={(photoId) => {
          const photo = viewerPhotos.find((p) => p.id === photoId);
          return deletePhoto(photoId, photo?.planId ?? activePlanId);
        }}
      />
    </>
  );
}
