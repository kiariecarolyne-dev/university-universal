import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { auth } from "../services/firebase";

import ChatScreen from "../screens/ChatScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import GroupsScreen from "../screens/GroupsScreen";
import HomeScreen from "../screens/HomeScreen";
import InboxScreen from "../screens/InboxScreen";
import LoginScreen from "../screens/LoginScreen";
import NotesScreen from "../screens/NotesScreen";
import PremiumScreen from "../screens/PremiumScreen";
import PrivateChatScreen from "../screens/PrivateChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import UploadNotesScreen from "../screens/UploadNotesScreen";
import VideoRoomScreen from "../screens/VideoRoomScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  /* Loading screen while checking auth */
  if (user === undefined) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#05070A",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#05070A",
          },
          headerTintColor: "#FFFFFF",
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: "#05070A",
          },
        }}
      >

        {/* AUTH SCREENS */}

        {!user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: "Create Account" }}
            />
          </>
        ) : (
          <>
            {/* MAIN APP */}

            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: "My Profile" }}
            />

            <Stack.Screen
              name="Groups"
              component={GroupsScreen}
              options={{ title: "Student Groups" }}
            />

            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ title: "Group Chat" }}
            />

            <Stack.Screen
              name="Discover"
              component={DiscoverScreen}
              options={{ title: "Discover Students" }}
            />

            <Stack.Screen
              name="PrivateChat"
              component={PrivateChatScreen}
              options={{ title: "Private Chat" }}
            />

            <Stack.Screen
  name="Inbox"
  component={InboxScreen}
  options={{ title: "Private Messages" }}
/>

            <Stack.Screen
              name="VideoRoom"
              component={VideoRoomScreen}
              options={{ title: "Video Study Room" }}
            />

            <Stack.Screen
              name="Notes"
              component={NotesScreen}
              options={{ title: "Notes Marketplace" }}
            />

            <Stack.Screen
              name="Premium"
              component={PremiumScreen}
              options={{ title: "Upgrade Premium" }}
            />

            <Stack.Screen
              name="UploadNotes"
              component={UploadNotesScreen}
              options={{ title: "Upload Notes" }}
            />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}