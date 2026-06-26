import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import {
  collection,
  getDocs
} from "firebase/firestore";

import useUser from "../hooks/useUser";
import { db } from "../services/firebase";

export default function DiscoverScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const user = useUser();

  const loadStudents = async () => {
    const snapshot = await getDocs(
      collection(db, "users")
    );

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setStudents(data);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handlePrivateMessage = (student) => {
    if (!user?.isPremium) {
      Alert.alert(
        "Premium Required",
        "Private messaging requires Premium"
      );
      return;
    }

    navigation.navigate("PrivateChat", {
      student
    });
  };

  return (
    <View style={{ flex: 1, padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 20 }}>
        Discover Students
      </Text>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              borderWidth: 1,
              padding: 15,
              marginTop: 10
            }}
          >
            <Text>{item.email}</Text>
            <Text>{item.course}</Text>
            <Text>{item.university}</Text>
            <Text>{item.country}</Text>

            {/* Message Button */}
            <Button
              title="Message Student"
              onPress={() => handlePrivateMessage(item)}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}