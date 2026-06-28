import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { db } from "../services/firebase";

export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState([]);

  const loadNotes = async () => {
    try {
      // NOTES MARKETPLACE COLLECTION
      const snapshot =
        await getDocs(
          collection(
            db,
            "notes_marketplace"
          )
        );

      const data =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      setNotes(data);

    } catch (error) {
      Alert.alert(
        "Error",
        error.message
      );
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  // ============================
  // DIRECT PRIVATE CHAT
  // ============================
  const handleNotePress = (item) => {
    Alert.alert(
      "Contact Student",
      `Do you want to message ${item.ownerEmail}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },

        {
          text: "Message",

          onPress: () =>
            navigation.navigate(
              "PrivateChat",
              {
                student: {
                  id: item.ownerId,
                  email:
                    item.ownerEmail
                }
              }
            )
        }
      ]
    );
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        marginTop: 40,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          marginBottom: 15,
          fontWeight: "bold",
        }}
      >
        Student Notes Exchange
      </Text>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}

        ListEmptyComponent={
          <Text>
            No notes posted yet.
          </Text>
        }

        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              borderWidth: 1,
              padding: 15,
              marginBottom: 12,
              borderRadius: 10,
            }}
            onPress={() =>
              handleNotePress(item)
            }
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              {item.title}
            </Text>

            <Text>
              Course: {item.course}
            </Text>

            <Text>
              University: {item.university}
            </Text>

            <Text>
              {item.description}
            </Text>

            <Text>
              Posted by:{" "}
              {item.ownerEmail}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}