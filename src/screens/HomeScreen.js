import { useEffect, useState } from "react";

import {
  Alert,
  AppState,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";
import { getUserPlan, isInTrialPeriod } from "../utils/access";

// -------------------------------------------------
// GET CURRENT WEEK KEY
// -------------------------------------------------

function getWeekKey() {
  const now = new Date();

  const startOfYear = new Date(
    now.getFullYear(),
    0,
    1
  );

  const days =
    Math.floor(
      (now - startOfYear) /
        (1000 * 60 * 60 * 24)
    );

  const week =
    Math.ceil(
      (days + startOfYear.getDay() + 1) / 7
    );

  return `${now.getFullYear()}-W${String(
    week
  ).padStart(2, "0")}`;
}


export default function HomeScreen({ navigation }) {
  const user = useUser();

  const [roomCounts, setRoomCounts] = useState({
    GlobalStudyHall: 0,
  });

  const [onlineStudents, setOnlineStudents] = useState(0);

  const [weeklyRanking, setWeeklyRanking] = useState([]);
const [myWeeklyPosition, setMyWeeklyPosition] = useState(null);
const [myWeeklyXP, setMyWeeklyXP] = useState(0);

  /* -------------------------------------------------
     SET USER ONLINE
  ------------------------------------------------- */

  useEffect(() => {
    if (!auth.currentUser) return;

    updateDoc(doc(db, "users", auth.currentUser.uid), {
      online: true,
      lastSeen: serverTimestamp(),
    }).catch(() => {});
  }, []);

  /* -------------------------------------------------
     TRACK APP ACTIVE / BACKGROUND
  ------------------------------------------------- */

  useEffect(() => {
    if (!auth.currentUser) return;

    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        if (!auth.currentUser) return;

        try {
          if (nextState === "active") {
            await updateDoc(
              doc(db, "users", auth.currentUser.uid),
              {
                online: true,
                lastSeen: serverTimestamp(),
              }
            );
          } else {
            await updateDoc(
              doc(db, "users", auth.currentUser.uid),
              {
                online: false,
                lastSeen: serverTimestamp(),
              }
            );
          }
        } catch (error) {
          console.log("Online status error:", error);
        }
      }
    );

    return () => subscription.remove();
  }, []);

  /* -------------------------------------------------
     COUNT ONLINE STUDENTS
  ------------------------------------------------- */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        let count = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          if (data.online === true) {
            count++;
          }
        });

        setOnlineStudents(count);
      },
      (error) => {
        console.log("Online students error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

/* -------------------------------------------------
   WEEKLY RANKING
------------------------------------------------- */

useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const students = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        const currentWeek = getWeekKey();

const studentWeek =
  data.weeklyXPWeek || null;

const weeklyXP =
  studentWeek === currentWeek
    ? Number(data.weeklyXP || 0)
    : 0;

students.push({
  id: docSnap.id,
  fullName: data.fullName || "Student",
  weeklyXP,
});
      });

      // Highest weekly XP first
      students.sort((a, b) => b.weeklyXP - a.weeklyXP);

      setWeeklyRanking(students.slice(0, 5));

      // Find current user's position
      if (auth.currentUser) {
        const myIndex = students.findIndex(
          (student) =>
            student.id === auth.currentUser.uid
        );

        if (myIndex !== -1) {
          setMyWeeklyPosition(myIndex + 1);
          setMyWeeklyXP(
            students[myIndex].weeklyXP
          );
        } else {
          setMyWeeklyPosition(null);
          setMyWeeklyXP(0);
        }
      }
    },
    (error) => {
      console.log(
        "Weekly ranking error:",
        error
      );
    }
  );

  return () => unsubscribe();
}, []);


  /* -------------------------------------------------
     PREMIUM EXPIRY CHECK
  ------------------------------------------------- */

  useEffect(() => {
    if (!user) return;

    if (user.isPremium === false && user.premiumUntil) {
      const now = new Date();
      const expiryDate = new Date(user.premiumUntil);

      if (now > expiryDate) {
        Alert.alert(
          "Subscription Expired",
          "Your Premium subscription has expired.",
          [
            {
              text: "Renew Now",
              onPress: () => navigation.navigate("Premium"),
            },
            {
              text: "Later",
              style: "cancel",
            },
          ]
        );
      }
    }
  }, [user]);

  /* -------------------------------------------------
     STUDY ROOM COUNTS
  ------------------------------------------------- */

  useEffect(() => {
    if (!user) return;

    const rooms = ["GlobalStudyHall"];

    if (user.course && user.course !== "Not set yet") {
      rooms.push(user.course);
    }

    const unsubscribes = rooms.map((room) => {
      return onSnapshot(
        collection(
          db,
          "videoRooms",
          room,
          "participants"
        ),
        (snapshot) => {
          setRoomCounts((prev) => ({
            ...prev,
            [room]: snapshot.size,
          }));
        },
        (error) => {
          console.log("Room count error:", error);
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  if (!user) return null;

  /* -------------------------------------------------
     USER PLAN
  ------------------------------------------------- */

  const plan = getUserPlan(user);

  let trialDaysLeft = 0;

  if (isInTrialPeriod(user) && user.createdAt) {
    const createdDate = new Date(user.createdAt);
    const now = new Date();

    const diff = now - createdDate;
    const daysPassed = diff / (1000 * 60 * 60 * 24);

    trialDaysLeft = Math.max(
      0,
      Math.ceil(3 - daysPassed)
    );
  }

  /* -------------------------------------------------
     STUDY ROOMS
  ------------------------------------------------- */

  const rooms = [
    {
      id: "GlobalStudyHall",
      emoji: "🌍",
      title: "Global Study Hall",
    },
  ];

  if (user.course && user.course !== "Not set yet") {
    rooms.push({
      id: user.course,
      emoji: "📚",
      title: user.course,
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* =========================================
          WELCOME
      ========================================= */}

      <View style={styles.hero}>
        <Text style={styles.smallGreeting}>
          Welcome back 👋
        </Text>

        <Text style={styles.welcome}>
          {user.fullName?.split(" ")[0] || "Student"}
        </Text>

        <Text style={styles.subtitle}>
          Your global student community is waiting for you 🌍
        </Text>
      </View>

      {/* =========================================
          LIVE STUDENT ACTIVITY
      ========================================= */}

      <TouchableOpacity
        style={styles.onlineCard}
        onPress={() => navigation.navigate("Discover")}
      >
        <View style={styles.onlineIcon}>
          <Text style={styles.onlineEmoji}>🌍</Text>
        </View>

        <View style={styles.onlineInfo}>
          <Text style={styles.onlineNumber}>
            {onlineStudents}
          </Text>

          <Text style={styles.onlineText}>
            students online now
          </Text>
        </View>

        <Text style={styles.onlineArrow}>›</Text>
      </TouchableOpacity>

      {/* =========================================
          DAILY CHALLENGE
      ========================================= */}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          🎯 Today's Challenge
        </Text>

        <Text style={styles.sectionHint}>
          Compete with students worldwide
        </Text>
      </View>

      <TouchableOpacity
  style={styles.challengeCard}
  onPress={() => navigation.navigate("DailyChallenge")}
>
        <View style={styles.challengeTop}>
          <Text style={styles.challengeEmoji}>🧠</Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>
              Daily Student Quiz
            </Text>

            <Text style={styles.challengeText}>
              Test your knowledge and see how you rank globally.
            </Text>
          </View>
        </View>

        <View style={styles.challengeBottom}>
          <Text style={styles.challengeReward}>
  ⭐ Earn 10 XP
</Text>

          <Text style={styles.challengeButton}>
            Play →
          </Text>
        </View>
      </TouchableOpacity>

      {/* =========================================
          QUESTION OF THE DAY
      ========================================= */}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          💬 Question of the Day
        </Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionEmoji}>
          💭
        </Text>

        <Text style={styles.question}>
          If you could study at any university in the world,
          where would you go?
        </Text>

        <TouchableOpacity
  style={styles.questionButton}
  onPress={() => navigation.navigate("QuestionOfTheDay")}
>
  <Text style={styles.questionButtonText}>
    Answer Question
  </Text>
</TouchableOpacity>

        <Text style={styles.responses}>
          🌍 Student responses coming soon
        </Text>
      </View>

      {/* =========================================
          GLOBAL STUDY HALL
      ========================================= */}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          🌎 Global Study Hall
        </Text>

        <Text style={styles.sectionHint}>
          Study together with students worldwide
        </Text>
      </View>

      <View style={styles.videoGrid}>
        {rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={styles.videoCard}
            onPress={() =>
              navigation.navigate("VideoRoom", {
                roomName: room.id,
              })
            }
          >
            <Text style={styles.videoEmoji}>
              {room.emoji}
            </Text>

            <Text style={styles.videoCardTitle}>
              {room.title}
            </Text>

            <Text style={styles.videoCardHint}>
              👥 {roomCounts[room.id] || 0} students studying
            </Text>

            <View style={styles.joinButton}>
              <Text style={styles.joinButtonText}>
                Join Study Hall
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

     {/* =========================================
    YOUR STREAK
========================================= */}

<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>
    🔥 Your Progress
  </Text>
</View>

<View style={styles.progressRow}>

  {/* STREAK */}

  <View style={styles.progressCard}>

    <Text style={styles.progressEmoji}>
      🔥
    </Text>

    <Text style={styles.progressNumber}>
      {user.streak || 0}
    </Text>

    <Text style={styles.progressLabel}>
      Day Streak
    </Text>

  </View>


  {/* XP */}

  <View style={styles.progressCard}>

    <Text style={styles.progressEmoji}>
      ⭐
    </Text>

    <Text style={styles.progressNumber}>
      {user.xp || 0}
    </Text>

    <Text style={styles.progressLabel}>
      XP
    </Text>

  </View>

</View>

{/* =========================================
    WEEKLY RANKING
========================================= */}

<View style={styles.rankingCard}>

  <View style={styles.rankingHeader}>

    <View>
      <Text style={styles.rankingTitle}>
        🏆 Weekly Ranking
      </Text>

      <Text style={styles.rankingSubtitle}>
        Top students this week
      </Text>
    </View>

    <Text style={styles.trophy}>
      🏆
    </Text>

  </View>

  {/* TOP STUDENTS */}

  {weeklyRanking.length === 0 ? (

    <View style={styles.emptyRanking}>
      <Text style={styles.emptyRankingText}>
        No weekly XP yet.
      </Text>

      <Text style={styles.emptyRankingSubtext}>
        Answer today's challenge to start climbing!
      </Text>
    </View>

  ) : (

    weeklyRanking.map((student, index) => (

      <View
        key={student.id}
        style={styles.rankingStudent}
      >

        <Text style={styles.rankNumber}>
          {index === 0
            ? "🥇"
            : index === 1
            ? "🥈"
            : index === 2
            ? "🥉"
            : `#${index + 1}`}
        </Text>

        <View style={styles.rankingStudentInfo}>

          <Text style={styles.rankingStudentName}>
            {student.id === auth.currentUser?.uid
              ? "You"
              : student.fullName}
          </Text>

          <Text style={styles.rankingStudentXP}>
            ⭐ {student.weeklyXP} XP
          </Text>

        </View>

      </View>

    ))

  )}

  {/* YOUR POSITION */}

  <View style={styles.myRankingBox}>

    <Text style={styles.myRankingPosition}>
      {myWeeklyPosition
        ? `#${myWeeklyPosition}`
        : "—"}
    </Text>

    <View style={{ flex: 1 }}>

      <Text style={styles.myRankingTitle}>
        Your weekly position
      </Text>

      <Text style={styles.myRankingText}>
        ⭐ {myWeeklyXP} XP this week
      </Text>

    </View>

  </View>

</View>

      {/* =========================================
          MEMBERSHIP
      ========================================= */}

      <View style={styles.planCard}>
        <Text style={styles.planLabel}>
          Your Membership
        </Text>

        <Text style={styles.planText}>
          {plan === "premium"
            ? "⭐ Premium"
            : plan === "trial"
            ? "🚀 Trial"
            : "🆓 Free"}
        </Text>

        {plan === "trial" && (
          <Text style={styles.trialText}>
            Trial ends in {trialDaysLeft} day(s)
          </Text>
        )}

        {plan !== "premium" && (
          <Text style={styles.upgradeHint}>
            Unlock private chats, study rooms and more.
          </Text>
        )}
      </View>

      {/* =========================================
          PAST PAPERS
      ========================================= */}

      <TouchableOpacity
        style={styles.utilityCard}
        onPress={() =>
          navigation.navigate("PastPapers")
        }
      >
        <Text style={styles.utilityEmoji}>
          📄
        </Text>

        <View style={{ flex: 1 }}>
          <Text style={styles.utilityTitle}>
            Past Papers
          </Text>

          <Text style={styles.utilityText}>
            Find academic papers to help you prepare.
          </Text>
        </View>

        <Text style={styles.utilityArrow}>
          →
        </Text>
      </TouchableOpacity>

      {/* =========================================
          PREMIUM CTA
      ========================================= */}

      {plan !== "premium" && (
        <TouchableOpacity
          style={styles.cta}
          onPress={() =>
            navigation.navigate("Premium")
          }
        >
          <Text style={styles.ctaText}>
            Upgrade to Premium 🚀
          </Text>

          <Text style={styles.ctaSubtext}>
            Unlock more ways to connect and study
          </Text>
        </TouchableOpacity>
      )}

      {/* =========================================
          BOTTOM MESSAGE
      ========================================= */}

      <View style={styles.bottomMessage}>
        <Text style={styles.bottomEmoji}>
          🌍
        </Text>

        <Text style={styles.bottomTitle}>
          University Universal
        </Text>

        <Text style={styles.bottomText}>
          Connect. Study. Compete. Have fun.
        </Text>
      </View>
    </ScrollView>
  );
}

/* =================================================
   STYLES
================================================= */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  content: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 50,
  },

  /* HERO */

  hero: {
    marginTop: 28,
    marginBottom: 20,
  },

  smallGreeting: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 3,
  },

  welcome: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
  },

  /* ONLINE */

  onlineCard: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 24,
  },

  onlineIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  onlineEmoji: {
    fontSize: 25,
  },

  onlineInfo: {
    flex: 1,
  },

  onlineNumber: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  onlineText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 2,
  },

  onlineArrow: {
    color: "#6B7280",
    fontSize: 30,
  },

  /* SECTIONS */

  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  sectionHint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 3,
  },

  /* CHALLENGE */

  challengeCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  challengeTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  challengeEmoji: {
    fontSize: 32,
    marginRight: 14,
  },

  challengeTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
  },

  challengeText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 19,
  },

  challengeBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },

  challengeReward: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
  },

  challengeButton: {
    color: "#818CF8",
    fontWeight: "800",
    fontSize: 13,
  },

  /* QUESTION */

  questionCard: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  questionEmoji: {
    fontSize: 27,
    marginBottom: 10,
  },

  question: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },

  questionButton: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 13,
    marginTop: 16,
    alignItems: "center",
  },

  questionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  responses: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 10,
    textAlign: "center",
  },

  /* VIDEO */

  videoGrid: {
    marginBottom: 24,
  },

  videoCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  videoEmoji: {
    fontSize: 30,
    marginBottom: 9,
  },

  videoCardTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  videoCardHint: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 6,
  },

  joinButton: {
    backgroundColor: "#1F2937",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 13,
    alignItems: "center",
  },

  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* PROGRESS */

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  progressCard: {
    width: "48%",
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 17,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  progressEmoji: {
    fontSize: 26,
  },

  progressNumber: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 5,
  },

  progressLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },

  /* RANKING */

  rankingCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  rankingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rankingTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  rankingSubtitle: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
  },

  trophy: {
    fontSize: 30,
  },

  rankingPosition: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },

  rankingNumber: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginRight: 14,
  },

  rankingPositionTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

    rankingPositionText: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
  },

  emptyRanking: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  emptyRankingSubtext: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 5,
    textAlign: "center",
  },

  rankingStudent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },

  rankNumber: {
    width: 45,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  rankingStudentInfo: {
    flex: 1,
  },

  rankingStudentName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  rankingStudentXP: {
    color: "#FBBF24",
    fontSize: 11,
    marginTop: 3,
  },

  myRankingBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },

  myRankingPosition: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    width: 55,
  },

  myRankingTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  myRankingText: {
    color: "#FBBF24",
    fontSize: 11,
    marginTop: 4,
  },

  /* MEMBERSHIP */

  planCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  planLabel: {
    color: "#9CA3AF",
    fontSize: 13,
  },

  planText: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 7,
  },

  trialText: {
    color: "#22C55E",
    marginTop: 7,
    fontSize: 13,
  },

  upgradeHint: {
    color: "#FBBF24",
    marginTop: 7,
    fontSize: 12,
  },

  /* UTILITY */

  utilityCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  utilityEmoji: {
    fontSize: 28,
    marginRight: 14,
  },

  utilityTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  utilityText: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
  },

  utilityArrow: {
    color: "#818CF8",
    fontSize: 20,
    fontWeight: "800",
  },

  /* PREMIUM */

  cta: {
    backgroundColor: "#4F46E5",
    padding: 17,
    borderRadius: 16,
    marginTop: 4,
    alignItems: "center",
  },

  ctaText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  ctaSubtext: {
    color: "#C7D2FE",
    fontSize: 11,
    marginTop: 4,
  },

  /* BOTTOM */

  bottomMessage: {
    alignItems: "center",
    marginTop: 35,
    paddingBottom: 15,
  },

  bottomEmoji: {
    fontSize: 30,
  },

  bottomTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 7,
  },

  bottomText: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
  },
};