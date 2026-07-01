import { Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

import useUser from "../hooks/useUser";
import { isPremiumUser } from "../utils/access";

export default function VideoRoomScreen({ route, navigation }) {
  const user = useUser();
  const roomName = route.params?.roomName || "General";

  if (!user) return null;

  const isAllowed = isPremiumUser(user);

  /* =========================
     PREMIUM GATE UI
  ========================= */
  if (!isAllowed) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>🔒 Premium Feature</Text>

        <Text style={styles.lockText}>
          Video Study Rooms are designed for collaborative learning.{"\n"}
          Upgrade to join live sessions.
        </Text>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation.navigate("Premium")}
        >
          <Text style={styles.upgradeText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* =========================
     SAFE ROOM NAME
  ========================= */
  const safeRoomName = String(roomName)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 50);

  const jitsiUrl = `https://meet.jit.si/UniversityUniversal_${safeRoomName}`;

  return (
    <View style={styles.container}>

      {/* HEADER BAR */}
      <View style={styles.header}>
        <Text style={styles.title}>Video Room</Text>
        <View style={styles.roomBadge}>
          <Text style={styles.roomText}>{safeRoomName}</Text>
        </View>
      </View>

      {/* VIDEO */}
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: jitsiUrl }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </View>
  );
}

/* =========================
   DARK SaaS UI SYSTEM
========================= */
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },

  roomBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#1F2937",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },

  roomText: {
    color: "#9CA3AF",
    fontSize: 12,
  },

  videoContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  webview: {
    flex: 1,
    backgroundColor: "#000",
  },

  /* =========================
     PREMIUM SCREEN
  ========================= */
  lockContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  lockTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  lockText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginBottom: 20,
    lineHeight: 20,
  },

  upgradeBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
};