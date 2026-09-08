import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";

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
    const parsed = new Date(deadline);

    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

export default function JobDetailScreen({
  route,
}) {
  const { jobId } = route.params;

  const user = useUser();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [recording, setRecording] = useState(false);

  /* ------------------------------------------------
     LOAD JOB
  ------------------------------------------------ */

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(
      doc(db, "jobs", jobId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setError(
            "This job is no longer available."
          );
          setLoading(false);
          return;
        }

        setJob({
          id: snapshot.id,
          ...snapshot.data(),
        });

        setLoading(false);
      },
      (snapshotError) => {
        console.log(
          "Job detail error:",
          snapshotError
        );

        setError(
          "Unable to load this job. Please try again."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  /* ------------------------------------------------
     ALREADY APPLIED?
  ------------------------------------------------ */

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!jobId || !uid) return;

    let cancelled = false;

    getDoc(
      doc(db, "jobs", jobId, "applications", uid)
    )
      .then((snapshot) => {
        if (!cancelled) {
          setHasApplied(snapshot.exists());
        }
      })
      .catch((snapshotError) => {
        console.log(
          "Applied check error:",
          snapshotError
        );
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const openExternal = async (url) => {
    try {
      const supported = await Linking.canOpenURL(
        url
      );

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Error",
          "Unable to open this link."
        );
      }
    } catch (error) {
      console.log("Open link error:", error);

      Alert.alert(
        "Error",
        "Unable to open this link."
      );
    }
  };

  const applyExternal = () => {
    if (job.applyUrl) {
      openExternal(job.applyUrl);
    } else {
      Alert.alert(
        "No application link",
        "This job does not have an application link."
      );
    }
  };

  const applyByEmail = () => {
    if (!job.applicationEmail) return;

    const subject = encodeURIComponent(
      `Application: ${job.title}`
    );

    openExternal(
      `mailto:${job.applicationEmail}?subject=${subject}`
    );
  };

  const recordApplication = async () => {
    const uid = auth.currentUser?.uid;

    if (!uid || !jobId) return;

    try {
      setRecording(true);

      await setDoc(
        doc(
          db,
          "jobs",
          jobId,
          "applications",
          uid
        ),
        {
          userId: uid,
          name: user?.fullName || "Student",
          email: user?.email || "",
          status: "applied",
          appliedAt: serverTimestamp(),
        }
      );

      setHasApplied(true);

      Alert.alert(
        "Application Recorded",
        "Your application has been recorded. Staff can now see it."
      );
    } catch (error) {
      console.log(
        "Record application error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to record your application."
      );
    } finally {
      setRecording(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />

        <Text style={styles.loadingText}>
          Loading job...
        </Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>
          ⚠️
        </Text>

        <Text style={styles.emptyTitle}>
          Job unavailable
        </Text>

        <Text style={styles.emptyText}>
          {error ||
            "This job could not be found."}
        </Text>
      </View>
    );
  }

  const deadlineDate = getDeadlineDate(job.deadline);

  const daysLeft = deadlineDate
    ? Math.max(
        0,
        Math.ceil(
          (deadlineDate - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        {job.title || "Job Opportunity"}
      </Text>

      <Text style={styles.company}>
        {job.company || "Employer"}
      </Text>

      {job.location && (
        <Text style={styles.row}>
          📍 {job.location}
        </Text>
      )}

      <View style={styles.tagsRow}>
        {job.category && (
          <Text style={styles.tag}>
            💼 {job.category}
          </Text>
        )}

        {job.type && (
          <Text style={styles.tag}>
            🎓 {job.type}
          </Text>
        )}

        {job.workMode && (
          <Text style={styles.tag}>
            🏢 {job.workMode}
          </Text>
        )}

        {job.salary && (
          <Text style={styles.tag}>
            💰 {job.salary}
          </Text>
        )}
      </View>

      {deadlineDate && (
        <View style={styles.deadlineCard}>
          <Text style={styles.deadlineTitle}>
            ⏰ Apply by:{" "}
            {deadlineDate.toLocaleDateString()}
          </Text>

          <Text style={styles.deadlineText}>
            {daysLeft > 0
              ? `${daysLeft} day${
                  daysLeft === 1 ? "" : "s"
                } left to apply`
              : "Deadline has passed"}
          </Text>
        </View>
      )}

      {job.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            📄 Job Description
          </Text>

          <Text style={styles.cardText}>
            {job.description}
          </Text>
        </View>
      )}

      {job.applicationInstructions && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            📝 How to Apply
          </Text>

          <Text style={styles.cardText}>
            {job.applicationInstructions}
          </Text>
        </View>
      )}

      {job.source && (
        <Text style={styles.source}>
          🔗 Source: {job.source}
        </Text>
      )}

      {/* DISCLAIMER */}

      <Text style={styles.source}>
        Job opportunities vary and availability is not guaranteed. Always verify the employer and job details before applying.
      </Text>

      {/* APPLY BUTTONS */}

      {job.applyUrl && (
        <TouchableOpacity
          style={styles.applyButton}
          onPress={applyExternal}
        >
          <Text style={styles.applyText}>
            🚀 Apply on Company Website
          </Text>
        </TouchableOpacity>
      )}

      {job.applicationEmail && (
        <TouchableOpacity
          style={styles.emailButton}
          onPress={applyByEmail}
        >
          <Text style={styles.emailText}>
            ✉️ Apply via Email
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.recordButton,
          hasApplied && styles.recordedButton,
        ]}
        onPress={recordApplication}
        disabled={hasApplied || recording}
      >
        {recording ? (
          <ActivityIndicator color="#4F46E5" />
        ) : (
          <Text style={styles.recordText}>
            {hasApplied
              ? "✅ Application recorded"
              : "📋 I've applied — record it"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  content: {
    padding: 16,
    paddingBottom: 50,
  },

  center: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },

  emptyEmoji: {
    fontSize: 50,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12,
  },

  company: {
    color: "#818CF8",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
  },

  row: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 8,
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
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 7,
    marginBottom: 5,
    fontSize: 11,
  },

  deadlineCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  deadlineTitle: {
    color: "#FBBF24",
    fontSize: 13,
    fontWeight: "800",
  },

  deadlineText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },

  cardText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 21,
  },

  source: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 12,
  },

  applyButton: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 25,
  },

  applyText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  emailButton: {
    backgroundColor: "#1F2937",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  emailText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  recordButton: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#4F46E5",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  recordedButton: {
    borderColor: "#22C55E",
  },

  recordText: {
    color: "#A5B4FC",
    fontWeight: "800",
    fontSize: 13,
  },
});