import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import useUser from "../hooks/useUser";
import { isInTrialPeriod, isPremiumUser } from "../utils/access";
import { getRecommendedGroups } from "../utils/matchGroups";

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const user = useUser();

  const loadGroups = async () => {
    try {
      if (!user) return;

      const recommended = await getRecommendedGroups(user);
      setGroups(recommended || []);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [user]);

  if (!user) return null;

  const handleOpenGroup = (group) => {
    if (isPremiumUser(user) || isInTrialPeriod(user)) {
      navigation.navigate("Chat", { group });
      return;
    }

    Alert.alert(
      "Trial Expired",
      "Your free trial has ended. Upgrade to Premium to participate in study groups."
    );

    navigation.navigate("Premium");
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>
  👥 Study Groups
</Text>
        <Text style={styles.subtitle}>
          Join study communities matched to your university and course
        </Text>
      </View>

      <View style={styles.infoCard}>
  <Text style={styles.infoTitle}>
    🌍 Learn Together
  </Text>

  <Text style={styles.infoText}>
    Join discussions, ask questions, share ideas and collaborate with students studying similar courses.
  </Text>
</View>

      {/* LIST */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No groups available yet
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleOpenGroup(item)}
          >

            {/* GROUP NAME */}
            <Text style={styles.groupName}>
              {item.name}
            </Text>

            {/* COURSE TAG */}
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {item.course}
              </Text>
            </View>

            {/* CTA hint */}
            <Text style={styles.hint}>
              💬 Tap to join the conversation
            </Text>

          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* =========================
   DARK SaaS STYLE
========================= */
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
    paddingTop: 50,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 5,
  },

  infoCard: {
  backgroundColor: "#111827",
  borderWidth: 1,
  borderColor: "#1F2937",
  borderRadius: 16,
  padding: 16,
  marginBottom: 18,
},

infoTitle: {
  color: "#FFFFFF",
  fontWeight: "bold",
  marginBottom: 6,
  fontSize: 15,
},

infoText: {
  color: "#9CA3AF",
  lineHeight: 20,
},

  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  groupName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#1F2937",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },

  tagText: {
    color: "#9CA3AF",
    fontSize: 12,
  },

  hint: {
    color: "#6B7280",
    marginTop: 10,
    fontSize: 12,
  },

  empty: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 30,
  },
};