// Defines the parameters expected by each screen in the stack navigator
export type RootStackParamList = {
  Home: undefined; // No parameters expected for HomeScreen
  ArtworkDetail: { artworkId: string }; // Ensure artworkId is string for navigation params
  Exhibition: undefined; // No parameters expected for ExhibitionScreen
};
