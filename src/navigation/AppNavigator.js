import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ChatScreen from "../screens/ChatScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import GroupsScreen from "../screens/GroupsScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import NotesScreen from "../screens/NotesScreen";
import PremiumScreen from "../screens/PremiumScreen";
import PrivateChatScreen from "../screens/PrivateChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import VideoRoomScreen from "../screens/VideoRoomScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />

        <Stack.Screen
          name="Groups"
          component={GroupsScreen}
        />

        <Stack.Screen
          name="Chat"
          component={ChatScreen}
        />

        <Stack.Screen
          name="Discover"
          component={DiscoverScreen}
        />

        <Stack.Screen
          name="PrivateChat"
          component={PrivateChatScreen}
         />

         <Stack.Screen
          name="VideoRoom"
          component={VideoRoomScreen}
         />

         <Stack.Screen
          name="Notes"
          component={NotesScreen}
         />

         <Stack.Screen
          name="Premium"
          component={PremiumScreen}
         />



      </Stack.Navigator>
    </NavigationContainer>
  );
}