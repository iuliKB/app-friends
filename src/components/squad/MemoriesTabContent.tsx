import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { GalleryViewerModal } from '@/components/plans/GalleryViewerModal';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { useAllPlanPhotos } from '@/hooks/useAllPlanPhotos';
import type { PlanPhotoWithUploader } from '@/types/database';
import type { PlanPhotoGroup } from '@/hooks/useAllPlanPhotos';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GUTTER = SPACING.xs;
const CELL_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - GUTTER * 2) / 3;
const HERO_SIZE = CELL_SIZE * 2 + GUTTER; // 2x2 block that aligns with 3-col grid

type FilterKey = 'all' | 'mine' | 'friends';

type MemoryRow =
  | { kind: 'hero'; photos: PlanPhotoWithUploader[]; startIndex: number }
  | { kind: 'row'; photos: PlanPhotoWithUploader[]; startIndex: number };

type MemorySection = {
  title: string;
  planId: string;
  scheduledFor: string | null;
  allPhotos: PlanPhotoWithUploader[];
  data: MemoryRow[];
};

function formatPlanDateShort(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function chunkIntoRows(photos: PlanPhotoWithUploader[]): MemoryRow[] {
  if (photos.length === 0) return [];
  const rows: MemoryRow[] = [];
  let i = 0;
  // First "row" is a hero block consuming 3 photos arranged 2x2 + stacked-right.
  // Only kick in when we have enough photos to fill it.
  if (photos.length >= 3) {
    rows.push({ kind: 'hero', photos: photos.slice(0, 3), startIndex: 0 });
    i = 3;
  }
  while (i < photos.length) {
    rows.push({ kind: 'row', photos: photos.slice(i, i + 3), startIndex: i });
    i += 3;
  }
  return rows;
}

export function MemoriesTabContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { groups, isLoading, error, refetch, deletePhoto } = useAllPlanPhotos();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<PlanPhotoWithUploader[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activePlanId, setActivePlanId] = useState('');

  const currentUserId = session?.user?.id ?? '';

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

  const sections: MemorySection[] = useMemo(() => {
    return groups
      .map((group: PlanPhotoGroup) => {
        const filtered =
          filter === 'all'
            ? group.photos
            : filter === 'mine'
              ? group.photos.filter((p) => p.uploaderId === currentUserId)
              : group.photos.filter((p) => p.uploaderId !== currentUserId);
        return {
          title: group.planTitle,
          planId: group.planId,
          scheduledFor: group.planScheduledFor,
          allPhotos: filtered,
          data: chunkIntoRows(filtered),
        };
      })
      .filter((s) => s.allPhotos.length > 0);
  }, [groups, filter, currentUserId]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface.base,
        },

        // Filter chips
        filterRow: {
          flexDirection: 'row',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.sm,
          backgroundColor: colors.surface.base,
        },
        chip: {
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.xs + 2,
          borderRadius: RADII.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface.card,
        },
        chipActive: {
          backgroundColor: colors.interactive.accent,
          borderColor: colors.interactive.accent,
        },
        chipLabel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
        chipLabelActive: {
          color: colors.surface.base,
        },

        // Section header
        sectionHeader: {
          paddingTop: SPACING.xl,
          paddingBottom: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          backgroundColor: colors.surface.base,
        },
        sectionHeaderText: {
          flex: 1,
          minWidth: 0,
        },
        sectionTitle: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        sectionSubtitle: {
          marginTop: SPACING.xs,
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },

        // Grid rows
        row: {
          flexDirection: 'row',
          gap: GUTTER,
          marginBottom: GUTTER,
          paddingHorizontal: SPACING.lg,
        },
        heroRightColumn: {
          flexDirection: 'column',
          gap: GUTTER,
        },

        // Memory cell
        cell: {
          overflow: 'hidden',
          borderRadius: RADII.md,
          backgroundColor: colors.surface.card,
        },
        cellImage: {
          width: '100%',
          height: '100%',
        },
        cellGradient: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '45%',
        },
        cellAvatar: {
          position: 'absolute',
          left: SPACING.xs + 2,
          bottom: SPACING.xs + 2,
        },

        // Filtered-empty state
        filterEmpty: {
          paddingTop: SPACING.xxl,
          paddingHorizontal: SPACING.xl,
          alignItems: 'center',
        },
        filterEmptyText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
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
        <ErrorDisplay mode="screen" message="Couldn't load memories." onRetry={refetch} />
      </View>
    );
  }

  if (!isLoading && groups.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="images-outline"
          iconType="ionicons"
          heading="Memories light up here"
          body="Snap photos in your plans — they'll all gather in one place."
          ctaLabel="Browse your plans"
          onCta={() => router.push('/(tabs)/plans')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FilterChips value={filter} onChange={setFilter} styles={styles} />

      <SectionList<MemoryRow, MemorySection>
        sections={sections}
        keyExtractor={(row) => `${row.kind}-${row.startIndex}-${row.photos[0]?.id ?? 'x'}`}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: SPACING.sm,
          paddingBottom: insets.bottom + SPACING.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.interactive.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.filterEmpty}>
            <Text style={styles.filterEmptyText}>
              {filter === 'mine' ? 'No photos by you yet.' : 'No photos from friends yet.'}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Pressable
            onPress={() => router.push(`/plans/${section.planId}` as never)}
            style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`Open plan ${section.title}`}
          >
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {section.title}
              </Text>
              <Text style={styles.sectionSubtitle} numberOfLines={1}>
                {buildSubtitle(section.scheduledFor, section.allPhotos.length)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
          </Pressable>
        )}
        renderItem={({ item: row, section }) => {
          if (row.kind === 'hero') {
            const [hero, top, bottom] = row.photos;
            return (
              <View style={styles.row}>
                {hero && (
                  <MemoryCell
                    photo={hero}
                    width={HERO_SIZE}
                    height={HERO_SIZE}
                    sectionTitle={section.title}
                    onPress={() => openViewer(section.allPhotos, 0, section.planId)}
                    styles={styles}
                  />
                )}
                <View style={styles.heroRightColumn}>
                  {top && (
                    <MemoryCell
                      photo={top}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      sectionTitle={section.title}
                      onPress={() => openViewer(section.allPhotos, 1, section.planId)}
                      styles={styles}
                    />
                  )}
                  {bottom && (
                    <MemoryCell
                      photo={bottom}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      sectionTitle={section.title}
                      onPress={() => openViewer(section.allPhotos, 2, section.planId)}
                      styles={styles}
                    />
                  )}
                </View>
              </View>
            );
          }
          return (
            <View style={styles.row}>
              {row.photos.map((photo, cellIdx) => (
                <MemoryCell
                  key={photo.id}
                  photo={photo}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  sectionTitle={section.title}
                  onPress={() =>
                    openViewer(section.allPhotos, row.startIndex + cellIdx, section.planId)
                  }
                  styles={styles}
                />
              ))}
            </View>
          );
        }}
      />

      <GalleryViewerModal
        visible={viewerVisible}
        photos={viewerPhotos}
        initialIndex={viewerIndex}
        currentUserId={currentUserId}
        onClose={() => setViewerVisible(false)}
        deletePhoto={(photoId) => {
          const photo = viewerPhotos.find((p) => p.id === photoId);
          return deletePhoto(photoId, photo?.planId ?? activePlanId);
        }}
      />
    </View>
  );
}

