import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function StudentProfileScreen({ route, navigation }) {
  const { member } = route.params;
  const currentUserId = auth.currentUser?.uid;

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>

        {member.photo ? (
          <Image
            source={{ uri: member.photo }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatar} />
        )}

        <Text style={styles.name}>
          {member.fullName}
        </Text>

        <Text style={styles.course}>
          {member.course || "Student"}
        </Text>

      </View>

      <View style={styles.card}>

        <Text style={styles.label}>University</Text>
        <Text style={styles.value}>
          {member.university || "-"}
        </Text>

        <Text style={styles.label}>Course</Text>
        <Text style={styles.value}>
          {member.course || "-"}
        </Text>

        <Text style={styles.label}>Year</Text>
        <Text style={styles.value}>
          {member.year || "-"}
        </Text>

        <Text style={styles.label}>Country</Text>
        <Text style={styles.value}>
          {member.country || "-"}
        </Text>

      </View>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() =>
          navigation.navigate("PrivateChat", {
            student: {
              id: member.userId,
              fullName: member.fullName,
              email: member.email,
              photo: member.photo,
            },
          })
        }
      >
        <Text style={styles.buttonText}>
          💬 Start Private Chat
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
  style={styles.videoButton}
  onPress={() => {
    const currentUserId = auth.currentUser.uid;

    const roomName =
      currentUserId < member.userId
        ? `private-${currentUserId}-${member.userId}`
        : `private-${member.userId}-${currentUserId}`;

    navigation.navigate("VideoRoom", {
      roomName,
    });
  }}
>
  <Text style={styles.buttonText}>
    📹 Start Video Call
  </Text>
</TouchableOpacity>

    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },

  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#374151",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 15,
  },

  course: {
    color: "#9CA3AF",
    marginTop: 5,
  },

  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
  },

  label: {
    color: "#6B7280",
    marginTop: 12,
    fontSize: 13,
  },

  value: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 3,
  },

  chatButton: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },

  videoButton: {
    backgroundColor: "#059669",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
};