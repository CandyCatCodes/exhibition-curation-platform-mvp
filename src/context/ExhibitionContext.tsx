import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { UnifiedArtwork } from '../services/api'; // Import the artwork type

// Define the shape of the context data and functions
interface ExhibitionContextType {
  exhibition: UnifiedArtwork[];
  addToExhibition: (artwork: UnifiedArtwork) => void;
  removeFromExhibition: (artworkId: string) => void;
  isArtworkInExhibition: (artworkId: string) => boolean;
}

// Create the context with a default value (can be undefined or a default object)
// Using undefined forces consumers to be nested within a provider
const ExhibitionContext = createContext<ExhibitionContextType | undefined>(undefined);

// Define the props for the provider component
interface ExhibitionProviderProps {
  children: ReactNode;
}

// Create the provider component
export const ExhibitionProvider: React.FC<ExhibitionProviderProps> = ({ children }) => {
  const [exhibition, setExhibition] = useState<UnifiedArtwork[]>([]);

  // Function to add an artwork to the exhibition
  const addToExhibition = useCallback((artwork: UnifiedArtwork) => {
    setExhibition((prevExhibition) => {
      // Check if the artwork is already in the exhibition
      if (prevExhibition.some((item) => item.id === artwork.id)) {
        return prevExhibition; // Return previous state if already exists
      }
      // Add the new artwork
      return [...prevExhibition, artwork];
    });
  }, []); // Empty dependency array as it doesn't depend on external state/props

  // Function to remove an artwork from the exhibition by its prefixed ID
  const removeFromExhibition = useCallback((artworkId: string) => {
    setExhibition((prevExhibition) =>
      prevExhibition.filter((item) => item.id !== artworkId)
    );
  }, []); // Empty dependency array

  // Helper function to check if an artwork is already in the exhibition
  const isArtworkInExhibition = useCallback((artworkId: string): boolean => {
    return exhibition.some((item) => item.id === artworkId);
  }, [exhibition]); // Depends on the exhibition state

  // The value provided to consuming components
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

// Custom hook to use the Exhibition context
export const useExhibition = (): ExhibitionContextType => {
  const context = useContext(ExhibitionContext);
  if (context === undefined) {
    throw new Error('useExhibition must be used within an ExhibitionProvider');
  }
  return context;
};
