import { useEffect } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import useUser from "../hooks/useUser";
import { getUserPlan, isInTrialPeriod } from "../utils/access";

export default function HomeScreen({ navigation }) {
  const user = useUser();

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

  if (!user) return null;

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
          The Global Student Network 🌍
        </Text>
      </View>

      {/* PLAN STATUS */}
      <View style={styles.planCard}>
        <Text style={styles.planLabel}>Current Membership</Text>

        <Text style={styles.planText}>
          {plan === "premium"
            ? "⭐ Premium Member"
            : plan === "trial"
            ? "🚀 Trial Member"
            : "🆓 Free Member"}
        </Text>

        {plan === "trial" && (
          <Text style={styles.trialText}>
            Trial ends in {trialDaysLeft} day(s)
          </Text>
        )}

        {plan !== "premium" && (
          <Text style={styles.upgradeHint}>
            Upgrade to unlock everything
          </Text>
        )}
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
          title="🎥 Video Room"
          onPress={() =>
            navigation.navigate("VideoRoom", {
              roomName: "General",
            })
          }
        />

        <NavButton
          title="📚 Notes"
          onPress={() => navigation.navigate("Notes")}
        />

        <NavButton
          title="⬆ Upload"
          onPress={() => navigation.navigate("UploadNotes")}
        />
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
};