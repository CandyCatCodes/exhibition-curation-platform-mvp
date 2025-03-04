import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types'; // We'll create this next

type ArtworkDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArtworkDetail'>;

type Props = {
  route: ArtworkDetailScreenRouteProp;
};

export default function ArtworkDetailScreen({ route }: Props) {
  const { artworkId } = route.params;

  return (
    <View style={styles.container}>
      <Text>Artwork Detail Screen</Text>
      <Text>Artwork ID: {artworkId}</Text>
      {/* Add/Remove from exhibition button will go here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
