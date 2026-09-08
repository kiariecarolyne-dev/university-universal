import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "../services/firebase";

import EmptyState from "../components/EmptyState";

import useUser from "../hooks/useUser";
import {
  getUserPlan,
  isAdminUser,
} from "../utils/access";

export default function JobsScreen({ navigation }) {
  const user = useUser();

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const getDeadlineDate = (deadline) => {
  if (!deadline) return null;

  if (deadline instanceof Timestamp) {
    return deadline.toDate();
  }

  if (deadline?.toDate) {
    return deadline.toDate();
  }

  if (deadline instanceof Date) {
    return deadline;
  }

  if (typeof deadline === "string") {
    // Web format: YYYY-MM-DD
    const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, year, month, day] = match;

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        23,
        59,
        59,
        999
      );
    }

    // Try other readable date formats
    const parsed = new Date(deadline);

    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

  /* =========================================
     LOAD JOBS FROM FIRESTORE
  ========================================= */

  useEffect(() => {
    let active = true;

    const jobsQuery = query(
      collection(db, "jobs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        if (!active) return;

        const loadedJobs = [];

        snapshot.forEach((docSnap) => {
  const data = docSnap.data();

  const deadlineDate = getDeadlineDate(data.deadline);

  // Only show active jobs that have not expired
  const isNotExpired =
    !deadlineDate || deadlineDate >= new Date();

  if (data.active !== false && isNotExpired) {
    loadedJobs.push({
      id: docSnap.id,
      ...data,
    });
  }
});

        setJobs(loadedJobs);
        setLoadError(false);
        setLoadingJobs(false);
      },
      (error) => {
        console.log("JOBS LOAD ERROR:", error);
        if (!active) return;
        setLoadError(true);
        setLoadingJobs(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reloadKey]);

  /* =========================================
     APPLY
  ========================================= */

  const handleApply = async (url) => {
    if (!url) {
      Alert.alert(
        "Application unavailable",
        "The application link is not available."
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Error",
          "Unable to open this application link."
        );
      }
    } catch (error) {
      console.log("JOB APPLICATION ERROR:", error);

      Alert.alert(
        "Error",
        "Unable to open the application page."
      );
    }
  };

  /* =========================================
     USER PLAN
  ========================================= */

  if (!user) {
    return null;
  }

  const plan = getUserPlan(user);

  // Admin access depends ONLY on users/{uid}.isAdmin === true — never on
  // Premium membership. Admins bypass the premium lock so they can always
  // reach the admin controls below.
  const isAdmin = isAdminUser(user);

  /* =========================================
     FREE USER (non-admin students only)
  ========================================= */

  if (!isAdmin && plan !== "premium") {
    return (
      <View style={styles.container}>
        <View style={styles.lockCard}>
          <Text style={styles.lockIcon}>
            🔒
          </Text>

          <Text style={styles.lockTitle}>
            Jobs & Careers
          </Text>

          <Text style={styles.lockSubtitle}>
            Find graduate jobs, internships and
            career opportunities from employers
            around the world.
          </Text>

          <View style={styles.featureList}>
            <Text style={styles.feature}>
              ✓ Graduate jobs
            </Text>

            <Text style={styles.feature}>
              ✓ Internships
            </Text>

            <Text style={styles.feature}>
              ✓ Entry-level opportunities
            </Text>

            <Text style={styles.feature}>
              ✓ Remote jobs
            </Text>

            <Text style={styles.feature}>
              ✓ Apply directly to employers
            </Text>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() =>
              navigation.navigate("Premium")
            }
          >
            <Text style={styles.upgradeText}>
              ✨ Upgrade to Premium
            </Text>
          </TouchableOpacity>

          <Text style={styles.noExtraFee}>
            Jobs & Careers is included with your
            Premium membership.
          </Text>
        </View>
      </View>
    );
  }

  /* =========================================
     CATEGORIES
  ========================================= */

  const categories = [
    "All",
    "IT",
    "Business",
    "Health",
    "Engineering",
    "Education",
    "Design",
    "Marketing",
    "Law",
    "Internships",
    "Remote",
  ];

  /* =========================================
     FILTER JOBS
  ========================================= */

  const filteredJobs = jobs.filter((job) => {
    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      job.title?.toLowerCase().includes(searchText) ||
      job.company?.toLowerCase().includes(searchText) ||
      job.category?.toLowerCase().includes(searchText) ||
      job.country?.toLowerCase().includes(searchText) ||
      job.location?.toLowerCase().includes(searchText) ||
      job.type?.toLowerCase().includes(searchText);

    let matchesCategory = true;

    if (selectedCategory !== "All") {
      if (selectedCategory === "Remote") {
  matchesCategory =
    job.workMode?.toLowerCase() === "remote" ||
    job.location?.toLowerCase().includes("remote");
      } else {
        matchesCategory =
          job.category?.toLowerCase() ===
          selectedCategory.toLowerCase();
      }
    }

    return matchesSearch && matchesCategory;
  });

  /* =========================================
     JOB CARD
  ========================================= */

  const renderJob = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("JobDetail", {
            jobId: item.id,
          })
        }
      >

        <View style={styles.jobHeader}>
          <View style={{ flex: 1 }}>

            <Text style={styles.jobTitle}>
              {item.title || "Job Opportunity"}
            </Text>

            <Text style={styles.company}>
              {item.company || "Employer"}
            </Text>

          </View>

          {item.type && (
            <Text style={styles.jobType}>
              {item.type.toUpperCase()}
            </Text>
          )}

        </View>

        {(item.location || item.country) && (
          <Text style={styles.location}>
            📍 {item.location || "Location not specified"}
            {item.country
              ? `, ${item.country}`
              : ""}
          </Text>
        )}

        {item.deadline && (
  <Text style={styles.deadline}>
    ⏰ Apply by:{" "}
    {getDeadlineDate(item.deadline)
      ? getDeadlineDate(item.deadline).toLocaleDateString()
      : item.deadline}
  </Text>
)}

