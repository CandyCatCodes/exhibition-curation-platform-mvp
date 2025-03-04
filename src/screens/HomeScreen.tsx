import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types'; // We'll create this next

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text>Home Screen (Artwork List/Search)</Text>
      {/* Example navigation buttons */}
      <Button
        title="Go to Artwork Detail (Example)"
        onPress={() => navigation.navigate('ArtworkDetail', { artworkId: 'example-123' })}
      />
      <Button
        title="Go to My Exhibition"
        onPress={() => navigation.navigate('Exhibition')}
      />
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
