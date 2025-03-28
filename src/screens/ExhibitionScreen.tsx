import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Button,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";
import { useExhibition } from "../context/ExhibitionContext";
import { UnifiedArtwork } from "../services/api";

type ExhibitionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Exhibition"
>;

type Props = {
  navigation: ExhibitionScreenNavigationProp;
};

export default function ExhibitionScreen({ navigation }: Props) {
  const { exhibition, removeFromExhibition } = useExhibition();

  const renderExhibitionItem = ({ item }: { item: UnifiedArtwork }) => {
    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemTouchable}
          onPress={() =>
            navigation.navigate("ArtworkDetail", { artworkId: item.id })
          }
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.thumbnail}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          <View style={styles.itemTextContainer}>
            <Text
              style={styles.itemTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title || "Untitled"}
            </Text>
            <Text
              style={styles.itemArtist}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.artist || "Unknown Artist"}
            </Text>
            <Text style={styles.itemSource}>
              Source: {item.source.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
        <Button
          title="Remove"
          onPress={() => removeFromExhibition(item.id)}
          color="#ff6347"
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {exhibition.length === 0 ? (
        <Text style={styles.emptyText}>
          Your exhibition is empty. Add artworks from their detail pages!
        </Text>
      ) : (
        <FlatList
          data={exhibition}
          renderItem={renderExhibitionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContentContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContentContainer: {
    padding: 10,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
  },
  placeholderImage: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 10,
    color: "#666",
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  itemArtist: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  itemSource: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
    paddingHorizontal: 20,
  },
});
