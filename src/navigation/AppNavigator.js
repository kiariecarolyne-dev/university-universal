import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { auth } from "../services/firebase";

import MainTabs from "./MainTabs";

import ChatScreen from "../screens/ChatScreen";
import CommentsScreen from "../screens/CommentsScreen";
import DailyChallengeScreen from "../screens/DailyChallengeScreen";
import InboxScreen from "../screens/InboxScreen";
import LoginScreen from "../screens/LoginScreen";
import MembersScreen from "../screens/MembersScreen";
import PastPapersScreen from "../screens/PastPapersScreen";
import PremiumScreen from "../screens/PremiumScreen";
import PrivateChatScreen from "../screens/PrivateChatScreen";
import QuestionOfTheDayScreen from "../screens/QuestionOfTheDayScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StudentProfileScreen from "../screens/StudentProfileScreen";
import UploadPastPaperScreen from "../screens/UploadPastPaperScreen";
import VideoRoomScreen from "../screens/VideoRoomScreen";
import WeeklyRankingScreen from "../screens/WeeklyRankingScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  // Loading screen while checking authentication
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
        {!user ? (
          <>
            {/* AUTH SCREENS */}

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
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />

            {/* GROUP CHAT */}

            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ title: "Group Chat" }}
            />

            {/* COMMENTS */}

            <Stack.Screen
  name="Comments"
  component={CommentsScreen}
  options={{
    title: "Comments",
  }}
/>

{/* QUESTION OF THE DAY */}

<Stack.Screen
  name="QuestionOfTheDay"
  component={QuestionOfTheDayScreen}
  options={{
    title: "Question of the Day",
  }}
/>

{/* DAILY CHALLENGE */}

<Stack.Screen
  name="DailyChallenge"
  component={DailyChallengeScreen}
  options={{
    title: "Daily Challenge",
  }}
/>

{/* WEEKLY RANKING */}

<Stack.Screen
  name="WeeklyRanking"
  component={WeeklyRankingScreen}
/>

            {/* PRIVATE CHAT */}

            <Stack.Screen
              name="PrivateChat"
              component={PrivateChatScreen}
              options={{ title: "Private Chat" }}
            />

            {/* INBOX */}

            <Stack.Screen
              name="Inbox"
              component={InboxScreen}
              options={{ title: "Private Messages" }}
            />

            {/* VIDEO STUDY ROOM */}

            <Stack.Screen
              name="VideoRoom"
              component={VideoRoomScreen}
              options={{ title: "Video Study Room" }}
            />

            {/* PREMIUM */}

            <Stack.Screen
              name="Premium"
              component={PremiumScreen}
              options={{ title: "Upgrade Premium" }}
            />

            {/* PAST PAPERS */}

            <Stack.Screen
              name="PastPapers"
              component={PastPapersScreen}
              options={{ title: "Past Papers" }}
            />

            {/* UPLOAD PAST PAPER */}

            <Stack.Screen
              name="UploadPastPaper"
              component={UploadPastPaperScreen}
              options={{ title: "Upload Past Paper" }}
            />

            {/* GROUP MEMBERS */}

            <Stack.Screen
              name="Members"
              component={MembersScreen}
              options={{ title: "Group Members" }}
            />

            {/* STUDENT PROFILE */}

            <Stack.Screen
              name="StudentProfile"
              component={StudentProfileScreen}
              options={{ title: "Student Profile" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}