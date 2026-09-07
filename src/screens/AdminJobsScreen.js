import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

import useUser from "../hooks/useUser";
import { isAdminUser } from "../utils/access";

export default function AdminJobsScreen({
  navigation,
}) {
  const user = useUser();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicationCounts, setApplicationCounts] =
    useState({});

  /* ------------------------------------------------
     LOAD ALL JOBS (including unpublished)
  ------------------------------------------------ */

  useEffect(() => {
    const jobsQuery = query(
      collection(db, "jobs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const loadedJobs = [];

        snapshot.forEach((docSnap) => {
          loadedJobs.push({
            id: docSnap.id,
            ...docSnap.data(),
          });
        });

        setJobs(loadedJobs);
        setLoading(false);
      },
      (snapshotError) => {
        console.log(
          "Admin jobs load error:",
          snapshotError
        );

        setError(
          "Unable to load jobs. Please try again."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* ------------------------------------------------
     APPLICATION COUNTS (one-time per load)
  ------------------------------------------------ */

  useEffect(() => {
    if (jobs.length === 0) return;

    let cancelled = false;

    (async () => {
      const counts = {};

      await Promise.all(
        jobs.map(async (job) => {
          try {
            const snapshot = await getDocs(
              collection(
                db,
                "jobs",
                job.id,
                "applications"
              )
            );

            if (!cancelled) {
              counts[job.id] = snapshot.size;
            }
          } catch (error) {
            console.log(
              "Application count error:",
              error
            );
          }
        })
      );

      if (!cancelled) {
        setApplicationCounts(counts);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobs]);

  /* ------------------------------------------------
     GATE: ADMIN ONLY
  ------------------------------------------------ */

  if (!user) return null;

  if (!isAdminUser(user)) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedEmoji}>
          🔐
        </Text>

        <Text style={styles.lockedTitle}>
          Admin only
        </Text>

        <Text style={styles.lockedText}>
          You need an admin account to manage
          job vacancies.
        </Text>
      </View>
    );
  }

  const togglePublish = async (job) => {
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        active: job.active !== false ? false : true,
      });
    } catch (error) {
      console.log("Toggle publish error:", error);

      Alert.alert(
        "Error",
        "Unable to update the job."
      );
    }
  };

  const confirmDelete = (job) => {
    Alert.alert(
      "Delete Job",
      `Are you sure you want to delete "${job.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, "jobs", job.id)
              );
            } catch (error) {
              console.log(
                "Delete job error:",
                error
              );

              Alert.alert(
                "Error",
                "Unable to delete the job."
              );
            }
          },
        },
      ]
    );
  };

  const renderJob = ({ item }) => {
    const isPublished = item.active !== false;

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle}>
              {item.title || "Untitled job"}
            </Text>

            <Text style={styles.company}>
              {item.company || "Employer"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isPublished
                ? styles.publishedBadge
                : styles.unpublishedBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {isPublished
                ? "Published"
                : "Unpublished"}
            </Text>
          </View>
        </View>

        <Text style={styles.applicants}>
          📋 {applicationCounts[item.id] || 0}{" "}
          applicant
          {(applicationCounts[item.id] || 0) === 1
            ? ""
            : "s"}
        </Text>

        {/* ACTIONS */}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() =>
              navigation.navigate("JobDetail", {
                jobId: item.id,
              })
            }
          >
            <Text style={styles.actionText}>
              View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.publishButton,
            ]}
            onPress={() => togglePublish(item)}
          >
            <Text style={styles.actionText}>
              {isPublished
                ? "Unpublish"
                : "Publish"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.editButton,
            ]}
            onPress={() =>
              navigation.navigate("PostJob", {
                job: item,
              })
            }
          >
            <Text style={styles.actionText}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteButton,
            ]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={styles.actionText}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.applicationsButton}
          onPress={() =>
            navigation.navigate("JobApplications", {
              jobId: item.id,
              jobTitle: item.title,
            })
          }
        >
          <Text style={styles.applicationsText}>
            👥 View Applications →
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!loading && error) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedEmoji}>
          ⚠️
        </Text>

        <Text style={styles.lockedTitle}>
          Something went wrong
        </Text>

        <Text style={styles.lockedText}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.newJobButton}
        onPress={() => navigation.navigate("PostJob")}
      >
        <Text style={styles.newJobText}>
          + New Job
        </Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#4F46E5"
          />

          <Text style={styles.loadingText}>
            Loading jobs...
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View style={styles.locked}>
              <Text style={styles.lockedEmoji}>
                💼
              </Text>

              <Text style={styles.lockedTitle}>
                No jobs yet
              </Text>

              <Text style={styles.lockedText}>
                Tap "+ New Job" to publish the
                first vacancy.
              </Text>
            </View>
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },

  newJobButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 18,
  },

  newJobText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  jobCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  jobHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  jobTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  company: {
    color: "#818CF8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginLeft: 10,
  },

  publishedBadge: {
    backgroundColor: "#052E16",
  },

  unpublishedBadge: {
    backgroundColor: "#1F2937",
  },

  statusText: {
    color: "#A7F3D0",
    fontSize: 10,
    fontWeight: "800",
  },

  applicants: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 12,
  },

  actionsRow: {
    flexDirection: "row",
    marginTop: 15,
    gap: 8,
  },

  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },

  viewButton: {
    backgroundColor: "#1F2937",
  },

  publishButton: {
    backgroundColor: "#4F46E5",
  },

  editButton: {
    backgroundColor: "#0EA5E9",
  },

  deleteButton: {
    backgroundColor: "#B91C1C",
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  applicationsButton: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  applicationsText: {
    color: "#A5B4FC",
    fontSize: 12,
    fontWeight: "800",
  },

  locked: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  lockedEmoji: {
    fontSize: 50,
    marginBottom: 12,
  },

  lockedTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  lockedText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});