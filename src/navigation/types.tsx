// Defines the parameters expected by each screen in the stack navigator
export type RootStackParamList = {
  Home: undefined; // No parameters expected for HomeScreen
  ArtworkDetail: { artworkId: string }; // ArtworkDetailScreen expects an artworkId
  Exhibition: undefined; // No parameters expected for ExhibitionScreen
};
