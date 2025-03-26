import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnifiedArtwork } from "../services/api";

interface ExhibitionContextType {
  exhibition: UnifiedArtwork[];
  addToExhibition: (artwork: UnifiedArtwork) => void;
  removeFromExhibition: (artworkId: string) => void;
  isArtworkInExhibition: (artworkId: string) => boolean;
}

const ExhibitionContext = createContext<ExhibitionContextType | undefined>(
  undefined,
);

interface ExhibitionProviderProps {
  children: ReactNode;
}

const EXHIBITION_STORAGE_KEY = "exhibitionList";

export const ExhibitionProvider: React.FC<ExhibitionProviderProps> = ({
  children,
}) => {
  const [exhibition, setExhibition] = useState<UnifiedArtwork[]>([]);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

  useEffect(() => {
    const loadExhibition = async () => {
      try {
        const storedExhibition = await AsyncStorage.getItem(
          EXHIBITION_STORAGE_KEY,
        );
        if (storedExhibition !== null) {
          try {
            const parsedExhibition = JSON.parse(storedExhibition);
            if (Array.isArray(parsedExhibition)) {
              setExhibition(parsedExhibition);
            } else {
              console.warn(
                "Stored exhibition data is not an array, resetting.",
              );
              await AsyncStorage.removeItem(EXHIBITION_STORAGE_KEY);
            }
          } catch (parseError) {
            console.error("Error parsing stored exhibition data:", parseError);
            await AsyncStorage.removeItem(EXHIBITION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Error loading exhibition from AsyncStorage:", error);
      } finally {
        setIsLoadedFromStorage(true);
      }
    };

    loadExhibition();
  }, []);

  useEffect(() => {
    const saveExhibition = async () => {
      try {
        await AsyncStorage.setItem(
          EXHIBITION_STORAGE_KEY,
          JSON.stringify(exhibition),
        );
      } catch (error) {
        console.error("Error saving exhibition to AsyncStorage:", error);
      }
    };

    if (isLoadedFromStorage) {
      saveExhibition();
    }
  }, [exhibition, isLoadedFromStorage]);

  const addToExhibition = useCallback((artwork: UnifiedArtwork) => {
    setExhibition((prevExhibition) => {
      if (prevExhibition.some((item) => item.id === artwork.id)) {
        return prevExhibition;
      }
      return [...prevExhibition, artwork];
    });
  }, []);

  const removeFromExhibition = useCallback((artworkId: string) => {
    setExhibition((prevExhibition) =>
      prevExhibition.filter((item) => item.id !== artworkId),
    );
  }, []);

  const isArtworkInExhibition = useCallback(
    (artworkId: string): boolean => {
      return exhibition.some((item) => item.id === artworkId);
    },
    [exhibition],
  );

  const value = {
    exhibition,
    addToExhibition,
    removeFromExhibition,
    isArtworkInExhibition,
  };

  return (
    <ExhibitionContext.Provider value={value}>
      {children}
    </ExhibitionContext.Provider>
  );
};

export const useExhibition = (): ExhibitionContextType => {
  const context = useContext(ExhibitionContext);
  if (context === undefined) {
    throw new Error("useExhibition must be used within an ExhibitionProvider");
  }
  return context;
};
