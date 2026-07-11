import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";


import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
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
  const downloadsA = a.downloads || 0;
  const downloadsB = b.downloads || 0;

  // Higher downloads first
  if (downloadsB !== downloadsA) {
    return downloadsB - downloadsA;
  }

  // If downloads are equal, newest first
  return new Date(b.createdAt) - new Date(a.createdAt);
});

      // Count uploads per creator
const uploadCounts = {};

data.forEach((note) => {
  uploadCounts[note.userId] =
    (uploadCounts[note.userId] || 0) + 1;
});

// Attach upload count to every note
const updatedNotes = data.map((note) => ({
  ...note,
  creatorUploads: uploadCounts[note.userId] || 0,
}));

setNotes(updatedNotes);
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
    `Message ${item.ownerName}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Message",
        onPress: () => {
          if (item.userId === auth.currentUser.uid) {
            Alert.alert(
              "Your Note",
              "You cannot message yourself."
            );
            return;
          }

          navigation.navigate("PrivateChat", {
            student: {
              id: item.userId,
              email: item.email,
              fullName: item.ownerName,
            },
          });
        },
      },
    ]
  );
};

const downloadPDF = async (item) => {
  if (!item.fileUrl) {
    Alert.alert("Unavailable", "This note has no downloadable PDF.");
    return;
  }

  try {
    setDownloadingId(item.id);

    const fileName =
      item.title?.replace(/\s+/g, "_") || "note_file";

    const fileUri =
      FileSystem.documentDirectory + fileName + ".pdf";

    const { uri } = await FileSystem.downloadAsync(
      item.fileUrl,
      fileUri
    );

    await updateDoc(doc(db, "notes", item.id), {
  downloads: (item.downloads || 0) + 1,
});

    setDownloadingId(null);

    const canShare = await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert(
        "Download Complete",
        "File saved but cannot be opened on this device."
      );
    }
  } catch (error) {
    console.log("Download error:", error);
    setDownloadingId(null);
    Alert.alert("Error", "Download failed. Please try again.");
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
  Discover quality study materials from university students worldwide 🌍
</Text>

  <TextInput
    style={styles.searchInput}
    placeholder="🔍 Search notes..."
    placeholderTextColor="#9CA3AF"
    value={searchText}
    onChangeText={setSearchText}
  />
</View>

{/* FILTER BUTTONS */}
<View style={styles.filterRow}>
  {filters.map((f) => (
    <TouchableOpacity
      key={f.key}
      style={[
        styles.filterChip,
        activeFilter === f.key && styles.activeFilterChip,
      ]}
      onPress={() => setActiveFilter(f.key)}
    >
      <Text
        style={[
          styles.filterText,
          activeFilter === f.key && styles.activeFilterText,
        ]}
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
            <Text style={styles.emptyText}>
  📚 No notes found.
  {"\n\n"}
  Try another search or be the first to upload study materials.
</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleNotePress(item)}
              style={styles.card}
            >

              {Date.now() - new Date(item.createdAt).getTime() <
  3 * 24 * 60 * 60 * 1000 && (
  <View
    style={{
      alignSelf: "flex-start",
      backgroundColor: "#22C55E",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      marginBottom: 8,
    }}
  >
    <Text
      style={{
        color: "#000",
        fontWeight: "bold",
        fontSize: 11,
      }}
    >
      NEW
    </Text>
  </View>
)}

{(item.downloads || 0) >= 10 && (
  <View
    style={{
      alignSelf: "flex-start",
      backgroundColor: "#EF4444",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      marginBottom: 8,
      marginTop: 6,
    }}
  >
    <Text
      style={{
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 11,
      }}
    >
      🔥 POPULAR
    </Text>
  </View>
)}

{(item.creatorUploads || 0) >= 5 && (
  <View
    style={{
      alignSelf: "flex-start",
      backgroundColor: "#F59E0B",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      marginBottom: 8,
      marginTop: 6,
    }}
  >
    <Text
      style={{
        color: "#000",
        fontWeight: "bold",
        fontSize: 11,
      }}
    >
      🏆 TOP CREATOR
    </Text>
  </View>
)}

<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  }}
>
  {item.ownerPhoto ? (
    <Image
      source={{ uri: item.ownerPhoto }}
      style={styles.ownerAvatar}
    />
  ) : (
    <View style={styles.ownerAvatar}>
      <Text style={{ fontWeight: "bold" }}>
        {(item.ownerName || "S")
          .charAt(0)
          .toUpperCase()}
      </Text>
    </View>
  )}

  <View>
    <Text style={styles.owner}>
      {(item.creatorUploads || 0) >= 5 ? "✅" : "👤"}{" "}
      {item.ownerName || item.email}
    </Text>

    <Text
      style={{
        color: "#9CA3AF",
        fontSize: 12,
      }}
    >
      📥 {item.downloads || 0} downloads
    </Text>
  </View>
</View>

              <Text style={styles.cardTitle}>{item.title}</Text>

              <Text style={styles.meta}>
                {item.course} • {item.university}
              </Text>

              <Text style={styles.description}>
                {item.description}
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

filterRow: {
  flexDirection: "row",
  paddingHorizontal: 16,
  marginTop: 12,
  marginBottom: 8,
},

filterChip: {
  backgroundColor: "#111827",
  borderWidth: 1,
  borderColor: "#1F2937",
  paddingVertical: 9,
  paddingHorizontal: 14,
  borderRadius: 20,
  marginRight: 10,
},

activeFilterChip: {
  backgroundColor: "#4F46E5",
  borderColor: "#4F46E5",
},

filterText: {
  color: "#9CA3AF",
  fontSize: 12,
  fontWeight: "600",
},

activeFilterText: {
  color: "#FFFFFF",
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

  ownerAvatar: {
  width: 44,
  height: 44,
  borderRadius: 22,
  marginRight: 12,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#374151",
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