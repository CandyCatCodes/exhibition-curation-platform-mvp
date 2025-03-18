import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Import Platform for potential platform-specific styling
import { View, Text, Button, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
// Import unified types and new service functions
import { getArtworks, UnifiedArtwork, UnifiedArtworksResponse, ApiSource } from '../services/api';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [artworks, setArtworks] = useState<UnifiedArtwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<ApiSource | 'all'>('all'); // Default to 'all'
  const [totalRecords, setTotalRecords] = useState<number>(0); // Store total records info
  // State for sorting
  const [sortField, setSortField] = useState<'title' | 'artist' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // State for 'all' source infinite scroll
  const [aicPageForAll, setAicPageForAll] = useState<number>(1);
  const [hamPageForAll, setHamPageForAll] = useState<number>(1);
  const [aicHasMoreForAll, setAicHasMoreForAll] = useState<boolean>(true);
  const [hamHasMoreForAll, setHamHasMoreForAll] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // For infinite scroll loading indicator

  // Function to load artworks based on source and page (initial load or single source pagination)
  const loadArtworks = useCallback(async (source: ApiSource | 'all', page: number) => {
    console.log(`Loading artworks - Source: ${source}, Page: ${page}`);
    setLoading(true); // Indicate main loading state
    setIsLoadingMore(false); // Ensure infinite scroll indicator is off during main load
    setError(null);
    setArtworks([]); // Always clear artworks on initial load/source change

    const limit = 10; // Items per page

    try {
        if (source === 'aic' || source === 'ham') {
            // Single source loading (uses pagination buttons)
            const response = await getArtworks(source, page, limit);
            setArtworks(response.artworks);
            setTotalPages(response.pagination.totalPages);
            setCurrentPage(response.pagination.currentPage);
            setTotalRecords(response.pagination.totalRecords);
            // Reset 'all' state when switching to single source
            setAicPageForAll(1);
            setHamPageForAll(1);
            setAicHasMoreForAll(true);
            setHamHasMoreForAll(true);
        } else { // 'all' source - Initial Load Only
            console.log("Initial load for 'all' source");
            // Reset 'all' pagination state for the new load
            setAicPageForAll(1);
            setHamPageForAll(1);
            setAicHasMoreForAll(true);
            setHamHasMoreForAll(true);

            // Fetch page 1 from both concurrently
            // Use slightly larger limit for initial 'all' load to fill screen better? Optional.
            const initialLimit = limit;
            const aicPromise = getArtworks('aic', 1, initialLimit);
            // Only include HAM if key exists
            const hamPromise = process.env.EXPO_PUBLIC_HARVARD_API_KEY
                ? getArtworks('ham', 1, initialLimit)
                : Promise.resolve(null); // Resolve immediately if no key

            const [aicResult, hamResult] = await Promise.allSettled([aicPromise, hamPromise]);

            let combinedArtworks: UnifiedArtwork[] = [];
            let combinedTotalRecords = 0;
            let tempAicHasMore = false;
            let tempHamHasMore = false;
            let tempAicNextPage = 1;
            let tempHamNextPage = 1;

            if (aicResult.status === 'fulfilled') {
                const aicResponse = aicResult.value;
                combinedArtworks = combinedArtworks.concat(aicResponse.artworks);
                combinedTotalRecords += aicResponse.pagination.totalRecords;
                tempAicHasMore = aicResponse.pagination.currentPage < aicResponse.pagination.totalPages;
                tempAicNextPage = aicResponse.pagination.currentPage + 1;
            } else {
                console.error("Initial AIC fetch failed for 'all':", aicResult.reason);
                // Set error state but continue if HAM might succeed
                setError("Failed to load data from AIC.");
            }

            // Check hamResult only if it wasn't explicitly skipped
            if (hamResult.status === 'fulfilled' && hamResult.value !== null) {
                const hamResponse = hamResult.value;
                combinedArtworks = combinedArtworks.concat(hamResponse.artworks);
                combinedTotalRecords += hamResponse.pagination.totalRecords; // Assuming HAM response structure is adapted
                tempHamHasMore = hamResponse.pagination.currentPage < hamResponse.pagination.totalPages;
                tempHamNextPage = hamResponse.pagination.currentPage + 1;
                 // Clear partial error if HAM succeeded
                 if(aicResult.status === 'rejected') setError(null);
            } else if (hamResult.status === 'rejected') {
                console.error("Initial HAM fetch failed for 'all':", hamResult.reason);
                 const hamErrorMsg = hamResult.reason instanceof Error ? hamResult.reason.message : 'Unknown HAM Error';
                 // Set error state, potentially overwriting AIC error if both fail
                 setError(`Failed to load data from Harvard. ${hamErrorMsg.includes("API Key") ? "Check API Key." : ""}`);
            } else if (hamResult.value === null) {
                console.log("Skipped initial HAM fetch for 'all' due to missing API key.");
                tempHamHasMore = false; // No more HAM data if key is missing
            }


            // Shuffle the initial combined list
            combinedArtworks.sort(() => Math.random() - 0.5);

            setArtworks(combinedArtworks);
            setTotalRecords(combinedTotalRecords); // Approximate total
            // Estimate total pages - less relevant for infinite scroll
            setTotalPages(Math.ceil(combinedTotalRecords / limit));
            setCurrentPage(1); // Always page 1 for 'all' initial load
            setAicHasMoreForAll(tempAicHasMore);
            setHamHasMoreForAll(tempHamHasMore);
            setAicPageForAll(tempAicNextPage); // Set the *next* page to fetch
            setHamPageForAll(tempHamNextPage); // Set the *next* page to fetch

            // If both failed AND we ended up with no artworks, throw a more specific error
            if (aicResult.status === 'rejected' && hamResult.status !== 'fulfilled' && combinedArtworks.length === 0) {
                 throw new Error("Failed to fetch initial data from any source.");
            }
        }
    } catch (err) {
      console.error("Error in loadArtworks:", err);
      // Check if the error message indicates missing API key
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      if (errorMessage.includes("API Key is missing")) {
          setError(`${errorMessage} Check .env and restart.`);
      } else {
          setError(errorMessage);
      }
      setArtworks([]); // Clear artworks on error
      setTotalPages(1); // Reset pagination on error
      setCurrentPage(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed for useCallback


  // Function to load more artworks (infinite scroll for ALL sources)
  const handleLoadMore = useCallback(async () => {
      // Common guard clauses: Don't run if already loading more or if main loading is happening
      if (isLoadingMore || loading) {
          return;
      }

      const limit = 10; // Items per page for subsequent loads

      // --- 'All' Source Logic ---
      if (selectedSource === 'all') {
          // Guard clause: only run if there's more data from at least one source
          if (!aicHasMoreForAll && !hamHasMoreForAll) {
              return;
          }
          console.log(`handleLoadMore ('all'): Fetching AIC page ${aicPageForAll}, HAM page ${hamPageForAll}`);
          setIsLoadingMore(true);

          const promises = [];
          if (aicHasMoreForAll) {
              promises.push(getArtworks('aic', aicPageForAll, limit).then(res => ({ ...res, sourceOrigin: 'aic' })));
          }
          if (hamHasMoreForAll && process.env.EXPO_PUBLIC_HARVARD_API_KEY) {
              promises.push(getArtworks('ham', hamPageForAll, limit).then(res => ({ ...res, sourceOrigin: 'ham' })));
          } else if (hamHasMoreForAll && !process.env.EXPO_PUBLIC_HARVARD_API_KEY) {
              setHamHasMoreForAll(false); // Correct the state if key is missing
          }

          if (promises.length === 0) {
              setIsLoadingMore(false);
              return;
          }

          const results = await Promise.allSettled(promises);
          let newArtworks: UnifiedArtwork[] = [];
          let nextAicPage = aicPageForAll;
          let nextHamPage = hamPageForAll;
          let stillHasAic = aicHasMoreForAll;
          let stillHasHam = hamHasMoreForAll;

          results.forEach((result) => {
              if (result.status === 'fulfilled') {
                  const response = result.value;
                  newArtworks = newArtworks.concat(response.artworks);
                  if (response.sourceOrigin === 'aic') {
                      stillHasAic = response.pagination.currentPage < response.pagination.totalPages;
                      nextAicPage = response.pagination.currentPage + 1;
                  } else if (response.sourceOrigin === 'ham') {
                      stillHasHam = response.pagination.currentPage < response.pagination.totalPages;
                      nextHamPage = response.pagination.currentPage + 1;
                  }
              } else {
                  console.error(`handleLoadMore ('all'): Failed to fetch more data:`, result.reason);
                  // Handle failure - maybe stop trying for that source?
                  // For simplicity, we'll just log the error for now.
              }
          });

          newArtworks.sort(() => Math.random() - 0.5); // Shuffle combined results

          if (newArtworks.length > 0) {
              setArtworks(prevArtworks => {
                  const existingIds = new Set(prevArtworks.map(art => art.id));
                  const uniqueNewArtworks = newArtworks.filter(art => !existingIds.has(art.id));
                  return [...prevArtworks, ...uniqueNewArtworks];
              });
          }
          setAicPageForAll(nextAicPage);
          setHamPageForAll(nextHamPage);
          setAicHasMoreForAll(stillHasAic);
          setHamHasMoreForAll(stillHasHam);
          setIsLoadingMore(false);

      // --- Single Source Logic (AIC or HAM) ---
      } else {
          // Guard clause: only run if current page is less than total pages
          if (currentPage >= totalPages) {
              return;
          }
          console.log(`handleLoadMore ('${selectedSource}'): Fetching page ${currentPage + 1}`);
          setIsLoadingMore(true);

          try {
              const nextPage = currentPage + 1;
              const response = await getArtworks(selectedSource, nextPage, limit);

              // Append results, assuming getArtworks doesn't return duplicates on subsequent pages
              setArtworks(prevArtworks => [...prevArtworks, ...response.artworks]);
              setCurrentPage(response.pagination.currentPage);
              // Update totalPages and totalRecords in case they changed (less likely but possible)
              setTotalPages(response.pagination.totalPages);
              setTotalRecords(response.pagination.totalRecords);

          } catch (err) {
              console.error(`handleLoadMore ('${selectedSource}'): Failed to fetch page ${currentPage + 1}:`, err);
              setError(`Failed to load more artworks.`); // Set a generic error
          } finally {
              setIsLoadingMore(false);
          }
      }
  }, [
      selectedSource, isLoadingMore, loading, // Include loading to prevent overlap
      // 'all' source dependencies
      aicHasMoreForAll, hamHasMoreForAll, aicPageForAll, hamPageForAll,
      // Single source dependencies
      currentPage, totalPages
  ]);


  // Memoize the sorted artworks
  const sortedArtworks = useMemo(() => {
    if (!sortField) {
      return artworks; // No sorting applied
    }

    // Create a shallow copy before sorting to avoid mutating the original state
    const artworksToSort = [...artworks];

    artworksToSort.sort((a, b) => {
      const fieldA = (a[sortField] || '').toLowerCase(); // Handle null/undefined values
      const fieldB = (b[sortField] || '').toLowerCase();

      let comparison = 0;
      if (fieldA > fieldB) {
        comparison = 1;
      } else if (fieldA < fieldB) {
        comparison = -1;
      }

      return sortDirection === 'desc' ? comparison * -1 : comparison;
    });

    return artworksToSort;
  }, [artworks, sortField, sortDirection]);


  // Effect for initial load and source changes
  useEffect(() => {
    // Always load page 1 when the source changes
    console.log(`Source changed to: ${selectedSource}. Loading page 1.`);
    // Reset single-source page to 1 before loading
    setCurrentPage(1);
    loadArtworks(selectedSource, 1);
    // Reset sort when source changes? Optional.
    // setSortField(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource]); // Only trigger on source change

  // Effect for single-source pagination changes (Button clicks)
  useEffect(() => {
    // Only trigger pagination load if NOT 'all' source and page > 0 (page is 1-based)
    // Also ensure loadArtworks isn't called redundantly on initial source change (page will be 1)
    if (selectedSource !== 'all' && currentPage > 0) {
        console.log(`Current page changed to: ${currentPage} for source ${selectedSource}. Loading.`);
        // We don't need to check if page is > 1 here, loadArtworks handles clearing/setting based on page
        loadArtworks(selectedSource, currentPage);
    }
    // Do NOT add loadArtworks to dependencies here, it causes loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedSource]); // React to currentPage changes, but conditionally act based on selectedSource


  const handleSourceChange = (newSource: ApiSource | 'all') => {
    if (newSource !== selectedSource) {
      setSelectedSource(newSource);
      setCurrentPage(1); // Reset to page 1 when changing source
      // The useEffect will trigger the reload
    }
  };

  // Handlers for sorting
  const handleSortChange = (field: 'title' | 'artist') => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      toggleSortDirection();
    } else {
      // If changing field, set field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const clearSort = () => {
      setSortField(null);
      // Optionally reset direction, though it doesn't matter if field is null
      // setSortDirection('asc');
  };

  // Render item using UnifiedArtwork structure
  const renderArtwork = ({ item }: { item: UnifiedArtwork }) => {
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        // Pass the prefixed ID
        onPress={() => navigation.navigate('ArtworkDetail', { artworkId: item.id })}
      >
        {item.imageUrl ? (
          // Ensure uri is not null/undefined before passing to Image source
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImage}><Text style={styles.placeholderText}>No Image</Text></View>
        )}
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">{item.title || 'Untitled'}</Text>
          <Text style={styles.itemArtist} numberOfLines={1} ellipsizeMode="tail">{item.artist || 'Unknown Artist'}</Text>
          <Text style={styles.itemSource}>Source: {item.source.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading && artworks.length === 0) { // Show initial loading indicator only
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text>Loading artworks...</Text>
      </View>
    );
  }

  // Error state
  if (error && artworks.length === 0) { // Show full error screen only if no data is loaded
    return (
      <View style={[styles.container, styles.center]}>
         {/* Source Selection UI - Still show this on error page */}
         <View style={styles.sourceSelector}>
              <Button title="All" onPress={() => handleSourceChange('all')} disabled={selectedSource === 'all'} />
              <Button title="AIC" onPress={() => handleSourceChange('aic')} disabled={selectedSource === 'aic'} />
              <Button title="Harvard" onPress={() => handleSourceChange('ham')} disabled={selectedSource === 'ham'} />
              <Button title="My Exhibition" onPress={() => navigation.navigate('Exhibition')} />
         </View>
        <Text style={styles.errorText}>Error loading artworks: {error}</Text>
        {/* Pass current source and page 1 to retry */}
        <Button title="Retry" onPress={() => loadArtworks(selectedSource, 1)} />
        {/* <Button title="Go to My Exhibition" onPress={() => navigation.navigate('Exhibition')} /> */}
      </View>
    );
  }

  // Main view
  return (
    <View style={styles.container}>
       {/* Source Selection UI */}
       <View style={styles.sourceSelector}>
            <Button title="All" onPress={() => handleSourceChange('all')} disabled={selectedSource === 'all' || loading} />
            <Button title="AIC" onPress={() => handleSourceChange('aic')} disabled={selectedSource === 'aic' || loading} />
            {/* Conditionally disable Harvard if API key might be missing (based on error state) */}
            <Button
                title="Harvard"
                onPress={() => handleSourceChange('ham')}
                disabled={selectedSource === 'ham' || loading || error?.includes('Harvard API Key')}
            />
            <Button title="My Exhibition" onPress={() => navigation.navigate('Exhibition')} />
       </View>

       {/* Sorting Controls */}
       <View style={styles.sortSelector}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <Button title="Title" onPress={() => handleSortChange('title')} disabled={loading} />
            <Button title="Artist" onPress={() => handleSortChange('artist')} disabled={loading} />
            {sortField && ( // Show direction toggle only if a field is selected
                <Button
                    title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    onPress={toggleSortDirection}
                    disabled={loading}
                />
            )}
             {sortField && ( // Show clear button
                <Button title="Clear Sort" onPress={clearSort} disabled={loading} />
            )}
       </View>

       {/* Display error inline if data is already present */}
       {error && artworks.length > 0 && (
           <Text style={[styles.errorText, styles.inlineError]}>Error updating: {error}</Text>
       )}

      <FlatList
        data={sortedArtworks} // Use memoized sorted artworks
        renderItem={renderArtwork} // Uses updated render function
        keyExtractor={(item) => item.id} // Use the prefixed ID as key
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={!loading && !isLoadingMore ? <Text style={styles.emptyListText}>No artworks found.</Text> : null}
        // Infinite Scroll props - Always enabled now
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5} // Trigger when the end is within half the visible length
        ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footerLoadingIndicator} size="small" /> : null} // Show if loading more for any source
      />

      {/* --- Footer Area: Status Info --- */}

      {/* Pagination Buttons: Show only for single sources, if not loading, and if multiple pages exist */}
      {selectedSource !== 'all' && !loading && totalPages > 1 && (
          <View style={styles.paginationContainer}>
              <Button title="Previous" onPress={handlePrevPage} disabled={currentPage <= 1 || loading} />
              <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
              <Button title="Next" onPress={handleNextPage} disabled={currentPage >= totalPages || loading} />
          </View>
      )}

      {/* Single Page Info: Show for single sources if not loading and only one page */}
      {selectedSource !== 'all' && !loading && totalPages <= 1 && artworks.length > 0 && (
            <View style={styles.paginationContainer}>
                <Text style={styles.pageInfo}>{totalRecords} items found</Text>
            </View>
       )}

       {/* 'All' Source Info: Show when 'all' is selected and not actively loading more */}
       {selectedSource === 'all' && !isLoadingMore && artworks.length > 0 && (
            <View style={styles.paginationContainer}>
                 {/* Show total records if available, otherwise just indicate 'all' */}
                 <Text style={styles.pageInfo}>
                    {totalRecords > 0 ? `Approx. ${totalRecords} total items` : 'Showing combined results'}
                 </Text>
                 {/* Indicate if more might be available to load */}
                 {(aicHasMoreForAll || hamHasMoreForAll) && !loading &&
                    <Text style={styles.moreAvailableText}>(Scroll down for more)</Text>
                 }
                 {/* Indicate if all known items loaded */}
                 {!aicHasMoreForAll && !hamHasMoreForAll && !loading &&
                    <Text style={styles.moreAvailableText}>(All items loaded)</Text>
                 }
            </View>
       )}

       {/* Main loading indicator shown during initial load */}
       {/* Ensure it doesn't overlap with the footer indicator */}
       {/* Use `loading` state which is true only during initial load/source change */}
       {loading && artworks.length > 0 && <ActivityIndicator style={styles.pageLoadingIndicator} />}
       {/* The ListFooterComponent handles the isLoadingMore indicator within the FlatList */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Light background for contrast
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContentContainer: {
    padding: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    alignItems: 'center',
  },
  sourceSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    // Simple styling for web - adjust as needed
    ...(Platform.OS === 'web' && {
        // position: 'sticky', // Sticky positioning can be complex in RN/Expo web
        top: 0,
        zIndex: 1,
    }),
  },
  sortSelector: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Align items to the start
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0', // Slightly different background
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  sortLabel: {
      marginRight: 8,
      fontSize: 14,
      fontWeight: 'bold',
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 3,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  placeholderImage: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
   placeholderText: {
    fontSize: 10,
    color: '#666',
  },
  itemTextContainer: {
    flex: 1, // Allow text to take remaining space
    justifyContent: 'center', // Center text vertically
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemSource: {
      fontSize: 12,
      color: '#999',
      marginTop: 4,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  inlineError: {
      backgroundColor: '#ffdddd',
      color: '#cc0000',
      paddingVertical: 5,
      marginVertical: 0, // Reset margin for inline display
  },
  emptyListText: {
      textAlign: 'center',
      marginTop: 50,
      fontSize: 16,
      color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  pageInfo: {
    fontSize: 16,
    marginHorizontal: 10, // Add spacing around page info
  },
  moreAvailableText: {
      fontSize: 12,
      color: '#666',
      marginLeft: 5, // Space from the main page info
  },
  pageLoadingIndicator: {
    // This indicator is shown when `loading` is true (initial load/single source page change)
    // It appears *below* the list, potentially replacing pagination controls visually.
    // alignSelf: 'center',
    paddingVertical: 15, // Give it some vertical space
  },
  footerLoadingIndicator: {
      // This indicator is shown by ListFooterComponent when `isLoadingMore` is true for 'all' source
      marginVertical: 20, // Add padding within the list scroll area
  }
});