{item.source && (
  <Text style={styles.source}>
    🔗 Source: {item.source}
  </Text>
)}

        {item.description && (
          <Text style={styles.jobDescription}>
            {item.description}
          </Text>
        )}

        <View style={styles.tagsRow}>

          {item.category && (
            <Text style={styles.tag}>
              💼 {item.category}
            </Text>
          )}

          {item.type && (
            <Text style={styles.tag}>
              🎓 {item.type}
            </Text>
          )}

        </View>

        <TouchableOpacity
  style={styles.applyButton}
  onPress={() =>
    handleApply(item.applyUrl)
  }
>
          <Text style={styles.applyButtonText}>
            View Job & Apply →
          </Text>
        </TouchableOpacity>

      </TouchableOpacity>
    );
  };

  /* =========================================
     MAIN
  ========================================= */

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.headerRow}>

        <View style={{ flex: 1 }}>

          <Text style={styles.title}>
            💼 Jobs & Careers
          </Text>

          <Text style={styles.subtitle}>
            Find your next opportunity 🌍
          </Text>

        </View>


      </View>

      {/* DISCLAIMER */}

      <Text style={styles.disclaimer}>
        Job opportunities vary and availability is not guaranteed. Always verify the employer and job details before applying.
      </Text>

      {/* SEARCH */}

      <TextInput
        style={styles.searchInput}
        placeholder="🔎 Search jobs, companies, skills..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
      />

      {/* CATEGORIES */}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        style={styles.categoryList}
        contentContainerStyle={{
          paddingRight: 10,
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              setSelectedCategory(item)
            }
            style={[
              styles.categoryButton,
              selectedCategory === item &&
                styles.categoryButtonActive,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item &&
                  styles.categoryTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isAdmin && (
  <TouchableOpacity
    style={{
      backgroundColor: "#22C55E",
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    }}
    onPress={() => navigation.navigate("PostJob")}
  >
    <Text
      style={{
        color: "#FFFFFF",
        textAlign: "center",
        fontWeight: "800",
      }}
    >
      + Post Job Vacancy
    </Text>
  </TouchableOpacity>
)}

{isAdmin && (
  <TouchableOpacity
    style={{
      backgroundColor: "#0EA5E9",
      padding: 14,
      borderRadius: 12,
      marginBottom: 15,
    }}
    onPress={() => navigation.navigate("AdminJobs")}
  >
    <Text
      style={{
        color: "#FFFFFF",
        textAlign: "center",
        fontWeight: "800",
      }}
    >
      🗂️ Manage Jobs
    </Text>
  </TouchableOpacity>
)}

      <View style={styles.jobsIntro}>
        <Text style={styles.jobsIntroTitle}>
          🌍 Opportunities for Students
        </Text>

        <Text style={styles.jobsIntroText}>
          Discover graduate jobs, internships and
          remote opportunities from employers
          around the world.
        </Text>
      </View>

      {/* JOBS */}

      {loadingJobs ? (

        <View style={styles.loadingJobs}>
          <ActivityIndicator
            size="large"
            color="#4F46E5"
          />

          <Text style={styles.loadingText}>
            Finding opportunities...
          </Text>
        </View>

      ) : (

        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            loadError ? (
              <EmptyState
                emoji="😕"
                title="Couldn't load jobs"
                text="Something went wrong. Please try again."
                actionLabel="Try Again"
                onAction={() =>
                  setReloadKey((key) => key + 1)
                }
              />
            ) : search.trim() ||
              selectedCategory !== "All" ? (
              <EmptyState
                emoji="💼"
                title="No opportunities match your search"
                text="Try another search or category to see more opportunities."
                actionLabel="Reset Filters"
                onAction={() => {
                  setSearch("");
                  setSelectedCategory("All");
                }}
              />
            ) : (
              <EmptyState
                emoji="💼"
                title="Opportunities are coming"
                text="No opportunities match your current search yet. Check back later."
              />
            )
          }
        />

      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 18,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 5,
    fontSize: 13,
  },

  addButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    marginLeft: 10,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  searchInput: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF",
    marginBottom: 12,
  },

  disclaimer: {
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },

  categoryList: {
    marginBottom: 16,
  },

  categoryButton: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginRight: 8,
  },

  categoryButtonActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },

  categoryText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700",
  },

  categoryTextActive: {
    color: "#FFFFFF",
  },

  jobsIntro: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  jobsIntroTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  jobsIntroText: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },

  jobCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  jobHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  jobTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  company: {
    color: "#818CF8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },

  jobType: {
    color: "#22C55E",
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 10,
  },

  location: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 14,
  },

  jobDescription: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },

  tag: {
    color: "#D1D5DB",
    backgroundColor: "#1F2937",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    marginRight: 7,
    marginBottom: 5,
    fontSize: 10,
  },

  applyButton: {
    backgroundColor: "#4F46E5",
    padding: 13,
    borderRadius: 11,
    marginTop: 15,
    alignItems: "center",
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  loadingJobs: {
    alignItems: "center",
    marginTop: 30,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },

  lockCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 24,
    marginTop: 60,
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
  },

  lockIcon: {
    fontSize: 50,
    marginBottom: 15,
  },

  lockTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
  },

  lockSubtitle: {
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
  },

  featureList: {
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
  },

  feature: {
    color: "#FFFFFF",
    marginBottom: 10,
    fontSize: 15,
  },

  upgradeButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    width: "100%",
  },

  upgradeText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },

  noExtraFee: {
    color: "#6B7280",
    textAlign: "center",
    fontSize: 12,
    marginTop: 14,
  },

  emptyCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    marginTop: 10,
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "center",
  },

  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },

  deadline: {
  color: "#FBBF24",
  fontSize: 12,
  marginTop: 8,
  fontWeight: "700",
},

source: {
  color: "#6B7280",
  fontSize: 11,
  marginTop: 6,
},
});