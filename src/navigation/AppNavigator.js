import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { auth } from "../services/firebase";

import { navigationRef } from "../utils/navigationRef";

import IncomingCallHandler from "../components/IncomingCallHandler";

import MainTabs from "./MainTabs";

import AdminJobsScreen from "../screens/AdminJobsScreen";
import ChatScreen from "../screens/ChatScreen";
import CommentsScreen from "../screens/CommentsScreen";
import DailyChallengeScreen from "../screens/DailyChallengeScreen";
import DebateBattleScreen from "../screens/DebateBattleScreen";
import DebateChallengesScreen from "../screens/DebateChallengesScreen";
import DebateLobbyScreen from "../screens/DebateLobbyScreen";
import InboxScreen from "../screens/InboxScreen";
import JobApplicationsScreen from "../screens/JobApplicationsScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import JobsScreen from "../screens/JobsScreen";
import LiveDebatesScreen from "../screens/LiveDebatesScreen";
import LoginScreen from "../screens/LoginScreen";
import MembersScreen from "../screens/MembersScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import OutgoingCallScreen from "../screens/OutgoingCallScreen";
import PastPapersScreen from "../screens/PastPapersScreen";
import PostJobScreen from "../screens/PostJobScreen";
import PremiumScreen from "../screens/PremiumScreen";
import PrivateChatScreen from "../screens/PrivateChatScreen";
import QuestionOfTheDayScreen from "../screens/QuestionOfTheDayScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StudentProfileScreen from "../screens/StudentProfileScreen";
import UploadPastPaperScreen from "../screens/UploadPastPaperScreen";
import VideoRoomScreen from "../screens/VideoRoomScreen";
import WeeklyRankingScreen from "../screens/WeeklyRankingScreen";

// Diagnostic check to immediately identify broken/undefined imports
const screenMap = {
  MainTabs,
  AdminJobsScreen,
  LoginScreen,
  RegisterScreen,
  ChatScreen,
  CommentsScreen,
  DailyChallengeScreen,
  DebateBattleScreen,
  DebateChallengesScreen,
  DebateLobbyScreen,
  InboxScreen,
  JobApplicationsScreen,
  JobDetailScreen,
  JobsScreen,
  LiveDebatesScreen,
  MembersScreen,
  NotificationsScreen,
  OutgoingCallScreen,
  PastPapersScreen,
  PostJobScreen,
  PremiumScreen,
  PrivateChatScreen,
  QuestionOfTheDayScreen,
  StudentProfileScreen,
  UploadPastPaperScreen,
  VideoRoomScreen,
  WeeklyRankingScreen,
};

Object.entries(screenMap).forEach(([name, component]) => {
  if (!component) {
    console.error(`❌ IMPORT ERROR: Screen "${name}" is undefined. Check if it missing 'export default'.`);
  }
});

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      },
      (error) => {
        console.error("Auth state change error:", error);
        setUser(null);
      }
    );

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
    <>
      <NavigationContainer ref={navigationRef}>
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

            {/* NOTIFICATIONS */}
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: "Notifications" }}
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
              options={{ title: "Comments" }}
            />

            {/* QUESTION OF THE DAY */}
            <Stack.Screen
              name="QuestionOfTheDay"
              component={QuestionOfTheDayScreen}
              options={{ title: "Question of the Day" }}
            />

            {/* DAILY CHALLENGE */}
            <Stack.Screen
              name="DailyChallenge"
              component={DailyChallengeScreen}
              options={{ title: "Daily Challenge" }}
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

            {/* JOBS & CAREERS */}
            <Stack.Screen
              name="Jobs"
              component={JobsScreen}
              options={{ title: "Jobs & Careers" }}
            />
            <Stack.Screen
              name="PostJob"
              component={PostJobScreen}
              options={{ title: "Post Job" }}
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

            {/* DEBATE LOBBY */}
            <Stack.Screen
              name="DebateLobby"
              component={DebateLobbyScreen}
            />

            {/* DEBATE CHALLENGES */}
            <Stack.Screen
              name="DebateChallenges"
              component={DebateChallengesScreen}
            />

            {/* DEBATE BATTLE */}
            <Stack.Screen
              name="DebateBattle"
              component={DebateBattleScreen}
            />

            {/* LIVE DEBATES */}
            <Stack.Screen
              name="LiveDebates"
              component={LiveDebatesScreen}
              options={{ title: "Live Debates" }}
            />

            {/* OUTGOING CALL */}
            <Stack.Screen
              name="OutgoingCall"
              component={OutgoingCallScreen}
              options={{ headerShown: false }}
            />

            {/* JOB DETAIL */}
            <Stack.Screen
              name="JobDetail"
              component={JobDetailScreen}
              options={{ title: "Job Details" }}
            />

            {/* JOB APPLICATIONS */}
            <Stack.Screen
              name="JobApplications"
              component={JobApplicationsScreen}
              options={{ title: "Applications" }}
            />

            {/* ADMIN JOB MANAGEMENT */}
            <Stack.Screen
              name="AdminJobs"
              component={AdminJobsScreen}
              options={{ title: "Job Management" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>

      {user && <IncomingCallHandler />}
    </>
  );
}