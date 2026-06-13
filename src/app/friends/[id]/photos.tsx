// Phase 33 — Shared photos grid route for the friend profile.
//
// Mounts useAllPlanPhotos() (full photo library) and useFriendMutuals(friendId)
// to get sharedPlanIds, then filters the groups to only shared plans.
// Analog: MemoriesTabContent.tsx (same photo grid + GalleryViewerModal pattern).
//
// Route: /friends/[id]/photos
// Accessed via Photos quick action on FriendProfileScreen.

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { useAllPlanPhotos, type PlanPhotoGroup } from '@/hooks/useAllPlanPhotos';
import { useFriendMutuals } from '@/hooks/useFriendMutuals';
import { useAuthStore } from '@/stores/useAuthStore';
import { GalleryViewerModal } from '@/components/plans/GalleryViewerModal';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import type { PlanPhotoWithUploader } from '@/types/database';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GUTTER = SPACING.xs;
const CELL_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - GUTTER * 2) / 3;

type PhotoRow = { photos: PlanPhotoWithUploader[]; startIndex: number };

type PhotoSection = {
  title: string;
  planId: string;
  allPhotos: PlanPhotoWithUploader[];
  data: PhotoRow[];
};

function chunkPhotos(photos: PlanPhotoWithUploader[]): PhotoRow[] {
  const rows: PhotoRow[] = [];
  for (let i = 0; i < photos.length; i += 3) {
    rows.push({ photos: photos.slice(i, i + 3), startIndex: i });
  }
  return rows;
}

export default function SharedPhotosScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const friendId = (Array.isArray(params.id) ? params.id[0] : (params.id ?? '')) ?? '';
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? '';

  const { groups, isLoading, error, refetch } = useAllPlanPhotos();
  const { data: mutuals } = useFriendMutuals(friendId);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<PlanPhotoWithUploader[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Filter to only plans shared with this friend
  const sharedSet = new Set(mutuals?.sharedPlanIds ?? []);
  const filteredGroups = groups.filter((g: PlanPhotoGroup) => sharedSet.has(g.planId));

  const sections: PhotoSection[] = useMemo(
    () =>
      filteredGroups.map((g) => ({
        title: g.planTitle,
        planId: g.planId,
        allPhotos: g.photos,
        data: chunkPhotos(g.photos),
      })),
    [filteredGroups]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.base,
        },
        emptyContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACING.xxl,
          backgroundColor: colors.surface.base,
        },
        emptyHeading: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          marginTop: SPACING.md,
        },
        emptyBody: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          marginTop: SPACING.sm,
        },
        sectionHeader: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.sm,
          backgroundColor: colors.surface.base,
        },
        sectionTitle: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        },
        row: {
          flexDirection: 'row',
          paddingHorizontal: SPACING.lg,
          gap: GUTTER,
          marginBottom: GUTTER,
        },
        cell: {
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: RADII.sm,
          overflow: 'hidden',
          backgroundColor: colors.surface.card,
        },
        cellImage: {
          width: CELL_SIZE,
          height: CELL_SIZE,
        },
      }),
    [colors]
  );

  if (isLoading && groups.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Shared photos' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.interactive.accent} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Shared photos' }} />
        <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
          <ErrorDisplay mode="screen" message="Couldn't load shared photos." onRetry={refetch} />
        </View>
      </>
    );
  }

  if (!isLoading && filteredGroups.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Shared photos' }} />
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color={colors.text.secondary} />
          <Text style={styles.emptyHeading}>No shared photos yet</Text>
          <Text style={styles.emptyBody}>
            Photos from plans you both attended will appear here.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Shared photos' }} />
      <View style={styles.container}>
        <SectionList<PhotoRow, PhotoSection>
          sections={sections}
          keyExtractor={(row) => `${row.startIndex}-${row.photos[0]?.id ?? 'x'}`}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, section }) => (
            <View style={styles.row}>
              {item.photos.map((photo, photoIdx) => (
                <Pressable
                  key={photo.id}
                  style={styles.cell}
                  onPress={() => {
                    setViewerPhotos(section.allPhotos);
                    setViewerIndex(item.startIndex + photoIdx);
                    setViewerVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View photo"
                >
                  <Image
                    source={{ uri: photo.signedUrl ?? '' }}
                    style={styles.cellImage}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          )}
        />

        <GalleryViewerModal
          visible={viewerVisible}
          photos={viewerPhotos}
          initialIndex={viewerIndex}
          currentUserId={currentUserId}
          deletePhoto={() => Promise.resolve({ error: null })}
          onClose={() => setViewerVisible(false)}
        />
      </View>
    </>
  );
}
