import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { auth } from "../services/firebase";

export default function StudentProfileScreen({ route, navigation }) {
  const { member } = route.params;

  const insets = useSafeAreaInsets();

  const [customMessage, setCustomMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = [
    "😀",
    "😂",
    "😍",
    "🥰",
    "😊",
    "😎",
    "🤔",
    "😅",
    "😭",
    "😡",
    "👍",
    "👎",
    "👏",
    "🙌",
    "❤️",
    "🔥",
    "🎉",
    "💯",
    "🙏",
    "📚",
    "🧠",
    "✍️",
    "🎓",
    "💻",
    "☕",
    "🚀",
  ];

  const student = {
    id: member.id || member.userId,
    fullName: member.fullName,
    email: member.email,
    photo: member.photo,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 30,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ===================================== */}
      {/* PROFILE HEADER */}
      {/* ===================================== */}

      <View style={styles.header}>
        {member.photo ? (
          <Image
            source={{ uri: member.photo }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(member.fullName || "S")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.name}>
          {member.fullName}
        </Text>

        <Text style={styles.course}>
          {member.course || "Student"}
        </Text>
      </View>

      {/* ===================================== */}
      {/* STUDENT INFORMATION */}
      {/* ===================================== */}

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

      {/* ===================================== */}
      {/* START CONVERSATION */}
      {/* ===================================== */}

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
                student,
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

        {/* ===================================== */}
        {/* WRITE YOUR OWN MESSAGE */}
        {/* ===================================== */}

        <Text style={styles.manualMessageTitle}>
          ✏️ Or write your own message
        </Text>

        {/* ===================================== */}
        {/* EMOJI PICKER */}
        {/* ===================================== */}

        {showEmojiPicker && (
          <View style={styles.emojiContainer}>
            {emojis.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiItem}
                onPress={() => {
                  setCustomMessage(
                    (prev) => prev + emoji
                  );
                }}
              >
                <Text style={styles.emojiText}>
                  {emoji}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ===================================== */}
        {/* MESSAGE INPUT ROW */}
        {/* ===================================== */}

        <View style={styles.messageRow}>
          {/* EMOJI BUTTON */}

          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() =>
              setShowEmojiPicker((prev) => !prev)
            }
          >
            <Text style={styles.emojiButtonText}>
              😊
            </Text>
          </TouchableOpacity>

          {/* TEXT INPUT */}

          <TextInput
            placeholder={`Write a message to ${member.fullName}...`}
            placeholderTextColor="#6B7280"
            value={customMessage}
            onChangeText={setCustomMessage}
            multiline
            style={styles.manualMessageInput}
          />
        </View>

        {/* ===================================== */}
        {/* START CHAT */}
        {/* ===================================== */}

        <TouchableOpacity
          style={[
            styles.startChatButton,
            !customMessage.trim() &&
              styles.disabledChatButton,
          ]}
          disabled={!customMessage.trim()}
          onPress={() => {
            const textToSend =
              customMessage.trim();

            setCustomMessage("");
            setShowEmojiPicker(false);

            navigation.navigate("PrivateChat", {
              student,
              initialMessage: textToSend,
            });
          }}
        >
          <Text style={styles.buttonText}>
            💬 Start Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===================================== */}
      {/* VIDEO CALL */}
      {/* ===================================== */}

      <TouchableOpacity
        style={styles.videoButton}
        onPress={() => {
          const currentUserId =
            auth.currentUser?.uid;

          const otherUserId =
            member.id || member.userId;

          if (!currentUserId || !otherUserId) {
            return;
          }

          const roomName =
            currentUserId < otherUserId
              ? `private-${currentUserId}-${otherUserId}`
              : `private-${otherUserId}-${currentUserId}`;

          navigation.navigate("VideoRoom", {
            roomName,
          });
        }}
      >
        <Text style={styles.buttonText}>
          📹 Start Video Call
        </Text>
      </TouchableOpacity>

      {/* ===================================== */}
      {/* DEBATE */}
      {/* ===================================== */}

      <TouchableOpacity
        style={styles.debateButton}
        onPress={() => {
          navigation.navigate("DebateLobby", {
            opponent: {
              id: member.id || member.userId,
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
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "bold",
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

  manualMessageTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 10,
  },

  /* ===================================== */
  /* MESSAGE ROW */
  /* ===================================== */

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
  },

  emojiButton: {
    width: 48,
    height: 52,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  emojiButtonText: {
    fontSize: 25,
  },

  manualMessageInput: {
    flex: 1,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 52,
    maxHeight: 120,
    color: "#FFFFFF",
    fontSize: 14,
    textAlignVertical: "top",
  },

  /* ===================================== */
  /* EMOJI PANEL */
  /* ===================================== */

  emojiContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  emojiItem: {
    width: "12.5%",
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  emojiText: {
    fontSize: 24,
  },

  /* ===================================== */
  /* START CHAT BUTTON */
  /* ===================================== */

  startChatButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  disabledChatButton: {
    opacity: 0.5,
  },

  /* ===================================== */
  /* VIDEO */
  /* ===================================== */

  videoButton: {
    backgroundColor: "#059669",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  /* ===================================== */
  /* DEBATE */
  /* ===================================== */

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
};