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
const API_URL = "https://university-universal-backend.onrender.com";

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../services/firebase";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const userId = auth.currentUser?.uid;

  // LOAD PROFILE
  const loadProfile = async () => {
    try {
      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setFullName(data.fullName || "");
        setUniversity(data.university || "");
        setCourse(data.course || "");
        setCountry(data.country || "");
        setYear(data.year || "");
        setPhoto(data.photo || "");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setFetching(false);
    }
  };

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

const createGroupId = (course) => {
  return course
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

    // CREATE STUDY GROUP + JOIN STUDENT
const createStudyGroupIfNeeded = async (photoURL) => {
  try {
    const groupId = createGroupId(course);

    // Course study group
    const groupRef = doc(db, "groups", groupId);

    const groupSnap = await getDoc(groupRef);

    // Create the course group if it doesn't exist
    if (!groupSnap.exists()) {
      await setDoc(groupRef, {
        name: `${course} Study Group`,
        course,
        memberCount: 0,
        createdBy: userId,
        createdAt: serverTimestamp(),
      });
    }

    // Student membership document
    const memberRef = doc(
      db,
      "groups",
      groupId,
      "members",
      userId
    );

    const memberSnap = await getDoc(memberRef);

    // New member
if (!memberSnap.exists()) {

  await setDoc(memberRef, {
    userId,
    fullName,
    university,
    country,
    year,
    photo: photoURL,
    joinedAt: serverTimestamp(),
  });

  await updateDoc(groupRef, {
    memberCount: increment(1),
  });

} else {

  // Existing member → update profile information
  await setDoc(
    memberRef,
    {
      fullName,
      university,
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

  // SAVE PROFILE (SAFE UPDATE)
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

    await setDoc(
      userRef,
      {
        fullName,
        university,
        course,
        country,
        year,
        photo: photoURL,
        email: auth.currentUser.email,
      },
      { merge: true }
    );

       await createStudyGroupIfNeeded(photoURL);

       if (
  previousCourse &&
  previousCourse !== course
) {
  const oldGroupId = createGroupId(previousCourse);

  const oldGroupRef = doc(
    db,
    "groups",
    oldGroupId
  );

  const oldMemberRef = doc(
    db,
    "groups",
    oldGroupId,
    "members",
    userId
  );

  // Remove from old group
  await deleteDoc(oldMemberRef);

  // Decrease old group's member count
  await updateDoc(oldGroupRef, {
    memberCount: increment(-1),
  });
}

    Alert.alert(
      "Success",
      "Profile updated successfully."
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

  useEffect(() => {
    loadProfile();
  }, []);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >

      {/* HEADER */}
      <View style={styles.header}>
  <Text style={styles.title}>My Profile</Text>

  <Text style={styles.subtitle}>
    Build your academic identity 🌍
  </Text>

  <Text style={styles.email}>
    {auth.currentUser?.email}
  </Text>
</View>

<TouchableOpacity
  onPress={pickImage}
  style={{ alignItems: "center", marginTop: 20 }}
>
  <Image
    source={{
      uri:
        photo ||
        "https://via.placeholder.com/150",
    }}
    style={{
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: "#E5E7EB",
    }}
  />

  <Text
    style={{
      color: "#4F46E5",
      marginTop: 10,
      fontWeight: "bold",
    }}
  >
    Upload Profile Photo
  </Text>
</TouchableOpacity>

      {/* PROFILE CARD */}
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
          <Text style={styles.primaryText}>
            {loading ? "Saving..." : "💾 Save Profile"}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

/* =========================
   PREMIUM SAAS DARK UI
========================= */
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },

  header: {
    marginTop: 55,
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  subtitle: {
  color: "#9CA3AF",
  marginTop: 6,
},

email: {
  color: "#6B7280",
  marginTop: 4,
  fontSize: 13,
},

  card: {
    backgroundColor: "rgba(15, 23, 42, 0.90)",
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
};