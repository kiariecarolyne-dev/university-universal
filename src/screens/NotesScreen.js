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
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";
import { canAccessNotes, isPremiumUser } from "../utils/access";

export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportCooldown, setReportCooldown] = useState(false);

  const user = useUser();

  const canViewNotes = user && canAccessNotes(user);
  const canChat = user && isPremiumUser(user);

  const loadNotes = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "notes_marketplace"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

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
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#22C55E" />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
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
                onPress={() => reportUser(item)}
                style={styles.reportBtn}
              >
                <Text style={styles.reportText}>Report User</Text>
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