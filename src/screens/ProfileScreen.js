import { signOut } from "firebase/auth";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "../services/firebase";

import useUser from "../hooks/useUser";
import {
  isAdminUser,
  isPremiumUser,
} from "../utils/access";

export default function ProfileScreen({ navigation }) {
  const user = useUser();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log("LOGOUT ERROR:", error.code, error.message);
      Alert.alert("Logout Failed", error.message);
    }
  };

  // All hooks are above this loader — hook order stays stable.
  if (!user) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loaderText}>Loading profile...</Text>
      </View>
    );
  }

  // Admin (isAdmin === true) or Premium users can access Jobs & Careers.
  // Uses the shared isAdminUser() helper for the admin check.
  const isAdmin = isAdminUser(user);
  const isPremium = isPremiumUser(user);

  const fullName = user.fullName || "Student";
  const university = user.university || "-";
  const course = user.course || "-";
  const year = user.year || "-";
  const country = user.country || "-";
  const photo = user.photo || "";
  const email = user.email || auth.currentUser?.email || "";

  const initial = (fullName || "S").charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* =========================
          PROFILE HEADER
      ========================= */}
      <View style={styles.header}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}

        <Text style={styles.name}>{fullName}</Text>

        <Text style={styles.university}>{university}</Text>

        <Text style={styles.courseYear}>
          {course}
          {year && year !== "Not set yet" ? `  •  ${year}` : ""}
        </Text>

        <Text style={styles.email}>{email}</Text>

        <View style={styles.badgeRow}>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>
                ⭐ Premium
              </Text>
            </View>
          )}

          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>
                👑 Admin
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* =========================
          ACCOUNT / SETTINGS
      ========================= */}
      <Text style={styles.sectionTitle}>
        Account / Settings
      </Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.rowBtn}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Text style={styles.rowBtnTitle}>
            ⚙️ Edit Profile
          </Text>

          <Text style={styles.rowBtnText}>
            Update your name, university, course, year of
            study and profile photo.
          </Text>

          <Text style={styles.rowBtnArrow}>
            Open Settings →</Text>
        </TouchableOpacity>
      </View>

      {/* =========================
          APP FEATURES
      ========================= */}
      <Text style={styles.sectionTitle}>
        App Features
      </Text>

      <View style={styles.card}>
        {/* JOBS & CAREERS */}
        <TouchableOpacity
          style={styles.rowBtn}
          onPress={() => navigation.navigate("Jobs")}
        >
          <Text style={styles.rowBtnTitle}>
            💼 Jobs & Careers
          </Text>

          <Text style={styles.rowBtnText}>
            Explore graduate jobs, internships and remote
            opportunities.
          </Text>

          <Text style={styles.rowBtnArrow}>
            {isAdmin
              ? "Admin access →"
              : isPremium
              ? "Explore Jobs →"
              : "View Jobs →"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* PREMIUM */}
        {isPremium ? (
          <View style={styles.premiumActiveRow}>
            <Text style={styles.rowBtnTitle}>
              ⚡ Premium Active
            </Text>

            <Text style={styles.premiumActiveText}>
              You have full Premium access until your
              subscription expires.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.rowBtn}
            onPress={() => navigation.navigate("Premium")}
          >
            <Text style={styles.rowBtnTitle}>
              ⭐ Upgrade to Premium
            </Text>

            <Text style={styles.rowBtnText}>
              Unlock Jobs & Careers together with all
              Premium features.
            </Text>

            <Text style={styles.rowBtnArrow}>
              View Premium →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* =========================
          ACCOUNT
      ========================= */}
      <Text style={styles.sectionTitle}>
        Account
      </Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            🚪 Logout
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  loader: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  loaderText: {
    color: "#9CA3AF",
    marginTop: 10,
  },

  header: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 24,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "bold",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 14,
    textAlign: "center",
  },

  university: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 15,
    textAlign: "center",
  },

  courseYear: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 13,
    textAlign: "center",
  },

  email: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 13,
    textAlign: "center",
  },

  badgeRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  premiumBadge: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
  },

  premiumBadgeText: {
    color: "#F59E0B",
    fontWeight: "bold",
    fontSize: 13,
  },

  adminBadge: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#4F46E5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
  },

  adminBadgeText: {
    color: "#818CF8",
    fontWeight: "bold",
    fontSize: 13,
  },

  sectionTitle: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },

  card: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },

  rowBtn: {
    padding: 17,
  },

  rowBtnTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  rowBtnText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },

  rowBtnArrow: {
    color: "#818CF8",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#1F2937",
  },

  premiumActiveRow: {
    padding: 17,
  },

  premiumActiveText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },

  logoutBtn: {
    padding: 17,
    alignItems: "center",
  },

  logoutText: {
    color: "#F87171",
    fontWeight: "bold",
    fontSize: 15,
  },
};