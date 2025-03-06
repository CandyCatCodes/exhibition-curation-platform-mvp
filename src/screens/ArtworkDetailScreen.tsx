import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Button } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { getArtworkDetails, getImageUrl, ArtworkDetail } from '../services/api'; // Import new function and type

type ArtworkDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArtworkDetail'>;

type Props = {
  route: ArtworkDetailScreenRouteProp;
};

// Basic component to render HTML content safely (requires further implementation/library)
// For now, it just displays the raw text. Consider using react-native-render-html later.
const HtmlRenderer = ({ html }: { html: string | null }) => {
  if (!html) return null;
  // Basic cleanup: remove HTML tags for now
  const plainText = html.replace(/<[^>]*>?/gm, '');
  return <Text style={styles.detailText}>{plainText}</Text>;
};


export default function ArtworkDetailScreen({ route }: Props) {
  const { artworkId } = route.params;
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [iiifUrl, setIiifUrl] = useState<string>(''); // Store the base image URL

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getArtworkDetails(artworkId);
        setArtwork(response.data);
        setIiifUrl(response.config.iiif_url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setArtwork(null);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [artworkId]); // Reload if artworkId changes

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text>Loading details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Error loading details: {error}</Text>
        {/* Optionally add a retry button */}
      </View>
    );
  }

  if (!artwork) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Artwork not found.</Text>
      </View>
    );
  }

  const imageUrl = getImageUrl(artwork.image_id, iiifUrl);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.artworkImage} resizeMode="contain" />
      ) : (
        <View style={styles.placeholderImage}><Text>No Image Available</Text></View>
      )}

      <Text style={styles.title}>{artwork.title || 'Untitled'}</Text>
      <Text style={styles.artist}>{artwork.artist_title || 'Unknown Artist'}</Text>

      {artwork.date_display && <Text style={styles.detailLabel}>Date:</Text>}
      {artwork.date_display && <Text style={styles.detailText}>{artwork.date_display}</Text>}

      {artwork.medium_display && <Text style={styles.detailLabel}>Medium:</Text>}
      {artwork.medium_display && <Text style={styles.detailText}>{artwork.medium_display}</Text>}

      {artwork.dimensions && <Text style={styles.detailLabel}>Dimensions:</Text>}
      {artwork.dimensions && <Text style={styles.detailText}>{artwork.dimensions}</Text>}

      {artwork.description && <Text style={styles.detailLabel}>Description:</Text>}
      {/* Use a simple renderer for now. Replace with a proper HTML renderer later if needed. */}
      <HtmlRenderer html={artwork.description} />

      {/* TODO: Add/Remove from exhibition button will go here */}
      <View style={styles.buttonContainer}>
         <Button title="Add to Exhibition (Placeholder)" onPress={() => alert('Add functionality TBD')} />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 15,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: '100%',
    height: 300, // Adjust height as needed
    marginBottom: 15,
    backgroundColor: '#e0e0e0',
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    marginBottom: 15,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  artist: {
    fontSize: 18,
    color: '#555',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    lineHeight: 22, // Improve readability
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  buttonContainer: {
      marginTop: 20,
      marginBottom: 20,
  }
});
