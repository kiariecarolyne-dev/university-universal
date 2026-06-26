import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import useUser from "../hooks/useUser";
import { db } from "../services/firebase";
import { isPremiumUser } from "../utils/access";

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const user = useUser();

  const loadNotes = async () => {
    try {
      const snapshot = await getDocs(collection(db, "notes"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotes(data);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleNotePress = (item) => {
    if (!isPremiumUser(user)) {
      Alert.alert(
        "Premium Required",
        "Downloading notes requires Premium subscription"
      );
      return;
    }

    Alert.alert("Download started", item.title);

    // 👉 Later replace this with real PDF download logic
  };

  return (
    <View style={{ flex: 1, padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        Study Notes
      </Text>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              borderWidth: 1,
              padding: 15,
              marginBottom: 10,
            }}
            onPress={() => handleNotePress(item)}
          >
            <Text style={{ fontWeight: "bold" }}>
              {item.title}
            </Text>

            <Text>{item.course}</Text>
            <Text>{item.university}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}