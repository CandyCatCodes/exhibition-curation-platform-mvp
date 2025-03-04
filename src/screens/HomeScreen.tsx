import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { getArtworks, getImageUrl, Artwork } from '../services/api'; // Import API functions and type

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [iiifUrl, setIiifUrl] = useState<string>(''); // Store the base image URL

  const loadArtworks = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getArtworks(page, 10); // Fetch page with 10 items
      setArtworks(response.data);
      setTotalPages(response.pagination.total_pages);
      setCurrentPage(response.pagination.current_page);
      setIiifUrl(response.config.iiif_url); // Store the base IIIF URL
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setArtworks([]); // Clear artworks on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArtworks(currentPage);
  }, [loadArtworks, currentPage]); // Reload when currentPage changes

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };

  const renderArtwork = ({ item }: { item: Artwork }) => {
    const imageUrl = getImageUrl(item.image_id, iiifUrl);
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => navigation.navigate('ArtworkDetail', { artworkId: String(item.id) })} // Ensure artworkId is string
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImage}><Text>No Image</Text></View>
        )}
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemTitle}>{item.title || 'Untitled'}</Text>
          <Text style={styles.itemArtist}>{item.artist_title || 'Unknown Artist'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && artworks.length === 0) { // Show initial loading indicator
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text>Loading artworks...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Error loading artworks: {error}</Text>
        <Button title="Retry" onPress={() => loadArtworks(currentPage)} />
        <Button title="Go to My Exhibition" onPress={() => navigation.navigate('Exhibition')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button title="Go to My Exhibition" onPress={() => navigation.navigate('Exhibition')} />

      <FlatList
        data={artworks}
        renderItem={renderArtwork}
        keyExtractor={(item) => String(item.id)} // Ensure key is string
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={<Text>No artworks found.</Text>}
      />

      <View style={styles.paginationContainer}>
        <Button title="Previous" onPress={handlePrevPage} disabled={currentPage <= 1 || loading} />
        <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
        <Button title="Next" onPress={handleNextPage} disabled={currentPage >= totalPages || loading} />
      </View>
      {loading && <ActivityIndicator style={styles.pageLoadingIndicator} />}
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
    alignItems: 'center', // Align items vertically
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
  itemTextContainer: {
    flex: 1, // Allow text to take remaining space
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemArtist: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
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
    position: 'absolute',
    bottom: 50, // Adjust position as needed
    alignSelf: 'center',
  }
});
