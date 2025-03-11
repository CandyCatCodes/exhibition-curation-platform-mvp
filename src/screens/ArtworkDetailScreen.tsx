import React, { useState, useEffect } from 'react';
// Import Linking for opening URLs and Platform
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Button, Linking, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
// Import unified types and updated service function
import { getArtworkDetails, UnifiedArtworkDetail } from '../services/api';
// Import the context hook
import { useExhibition } from '../context/ExhibitionContext';

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
  // artworkId is now the prefixed ID, e.g., "aic-123" or "ham-456"
  const { artworkId } = route.params;
  const [artwork, setArtwork] = useState<UnifiedArtworkDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Get exhibition context functions and state
  const { addToExhibition, removeFromExhibition, isArtworkInExhibition } = useExhibition();

  useEffect(() => {
    const loadDetails = async () => {
      console.log(`Loading details for prefixed ID: ${artworkId}`);
      setLoading(true);
      setError(null); // Clear previous errors
      setArtwork(null); // Clear previous artwork data
      try {
        // Use the updated service function that handles prefixed IDs
        const details = await getArtworkDetails(artworkId);
        setArtwork(details);
      } catch (err) {
         console.error(`Error loading details for ${artworkId}:`, err);
         const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
         if (errorMessage.includes("API Key is missing")) {
             setError(`${errorMessage} Check .env and restart.`);
         } else {
             setError(errorMessage);
         }
        setArtwork(null);
      } finally {
        setLoading(false);
      }
    };

    // Ensure artworkId is valid before attempting to load
    if (artworkId) {
        loadDetails();
    } else {
        setError("Artwork ID is missing.");
        setLoading(false);
    }

  }, [artworkId]); // Reload if prefixed artworkId changes

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

  // Use artwork.imageUrl directly from the unified structure
  const imageUrl = artwork?.imageUrl; // Use optional chaining

  const openSourceUrl = () => {
      if (artwork?.sourceApiUrl) {
          Linking.openURL(artwork.sourceApiUrl).catch(err => {
              console.error("Couldn't load page", err);
              alert('Could not open the link.'); // User feedback
          });
      }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.artworkImage} resizeMode="contain" />
      ) : (
        <View style={styles.placeholderImage}><Text>No Image Available</Text></View>
      )}

      <Text style={styles.title}>{artwork.title || 'Untitled'}</Text>
      <Text style={styles.artist}>{artwork.artist || 'Unknown Artist'}</Text>
      {/* Display source prominently */}
      <Text style={styles.sourceText}>Source: {artwork.source?.toUpperCase()}</Text>

      {artwork.date && <Text style={styles.detailLabel}>Date:</Text>}
      {artwork.date && <Text style={styles.detailText}>{artwork.date}</Text>}

      {artwork.medium && <Text style={styles.detailLabel}>Medium:</Text>}
      {artwork.medium && <Text style={styles.detailText}>{artwork.medium}</Text>}

      {artwork.dimensions && <Text style={styles.detailLabel}>Dimensions:</Text>}
      {artwork.dimensions && <Text style={styles.detailText}>{artwork.dimensions}</Text>}

      {artwork.description && <Text style={styles.detailLabel}>Description:</Text>}
      {/* Use a simple renderer for now. Replace with a proper HTML renderer later if needed. */}
      <HtmlRenderer html={artwork.description} />

      {/* Link to original source if available */}
      {artwork.sourceApiUrl && (
          <View style={styles.linkContainer}>
              <Button title={`View on ${artwork.source?.toUpperCase()} Website`} onPress={openSourceUrl} />
          </View>
      )}

      {/* Add/Remove from Exhibition Button */}
      {/* Ensure artwork is not null before rendering the button */}
      {artwork && (
          <View style={styles.buttonContainer}>
              {isArtworkInExhibition(artwork.id) ? (
                  <Button
                      title="Remove from Exhibition"
                      onPress={() => removeFromExhibition(artwork.id)}
                      color="#ff6347" // Tomato color for remove action
                  />
              ) : (
                  <Button
                      title="Add to Exhibition"
                      // Pass the necessary UnifiedArtwork fields from the detail object
                      onPress={() => addToExhibition({
                          id: artwork.id,
                          title: artwork.title,
                          artist: artwork.artist,
                          imageUrl: artwork.imageUrl,
                          source: artwork.source,
                      })}
                      color="#1e90ff" // DodgerBlue color for add action
                  />
              )}
          </View>
      )}

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
    marginBottom: 5, // Reduced margin below artist
  },
  sourceText: {
      fontSize: 14,
      color: '#888',
      marginBottom: 15,
      fontStyle: 'italic',
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
  linkContainer: {
      marginTop: 15,
      marginBottom: 10, // Add margin below link button
      alignItems: 'flex-start', // Align button to the left
  },
  buttonContainer: {
      marginTop: 20,
      marginBottom: 40, // Add more space at the bottom
      alignItems: 'flex-start', // Align button to the left
  }
});
