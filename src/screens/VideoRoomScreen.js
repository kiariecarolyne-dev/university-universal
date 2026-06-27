import { Text, View } from "react-native";
import { WebView } from "react-native-webview";
import useUser from "../hooks/useUser";
import { isPremiumUser } from "../utils/access";

export default function VideoRoomScreen({ route }) {
  const { roomName } = route.params;

  const user = useUser();

  // BLOCK NON PREMIUM USERS
  if (!isPremiumUser(user)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            textAlign: "center",
          }}
        >
          Premium subscription required to access Video Study Rooms.
        </Text>
      </View>
    );
  }

  const jitsiUrl =
    `https://meet.jit.si/UniversityUniversal_${roomName}`;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: jitsiUrl }}
        style={{ flex: 1 }}
      />
    </View>
  );
}