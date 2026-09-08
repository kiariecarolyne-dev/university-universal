import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../services/firebase";
import useUser from "../hooks/useUser";
import {
  INTERESTS_CATALOG,
  LOOKING_FOR_OPTIONS,
} from "../utils/matching";

export default function MatchPreferencesScreen({ navigation }) {
  const user = useUser();

  const [interests, setInterests] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const [matchVisible, setMatchVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadPrefs = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists() && mounted) {
          const data = snap.data();
          setInterests(data.interests || []);
          setLookingFor(data.lookingFor || []);
          setMatchVisible(data.matchVisible !== false);
        }
      } catch (error) {
        console.log("Load match prefs error:", error);
      } finally {
        if (mounted) setFetching(false);
      }
    };

    loadPrefs();
    return () => { mounted = false; };
  }, []);

  const savePrefs = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setLoading(true);
      await setDoc(
        doc(db, "users", uid),
        { interests, lookingFor, matchVisible },
        { merge: true }
      );
      Alert.alert("Saved", "Your match preferences have been updated.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (fetching) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loaderText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Match Preferences</Text>
      <Text style={styles.subtitle}>
        Customize how you appear in the matching deck.
      </Text>

      {/* INTERESTS */}
      <Text style={styles.sectionTitle}>Interests</Text>
      <Text style={styles.sectionHint}>
        Select up to 10 interests to show on your profile.
      </Text>
      <View style={styles.chipRow}>
        {INTERESTS_CATALOG.map((item) => {
          const selected = interests.includes(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => {
                setInterests((prev) => {
                  if (selected) return prev.filter((i) => i !== item.key);
                  if (prev.length >= 10) return prev;
                  return [...prev, item.key];
                });
              }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* LOOKING FOR */}
      <Text style={styles.sectionTitle}>What are you looking for?</Text>
      <View style={styles.chipRow}>
        {LOOKING_FOR_OPTIONS.map((item) => {
          const selected = lookingFor.includes(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => {
                setLookingFor((prev) =>
                  selected
                    ? prev.filter((l) => l !== item.key)
                    : [...prev, item.key]
                );
              }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* HIDE PROFILE */}
      <Text style={styles.sectionTitle}>Profile Visibility</Text>
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => setMatchVisible((prev) => !prev)}
      >
        <Text style={styles.toggleLabel}>Show my profile in matches</Text>
        <View style={[styles.toggle, matchVisible && styles.toggleActive]}>
          <View style={[styles.toggleDot, matchVisible && styles.toggleDotActive]} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={savePrefs}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },
  content: {
    padding: 16,
    paddingBottom: 50,
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
  heading: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 6,
  },
  sectionHint: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  chipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  chipText: {
    color: "#D1D5DB",
    fontSize: 13,
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 16,
  },
  toggleLabel: {
    color: "#D1D5DB",
    fontSize: 14,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#374151",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: "#4F46E5",
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#9CA3AF",
  },
  toggleDotActive: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
  },
  saveBtn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
};
