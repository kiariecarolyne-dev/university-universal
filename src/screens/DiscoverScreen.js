import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { collection, getDocs } from "firebase/firestore";
import EmptyState from "../components/EmptyState";
import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";

import {
  isInTrialPeriod,
  isPremiumUser,
} from "../utils/access";

export default function DiscoverScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [courses, setCourses] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [countries, setCountries] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const user = useUser();

  const loadStudents = async () => {
    try {
      setLoading(true);
      setLoadError(false);

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

      const uniqueCountries = [
        "All",
        ...new Set(
          filtered
            .map((student) => student.country)
            .filter(Boolean)
        ),
      ];

      setCountries(uniqueCountries);
    } catch (error) {
      console.log("Discover load error:", error);

      setLoadError(true);

      Alert.alert(
        "Couldn't load students",
        "Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

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

  const trimmedSearch = search.trim().toLowerCase();

  const displayedStudents = students.filter((student) => {
    if (
      selectedCourse !== "All" &&
      student.course !== selectedCourse
    ) {
      return false;
    }

    if (
      selectedCountry !== "All" &&
      student.country !== selectedCountry
    ) {
      return false;
    }

    if (trimmedSearch) {
      const haystack = [
        student.fullName,
        student.course,
        student.university,
        student.country,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");

      if (!haystack.includes(trimmedSearch)) return false;
    }

    return true;
  });

  if (!user) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedStudents}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.title}>
                Discover Students
              </Text>

              <Text style={styles.subtitle}>
                Meet students, connect, and grow together.
              </Text>
            </View>

            {/* SEARCH */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>
                🔍
              </Text>

              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor="#6B7280"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* INTRO STRIP */}
            <View style={styles.introCard}>
              <Text style={styles.introEmoji}>🌍</Text>

              <Text style={styles.introText}>
                Connect with students from around the world
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

            {/* COURSE FILTER */}

            <View style={styles.filtersRow}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={courses}
                keyExtractor={(item) => `course-${item}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      selectedCourse === item &&
                        styles.activeChip,
                    ]}
                    onPress={() => setSelectedCourse(item)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selectedCourse === item &&
                          styles.activeFilterText,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* COUNTRY FILTER */}

            <View style={styles.filtersRow}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={countries}
                keyExtractor={(item) => `country-${item}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      selectedCountry === item &&
                        styles.activeChip,
                    ]}
                    onPress={() => setSelectedCountry(item)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selectedCountry === item &&
                          styles.activeFilterText,
                      ]}
                    >
                      {item === "All" ? "🌍 All" : item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* SECTION HEADER */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Students you may know
              </Text>

              <Text style={styles.sectionHint}>
                {displayedStudents.length} student
                {displayedStudents.length === 1 ? "" : "s"}
              </Text>
            </View>

            {loading && students.length > 0 && (
              <View style={styles.reloadingRow}>
                <ActivityIndicator
                  size="small"
                  color="#4F46E5"
                />

                <Text style={styles.reloadingText}>
                  Updating students...
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator
                size="small"
                color="#4F46E5"
              />

              <Text style={styles.stateText}>
                Finding students...
              </Text>
            </View>
          ) : loadError ? (
            <EmptyState
              emoji="😕"
              title="Couldn't load students"
              text="Check your connection and try again."
              actionLabel="Try Again"
              onAction={loadStudents}
              card={false}
            />
          ) : search.trim() ||
            selectedCourse !== "All" ||
            selectedCountry !== "All" ? (
            <EmptyState
              emoji="🌍"
              title="Your student network is waiting"
              text="No students match your current search. Try clearing your filters to see everyone."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch("");
                setSelectedCourse("All");
                setSelectedCountry("All");
              }}
              card={false}
            />
          ) : (
            <EmptyState
              emoji="🌍"
              title="Your student network is waiting"
              text="Connect with students from your course, university, and beyond."
              card={false}
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.studentCard}
            onPress={() =>
              navigation.navigate("StudentProfile", {
                member: item,
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.avatarWrap}>
              {item.photo ? (
                <Image
                  source={{ uri: item.photo }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>
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

            <View style={styles.studentInfo}>
              <Text
                numberOfLines={1}
                style={styles.studentName}
              >
                {item.fullName || "Student"}
              </Text>

              <Text
                numberOfLines={1}
                style={styles.studentCourse}
              >
                {item.course || "Course"}
              </Text>

              <Text
                numberOfLines={1}
                style={styles.studentUniversity}
              >
                {item.university || "University"}
              </Text>

              {item.country ? (
                <Text
                  numberOfLines={1}
                  style={styles.studentCountry}
                >
                  🌍 {item.country}
                </Text>
              ) : null}
            </View>

            <View style={styles.viewProfile}>
              <Text style={styles.viewProfileText}>
                View
              </Text>

              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  list: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    marginBottom: 16,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  /* SEARCH */

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 44,
    marginBottom: 12,
  },

  searchIcon: {
    fontSize: 15,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    padding: 0,
  },

  clearIcon: {
    fontSize: 14,
    color: "#6B7280",
    paddingHorizontal: 4,
  },

  /* INTRO STRIP */

  introCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  introEmoji: {
    fontSize: 16,
    marginRight: 10,
  },

  introText: {
    color: "#D1D5DB",
    fontSize: 13,
    flex: 1,
  },

  /* TRIAL BANNER */

  trialBanner: {
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },

  trialText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
  },

  /* FILTER CHIPS */

  filtersRow: {
    marginBottom: 10,
  },

  filterChip: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 8,
  },

  activeChip: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },

  filterText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* SECTION HEADER */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionHint: {
    color: "#6B7280",
    fontSize: 12,
  },

  /* STUDENT CARD */

  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  avatarWrap: {
    width: 56,
    height: 56,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    borderWidth: 2,
    borderColor: "#1F2937",
  },

  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4F46E5",
    borderWidth: 2,
    borderColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#05070A",
  },

  studentInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  studentName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  studentCourse: {
    color: "#D1D5DB",
    fontSize: 12,
    marginTop: 2,
  },

  studentUniversity: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 1,
  },

  studentCountry: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 3,
  },

  viewProfile: {
    flexDirection: "row",
    alignItems: "center",
  },

  viewProfileText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "700",
  },

  chevron: {
    color: "#4F46E5",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 2,
  },

  /* EMPTY / LOADING STATE */

  stateBox: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  reloadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    marginBottom: 8,
  },

  reloadingText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginLeft: 8,
  },

  stateEmoji: {
    fontSize: 34,
    marginBottom: 12,
  },

  stateTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  stateHint: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },

  stateText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 12,
  },
};