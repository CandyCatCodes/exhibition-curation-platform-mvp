import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ExhibitionScreen() {
  return (
    <View style={styles.container}>
      <Text>My Exhibition Screen</Text>
      {/* List of saved artworks will go here */}
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
