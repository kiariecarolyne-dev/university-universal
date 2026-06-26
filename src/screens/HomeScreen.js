import { Button, Text, View } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Welcome To University Universal</Text>

      <Button
        title="My Profile"
        onPress={() => navigation.navigate("Profile")}
      />

      <Button
        title="Study Groups"
        onPress={() => navigation.navigate("Groups")}
      />

      <Button
        title="Discover Students"
        onPress={() => navigation.navigate("Discover")}
      />

      <Button
        title="Join Study Room"
        onPress={() =>
          navigation.navigate("VideoRoom", {
            roomName: "General",
          })
        }
      />

      <Button
        title="Study Notes"
        onPress={() => navigation.navigate("Notes")}
      />

      {/* NEW PREMIUM BUTTON */}
      <Button
        title="Upgrade To Premium ⭐"
        onPress={() => navigation.navigate("Premium")}
      />
    </View>
  );
}