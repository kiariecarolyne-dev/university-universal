import { Alert, View } from "react-native";
import { WebView } from "react-native-webview";
import useUser from "../hooks/useUser";
import { isPremiumUser } from "../utils/access"; // ✅ STEP 5.1 ADDED

export default function VideoRoomScreen({ route }) {
  const { roomName } = route.params;

  const user = useUser(); // ✅ STEP 5.2

  // 🔒 STEP 5.3 — BLOCK FREE USERS
  if (!isPremiumUser(user)) {
    Alert.alert(
      "Premium Required",
      "Video study rooms are available for Premium users only."
    );
    return null;
  }

  const jitsiUrl = `https://meet.jit.si/UniversityUniversal_${roomName}`;

  // 🧱 STEP 5.4 — JITSI ROOM (UNCHANGED LOGIC)
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: jitsiUrl }}
        style={{ flex: 1 }}
      />
    </View>
  );
}