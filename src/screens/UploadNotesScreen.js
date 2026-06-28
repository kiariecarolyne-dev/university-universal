import { useState } from "react";
import {
    Alert,
    Button,
    TextInput,
    View
} from "react-native";

import {
    addDoc,
    collection,
    serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function UploadNotesScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [university, setUniversity] = useState("");
  const [description, setDescription] = useState("");

  // =========================
  // BLOCK CONTACT SHARING
  // =========================
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

  const uploadNote = async () => {
    // CHECK EMPTY FIELDS
    if (
      !title ||
      !course ||
      !university ||
      !description
    ) {
      Alert.alert(
        "Error",
        "Please fill all fields"
      );
      return;
    }

    // BLOCK CONTACT DETAILS
    if (
      containsContactInfo(title) ||
      containsContactInfo(description)
    ) {
      Alert.alert(
        "Blocked",
        "Do not post phone numbers, emails or WhatsApp links in notes."
      );
      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "notes_marketplace"
        ),
        {
          title,
          course,
          university,
          description,

          ownerId:
            auth.currentUser.uid,

          ownerEmail:
            auth.currentUser.email,

          createdAt:
            serverTimestamp(),
        }
      );

      Alert.alert(
        "Success",
        "Notes posted successfully"
      );

      // CLEAR FORM
      setTitle("");
      setCourse("");
      setUniversity("");
      setDescription("");

      navigation.goBack();

    } catch (error) {
      Alert.alert(
        "Error",
        error.message
      );
    }
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        justifyContent: "center"
      }}
    >
      <TextInput
        placeholder="Notes title"
        value={title}
        onChangeText={setTitle}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <TextInput
        placeholder="Course"
        value={course}
        onChangeText={setCourse}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <TextInput
        placeholder="University / College"
        value={university}
        onChangeText={setUniversity}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <Button
        title="Post Notes"
        onPress={uploadNote}
      />
    </View>
  );
}