function buildSubtitle(scheduledFor: string | null, count: number): string {
  const noun = count === 1 ? 'photo' : 'photos';
  const dateLabel = formatPlanDateShort(scheduledFor);
  return dateLabel ? `${dateLabel} · ${count} ${noun}` : `${count} ${noun}`;
}

interface FilterChipsProps {
  value: FilterKey;
  onChange: (next: FilterKey) => void;
  styles: ReturnType<typeof StyleSheet.create<any>>;
}

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'By me' },
  { key: 'friends', label: 'By friends' },
];

function FilterChips({ value, onChange, styles }: FilterChipsProps) {
  return (
    <View style={styles.filterRow}>
      {FILTER_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter: ${opt.label}`}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface MemoryCellProps {
  photo: PlanPhotoWithUploader;
  width: number;
  height: number;
  sectionTitle: string;
  onPress: () => void;
  styles: ReturnType<typeof StyleSheet.create<any>>;
}

function MemoryCell({ photo, width, height, sectionTitle, onPress, styles }: MemoryCellProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="imagebutton"
      accessibilityLabel={`Photo by ${photo.uploader.displayName} from ${sectionTitle}`}
    >
      <Animated.View style={[styles.cell, { width, height, transform: [{ scale }] }]}>
        <Image
          source={{ uri: photo.signedUrl ?? undefined }}
          style={styles.cellImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
          style={styles.cellGradient}
          pointerEvents="none"
        />
        <View style={styles.cellAvatar} pointerEvents="none">
          <AvatarCircle
            size={18}
            imageUri={photo.uploader.avatarUrl}
            displayName={photo.uploader.displayName}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}
