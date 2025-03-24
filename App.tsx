import "react-native-gesture-handler";
import React from "react";
import { LogBox } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { ExhibitionProvider } from "./src/context/ExhibitionContext";
import HomeScreen from "./src/screens/HomeScreen";
import ArtworkDetailScreen from "./src/screens/ArtworkDetailScreen";
import ExhibitionScreen from "./src/screens/ExhibitionScreen";
import { RootStackParamList } from "./src/navigation/types";

const Stack = createStackNavigator<RootStackParamList>();

LogBox.ignoreLogs([
  "Warning: TNodeChildrenRenderer: Support for defaultProps will be removed",
]);

export default function App() {
  return (
    <ExhibitionProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Artworks" }}
          />
          <Stack.Screen
            name="ArtworkDetail"
            component={ArtworkDetailScreen}
            options={{ title: "Artwork Details" }}
          />
          <Stack.Screen
            name="Exhibition"
            component={ExhibitionScreen}
            options={{ title: "My Exhibition" }}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </ExhibitionProvider>
  );
}
