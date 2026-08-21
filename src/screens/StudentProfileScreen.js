import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


import { auth } from "../services/firebase";

export default function StudentProfileScreen({ route, navigation }) {
  const { member } = route.params;

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

    
        <View style={styles.icebreakerSection}>
  <Text style={styles.icebreakerTitle}>
    💬 Start a conversation
  </Text>

  <Text style={styles.icebreakerSubtitle}>
    Not sure what to say? Pick a question 👇
  </Text>

  {[
    "👋 What are you studying?",
    "🎓 Which year are you in?",
    "📚 How are exams going?",
    "🌍 What country are you studying in?",
    "🤝 Want to study together?",
  ].map((question) => (
    <TouchableOpacity
      key={question}
      style={styles.icebreakerButton}
      onPress={() => {
        navigation.navigate("PrivateChat", {
          student: {
            id: member.userId,
            fullName: member.fullName,
            email: member.email,
            photo: member.photo,
          },
          initialMessage: question.replace(
            /^(👋|🎓|📚|🌍|🤝)\s*/,
            ""
          ),
        });
      }}
    >
      <Text style={styles.icebreakerText}>
        {question}
      </Text>
    </TouchableOpacity>
  ))}
</View>

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

<TouchableOpacity
  style={styles.debateButton}
  onPress={() => {
    navigation.navigate("DebateLobby", {
      opponent: {
        id: member.userId,
        fullName: member.fullName,
        email: member.email,
        photo: member.photo,
      },
    });
  }}
>
  <Text style={styles.buttonText}>
    ⚔️ Challenge to Debate
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

  videoButton: {
    backgroundColor: "#059669",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  debateButton: {
  backgroundColor: "#7C3AED",
  padding: 16,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 15,
},

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  icebreakerSection: {
  marginBottom: 25,
},

icebreakerTitle: {
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: 5,
},

icebreakerSubtitle: {
  color: "#9CA3AF",
  fontSize: 13,
  marginBottom: 12,
},

icebreakerButton: {
  backgroundColor: "#111827",
  borderWidth: 1,
  borderColor: "#1F2937",
  padding: 14,
  borderRadius: 12,
  marginBottom: 9,
},

icebreakerText: {
  color: "#FFFFFF",
  fontSize: 14,
},
};