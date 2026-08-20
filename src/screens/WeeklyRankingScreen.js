import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    collection,
    limit,
    onSnapshot,
    orderBy,
    query,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function WeeklyRankingScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
     LOAD TOP STUDENTS
  ------------------------------------------------- */

  useEffect(() => {
       const rankingQuery = query(
  collection(db, "users"),
  orderBy("weeklyXP", "desc"),
  limit(50)
);

    const unsubscribe = onSnapshot(
      rankingQuery,
      (snapshot) => {
        const list = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          list.push({
            id: docSnap.id,
            fullName: data.fullName || "Student",
            photo: data.photo || null,
            course: data.course || "Student",
            country: data.country || "",
            xp: Number(data.weeklyXP || 0),
          });
        });

        setStudents(list);
        setLoading(false);
      },
      (error) => {
        console.log("Ranking error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* -------------------------------------------------
     CURRENT USER POSITION
  ------------------------------------------------- */

  const currentUserId = auth.currentUser?.uid;

  const currentUserIndex = students.findIndex(
    (student) => student.id === currentUserId
  );

  const currentUserPosition =
    currentUserIndex !== -1
      ? currentUserIndex + 1
      : null;

  /* -------------------------------------------------
     LOADING
  ------------------------------------------------- */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#818CF8"
        />

        <Text style={styles.loadingText}>
          Loading global ranking...
        </Text>
      </View>
    );
  }

  /* -------------------------------------------------
     RANKING ITEM
  ------------------------------------------------- */

  const renderStudent = ({ item, index }) => {
    const position = index + 1;

    const isCurrentUser =
      item.id === currentUserId;

    return (
      <View
        style={[
          styles.studentCard,
          isCurrentUser && styles.currentUserCard,
        ]}
      >
        {/* POSITION */}

        <View style={styles.positionContainer}>
          {position === 1 && (
            <Text style={styles.positionEmoji}>
              🥇
            </Text>
          )}

          {position === 2 && (
            <Text style={styles.positionEmoji}>
              🥈
            </Text>
          )}

          {position === 3 && (
            <Text style={styles.positionEmoji}>
              🥉
            </Text>
          )}

          {position > 3 && (
            <Text style={styles.positionNumber}>
              {position}
            </Text>
          )}
        </View>

        {/* STUDENT */}

        <View style={styles.studentInfo}>
          <Text
            style={styles.studentName}
            numberOfLines={1}
          >
            {item.fullName}
            {isCurrentUser ? " (You)" : ""}
          </Text>

          <Text
            style={styles.studentCourse}
            numberOfLines={1}
          >
            {item.course}
            {item.country
              ? ` • ${item.country}`
              : ""}
          </Text>
        </View>

        {/* XP */}

        <View style={styles.xpContainer}>
          <Text style={styles.xpNumber}>
            {item.xp}
          </Text>

          <Text style={styles.xpLabel}>
            XP
          </Text>
        </View>
      </View>
    );
  };

  /* -------------------------------------------------
     SCREEN
  ------------------------------------------------- */

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerEmoji}>
            🏆
          </Text>

          <Text style={styles.title}>
            Weekly Ranking
          </Text>

          <Text style={styles.subtitle}>
            Compete with students around the world
          </Text>
        </View>

      </View>

      {/* YOUR POSITION */}

      <View style={styles.yourPositionCard}>

        <Text style={styles.yourPositionLabel}>
          YOUR GLOBAL POSITION
        </Text>

        <View style={styles.yourPositionRow}>

          <Text style={styles.yourPositionNumber}>
            {currentUserPosition
              ? `#${currentUserPosition}`
              : "—"}
          </Text>

          <View>
            <Text style={styles.yourPositionTitle}>
              Keep earning weekly XP ⭐
            </Text>

            <Text style={styles.yourPositionText}>
              Complete daily challenges this week to climb the ranking.
            </Text>
          </View>

        </View>

      </View>

      {/* TOP STUDENTS */}

      <Text style={styles.sectionTitle}>
        🌍 Top Students
      </Text>

      {students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>
            🏆
          </Text>

          <Text style={styles.emptyTitle}>
            No ranking yet
          </Text>

          <Text style={styles.emptyText}>
            Start completing challenges to appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}

    </View>
  );
}

/* =================================================
   STYLES
================================================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 14,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 25,
    marginBottom: 20,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 32,
  },

  headerText: {
    flex: 1,
  },

  headerEmoji: {
    fontSize: 28,
    marginBottom: 5,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  /* YOUR POSITION */

  yourPositionCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 22,
  },

  yourPositionLabel: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },

  yourPositionRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  yourPositionNumber: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "900",
    marginRight: 15,
  },

  yourPositionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  yourPositionText: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 240,
  },

  /* SECTION */

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  /* LIST */

  list: {
    paddingBottom: 40,
  },

  studentCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#1F2937",
    flexDirection: "row",
    alignItems: "center",
  },

  currentUserCard: {
    borderColor: "#818CF8",
    backgroundColor: "#151638",
  },

  /* POSITION */

  positionContainer: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  positionEmoji: {
    fontSize: 25,
  },

  positionNumber: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* STUDENT */

  studentInfo: {
    flex: 1,
    minWidth: 0,
  },

  studentName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  studentCourse: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 4,
  },

  /* Weekly XP */

  xpContainer: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  xpNumber: {
    color: "#FBBF24",
    fontSize: 16,
    fontWeight: "900",
  },

  xpLabel: {
    color: "#6B7280",
    fontSize: 9,
    marginTop: 2,
  },

  /* EMPTY */

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },

  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  emptyText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },

});