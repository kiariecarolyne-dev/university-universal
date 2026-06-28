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

  const uploadNote = async () => {
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

      // clear form
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