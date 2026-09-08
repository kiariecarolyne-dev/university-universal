import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { auth, db } from "../services/firebase";

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
import EditProfileScreen from "../screens/EditProfileScreen";
import FriendsMatchScreen from "../screens/FriendsMatchScreen";
import InboxScreen from "../screens/InboxScreen";
import JobApplicationsScreen from "../screens/JobApplicationsScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import JobsScreen from "../screens/JobsScreen";
import LiveDebatesScreen from "../screens/LiveDebatesScreen";
import LoginScreen from "../screens/LoginScreen";
import MatchPreferencesScreen from "../screens/MatchPreferencesScreen";
import MatchSwipeScreen from "../screens/MatchSwipeScreen";
import MembersScreen from "../screens/MembersScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
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
import YourMatchesScreen from "../screens/YourMatchesScreen";

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
  EditProfileScreen,
  FriendsMatchScreen,
  InboxScreen,
  JobApplicationsScreen,
  JobDetailScreen,
  JobsScreen,
  LiveDebatesScreen,
  MatchPreferencesScreen,
  MatchSwipeScreen,
  MembersScreen,
  NotificationsScreen,
  OnboardingScreen,
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
  YourMatchesScreen,
};

Object.entries(screenMap).forEach(([name, component]) => {
  if (!component) {
    console.error(`❌ IMPORT ERROR: Screen "${name}" is undefined. Check if it missing 'export default'.`);
  }
});

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(undefined);
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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

  /* =============================================
     ONBOARDING GATE
     Watches users/{uid} once the user is signed in
     and decides whether onboarding is required.

     - onboardingCompleted === true       → skip
     - clearly complete profile (name +
       real course & university)          → skip + mark completed
     - otherwise                          → show onboarding
     - document missing / listener error  → skip (never lock out)
  ============================================= */

  useEffect(() => {
    if (!user) {
      setProfileChecked(false);
      setNeedsOnboarding(false);
      return;
    }

    let active = true;

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        if (!active) return;

        if (snapshot.exists()) {
          const data = snapshot.data();

          const hasName =
            typeof data.fullName === "string" &&
            data.fullName.trim().length > 0;

          const hasRealCourse =
            typeof data.course === "string" &&
            data.course.trim() !== "" &&
            data.course !== "Not set yet";

          const hasRealUniversity =
            typeof data.university === "string" &&
            data.university.trim() !== "" &&
            data.university !== "Not set yet";

          const profileComplete =
            hasName && hasRealCourse && hasRealUniversity;

          if (
            !data.onboardingCompleted &&
            profileComplete
          ) {
            // Legacy user with a fully populated profile:
            // treat onboarding as done and record it once.
            setDoc(
              doc(db, "users", user.uid),
              { onboardingCompleted: true },
              { merge: true }
            ).catch(() => {});
          }

          setNeedsOnboarding(
            data.onboardingCompleted !== true &&
              !profileComplete
          );
        } else {
          // Missing document — never block the user.
          setNeedsOnboarding(false);
        }

        setProfileChecked(true);
      },
      (error) => {
        console.log("Profile gate error:", error);

        if (active) {
          setNeedsOnboarding(false);
          setProfileChecked(true);
        }
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user]);

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

  // Brief pause while deciding whether onboarding is needed
  if (user && !profileChecked) {
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
            {/* ONBOARDING (only for users who have not completed it) */}
            {needsOnboarding && (
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
            )}

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

            {/* FRIENDS & MATCH */}
            <Stack.Screen
              name="FriendsMatch"
              component={FriendsMatchScreen}
              options={{ title: "Friends & Match" }}
            />
            <Stack.Screen
              name="MatchSwipe"
              component={MatchSwipeScreen}
              options={{ title: "Find Your Match" }}
            />
            <Stack.Screen
              name="YourMatches"
              component={YourMatchesScreen}
              options={{ title: "Your Matches" }}
            />
            <Stack.Screen
              name="MatchPreferences"
              component={MatchPreferencesScreen}
              options={{ title: "Match Preferences" }}
            />

            {/* EDIT PROFILE */}
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ title: "Edit Profile" }}
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