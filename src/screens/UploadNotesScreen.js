import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import axios from "axios";

import useUser from "../hooks/useUser";
import { auth } from "../services/firebase";
import { isPremiumUser } from "../utils/access";

const API_URL = "https://university-universal-backend.onrender.com";

export default function UploadNotesScreen({ navigation }) {
  const user = useUser();

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [university, setUniversity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const isAllowed = user && isPremiumUser(user);

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

  /* =========================
     PREMIUM LOCK SCREEN
  ========================= */
  if (!isAllowed) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>
          🔒 Creator Access Required
        </Text>

        <Text style={styles.lockText}>
          Uploading notes is part of the Premium Creator Program.
          {"\n"}
          Earn by sharing academic materials.
        </Text>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation.navigate("Premium")}
        >
          <Text style={styles.upgradeText}>
            Upgrade to Premium
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* =========================
     UPLOAD NOTE
  ========================= */
  const uploadNote = async () => {
    if (loading) return;

    if (!title || !course || !university || !description) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (
      containsContactInfo(title) ||
      containsContactInfo(description)
    ) {
      Alert.alert(
        "Blocked",
        "Phone numbers, emails and WhatsApp links are not allowed."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/upload-note`,
        {
          userId: auth.currentUser.uid,

          email: auth.currentUser.email,

          // NEW
          ownerName: user.fullName || "Unknown Student",

          title,
          course,
          university,
          description,
        }
      );

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Notes published successfully"
        );

        setTitle("");
        setCourse("");
        setUniversity("");
        setDescription("");

        navigation.goBack();
      } else {
        Alert.alert("Error", "Upload failed");
      }

    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Server error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Upload Notes
        </Text>

        <Text style={styles.subtitle}>
          Share knowledge • Build reputation • Earn value
        </Text>
      </View>

      {/* FORM */}
      <View style={styles.card}>

        <Text style={styles.label}>Title</Text>
        <TextInput
          placeholder="Introduction to Calculus Notes"
          placeholderTextColor="#6B7280"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <Text style={styles.label}>Course</Text>
        <TextInput
          placeholder="Computer Science"
          placeholderTextColor="#6B7280"
          value={course}
          onChangeText={setCourse}
          style={styles.input}
        />

        <Text style={styles.label}>University</Text>
        <TextInput
          placeholder="University of Nairobi"
          placeholderTextColor="#6B7280"
          value={university}
          onChangeText={setUniversity}
          style={styles.input}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          placeholder="Describe what students will get..."
          placeholderTextColor="#6B7280"
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textArea]}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={uploadNote}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading
              ? "Publishing..."
              : "Publish Notes"}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

/* =========================
   SAAS DARK DESIGN
========================= */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
    paddingTop: 50,
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 5,
  },

  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 18,
    padding: 18,
  },

  label: {
    color: "#9CA3AF",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 13,
  },

  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF",
    marginBottom: 10,
  },

  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  primaryBtn: {
    backgroundColor: "#4F46E5",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  lockContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  lockTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  lockText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginBottom: 20,
    lineHeight: 22,
  },

  upgradeBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
  },

  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
};