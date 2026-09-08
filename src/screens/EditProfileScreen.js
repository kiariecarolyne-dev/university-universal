import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../services/firebase";

const API_URL =
  "https://university-universal-backend.onrender.com";

export default function EditProfileScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const userId = auth.currentUser?.uid;

  // Load the existing users/{uid} document into the form.
  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!userId) return;

      try {
        const ref = doc(db, "users", userId);
        const snap = await getDoc(ref);

        if (snap.exists() && mounted) {
          const data = snap.data();

          setFullName(data.fullName || "");
          setUniversity(data.university || "");
          setCourse(data.course || "");
          setCountry(data.country || "");
          setYear(data.year || "");
          setPhoto(data.photo || "");
        }
      } catch (error) {
        if (mounted) {
          Alert.alert("Error", error.message);
        }
      } finally {
        if (mounted) {
          setFetching(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const createGroupId = (groupCourse) => {
    return groupCourse
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  // CREATE STUDY GROUP + JOIN STUDENT
  const createStudyGroupIfNeeded = async (photoURL) => {
    try {
      const groupId = createGroupId(course);

      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        await setDoc(groupRef, {
          name: `${course} Study Group`,
          course,
          memberCount: 0,
          createdBy: userId,
          createdAt: serverTimestamp(),
        });
      }

      const memberRef = doc(
        db,
        "groups",
        groupId,
        "members",
        userId
      );

      const memberSnap = await getDoc(memberRef);

      if (!memberSnap.exists()) {
        await setDoc(memberRef, {
          userId,
          email: auth.currentUser?.email,
          fullName,
          university,
          course,
          country,
          year,
          photo: photoURL,
          joinedAt: serverTimestamp(),
        });

        await updateDoc(groupRef, {
          memberCount: increment(1),
        });
      } else {
        await setDoc(
          memberRef,
          {
            email: auth.currentUser?.email,
            fullName,
            university,
            course,
            country,
            year,
            photo: photoURL,
          },
          { merge: true }
        );
      }

      return groupId;
    } catch (error) {
      console.log("Group creation error:", error.message);
      throw error;
    }
  };

  // SAVE PROFILE (SAFE UPDATE — same rules as the previous Profile screen)
  const saveProfile = async () => {
    if (
      !fullName ||
      !university ||
      !course ||
      !country ||
      !year ||
      !photo
    ) {
      Alert.alert(
        "Error",
        "Please fill all fields and upload a profile picture."
      );
      return;
    }

    try {
      setLoading(true);

      let photoURL = photo;

      // Upload only if this is a newly selected local file
      if (photo.startsWith("file")) {
        const formData = new FormData();

        formData.append("userId", userId);
        formData.append("photo", {
          uri: photo,
          name: "profile.jpg",
          type: "image/jpeg",
        });

        const response = await axios.post(
          `${API_URL}/upload-profile-photo`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (!response.data.success) {
          throw new Error("Photo upload failed.");
        }

        photoURL = response.data.photoUrl;
      }

      const userRef = doc(db, "users", userId);
      const oldProfile = await getDoc(userRef);

      const previousCourse = oldProfile.exists()
        ? oldProfile.data().course
        : null;

      // Update the existing users/{uid} document (no second profile system).
      await setDoc(
        userRef,
        {
          fullName,
          university,
          course,
          country,
          year,
          photo: photoURL,
          email: auth.currentUser?.email,
        },
        { merge: true }
      );

      await createStudyGroupIfNeeded(photoURL);

      // Move the student out of their previous course group when course changes
      if (previousCourse && previousCourse !== course) {
        const oldGroupId = createGroupId(previousCourse);
        const oldGroupRef = doc(db, "groups", oldGroupId);
        const oldMemberRef = doc(
          db,
          "groups",
          oldGroupId,
          "members",
          userId
        );

        await deleteDoc(oldMemberRef);

        await updateDoc(oldGroupRef, {
          memberCount: increment(-1),
        });
      }

      Alert.alert(
        "Profile Updated",
        "Your profile has been saved successfully.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Error",
        error.response?.data?.error || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  // LOADER
  if (fetching) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loaderText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE PHOTO */}
        <TouchableOpacity
          onPress={pickImage}
          style={styles.photoArea}
        >
          <Image
            source={{
              uri:
                photo ||
                "https://via.placeholder.com/150",
            }}
            style={styles.avatar}
          />

          <Text style={styles.photoHint}>
            {photo ? "Change Profile Photo" : "Upload Profile Photo"}
          </Text>
        </TouchableOpacity>

        {/* FORM CARD */}
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            placeholder="Enter full name"
            placeholderTextColor="#6B7280"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
          />

          <Text style={styles.label}>University</Text>
          <TextInput
            placeholder="Enter university"
            placeholderTextColor="#6B7280"
            autoCapitalize="words"
            value={university}
            onChangeText={setUniversity}
            style={styles.input}
          />

          <Text style={styles.label}>Course</Text>
          <TextInput
            placeholder="Enter course"
            placeholderTextColor="#6B7280"
            autoCapitalize="words"
            value={course}
            onChangeText={setCourse}
            style={styles.input}
          />

          <Text style={styles.label}>Country</Text>
          <TextInput
            placeholder="Enter country"
            placeholderTextColor="#6B7280"
            autoCapitalize="words"
            value={country}
            onChangeText={setCountry}
            style={styles.input}
          />

          <Text style={styles.label}>Year of Study</Text>
          <TextInput
            placeholder="e.g. 1st Year"
            placeholderTextColor="#6B7280"
            autoCorrect={false}
            value={year}
            onChangeText={setYear}
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={saveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                💾 Save Profile
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  scroll: {
    flex: 1,
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  loader: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  loaderText: {
    color: "#9CA3AF",
    marginTop: 10,
  },

  photoArea: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 22,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
  },

  photoHint: {
    color: "#4F46E5",
    marginTop: 10,
    fontWeight: "bold",
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
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "500",
  },

  input: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 15,
  },

  primaryBtn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 14,
    marginTop: 22,
    alignItems: "center",
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
};