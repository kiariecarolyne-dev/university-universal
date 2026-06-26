import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Text,
  TextInput,
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

export default function ChatScreen({ route }) {
  const { group } = route.params;

  const user = useUser(); // ✅ STEP 3.2

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

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
        createdAt: serverTimestamp()
      }
    );

    setMessage("");
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            <Text>{item.sender}</Text>
            <Text>{item.text}</Text>
          </View>
        )}
      />

      <TextInput
        placeholder="Type message..."
        value={message}
        onChangeText={setMessage}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <Button title="Send" onPress={sendMessage} />

    </View>
  );
}