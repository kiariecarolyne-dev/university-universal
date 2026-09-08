import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
import useUser from "../hooks/useUser";

export default function YourMatchesScreen({ navigation }) {
  const user = useUser();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const uid = auth.currentUser?.uid;

  // Listen to matches where users array-contains current user
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "matches"),
      where("users", "array-contains", uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const activeMatches = snapshot.docs
          .filter((d) => d.data().status === "active")
          .map((d) => ({ id: d.id, ...d.data() }));

        // Resolve the other user's info for each match
        const enriched = await Promise.all(
          activeMatches.map(async (match) => {
            const otherId = match.users.find((u) => u !== uid);

            if (!otherId) return { ...match, other: null };

            try {
              const userSnap = await getDoc(doc(db, "users", otherId));
              if (userSnap.exists()) {
                return {
                  ...match,
                  other: { id: userSnap.id, ...userSnap.data() },
                };
              }
            } catch (error) {
              console.log("Resolve match user error:", error);
            }

            return { ...match, other: { id: otherId, fullName: "Student" } };
          })
        );

        // Sort by matchedAt desc
        enriched.sort((a, b) => {
          const tA = a.matchedAt?.toDate?.() || new Date(0);
          const tB = b.matchedAt?.toDate?.() || new Date(0);
          return tB - tA;
        });

        setMatches(enriched);
        setLoading(false);
      },
      (error) => {
        console.log("Matches listener error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  // ALL HOOKS ABOVE — early returns below

  if (!user) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const other = item.other;
    if (!other) return null;

    const name = other.fullName || "Student";
    const photo = other.photo || "";
    const initial = name.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() =>
          navigation.navigate("PrivateChat", {
            student: {
              id: other.id,
              fullName: other.fullName,
              email: other.email,
              photo: other.photo,
            },
          })
        }
      >
        <View style={styles.avatarContainer}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}

          {other.online && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {other.course && other.course !== "Not set yet"
              ? other.course
              : other.university || ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.sayHiBtn}
          onPress={() =>
            navigation.navigate("PrivateChat", {
              student: {
                id: other.id,
                fullName: other.fullName,
                email: other.email,
                photo: other.photo,
              },
            })
          }
        >
          <Text style={styles.sayHiBtnText}>Say Hi →</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>💝</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyHint}>
              Start swiping to find people you connect with.
            </Text>
            <TouchableOpacity
              style={styles.findBtn}
              onPress={() => navigation.navigate("MatchSwipe", { mode: "match" })}
            >
              <Text style={styles.findBtnText}>Find Matches</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  list: {
    padding: 16,
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#374151",
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#111827",
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 3,
  },
  sayHiBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sayHiBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyHint: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  findBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  findBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
};
