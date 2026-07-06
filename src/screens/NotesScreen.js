import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";


import * as FileSystem from "expo-file-system";
import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";
import { canAccessNotes, isPremiumUser } from "../utils/access";

export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportCooldown, setReportCooldown] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

const filters = [
  { key: "all", label: "🎓 All Universities" },
  { key: "university", label: "📚 My University" },
  { key: "course", label: "⭐ My Course" },
];

const user = useUser();

  const canViewNotes = user && canAccessNotes(user);
  const canChat = user && isPremiumUser(user);

  const loadNotes = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "notes"));

      const data = snapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
}));

// Show newest notes first
data.sort((a, b) => {
  return new Date(b.createdAt) - new Date(a.createdAt);
});

      setNotes(data);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (!canViewNotes) {
      setLoading(false);
      setNotes([]);
      return;
    }

    loadNotes();
  }, [user, canViewNotes]);

  useEffect(() => {
  console.log("FILESYSTEM:", FileSystem);
}, []);

  const reportUser = async (item) => {
    if (reportCooldown) {
      Alert.alert("Wait", "Please wait before reporting again.");
      return;
    }

    try {
      setReportCooldown(true);

      await addDoc(collection(db, "reports"), {
        reportedUserId: item.ownerId,
        reportedEmail: item.ownerEmail,
        reportedBy: auth.currentUser.email,
        reason: "Suspicious notes post",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Reported", "User reported successfully.");

      setTimeout(() => setReportCooldown(false), 10000);
    } catch (error) {
      Alert.alert("Error", error.message);
      setReportCooldown(false);
    }
  };

  const handleNotePress = (item) => {
  if (!canChat) {
    Alert.alert(
      "Premium Required",
      "Private messaging requires Premium access."
    );

    navigation.navigate("Premium");
    return;
  }

  Alert.alert(
    "Contact Student",
    `Message ${item.ownerEmail}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Message",
        onPress: () =>
          navigation.navigate("PrivateChat", {
            student: {
              id: item.ownerId,
              email: item.ownerEmail,
            },
          }),
      },
    ]
  );
};

const downloadPDF = async (item) => {
  if (!item.fileUrl) {
    Alert.alert(
      "Unavailable",
      "This note has no downloadable PDF."
    );
    return;
  }

  try {
    await Linking.openURL(item.fileUrl);
  } catch (error) {
    Alert.alert(
      "Error",
      "Unable to open the PDF."
    );
  }
};

const filteredNotes = notes.filter((note) => {
  const search = searchText.trim().toLowerCase();

  // =========================
  // 1. SEARCH FILTER
  // =========================
  const matchesSearch =
    !search ||
    note.title?.toLowerCase().includes(search) ||
    note.course?.toLowerCase().includes(search) ||
    note.university?.toLowerCase().includes(search) ||
    note.description?.toLowerCase().includes(search);

  // =========================
  // 2. TAB FILTER
  // =========================
  let matchesFilter = true;

  if (activeFilter === "university") {
    matchesFilter = note.university === user?.university;
  }

  if (activeFilter === "course") {
    matchesFilter = note.course === user?.course;
  }

  if (activeFilter === "all") {
    matchesFilter = true;
  }

  // =========================
  // FINAL COMBINATION
  // =========================
  return matchesSearch && matchesFilter;
});

if (!user) return null;

  if (!canViewNotes) {
    return (
      <View style={styles.lockScreen}>
        <Text style={styles.lockTitle}>🔒 Premium Required</Text>

        <Text style={styles.lockText}>
          Notes Marketplace is only available for Trial or Premium users.
        </Text>

        <TouchableOpacity
          style={styles.lockButton}
          onPress={() => navigation.navigate("Premium")}
        >
          <Text style={styles.lockButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
<View style={styles.header}>
  <Text style={styles.title}>📚 Notes Marketplace</Text>

  <Text style={styles.subtitle}>
    Buy, share and connect with students
  </Text>

  <TextInput
    style={styles.searchInput}
    placeholder="🔍 Search notes..."
    placeholderTextColor="#9CA3AF"
    value={searchText}
    onChangeText={setSearchText}
  />
</View>

{/* 🧩 FILTER BUTTONS — ADD HERE */}
<View style={{ flexDirection: "row", marginBottom: 10, paddingHorizontal: 16 }}>
  {filters.map((f) => (
    <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)}>
      <Text
        style={{
          marginRight: 10,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: activeFilter === f.key ? "#000" : "#eee",
          color: activeFilter === f.key ? "#fff" : "#000",
          borderRadius: 20,
          fontSize: 12,
        }}
      >
        {f.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#22C55E" />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notes posted yet.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleNotePress(item)}
              style={styles.card}
            >

              <Text style={styles.cardTitle}>{item.title}</Text>

              <Text style={styles.meta}>
                {item.course} • {item.university}
              </Text>

              <Text style={styles.description}>
                {item.description}
              </Text>

              <Text style={styles.owner}>
  Posted by: {item.ownerEmail}
</Text>

<TouchableOpacity
  style={styles.downloadBtn}
  disabled={downloadingId === item.id}
  onPress={() => downloadPDF(item)}
>
  <Text style={styles.downloadText}>
    {downloadingId === item.id
      ? "⏳ Downloading..."
      : "📥 Download PDF"}
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.messageBtn}
  onPress={() => handleNotePress(item)}
>
  <Text style={styles.messageText}>
    💬 Message Student
  </Text>
</TouchableOpacity>

<TouchableOpacity
  onPress={() => reportUser(item)}
  style={styles.reportBtn}
>
  <Text style={styles.reportText}>
    🚩 Report User
  </Text>
</TouchableOpacity>

            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

/* =========================
   DARK PROFESSIONAL UI
========================= */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#0B0F14",
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },

searchInput: {
  marginTop: 15,
  backgroundColor: "#121826",
  color: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#1F2937",
  borderRadius: 12,
  paddingHorizontal: 15,
  paddingVertical: 12,
  fontSize: 15,
},

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 4,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 10,
  },

  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 30,
  },

  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,

    // subtle premium feel
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  meta: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 12,
  },

  description: {
    color: "#D1D5DB",
    marginTop: 8,
    lineHeight: 18,
  },

  owner: {
    color: "#6B7280",
    marginTop: 10,
    fontSize: 11,
  },

  downloadBtn: {
  marginTop: 12,
  backgroundColor: "#2563EB",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
},

downloadText: {
  color: "#FFFFFF",
  fontWeight: "bold",
},

messageBtn: {
  marginTop: 10,
  backgroundColor: "#22C55E",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
},

messageText: {
  color: "#000000",
  fontWeight: "bold",
},

  reportBtn: {
    marginTop: 12,
    backgroundColor: "#7F1D1D",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  reportText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },

  lockScreen: {
    flex: 1,
    backgroundColor: "#0B0F14",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  lockTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  lockText: {
    textAlign: "center",
    marginTop: 10,
    color: "#9CA3AF",
  },

  lockButton: {
    marginTop: 20,
    backgroundColor: "#22C55E",
    padding: 12,
    borderRadius: 10,
  },

  lockButtonText: {
    color: "#000",
    fontWeight: "bold",
  },
};