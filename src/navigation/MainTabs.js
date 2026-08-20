import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

import DiscoverScreen from "../screens/DiscoverScreen";
import GroupsScreen from "../screens/GroupsScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SocialScreen from "../screens/SocialScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: "#05070A",
          borderTopColor: "#1F2937",
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },

        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#6B7280",

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>🏠</Text>
          ),
        }}
      />

      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>🌍</Text>
          ),
        }}
      />

      <Tab.Screen
        name="SocialTab"
        component={SocialScreen}
        options={{
          title: "Social",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>💬</Text>
          ),
        }}
      />

      <Tab.Screen
        name="GroupsTab"
        component={GroupsScreen}
        options={{
          title: "Groups",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>👥</Text>
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}