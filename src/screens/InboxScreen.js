import React, { useEffect, useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function InboxScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, "privateChats"),
      orderBy("lastUpdated", "desc")
    ),
    () => {
      loadConversations();
    }
  );

  return unsubscribe;
}, []);

useFocusEffect(
  React.useCallback(() => {
    loadConversations();
  }, [])
);

 const loadConversations = async () => {
  const snapshot = await getDocs(
  query(
    collection(db, "privateChats"),
    orderBy("lastUpdated", "desc")
  )
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
let lastSenderId = null;

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
  )
);

if (!messageSnapshot.empty) {
  const allMessages = messageSnapshot.docs.map((doc) => doc.data());

  const last = allMessages[0];

  lastMessage = last.text;
  lastSenderId = last.senderId;
}

let unreadCount = 0;

messageSnapshot.docs.forEach((doc) => {
  const message = doc.data();

  if (
    message.receiverId === auth.currentUser.uid &&
    !message.read
  ) {
    unreadCount++;
  }
});

const lastMessageDoc = messageSnapshot.docs[0];

return {
  id: docSnap.id,
  student: otherUser,
  studentId: otherUserId,
  lastMessage,
  lastSenderId,
  unreadCount,
  lastTime: lastMessageDoc?.data().createdAt,
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
          fullName: item.student.fullName,
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: "#2563EB",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          {(item.student.fullName || "?")
            .charAt(0)
            .toUpperCase()}
        </Text>
      </View>

      {/* Right Side */}
      <View style={{ flex: 1 }}>
        {/* Name + Badge */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "bold",
              fontSize: 16,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.student.fullName}
          </Text>

          {item.unreadCount > 0 && (
            <View
              style={{
                backgroundColor: "#2563EB",
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 6,
                marginLeft: 8,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "bold",
                  fontSize: 12,
                }}
              >
                {item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Last Message + Time */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <Text
            style={{
              color: "#9CA3AF",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.lastSenderId === auth.currentUser.uid
              ? `You: ${item.lastMessage}`
              : item.lastMessage}
          </Text>

          <Text
            style={{
              color: "#6B7280",
              fontSize: 11,
              marginLeft: 8,
            }}
          >
            {item.lastTime
              ? item.lastTime
                  .toDate()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
              : ""}
          </Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
)}
      />
    </View>
  );
}