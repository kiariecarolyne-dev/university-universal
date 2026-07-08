import { useEffect, useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function InboxScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    loadConversations();
  }, []);

 const loadConversations = async () => {
  const snapshot = await getDocs(
    collection(db, "privateChats")
  );

  const chats = await Promise.all(
    snapshot.docs
      .filter((docSnap) =>
        docSnap.id.includes(auth.currentUser.uid)
      )
      .map(async (docSnap) => {
        const ids = docSnap.id.split("_");

        const otherUserId = ids.find(
          (id) => id !== auth.currentUser.uid
        );

        let otherUser = {
  fullName: "Unknown Student",
};

let lastMessage = "No messages yet";

if (otherUserId) {
  const userDoc = await getDoc(
    doc(db, "users", otherUserId)
  );

  if (userDoc.exists()) {
    otherUser = userDoc.data();
  }
}

const messageSnapshot = await getDocs(
  query(
    collection(db, "privateChats", docSnap.id, "messages"),
    orderBy("createdAt", "desc"),
    limit(1)
  )
);

if (!messageSnapshot.empty) {
  lastMessage = messageSnapshot.docs[0].data().text;
}

return {
  id: docSnap.id,
  student: otherUser,
  studentId: otherUserId,
  lastMessage,
};
      })
  );

  setConversations(chats);
};

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#05070A",
        padding: 16,
      }}
    >
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text
            style={{
              color: "#9CA3AF",
              textAlign: "center",
              marginTop: 40,
            }}
          >
            No conversations yet
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
  onPress={() =>
    navigation.navigate("PrivateChat", {
      student: {
        id: item.studentId,
        email: item.student.email,
        name: item.student.fullName,
      },
    })
  }
  style={{
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  }}
>
            <Text
  style={{
    color: "#FFFFFF",
    fontWeight: "bold",
  }}
>
  {item.student.fullName}
</Text>

<Text
  style={{
    color: "#9CA3AF",
    marginTop: 4,
  }}
  numberOfLines={1}
>
  {item.lastMessage}
</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}