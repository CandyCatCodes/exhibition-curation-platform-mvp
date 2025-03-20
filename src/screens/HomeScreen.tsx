import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";
import { getArtworks, UnifiedArtwork, ApiSource } from "../services/api";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [artworks, setArtworks] = useState<UnifiedArtwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<ApiSource | "all">(
    "all",
  );
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [sortField, setSortField] = useState<"title" | "artist" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [aicPageForAll, setAicPageForAll] = useState<number>(1);
  const [hamPageForAll, setHamPageForAll] = useState<number>(1);
  const [aicHasMoreForAll, setAicHasMoreForAll] = useState<boolean>(true);
  const [hamHasMoreForAll, setHamHasMoreForAll] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [webContentHeight, setWebContentHeight] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const updateHeight = () => {
      setWebContentHeight(window.innerHeight - 150);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const loadArtworks = useCallback(
    async (source: ApiSource | "all", page: number) => {
      console.log(`Loading artworks - Source: ${source}, Page: ${page}`);
      setLoading(true);
      setIsLoadingMore(false);
      setError(null);
      setArtworks([]);

      const limit = 10;

      try {
        if (source === "aic" || source === "ham") {
          const response = await getArtworks(source, page, limit);
          setArtworks(response.artworks);
          setTotalPages(response.pagination.totalPages);
          setCurrentPage(response.pagination.currentPage);
          setTotalRecords(response.pagination.totalRecords);
          setAicPageForAll(1);
          setHamPageForAll(1);
          setAicHasMoreForAll(true);
          setHamHasMoreForAll(true);
        } else {
          console.log("Initial load for 'all' source");
          setAicPageForAll(1);
          setHamPageForAll(1);
          setAicHasMoreForAll(true);
          setHamHasMoreForAll(true);

          const initialLimit = limit;
          const aicPromise = getArtworks("aic", 1, initialLimit);
          const hamPromise = process.env.EXPO_PUBLIC_HARVARD_API_KEY
            ? getArtworks("ham", 1, initialLimit)
            : Promise.resolve(null);

          const [aicResult, hamResult] = await Promise.allSettled([
            aicPromise,
            hamPromise,
          ]);

          let combinedArtworks: UnifiedArtwork[] = [];
          let combinedTotalRecords = 0;
          let tempAicHasMore = false;
          let tempHamHasMore = false;
          let tempAicNextPage = 1;
          let tempHamNextPage = 1;

          if (aicResult.status === "fulfilled") {
            const aicResponse = aicResult.value;
            combinedArtworks = combinedArtworks.concat(aicResponse.artworks);
            combinedTotalRecords += aicResponse.pagination.totalRecords;
            tempAicHasMore =
              aicResponse.pagination.currentPage <
              aicResponse.pagination.totalPages;
            tempAicNextPage = aicResponse.pagination.currentPage + 1;
          } else {
            console.error(
              "Initial AIC fetch failed for 'all':",
              aicResult.reason,
            );
            setError("Failed to load data from AIC.");
          }

          if (hamResult.status === "fulfilled" && hamResult.value !== null) {
            const hamResponse = hamResult.value;
            combinedArtworks = combinedArtworks.concat(hamResponse.artworks);
            combinedTotalRecords += hamResponse.pagination.totalRecords;
            tempHamHasMore =
              hamResponse.pagination.currentPage <
              hamResponse.pagination.totalPages;
            tempHamNextPage = hamResponse.pagination.currentPage + 1;
            if (aicResult.status === "rejected") setError(null);
          } else if (hamResult.status === "rejected") {
            console.error(
              "Initial HAM fetch failed for 'all':",
              hamResult.reason,
            );
            const hamErrorMsg =
              hamResult.reason instanceof Error
                ? hamResult.reason.message
                : "Unknown HAM Error";
            setError(
              `Failed to load data from Harvard. ${hamErrorMsg.includes("API Key") ? "Check API Key." : ""}`,
            );
          } else if (hamResult.value === null) {
            console.log(
              "Skipped initial HAM fetch for 'all' due to missing API key.",
            );
            tempHamHasMore = false;
          }

          combinedArtworks.sort(() => Math.random() - 0.5);

          setArtworks(combinedArtworks);
          setTotalRecords(combinedTotalRecords);
          setTotalPages(Math.ceil(combinedTotalRecords / limit));
          setCurrentPage(1);
          setAicHasMoreForAll(tempAicHasMore);
          setHamHasMoreForAll(tempHamHasMore);
          setAicPageForAll(tempAicNextPage);
          setHamPageForAll(tempHamNextPage);

          if (
            aicResult.status === "rejected" &&
            hamResult.status !== "fulfilled" &&
            combinedArtworks.length === 0
          ) {
            throw new Error("Failed to fetch initial data from any source.");
          }
        }
      } catch (err) {
        console.error("Error in loadArtworks:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        if (errorMessage.includes("API Key is missing")) {
          setError(`${errorMessage} Check .env and restart.`);
        } else {
          setError(errorMessage);
        }
        setArtworks([]);
        setTotalPages(1);
        setCurrentPage(1);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || loading) {
      return;
    }

    const limit = 10;

    if (selectedSource === "all") {
      if (!aicHasMoreForAll && !hamHasMoreForAll) {
        return;
      }
      console.log(
        `handleLoadMore ('all'): Fetching AIC page ${aicPageForAll}, HAM page ${hamPageForAll}`,
      );
      setIsLoadingMore(true);

      const promises = [];
      if (aicHasMoreForAll) {
        promises.push(
          getArtworks("aic", aicPageForAll, limit).then((res) => ({
            ...res,
            sourceOrigin: "aic",
          })),
        );
      }
      if (hamHasMoreForAll && process.env.EXPO_PUBLIC_HARVARD_API_KEY) {
        promises.push(
          getArtworks("ham", hamPageForAll, limit).then((res) => ({
            ...res,
            sourceOrigin: "ham",
          })),
        );
      } else if (hamHasMoreForAll && !process.env.EXPO_PUBLIC_HARVARD_API_KEY) {
        setHamHasMoreForAll(false);
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
        if (result.status === "fulfilled") {
          const response = result.value;
          newArtworks = newArtworks.concat(response.artworks);
          if (response.sourceOrigin === "aic") {
            stillHasAic =
              response.pagination.currentPage < response.pagination.totalPages;
            nextAicPage = response.pagination.currentPage + 1;
          } else if (response.sourceOrigin === "ham") {
            stillHasHam =
              response.pagination.currentPage < response.pagination.totalPages;
            nextHamPage = response.pagination.currentPage + 1;
          }
        } else {
          console.error(
            `handleLoadMore ('all'): Failed to fetch more data:`,
            result.reason,
          );
        }
      });

      newArtworks.sort(() => Math.random() - 0.5);

      if (newArtworks.length > 0) {
        setArtworks((prevArtworks) => {
          const existingIds = new Set(prevArtworks.map((art) => art.id));
          const uniqueNewArtworks = newArtworks.filter(
            (art) => !existingIds.has(art.id),
          );
          return [...prevArtworks, ...uniqueNewArtworks];
        });
      }
      setAicPageForAll(nextAicPage);
      setHamPageForAll(nextHamPage);
      setAicHasMoreForAll(stillHasAic);
      setHamHasMoreForAll(stillHasHam);
      setIsLoadingMore(false);
    } else {
      if (currentPage >= totalPages) {
        return;
      }
      console.log(
        `handleLoadMore ('${selectedSource}'): Fetching page ${currentPage + 1}`,
      );
      setIsLoadingMore(true);

      try {
        const nextPage = currentPage + 1;
        const response = await getArtworks(selectedSource, nextPage, limit);

        setArtworks((prevArtworks) => [...prevArtworks, ...response.artworks]);
        setCurrentPage(response.pagination.currentPage);
        setTotalPages(response.pagination.totalPages);
        setTotalRecords(response.pagination.totalRecords);
      } catch (err) {
        console.error(
          `handleLoadMore ('${selectedSource}'): Failed to fetch page ${currentPage + 1}:`,
          err,
        );
        setError(`Failed to load more artworks.`);
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [
    selectedSource,
    isLoadingMore,
    loading,
    aicHasMoreForAll,
    hamHasMoreForAll,
    aicPageForAll,
    hamPageForAll,
    currentPage,
    totalPages,
  ]);

  const sortedArtworks = useMemo(() => {
    if (!sortField) {
      return artworks;
    }

    const artworksToSort = [...artworks];

    artworksToSort.sort((a, b) => {
      const fieldA = (a[sortField] || "").toLowerCase();
      const fieldB = (b[sortField] || "").toLowerCase();

      let comparison = 0;
      if (fieldA > fieldB) {
        comparison = 1;
      } else if (fieldA < fieldB) {
        comparison = -1;
      }

      return sortDirection === "desc" ? comparison * -1 : comparison;
    });

    return artworksToSort;
  }, [artworks, sortField, sortDirection]);

  useEffect(() => {
    console.log(`Source changed to: ${selectedSource}. Loading page 1.`);
    setCurrentPage(1);
    setAicPageForAll(1);
    setHamPageForAll(1);
    setAicHasMoreForAll(true);
    setHamHasMoreForAll(true);
    loadArtworks(selectedSource, 1);
  }, [selectedSource]);

  const handleSourceChange = (newSource: ApiSource | "all") => {
    if (newSource !== selectedSource) {
      setSelectedSource(newSource);
      setCurrentPage(1);
    }
  };

  const handleSortChange = (field: "title" | "artist") => {
    if (sortField === field) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const clearSort = () => {
    setSortField(null);
  };

  const renderArtwork = ({ item }: { item: UnifiedArtwork }) => {
    return (
      <TouchableOpacity
        style={styles.itemContainer}
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
          <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">
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
    );
  };

  if (loading && artworks.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text>Loading artworks...</Text>
      </View>
    );
  }

  if (error && artworks.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.sourceSelector}>
          <Button
            title="All"
            onPress={() => handleSourceChange("all")}
            disabled={selectedSource === "all"}
          />
          <Button
            title="AIC"
            onPress={() => handleSourceChange("aic")}
            disabled={selectedSource === "aic"}
          />
          <Button
            title="Harvard"
            onPress={() => handleSourceChange("ham")}
            disabled={selectedSource === "ham"}
          />
          <Button
            title="My Exhibition"
            onPress={() => navigation.navigate("Exhibition")}
          />
        </View>
        <Text style={styles.errorText}>Error loading artworks: {error}</Text>
        <Button title="Retry" onPress={() => loadArtworks(selectedSource, 1)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sourceSelector}>
        <Button
          title="All"
          onPress={() => handleSourceChange("all")}
          disabled={selectedSource === "all" || loading}
        />
        <Button
          title="AIC"
          onPress={() => handleSourceChange("aic")}
          disabled={selectedSource === "aic" || loading}
        />
        <Button
          title="Harvard"
          onPress={() => handleSourceChange("ham")}
          disabled={
            selectedSource === "ham" ||
            loading ||
            error?.includes("Harvard API Key")
          }
        />
        <Button
          title="My Exhibition"
          onPress={() => navigation.navigate("Exhibition")}
        />
      </View>

      <View style={styles.sortSelector}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <Button
          title="Title"
          onPress={() => handleSortChange("title")}
          disabled={loading}
        />
        <Button
          title="Artist"
          onPress={() => handleSortChange("artist")}
          disabled={loading}
        />
        {sortField && (
          <Button
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
            onPress={toggleSortDirection}
            disabled={loading}
          />
        )}
        {sortField && (
          <Button title="Clear Sort" onPress={clearSort} disabled={loading} />
        )}
      </View>

      {error && artworks.length > 0 && (
        <Text style={[styles.errorText, styles.inlineError]}>
          Error updating: {error}
        </Text>
      )}

      {Platform.OS === "web" ? (
        <ScrollView
          style={{ flex: 1, height: webContentHeight || 500 }}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const paddingToBottom = 20;
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - paddingToBottom
            ) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {sortedArtworks.map((item) => (
            <View key={item.id}>{renderArtwork({ item })}</View>
          ))}
          {isLoadingMore && (
            <ActivityIndicator
              style={styles.footerLoadingIndicator}
              size="small"
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={sortedArtworks}
          renderItem={renderArtwork}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            !loading && !isLoadingMore ? (
              <Text style={styles.emptyListText}>No artworks found.</Text>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={styles.footerLoadingIndicator}
                size="small"
              />
            ) : null
          }
        />
      )}

      {!isLoadingMore && artworks.length > 0 && (
        <View style={styles.paginationContainer}>
          {selectedSource !== "all" && (
            <>
              <Text style={styles.pageInfo}>
                {totalRecords > 0
                  ? `${totalRecords} total items`
                  : "Loading info..."}
              </Text>
              {currentPage < totalPages && !loading && (
                <Text style={styles.moreAvailableText}>
                  (Scroll down for more)
                </Text>
              )}
              {currentPage >= totalPages && !loading && (
                <Text style={styles.moreAvailableText}>(All items loaded)</Text>
              )}
            </>
          )}
          {selectedSource === "all" && (
            <>
              <Text style={styles.pageInfo}>
                {totalRecords > 0
                  ? `Approx. ${totalRecords} total items`
                  : "Showing combined results"}
              </Text>
              {(aicHasMoreForAll || hamHasMoreForAll) && !loading && (
                <Text style={styles.moreAvailableText}>
                  (Scroll down for more)
                </Text>
              )}
              {!aicHasMoreForAll && !hamHasMoreForAll && !loading && (
                <Text style={styles.moreAvailableText}>(All items loaded)</Text>
              )}
            </>
          )}
        </View>
      )}

      {loading && artworks.length > 0 && (
        <ActivityIndicator style={styles.pageLoadingIndicator} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    ...(Platform.OS === "web" && {
      height: "100vh",
      overflow: "hidden",
    }),
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
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
  },
  sourceSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    backgroundColor: "#e0e0e0",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    ...(Platform.OS === "web" && {
      top: 0,
      zIndex: 1,
    }),
  },
  sortSelector: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  sortLabel: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: "bold",
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
  errorText: {
    color: "red",
    textAlign: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  inlineError: {
    backgroundColor: "#ffdddd",
    color: "#cc0000",
    paddingVertical: 5,
    marginVertical: 0,
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    backgroundColor: "#fff",
  },
  pageInfo: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  moreAvailableText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
  },
  pageLoadingIndicator: {
    paddingVertical: 15,
  },
  footerLoadingIndicator: {
    marginVertical: 20,
  },
});
