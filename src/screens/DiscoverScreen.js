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
          Build academic connections worldwide 🌍
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
        <Text style={styles.filterText}>
          {item}
        </Text>
      </TouchableOpacity>
    )}
  />
</View>

      {/* STUDENTS */}
      <FlatList
  data={displayedstudents}
  numColumns={2}
  columnWrapperStyle={{
    justifyContent: "space-between",
  }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
  No students found yet.
</Text>
        }
       renderItem={({ item }) => (
  <TouchableOpacity
    style={styles.studentCard}
    onPress={() => handlePrivateMessage(item)}
    activeOpacity={0.9}
  >
    {/* PHOTO */}

    <View>

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

  <View style={styles.onlineDot} />

</View>

    {/* NAME */}

    <Text numberOfLines={1} style={styles.studentName}>
      {item.fullName || "Student"}
    </Text>

    {/* UNIVERSITY */}

    <Text numberOfLines={1} style={styles.studentUniversity}>
      🎓 {item.university || "University"}
    </Text>

    {/* COURSE */}

    <Text numberOfLines={1} style={styles.studentCourse}>
      <View style={styles.badgesRow}>

  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      🎓 {item.year || "Year"}
    </Text>
  </View>

  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      📚 {item.course || "Student"}
    </Text>
  </View>

</View>
      📚 {item.course || "Course"}
    </Text>

    {/* YEAR */}

    <Text style={styles.studentYear}>
      {item.year || "Year"}
    </Text>

    {/* COUNTRY */}

    <Text numberOfLines={1} style={styles.studentCountry}>
      🌍 {item.country || "Country"}
    </Text>

    {/* ONLINE BUTTON */}

    <View style={styles.messageButton}>
      <Text style={styles.messageText}>
        💬 Connect
      </Text>
    </View>
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
  width: "48%",
  backgroundColor: "#0F172A",
  borderRadius: 20,
  padding: 12,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#1F2937",
},

studentImage: {
  width: "100%",
  height: 170,
  borderRadius: 16,
  marginBottom: 10,
},

studentPlaceholder: {
  width: "100%",
  height: 170,
  borderRadius: 16,
  backgroundColor: "#4F46E5",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 10,
},

studentLetter: {
  color: "#FFFFFF",
  fontSize: 42,
  fontWeight: "bold",
},

studentName: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "bold",
},

studentUniversity: {
  color: "#CBD5E1",
  fontSize: 12,
  marginTop: 6,
},

studentCourse: {
  color: "#94A3B8",
  fontSize: 12,
  marginTop: 4,
},

studentYear: {
  color: "#FBBF24",
  marginTop: 6,
  fontWeight: "bold",
},

studentCountry: {
  color: "#9CA3AF",
  fontSize: 11,
  marginTop: 4,
},

messageButton: {
  backgroundColor: "#4F46E5",
  marginTop: 12,
  paddingVertical: 8,
  borderRadius: 10,
  alignItems: "center",
},

messageText: {
  color: "#FFFFFF",
  fontWeight: "bold",
  fontSize: 12,
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

badgesRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: 10,
},

badge: {
  backgroundColor: "#1F2937",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 10,
  marginRight: 6,
  marginBottom: 6,
},

badgeText: {
  color: "#FFFFFF",
  fontSize: 10,
},

onlineDot: {
  position: "absolute",
  top: 10,
  right: 10,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: "#10B981",
  borderWidth: 2,
  borderColor: "#FFFFFF",
},
};