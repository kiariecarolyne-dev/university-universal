import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    collection,
    onSnapshot,
} from "firebase/firestore";

import { db } from "../services/firebase";

export default function MembersScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "groups", groupId, "members"),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMembers(list);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        👥 {groupName}
      </Text>

      <Text style={styles.subtitle}>
        {members.length} Members
      </Text>

   <FlatList
  data={members}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
  navigation.navigate("StudentProfile", {
    member: {
      ...item,
      userId: item.userId || item.id,
    },
  })
}
    >

      {item.photo ? (
        <Image
          source={{ uri: item.photo }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatar} />
      )}

      <View style={{ flex: 1 }}>

        <Text style={styles.name}>
          {item.fullName}
        </Text>

        <Text style={styles.university}>
          {item.university}
        </Text>

        <Text style={styles.year}>
          {item.year}
        </Text>

      </View>

    </TouchableOpacity>
  )}
/>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
    paddingTop: 50,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#05070A",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#9CA3AF",
    marginBottom: 20,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#374151",
    marginRight: 14,
  },

  name: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  university: {
    color: "#9CA3AF",
    marginTop: 3,
  },

  year: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 12,
  },
};