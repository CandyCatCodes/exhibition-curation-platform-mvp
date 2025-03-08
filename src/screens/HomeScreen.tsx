import React, { useState, useEffect, useCallback } from 'react';
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

  // Function to load artworks based on source and page
  const loadArtworks = useCallback(async (source: ApiSource | 'all', page: number) => {
    console.log(`Loading artworks - Source: ${source}, Page: ${page}`);
    setLoading(true);
    setError(null); // Clear previous errors
    // Reset artworks only if changing source or going to page 1 for a specific source
    // For 'all', we always fetch page 1 and replace results.
    if (page === 1 || source === 'all') {
        setArtworks([]);
    }
    try {
      // Use the updated getArtworks service function
      const response: UnifiedArtworksResponse = await getArtworks(source, page, 10); // Fetch 10 items per page

      // If page > 1 and not 'all', append results (simple infinite scroll idea, needs refinement)
      // For now, we replace results on every load for simplicity with pagination buttons
      setArtworks(response.artworks);
      setTotalPages(response.pagination.totalPages);
      setCurrentPage(response.pagination.currentPage);
      setTotalRecords(response.pagination.totalRecords); // Store total records

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
  }, []); // No dependencies needed for useCallback if it doesn't use external state directly

  // Initial load and reload when source or page changes
  useEffect(() => {
    // Call loadArtworks whenever selectedSource or currentPage changes.
    // loadArtworks itself handles setting the loading state.
    loadArtworks(selectedSource, currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource, currentPage]); // Rerun when source or page changes


  const handleSourceChange = (newSource: ApiSource | 'all') => {
    if (newSource !== selectedSource) {
      setSelectedSource(newSource);
      setCurrentPage(1); // Reset to page 1 when changing source
      // The useEffect will trigger the reload
    }
  };

  const handleNextPage = () => {
    // Disable next for 'all' source as pagination is simplified
    if (selectedSource !== 'all' && currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    // Disable prev for 'all' source
    if (selectedSource !== 'all' && currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
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

       {/* Display error inline if data is already present */}
       {error && artworks.length > 0 && (
           <Text style={[styles.errorText, styles.inlineError]}>Error updating: {error}</Text>
       )}

      <FlatList
        data={artworks} // Use unified artworks
        renderItem={renderArtwork} // Uses updated render function
        keyExtractor={(item) => item.id} // Use the prefixed ID as key
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={!loading ? <Text style={styles.emptyListText}>No artworks found for the selected source.</Text> : null}
        // Optional: Add pull-to-refresh or infinite scroll later
        // onEndReached={handleLoadMore} // Example for infinite scroll
        // onEndReachedThreshold={0.5}
        // ListFooterComponent={loading && artworks.length > 0 ? <ActivityIndicator size="small" /> : null} // Loading indicator at bottom
      />

      {/* Pagination Controls - Show only if not loading and more than one page */}
      {!loading && totalPages > 1 && (
          <View style={styles.paginationContainer}>
            {selectedSource !== 'all' ? (
                <>
                    <Button title="Previous" onPress={handlePrevPage} disabled={currentPage <= 1 || loading} />
                    <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
                    <Button title="Next" onPress={handleNextPage} disabled={currentPage >= totalPages || loading} />
                </>
            ) : (
                // Simplified message for 'all' source
                 <Text style={styles.pageInfo}>Page {currentPage} of {totalPages} (approx. {totalRecords} items)</Text>
            )}
          </View>
      )}
       {/* Show simplified info if only one page */}
       {!loading && totalPages <= 1 && artworks.length > 0 && (
            <View style={styles.paginationContainer}>
                <Text style={styles.pageInfo}>{totalRecords} items found</Text>
            </View>
       )}


      {/* Loading indicator for pagination/refresh (show only when loading more pages) */}
      {loading && artworks.length > 0 && <ActivityIndicator style={styles.pageLoadingIndicator} />}
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
  },
  pageLoadingIndicator: {
    // position: 'absolute', // Remove absolute positioning
    // bottom: 50,
    // alignSelf: 'center',
    marginTop: 10, // Add some margin if needed when shown at bottom
    paddingVertical: 10, // Add padding if it's replacing pagination controls visually
  }
});
