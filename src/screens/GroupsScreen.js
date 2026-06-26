import { useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

import useUser from "../hooks/useUser";
import { getRecommendedGroups } from "../utils/matchGroups";

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);

  const user = useUser();

  const MAX_GROUPS_FREE = 3;

  // 🧠 NEW AI-based loading logic
  const loadGroups = async () => {
    try {
      if (!user) return;

      const recommended = await getRecommendedGroups(user);
      setGroups(recommended || []);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // reload when user loads or changes
  useEffect(() => {
    loadGroups();
  }, [user]);

  // Wait until user data loads
  if (!user) return null;

  const handleOpenGroup = (group) => {
    // FREE users restriction
    if (
      user.plan === "free" &&
      user.joinedGroups &&
      user.joinedGroups.length >= MAX_GROUPS_FREE
    ) {
      Alert.alert(
        "Premium Required",
        "Free users can only join 3 study groups. Upgrade to Premium."
      );
      return;
    }

    navigation.navigate("Chat", { group });
  };

  return (
    <View style={{ flex: 1, padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        Recommended Study Groups
      </Text>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 15,
              borderWidth: 1,
              marginBottom: 10,
              borderRadius: 8
            }}
            onPress={() => handleOpenGroup(item)}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              {item.name}
            </Text>
            <Text>{item.course}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}