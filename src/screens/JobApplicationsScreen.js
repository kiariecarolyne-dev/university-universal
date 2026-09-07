import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../services/firebase";

import useUser from "../hooks/useUser";
import { isAdminUser } from "../utils/access";
import useResolvedNames from "../hooks/useResolvedNames";

function getDateLabel(value) {
  if (!value) return "";

  if (value.toDate) {
    return value.toDate().toLocaleDateString();
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch (error) {
    return "";
  }
}

export default function JobApplicationsScreen({
  route,
}) {
  const { jobId, jobTitle } = route.params;

  const user = useUser();

  const [applications, setApplications] = useState(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ------------------------------------------------
     LOAD APPLICATIONS
  ------------------------------------------------ */

  useEffect(() => {
    if (!jobId) return;

    const applicationsQuery = query(
      collection(db, "jobs", jobId, "applications"),
      orderBy("appliedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      applicationsQuery,
      (snapshot) => {
        const loaded = [];

        snapshot.forEach((docSnap) => {
          loaded.push({
            id: docSnap.id,
            ...docSnap.data(),
          });
        });

        setApplications(loaded);
        setLoading(false);
      },
      (snapshotError) => {
        console.log(
          "Applications load error:",
          snapshotError
        );

        setError(
          "Unable to load applications."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  const resolvedNames = useResolvedNames(
    applications
  );

  /* ------------------------------------------------
     GATE: ADMIN ONLY
  ------------------------------------------------ */

  if (!user) return null;

  if (!isAdminUser(user)) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>
          🔐
        </Text>

        <Text style={styles.emptyTitle}>
          Admin only
        </Text>

        <Text style={styles.emptyText}>
          You need an admin account to view
          applications.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />

        <Text style={styles.loadingText}>
          Loading applications...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>
          ⚠️
        </Text>

        <Text style={styles.emptyTitle}>
          Something went wrong
        </Text>

        <Text style={styles.emptyText}>
          {error}
        </Text>
      </View>
    );
  }

  const renderApplication = ({ item }) => {
    const displayName =
      resolvedNames[item.userId] ||
      item.name ||
      "Student";

    return (
      <View style={styles.applicationCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {displayName}
          </Text>

          {item.email ? (
            <Text style={styles.email}>
              {item.email}
            </Text>
          ) : null}

          <Text style={styles.date}>
            {item.appliedAt
              ? `📅 Applied: ${getDateLabel(
                  item.appliedAt
                )}`
              : "Application date unavailable"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {jobTitle || "Applications"}
      </Text>

      <Text style={styles.subheader}>
        {applications.length}{" "}
        {applications.length === 1
          ? "application"
          : "applications"}
      </Text>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>
              📭
            </Text>

            <Text style={styles.emptyTitle}>
              No applications yet
            </Text>

            <Text style={styles.emptyText}>
              Students who apply will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },

  header: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
  },

  subheader: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
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
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  applicationCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  email: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 3,
  },

  date: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 5,
  },
});