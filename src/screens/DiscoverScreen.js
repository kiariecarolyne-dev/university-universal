import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { collection, getDocs } from "firebase/firestore";
import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";

import {
  canAccessDiscover,
  isInTrialPeriod,
  isPremiumUser,
} from "../utils/access";

export default function DiscoverScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [courses, setCourses] = useState([]);
const [selectedCountry, setSelectedCountry] = useState("All");
  const user = useUser();

  const loadStudents = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filtered = data.filter(
  (student) => student.id !== auth.currentUser?.uid
);

setStudents(filtered);

const uniqueCourses = [
  "All",
  ...new Set(
    filtered
      .map((student) => student.course)
      .filter(Boolean)
  ),
];

setCourses(uniqueCourses);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (!canAccessDiscover(user)) {
      Alert.alert(
        "Trial Expired",
        "Your free trial has ended. Upgrade to continue."
      );

      navigation.navigate("Premium");
      return;
    }

    loadStudents();
  }, [user, selectedCourse]);

  const handlePrivateMessage = (student) => {
    if (!isPremiumUser(user)) {
      Alert.alert(
        "Premium Required",
        "Private messaging is a Premium feature."
      );

      navigation.navigate("Premium");
      return;
    }

    navigation.navigate("PrivateChat", { student });
  };

  const displayedStudents = students.filter(
  (student) =>
    selectedCourse === "All" ||
    student.course === selectedCourse
);

  if (!user) return null;

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>
  🌍 Discover Students
</Text>
        <Text style={styles.subtitle}>
  {displayedStudents.length} students available to connect 🌍
</Text>
      </View>

      {/* TRIAL BANNER */}
      {isInTrialPeriod(user) && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>
            🚀 Trial Active • Upgrade to unlock private messaging
          </Text>
        </View>
      )}

      <View style={styles.filtersRow}>
  <FlatList
    horizontal
    showsHorizontalScrollIndicator={false}
    data={courses}
    keyExtractor={(item) => item}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={[
          styles.filterChip,
          selectedCourse === item &&
            styles.activeChip,
        ]}
        onPress={() => setSelectedCourse(item)}
      >
        <Text
  style={[
    styles.filterText,
    selectedCourse === item && styles.activeFilterText,
  ]}
>
  {item}
</Text>
      </TouchableOpacity>
    )}
  />
</View>

{/* STUDENTS */}

<FlatList
  data={displayedStudents}
  numColumns={3}
  keyExtractor={(item) => item.id}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: 30 }}
  columnWrapperStyle={{
    justifyContent: "space-between",
    marginBottom: 15,
  }}
  ListEmptyComponent={
    <Text style={styles.empty}>
      No students found yet.
    </Text>
  }
  renderItem={({ item }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() =>
  navigation.navigate("StudentProfile", {
    member: item,
  })
}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
  {item.photo ? (
    <Image
      source={{ uri: item.photo }}
      style={styles.studentImage}
    />
  ) : (
    <View style={styles.studentPlaceholder}>
      <Text style={styles.studentLetter}>
        {item.fullName
          ? item.fullName.charAt(0).toUpperCase()
          : "S"}
      </Text>
    </View>
  )}

  {item.online && (
    <View style={styles.onlineDot} />
  )}
</View>

<Text numberOfLines={1} style={styles.studentName}>
        {item.fullName || "Student"}
      </Text>

      <Text numberOfLines={1} style={styles.studentUniversity}>
        {item.university || "University"}
      </Text>

      <Text numberOfLines={1} style={styles.studentCourse}>
        {item.course || "Course"}
      </Text>
    </TouchableOpacity>
  )}
/>
    </View>

   
  );
}

/* =========================
   PREMIUM UI
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
    fontSize: 27,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 5,
  },

  trialBanner: {
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
  },

  trialText: {
    color: "#FBBF24",
    fontSize: 12,
  },

  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarImage: {
  width: 56,
  height: 56,
  borderRadius: 28,
  marginRight: 12,
},

  avatarText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  country: {
    color: "#9CA3AF",
    marginTop: 3,
    fontSize: 12,
  },

  meta: {
    color: "#D1D5DB",
    marginTop: 6,
  },

  btn: {
    marginTop: 14,
    backgroundColor: "#4F46E5",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  btnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  empty: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
  },

studentCard: {
  width: "31%",
  marginBottom: 18,
},

imageContainer: {
  position: "relative",
},

onlineDot: {
  position: "absolute",
  right: 8,
  bottom: 8,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: "#22C55E",
  borderWidth: 2,
  borderColor: "#05070A",
},

studentImage: {
  width: "100%",
  height: 150,
  borderRadius: 18,
},

studentPlaceholder: {
  width: "100%",
  height: 150,
  borderRadius: 18,
  backgroundColor: "#4F46E5",
  justifyContent: "center",
  alignItems: "center",
},

studentLetter: {
  color: "#FFFFFF",
  fontSize: 42,
  fontWeight: "bold",
},

studentName: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "700",
  marginTop: 8,
},

studentUniversity: {
  color: "#CBD5E1",
  fontSize: 11,
  marginTop: 2,
},

studentCourse: {
  color: "#94A3B8",
  fontSize: 11,
},

filtersRow: {
  flexDirection: "row",
  marginBottom: 15,
},

filterChip: {
  backgroundColor: "#1F2937",
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  marginRight: 10,
},

activeChip: {
  backgroundColor: "#4F46E5",
},

filterText: {
  color: "#FFFFFF",
  fontSize: 12,
},

activeFilterText: {
  fontWeight: "bold",
},

};
