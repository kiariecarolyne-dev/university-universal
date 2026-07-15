import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";
import { isPremiumUser } from "../utils/access"; // ✅ ADDED (STEP 3.1)

export default function ChatScreen({
  route,
  navigation,
}) {
  const { group } = route.params;

  const user = useUser(); // ✅ STEP 3.2

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const flatListRef = useRef(null);

  // 🚫 CONTACT DETECTOR
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
    const q = query(
      collection(db, "groups", group.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => { 
  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));

  setMessages(data);

  setTimeout(() => {
    flatListRef.current?.scrollToEnd({
      animated: true,
    });
  }, 100);
});

    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;

    // 🚫 BLOCK CONTACT SHARING FOR FREE USERS (existing rule kept)
    if (!isPremiumUser(user) && containsContactInfo(message)) {
      Alert.alert(
        "Premium Feature",
        "Sharing contact details requires Premium"
      );
      return;
    }

    // ⚠️ PREMIUM WARNING (STEP 3.3 requirement)
    if (!isPremiumUser(user)) {
      Alert.alert(
        "Free Plan",
        "You are on Free plan. Some features are limited."
      );
    }

    await addDoc(
  collection(db, "groups", group.id, "messages"),
  {
    text: message,
    sender: auth.currentUser.email,
    senderName: user?.fullName || "Student",
    senderPhoto: user?.photo || "",
    createdAt: serverTimestamp(),
  }
);

    setMessage("");
  };

  return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >

    <View style={styles.header}>

  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >

    <View>
      <Text style={styles.title}>
        💬 {group.name}
      </Text>

      <Text style={styles.subtitle}>
        Collaborate with fellow students
      </Text>
    </View>

    <TouchableOpacity
      style={styles.membersButton}
      onPress={() =>
        navigation.navigate("Members", {
          groupId: group.id,
          groupName: group.name,
        })
      }
    >
      <Text style={styles.membersButtonText}>
        👥 Members
      </Text>
    </TouchableOpacity>

  </View>

</View>


    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const isMe = item.sender === auth.currentUser.email;

        return (
          <View
            style={[
              styles.messageCard,
              isMe && styles.myMessageCard,
            ]}
          >
            <View
  style={{
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  }}
>
  {item.senderPhoto ? (
    <Image
      source={{ uri: item.senderPhoto }}
      style={styles.chatAvatar}
    />
  ) : (
    <View style={styles.chatAvatar}>
      <Text>
        {(item.senderName || "S")
          .charAt(0)
          .toUpperCase()}
      </Text>
    </View>
  )}

  <Text style={styles.sender}>
    {isMe ? "You" : item.senderName}
  </Text>
</View>

<Text style={styles.message}>
  {item.text}
</Text>

            <Text style={styles.time}>
              {item.createdAt?.toDate
                ? item.createdAt.toDate().toLocaleTimeString()
                : ""}
            </Text>

          </View>
        );
      }}
    />


    <TextInput
      placeholder="Type your message..."
      placeholderTextColor="#6B7280"
      value={message}
      onChangeText={setMessage}
      style={styles.input}
    />


    <TouchableOpacity
      style={styles.sendButton}
      onPress={sendMessage}
    >
      <Text style={styles.sendText}>
        Send Message
      </Text>
    </TouchableOpacity>


  </KeyboardAvoidingView>
);
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
    paddingTop: 50,
  },

  header: {
    marginBottom: 18,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 4,
  },

  membersButton: {
  backgroundColor: "#1F2937",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
},

membersButtonText: {
  color: "#FFFFFF",
  fontWeight: "bold",
  fontSize: 13,
},

  messageCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  myMessageCard: {
  backgroundColor: "#312E81",
  borderColor: "#4F46E5",
  alignSelf: "flex-end",
  maxWidth: "85%",
},

chatAvatar: {
  width: 36,
  height: 36,
  borderRadius: 18,
  marginRight: 10,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#D1D5DB",
},

  sender: {
    color: "#4F46E5",
    fontWeight: "bold",
    marginBottom: 6,
  },

  message: {
    color: "#FFFFFF",
    lineHeight: 20,
  },

  time: {
  color: "#6B7280",
  fontSize: 11,
  marginTop: 6,
  textAlign: "right",
},

  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF",
    marginTop: 10,
    marginBottom: 10,
  },

  sendButton: {
    backgroundColor: "#4F46E5",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  sendText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
};