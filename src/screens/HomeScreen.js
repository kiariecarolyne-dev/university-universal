import { useEffect } from "react";
import { Alert, Button, Text, View } from "react-native";

import useUser from "../hooks/useUser";

export default function HomeScreen({ navigation }) {
  const user = useUser();

  useEffect(() => {
    if (!user) return;

    // If premium expired
    if (
      user.isPremium === false &&
      user.premiumUntil
    ) {
      const now = new Date();
      const expiryDate = new Date(user.premiumUntil);

      if (now > expiryDate) {
        Alert.alert(
          "Subscription Expired",
          "Your Premium subscription has expired. Renew now to continue using premium features.",
          [
            {
              text: "Renew Now",
              onPress: () => navigation.navigate("Premium"),
            },
            {
              text: "Later",
              style: "cancel",
            },
          ]
        );
      }
    }
  }, [user]);

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

      <Button
        title="Upgrade To Premium ⭐"
        onPress={() => navigation.navigate("Premium")}
      />
    </View>
  );
}