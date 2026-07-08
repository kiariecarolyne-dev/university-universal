import { Text, View } from "react-native";

export default function InboxScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#05070A",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        💬 Private Messages
      </Text>

      <Text
        style={{
          color: "#9CA3AF",
          marginTop: 10,
        }}
      >
        Your conversations will appear here.
      </Text>
    </View>
  );
}