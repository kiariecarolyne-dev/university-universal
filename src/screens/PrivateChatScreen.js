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
import { isPremiumUser } from "../utils/access";

export default function PrivateChatScreen({
  route,
  navigation
}) {
  const { student } = route.params;

  const user = useUser();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const currentUser = auth.currentUser.uid;

  const chatId =
    currentUser < student.id
      ? `${currentUser}_${student.id}`
      : `${student.id}_${currentUser}`;

  // CONTACT DETECTOR
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

  // PREMIUM CHECK (SAFE)
  useEffect(() => {
    if (user && !isPremiumUser(user)) {
      Alert.alert(
        "Premium Required",
        "Private messaging is a Premium feature.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [user]);

  if (!user || !isPremiumUser(user)) {
    return null;
  }

  // LOAD MESSAGES
  useEffect(() => {
    const q = query(
      collection(db, "privateChats", chatId, "messages"),
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

    if (!isPremiumUser(user) && containsContactInfo(message)) {
      Alert.alert(
        "Premium Feature",
        "Sharing contact details requires Premium"
      );
      return;
    }

    await addDoc(
      collection(db, "privateChats", chatId, "messages"),
      {
        sender: auth.currentUser.email,
        receiver: student.email,
        text: message,
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
        placeholder="Type private message..."
        value={message}
        onChangeText={setMessage}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <Button
        title="Send"
        onPress={sendMessage}
      />

    </View>
  );
}