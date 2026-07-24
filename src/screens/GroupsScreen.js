import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../services/firebase";

import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import useUser from "../hooks/useUser";
import { isInTrialPeriod, isPremiumUser } from "../utils/access";
import { getRecommendedGroups } from "../utils/matchGroups";

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [onlineStudents, setOnlineStudents] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = async () => {
  setRefreshing(true);

  await loadGroups();

  setRefreshing(false);
};

  useEffect(() => {
    loadGroups();
  }, [user]);

  useEffect(() => {
  const q = query(
    collection(db, "users"),
    where("online", "==", true)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    setOnlineStudents(snapshot.size);
  });

  return unsubscribe;
}, []);

  if (!user) return null;

  const filteredGroups = useMemo(() => {
  return groups.filter((group) => {
    const text = search.toLowerCase();

    return (
      group.name?.toLowerCase().includes(text) ||
      group.course?.toLowerCase().includes(text)
    );
  });
}, [groups, search]);

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

<TextInput
  placeholder="Search groups..."
  placeholderTextColor="#6B7280"
  value={search}
  onChangeText={setSearch}
  style={styles.searchInput}
/>

<View style={styles.liveCard}>
  <Text style={styles.liveTitle}>
    🟢 Students studying right now
  </Text>

  <Text style={styles.liveNumber}>
    {onlineStudents}
  </Text>
</View>

      {/* LIST */}
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}

        refreshControl={
  <RefreshControl
    refreshing={refreshing}
    onRefresh={onRefresh}
    tintColor="#4F46E5"
  />
}
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
            <View style={styles.groupHeader}>
  <Text style={styles.groupName}>
  📚 {item.name}
</Text>

  {item.course === user.course && (
    <View style={styles.recommendedBadge}>
      <Text style={styles.recommendedText}>
        Recommended
      </Text>
    </View>
  )}
</View>

            {/* COURSE TAG */}
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {item.course}
              </Text>
            </View>

            <Text style={styles.members}>
  👥 {item.memberCount || 0} members
</Text>

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

liveCard: {
  backgroundColor: "#111827",
  borderRadius: 16,
  padding: 18,
  alignItems: "center",
  marginBottom: 18,
  borderWidth: 1,
  borderColor: "#1F2937",
},

liveTitle: {
  color: "#9CA3AF",
  fontSize: 13,
},

liveNumber: {
  color: "#22C55E",
  fontSize: 34,
  fontWeight: "bold",
  marginTop: 6,
},

searchInput: {
  backgroundColor: "#111827",
  borderWidth: 1,
  borderColor: "#1F2937",
  borderRadius: 12,
  color: "#FFFFFF",
  padding: 14,
  marginBottom: 18,
},

  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  groupHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
},

recommendedBadge: {
  backgroundColor: "#10B981",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 20,
},

recommendedText: {
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: "bold",
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

  members: {
  color: "#10B981",
  marginTop: 10,
  fontWeight: "600",
  fontSize: 13,
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