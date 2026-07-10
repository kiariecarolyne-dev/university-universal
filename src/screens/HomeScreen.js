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

export default function HomeScreen({ navigation }) {
  const user = useUser();

  const [roomCounts, setRoomCounts] = useState({
  GlobalStudyHall: 0,
});

  useEffect(() => {
  if (!auth.currentUser) return;

  updateDoc(doc(db, "users", auth.currentUser.uid), {
    online: true,
    lastSeen: serverTimestamp(),
  });
}, []);

useEffect(() => {
  if (!auth.currentUser) return;

  const subscription = AppState.addEventListener(
    "change",
    async (nextState) => {
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
    }
  );

  return () => subscription.remove();
}, []);

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
            { text: "Later", style: "cancel" },
          ]
        );
      }
    }
  }, [user]);

  useEffect(() => {
  if (!user) return;

  const rooms = ["GlobalStudyHall"];

  if (
    user.course &&
    user.course !== "Not set yet"
  ) {
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
      }
    );
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}, []);

  if (!user) return null;

  const rooms = [
  {
    id: "GlobalStudyHall",
    emoji: "🌍",
    title: "Global Study Hall",
  },
];

if (
  user.course &&
  user.course !== "Not set yet"
) {
  rooms.push({
    id: user.course,
    emoji: "📚",
    title: user.course,
  });
}

  const plan = getUserPlan(user);

  let trialDaysLeft = 0;

  if (isInTrialPeriod(user) && user.createdAt) {
    const createdDate = new Date(user.createdAt);
    const now = new Date();

    const diff = now - createdDate;
    const daysPassed = diff / (1000 * 60 * 60 * 24);

    trialDaysLeft = Math.ceil(3 - daysPassed);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >

      {/* WELCOME */}
      <View style={styles.hero}>
        <Text style={styles.welcome}>
          Welcome back 👋
        </Text>

        <Text style={styles.name}>
          {user.fullName || "Student"}
        </Text>

        <Text style={styles.subtitle}>
  {user.university || "University Student"} • The Global Student Network 🌍
</Text>
</View>

      {/* PLAN STATUS */}
      <View style={styles.planCard}>
        <Text style={styles.planLabel}>Membership Status</Text>

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
            Unlock private chats, Notes Marketplace, study rooms and more.
          </Text>
        )}
      </View>

<View style={styles.statsCard}>
  <Text style={styles.cardTitle}>Your Dashboard</Text>

  <View style={styles.statsRow}>
    <View style={styles.statBox}>
      <Text style={styles.statNumber}>{plan === "premium" ? "∞" : "3"}</Text>
      <Text style={styles.statLabel}>Study Groups</Text>
    </View>

    <View style={styles.statBox}>
      <Text style={styles.statNumber}>
        {plan === "premium" ? "✓" : "🔒"}
      </Text>
      <Text style={styles.statLabel}>Private Chat</Text>
    </View>

    <View style={styles.statBox}>
      <Text style={styles.statNumber}>
        {plan === "premium" ? "✓" : "🔒"}
      </Text>
      <Text style={styles.statLabel}>Notes</Text>
    </View>
  </View>
</View>

      {/* FEATURES */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Free Access</Text>
        <Text style={styles.text}>• Public student groups</Text>
        <Text style={styles.text}>• Academic discovery</Text>
        <Text style={styles.text}>• Basic profile system</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Premium Access ⭐</Text>
        <Text style={styles.text}>🔒 Private Messaging</Text>
        <Text style={styles.text}>🔒 Video Study Rooms</Text>
        <Text style={styles.text}>🔒 Notes Marketplace</Text>
        <Text style={styles.text}>🔒 Upload & Earn Money</Text>
      </View>

      {/* DASHBOARD */}
      <View style={styles.grid}>
        <NavButton
          title="👤 Profile"
          onPress={() => navigation.navigate("Profile")}
        />

        <NavButton
          title="👥 Groups"
          onPress={() => navigation.navigate("Groups")}
        />

        <NavButton
          title="🌎 Discover"
          onPress={() => navigation.navigate("Discover")}
        />

        <NavButton
  title="💬 Messages"
  onPress={() => navigation.navigate("Inbox")}
/>

        {/* VIDEO STUDY HALLS */}

<View style={styles.videoSection}>
  <Text style={styles.videoTitle}>
    🎥 Live Study Halls
  </Text>

  <Text style={styles.videoSubtitle}>
    Join voice and video study rooms with students worldwide.
  </Text>

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
    </TouchableOpacity>
  ))}
</View>

        <NavButton
          title="📚 Notes"
          onPress={() => navigation.navigate("Notes")}
        />

        <NavButton
          title="⬆ Upload"
          onPress={() => navigation.navigate("UploadNotes")}
        />
      </View>
      
      </View>

      {/* PREMIUM CTA */}
      {plan !== "premium" && (
        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate("Premium")}
        >
          <Text style={styles.ctaText}>
            Upgrade to Premium 🚀
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

/* NAV BUTTON */
const NavButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.navBtn} onPress={onPress}>
    <Text style={styles.navText}>{title}</Text>
  </TouchableOpacity>
);

/* STYLES */
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },

  hero: {
    marginTop: 55,
    marginBottom: 20,
  },

  welcome: {
    color: "#9CA3AF",
    fontSize: 14,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 4,
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 5,
  },

  planCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  statsCard: {
  backgroundColor: "#111827",
  borderRadius: 16,
  padding: 18,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#1F2937",
},

statsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 15,
},

statBox: {
  alignItems: "center",
  flex: 1,
},

statNumber: {
  color: "#FFFFFF",
  fontSize: 22,
  fontWeight: "bold",
},

statLabel: {
  color: "#9CA3AF",
  fontSize: 12,
  marginTop: 5,
},

  planLabel: {
    color: "#9CA3AF",
    fontSize: 13,
  },

  planText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 6,
  },

  trialText: {
    color: "#22C55E",
    marginTop: 8,
  },

  upgradeHint: {
    color: "#FBBF24",
    marginTop: 8,
  },

  card: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },

  text: {
    color: "#9CA3AF",
    marginTop: 3,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },

  navBtn: {
    width: "48%",
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  navText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
  },

  cta: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 14,
    marginTop: 18,
    alignItems: "center",
  },

  ctaText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  videoSection: {
  marginTop: 20,
},

videoTitle: {
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: 6,
},

videoSubtitle: {
  color: "#9CA3AF",
  marginBottom: 14,
},

videoGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
},

videoCard: {
  width: "48%",
  backgroundColor: "#111827",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#1F2937",
},

videoEmoji: {
  fontSize: 28,
  marginBottom: 8,
},

videoCardTitle: {
  color: "#FFFFFF",
  fontWeight: "bold",
  fontSize: 14,
},

videoCardHint: {
  color: "#9CA3AF",
  fontSize: 12,
  marginTop: 6,
},
};