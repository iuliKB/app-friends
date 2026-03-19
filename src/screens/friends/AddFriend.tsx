import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/stores/useAuthStore';
import { SearchResultCard } from '@/components/friends/SearchResultCard';
import { QRScanView } from '@/components/friends/QRScanView';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import type { Profile } from '@/types/app';

type SearchStatus = 'idle' | 'loading' | 'pending';
type ScanState = 'scanning' | 'loading' | 'loaded' | 'error';

export function AddFriend() {
  const session = useAuthStore((s) => s.session);
  const { searchUsers, sendRequest } = useFriends();
  const [activeTab, setActiveTab] = useState<'search' | 'qr'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState<Map<string, SearchStatus>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // QR scan state
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scannedProfile, setScannedProfile] = useState<Profile | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [qrRequestStatus, setQrRequestStatus] = useState<SearchStatus>('idle');

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setHasSearched(true);
      const { data } = await searchUsers(q);
      setResults(data ?? []);
    },
    [searchUsers]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  async function handleAddFriend(profile: Profile) {
    setRequestStatuses((prev) => new Map(prev).set(profile.id, 'loading'));
    const { error } = await sendRequest(profile.id);
    if (error) {
      if (error.message === 'Friend request already sent.') {
        setRequestStatuses((prev) => new Map(prev).set(profile.id, 'pending'));
        Alert.alert('Info', 'Friend request already sent.');
      } else {
        setRequestStatuses((prev) => {
          const next = new Map(prev);
          next.delete(profile.id);
          return next;
        });
        Alert.alert('Error', "Couldn't send friend request. Try again.");
      }
    } else {
      setRequestStatuses((prev) => new Map(prev).set(profile.id, 'pending'));
    }
  }

  function getProfileStatus(profileId: string): SearchStatus {
    return requestStatuses.get(profileId) ?? 'idle';
  }

  function handleTabChange(tab: 'search' | 'qr') {
    setActiveTab(tab);
    if (tab === 'qr') {
      // Reset scan state when switching to QR tab
      setScanState('scanning');
      setScannedProfile(null);
      setScanErrorMessage(null);
      setQrRequestStatus('idle');
    }
  }

  async function handleScanned(uuid: string) {
    setScanState('loading');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at, updated_at')
      .eq('id', uuid)
      .maybeSingle();

    if (error || !data) {
      setScanState('error');
      setScanErrorMessage('QR code not recognized. Try again.');
      return;
    }

    setScannedProfile(data as Profile);
    setScanState('loaded');
    setQrRequestStatus('idle');
  }

  function handleScanAgain() {
    setScanState('scanning');
    setScannedProfile(null);
    setScanErrorMessage(null);
    setQrRequestStatus('idle');
  }

  async function handleQRAddFriend() {
    if (!scannedProfile) return;
    setQrRequestStatus('loading');
    const { error } = await sendRequest(scannedProfile.id);
    if (error) {
      if (error.message === 'Friend request already sent.') {
        setQrRequestStatus('pending');
        Alert.alert('Info', 'Friend request already sent.');
      } else {
        setQrRequestStatus('idle');
        Alert.alert('Error', "Couldn't send friend request. Try again.");
      }
    } else {
      setQrRequestStatus('pending');
    }
  }

  return (
    <View style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => handleTabChange('search')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qr' && styles.activeTab]}
          onPress={() => handleTabChange('qr')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'qr' && styles.activeTabText]}>QR</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' ? (
        <>
          {/* Search input */}
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={COLORS.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor={COLORS.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Results */}
          {!hasSearched ? (
            <View style={styles.placeholderContainer}>
              <Ionicons name="search-outline" size={48} color={COLORS.border} />
              <Text style={styles.placeholderText}>Search by username to add friends</Text>
            </View>
          ) : results.length === 0 ? (
            <Text style={styles.noResultsText}>No user found for &quot;@{query}&quot;</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SearchResultCard
                  profile={item}
                  status={getProfileStatus(item.id)}
                  onAddFriend={() => handleAddFriend(item)}
                  isSelf={item.id === session?.user.id}
                />
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      ) : (
        <View style={styles.qrContainer}>
          {scanState === 'scanning' && <QRScanView onScanned={handleScanned} />}

          {scanState === 'loading' && <LoadingIndicator color={COLORS.textPrimary} />}

          {scanState === 'error' && (
            <View style={styles.qrErrorContainer}>
              <Text style={styles.qrErrorText}>{scanErrorMessage}</Text>
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={handleScanAgain}
                activeOpacity={0.8}
              >
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {scanState === 'loaded' && scannedProfile && (
            <View style={styles.scannedCardContainer}>
              <View style={styles.scannedCard}>
                <AvatarCircle
                  size={48}
                  imageUri={scannedProfile.avatar_url}
                  displayName={scannedProfile.display_name}
                />
                <View style={styles.scannedInfo}>
                  <Text style={styles.scannedDisplayName}>{scannedProfile.display_name}</Text>
                  <Text style={styles.scannedUsername}>@{scannedProfile.username}</Text>
                </View>
              </View>

              {scannedProfile.id === session?.user.id ? (
                <Text style={styles.selfScanText}>This is your own QR code</Text>
              ) : (
                <>
                  {qrRequestStatus === 'pending' ? (
                    <View style={styles.pendingButton}>
                      <Text style={styles.pendingButtonText}>Pending</Text>
                    </View>
                  ) : (
                    <View style={styles.addFriendButton}>
                      <PrimaryButton
                        title="Add Friend"
                        onPress={handleQRAddFriend}
                        loading={qrRequestStatus === 'loading'}
                        disabled={qrRequestStatus === 'loading'}
                      />
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={handleScanAgain}
                activeOpacity={0.8}
              >
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.border,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 52,
    marginTop: 16,
    marginHorizontal: 16,
    paddingLeft: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  qrContainer: {
    flex: 1,
  },
  qrErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  qrErrorText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.destructive,
    textAlign: 'center',
    marginTop: 16,
  },
  scannedCardContainer: {
    padding: 16,
    alignItems: 'stretch',
  },
  scannedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
  },
  scannedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  scannedDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scannedUsername: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  selfScanText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  addFriendButton: {
    marginTop: 12,
  },
  pendingButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  scanAgainButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});
