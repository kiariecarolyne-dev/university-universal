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
  }, [user]);

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

      {/* STUDENTS */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
  No students found yet.
</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>

            {/* AVATAR + NAME */}
            <View style={styles.topRow}>
              {item.photo ? (
  <Image
    source={{ uri: item.photo }}
    style={styles.avatarImage}
  />
) : (
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>
      {item.fullName
        ? item.fullName.charAt(0).toUpperCase()
        : "S"}
    </Text>
  </View>
)}

              <View>
                <Text style={styles.name}>
                  {item.fullName || "Student"}
                </Text>

                <Text style={styles.country}>
                  {item.country || "Country not set"}
                </Text>
              </View>
            </View>

            {/* DETAILS */}
            <Text style={styles.meta}>
              🎓 {item.university || "University not set"}
            </Text>

            <Text style={styles.meta}>
              📚 {item.course || "Course not set"}
            </Text>

            <Text style={styles.meta}>
              🏛 Year: {item.year || "Not set"}
            </Text>

            {/* BUTTON */}
            <TouchableOpacity
              style={styles.btn}
              onPress={() => handlePrivateMessage(item)}
            >
              <Text style={styles.btnText}>
                💬 Message Student
              </Text>
            </TouchableOpacity>

          </View>
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
};