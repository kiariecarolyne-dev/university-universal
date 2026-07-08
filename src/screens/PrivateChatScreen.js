import { useEffect, useState } from "react";

import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";
import { isPremiumUser } from "../utils/access";

export default function PrivateChatScreen({ route, navigation }) {
  const { student } = route.params;

  const user = useUser();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const currentUser = auth.currentUser?.uid;

  const chatId =
    currentUser < student.id
      ? `${currentUser}_${student.id}`
      : `${student.id}_${currentUser}`;

  const isAllowed = user && isPremiumUser(user);

  const containsContactInfo = (text) => {
    const phoneRegex = /(\+254|07|01)\d{8}/;
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const whatsappRegex = /wa\.me|whatsapp/i;
    const telegramRegex = /t\.me|telegram/i;

    return (
      phoneRegex.test(text) ||
      emailRegex.test(text) ||
      whatsappRegex.test(text) ||
      telegramRegex.test(text)
    );
  };

  useEffect(() => {
    if (!user) return;

    if (!isPremiumUser(user)) {
      Alert.alert(
        "Premium Required",
        "Private messaging is a Premium feature.",
        [
          { text: "Upgrade Now", onPress: () => navigation.navigate("Premium") },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  }, [user]);

  useEffect(() => {
    if (!isAllowed) return;

    const q = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(data);
    });

    return unsubscribe;
  }, [isAllowed]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    if (!isAllowed) {
      Alert.alert("Premium Required", "Upgrade to send messages.");
      navigation.navigate("Premium");
      return;
    }

    if (containsContactInfo(message)) {
      Alert.alert("Not Allowed", "Sharing contact info is blocked.");
      return;
    }

    try {
      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        sender: auth.currentUser.email,
        senderId: auth.currentUser.uid,
        receiver: student.email,
        text: message,
        createdAt: serverTimestamp(),
      });

      await setDoc(
  doc(db, "conversations", chatId),
  {
    participants: [auth.currentUser.uid, student.id],
    participantEmails: [
      auth.currentUser.email,
      student.email,
    ],
    lastMessage: message,
    lastUpdated: serverTimestamp(),
  },
  { merge: true }
);

      setMessage("");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (!isAllowed) {
    return (
      <View style={styles.lockScreen}>
        <Text style={styles.lockTitle}>🔒 Premium Required</Text>
        <Text style={styles.lockText}>
          Private messaging is only available for Premium users.
        </Text>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation.navigate("Premium")}
        >
          <Text style={{ color: "#000", fontWeight: "bold" }}>
            Upgrade Now
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUser;

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? { alignItems: "flex-end" } : { alignItems: "flex-start" },
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.theirBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myText : styles.theirText,
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
  <SafeAreaView
    style={{ flex: 1, backgroundColor: "#0B0F14" }}
    edges={["bottom"]}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{student.name}</Text>
        <Text style={styles.subHeader}>Private Chat</Text>
      </View>

      {/* CHAT */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContainer}
      />

      {/* INPUT */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message..."
          placeholderTextColor="#6B7280"
          value={message}
          onChangeText={setMessage}
          style={styles.input}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
        </KeyboardAvoidingView>
  </SafeAreaView>
);
}

/* ======================
   DARK PREMIUM UI
====================== */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#0B0F14",
  },

  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    backgroundColor: "#0F172A",
  },

  headerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  subHeader: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 12,
  },

  chatContainer: {
    padding: 15,
    paddingBottom: 20,
  },

  messageWrapper: {
    marginBottom: 10,
  },

  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
  },

  myBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },

  theirBubble: {
    backgroundColor: "#1F2937",
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },

  myText: {
    color: "#FFFFFF",
  },

  theirText: {
    color: "#E5E7EB",
  },

  inputContainer: {
  flexDirection: "row",
  padding: 10,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderTopColor: "#1F2937",
  backgroundColor: "#0F172A",
  alignItems: "center",
},

  input: {
    flex: 1,
    backgroundColor: "#111827",
    color: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
  },

  sendBtn: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  sendText: {
    color: "#000",
    fontWeight: "bold",
  },

  lockScreen: {
    flex: 1,
    backgroundColor: "#0B0F14",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  lockTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  lockText: {
    textAlign: "center",
    marginTop: 10,
    color: "#9CA3AF",
  },

  upgradeBtn: {
    marginTop: 20,
    backgroundColor: "#22C55E",
    padding: 12,
    borderRadius: 10,
  },
};