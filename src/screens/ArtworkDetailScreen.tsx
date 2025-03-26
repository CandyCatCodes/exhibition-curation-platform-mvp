import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Button,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import RenderHTML from "react-native-render-html";
import { getArtworkDetails, UnifiedArtworkDetail } from "../services/api";
import { useExhibition } from "../context/ExhibitionContext";

type ArtworkDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "ArtworkDetail"
>;

type Props = {
  route: ArtworkDetailScreenRouteProp;
};

export default function ArtworkDetailScreen({ route }: Props) {
  const { width } = useWindowDimensions();
  const { artworkId } = route.params;
  const [artwork, setArtwork] = useState<UnifiedArtworkDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addToExhibition, removeFromExhibition, isArtworkInExhibition } =
    useExhibition();

  useEffect(() => {
    const loadDetails = async () => {
      console.log(`Loading details for prefixed ID: ${artworkId}`);
      setLoading(true);
      setError(null);
      setArtwork(null);
      try {
        const details = await getArtworkDetails(artworkId);
        setArtwork(details);
      } catch (err) {
        console.error(`Error loading details for ${artworkId}:`, err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
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

    if (artworkId) {
      loadDetails();
    } else {
      setError("Artwork ID is missing.");
      setLoading(false);
    }
  }, [artworkId]);

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

  const imageUrl = artwork?.imageUrl;

  const openSourceUrl = () => {
    if (artwork?.sourceApiUrl) {
      Linking.openURL(artwork.sourceApiUrl).catch((err) => {
        console.error("Couldn't load page", err);
        alert("Could not open the link.");
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.artworkImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text>No Image Available</Text>
        </View>
      )}

      <Text style={styles.title}>{artwork.title || "Untitled"}</Text>
      <Text style={styles.artist}>{artwork.artist || "Unknown Artist"}</Text>
      <Text style={styles.sourceText}>
        Source: {artwork.source?.toUpperCase()}
      </Text>

      {artwork.date && <Text style={styles.detailLabel}>Date:</Text>}
      {artwork.date && <Text style={styles.detailText}>{artwork.date}</Text>}

      {artwork.medium && <Text style={styles.detailLabel}>Medium:</Text>}
      {artwork.medium && (
        <Text style={styles.detailText}>{artwork.medium}</Text>
      )}

      {artwork.dimensions && (
        <Text style={styles.detailLabel}>Dimensions:</Text>
      )}
      {artwork.dimensions && (
        <Text style={styles.detailText}>{artwork.dimensions}</Text>
      )}

      {artwork.description && (
        <Text style={styles.detailLabel}>Description:</Text>
      )}
      {artwork.description && (
        <RenderHTML
          contentWidth={width - 30}
          source={{ html: artwork.description }}
          tagsStyles={htmlStyles}
          baseStyle={styles.detailText}
        />
      )}

      {artwork.sourceApiUrl && (
        <View style={styles.linkContainer}>
          <Button
            title={`View on ${artwork.source?.toUpperCase()} Website`}
            onPress={openSourceUrl}
          />
        </View>
      )}

      {artwork && (
        <View style={styles.buttonContainer}>
          {isArtworkInExhibition(artwork.id) ? (
            <Button
              title="Remove from Exhibition"
              onPress={() => removeFromExhibition(artwork.id)}
              color="#ff6347"
            />
          ) : (
            <Button
              title="Add to Exhibition"
              onPress={() =>
                addToExhibition({
                  id: artwork.id,
                  title: artwork.title,
                  artist: artwork.artist,
                  imageUrl: artwork.imageUrl,
                  source: artwork.source,
                })
              }
              color="#1e90ff"
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
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 15,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  artworkImage: {
    width: "100%",
    height: 300,
    marginBottom: 15,
    backgroundColor: "#e0e0e0",
  },
  placeholderImage: {
    width: "100%",
    height: 300,
    marginBottom: 15,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },
  artist: {
    fontSize: 18,
    color: "#555",
    marginBottom: 5,
  },
  sourceText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 15,
    fontStyle: "italic",
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  detailText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
    lineHeight: 22,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  linkContainer: {
    marginTop: 15,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: "flex-start",
  },
});

const htmlStyles = {
  p: {
    marginVertical: 5,
  },
  a: {
    color: "#1e90ff",
    textDecorationLine: "underline",
  },
};
