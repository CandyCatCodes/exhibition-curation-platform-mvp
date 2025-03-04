import 'react-native-gesture-handler'; // Must be at the top
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import ArtworkDetailScreen from './src/screens/ArtworkDetailScreen';
import ExhibitionScreen from './src/screens/ExhibitionScreen';
import { RootStackParamList } from './src/navigation/types';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Artworks' }}
        />
        <Stack.Screen
          name="ArtworkDetail"
          component={ArtworkDetailScreen}
          options={{ title: 'Artwork Details' }}
        />
        <Stack.Screen
          name="Exhibition"
          component={ExhibitionScreen}
          options={{ title: 'My Exhibition' }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

// No need for the StyleSheet here anymore unless you add global styles later
