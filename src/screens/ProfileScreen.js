import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { auth, db } from "../services/firebase";

export default function ProfileScreen() {
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");

  const userId = auth.currentUser?.uid;

  const loadProfile = async () => {
    try {
      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setUniversity(data.university || "");
        setCourse(data.course || "");
        setCountry(data.country || "");
        setYear(data.year || "");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const saveProfile = async () => {
    try {
      await setDoc(doc(db, "users", userId), {
        university,
        course,
        country,
        year,
        email: auth.currentUser.email
      });

      Alert.alert("Success", "Profile updated");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <View style={{ padding: 20, marginTop: 50 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>My Profile</Text>

      <TextInput placeholder="University" value={university} onChangeText={setUniversity} style={{ borderWidth: 1, marginBottom: 10, padding: 10 }} />

      <TextInput placeholder="Course" value={course} onChangeText={setCourse} style={{ borderWidth: 1, marginBottom: 10, padding: 10 }} />

      <TextInput placeholder="Country" value={country} onChangeText={setCountry} style={{ borderWidth: 1, marginBottom: 10, padding: 10 }} />

      <TextInput placeholder="Year of Study" value={year} onChangeText={setYear} style={{ borderWidth: 1, marginBottom: 10, padding: 10 }} />

      <Button title="Save Profile" onPress={saveProfile} />
    </View>
  );
}