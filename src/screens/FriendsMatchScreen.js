import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
import useUser from "../hooks/useUser";

export default function FriendsMatchScreen({ navigation }) {
  const user = useUser();

  const [matchCount, setMatchCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  const uid = auth.currentUser?.uid;

  // Listen to match count
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "matches"),
      where("users", "array-contains", uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const active = snapshot.docs.filter(
          (d) => d.data().status === "active"
        ).length;
        setMatchCount(active);
        setLoadingCount(false);
      },
      () => {
        setLoadingCount(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  // ALL HOOKS ABOVE — early returns below

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends & Match</Text>
        <Text style={styles.subtitle}>
          Connect with students who share your interests
        </Text>
      </View>

      {/* FIND YOUR MATCH */}
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("MatchSwipe", { mode: "match" })
        }
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>❤️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Find Your Match</Text>
            <Text style={styles.cardText}>
              Swipe through student profiles and find someone you connect with.
            </Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardHint}>Compatibility-based suggestions</Text>
          <Text style={styles.cardAction}>Open →</Text>
        </View>
      </TouchableOpacity>

      {/* FIND FRIENDS */}
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("MatchSwipe", { mode: "friend" })
        }
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>🤝</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Find Friends</Text>
            <Text style={styles.cardText}>
              Meet new people in friendship mode — same deck, same fun.
            </Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardHint}>Recommended for first-time users</Text>
          <Text style={styles.cardAction}>Open →</Text>
        </View>
      </TouchableOpacity>

      {/* YOUR MATCHES */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("YourMatches")}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>⭐</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Your Matches</Text>
            <Text style={styles.cardText}>
              {loadingCount
                ? "Loading..."
                : matchCount > 0
                ? `You have ${matchCount} mutual match${matchCount === 1 ? "" : "es"}.`
                : "No matches yet — start swiping!"}
            </Text>
          </View>

          {!loadingCount && matchCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{matchCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardHint}>Chat with your matches</Text>
          <Text style={styles.cardAction}>View →</Text>
        </View>
      </TouchableOpacity>

      {/* MATCH PREFERENCES */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("MatchPreferences")}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>⚙️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Match Preferences</Text>
            <Text style={styles.cardText}>
              Set your interests, what you're looking for, and visibility.
            </Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardHint}>Customize your matching experience</Text>
          <Text style={styles.cardAction}>Open →</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
    paddingTop: 18,
  },
  header: {
    marginBottom: 20,
    marginTop: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 6,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
  },
  cardText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 19,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },
  cardHint: {
    color: "#6B7280",
    fontSize: 11,
  },
  cardAction: {
    color: "#818CF8",
    fontWeight: "800",
    fontSize: 13,
  },
  badge: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    marginLeft: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
};
