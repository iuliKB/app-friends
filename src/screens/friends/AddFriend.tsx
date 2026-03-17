import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/stores/useAuthStore';
import { SearchResultCard } from '@/components/friends/SearchResultCard';
import type { Profile } from '@/types/app';

type SearchStatus = 'idle' | 'loading' | 'pending';

export function AddFriend() {
  const session = useAuthStore((s) => s.session);
  const { searchUsers, sendRequest } = useFriends();
  const [activeTab, setActiveTab] = useState<'search' | 'qr'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState<Map<string, SearchStatus>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <View style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qr' && styles.activeTab]}
          onPress={() => setActiveTab('qr')}
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
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrPlaceholderText}>Coming soon</Text>
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
  qrPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});
