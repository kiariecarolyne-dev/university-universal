import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

const formatTime = (timestamp) => {
  if (!timestamp) {
    return "Just now";
  }

  let date;

  try {
    date =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);
  } catch {
    return "Just now";
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const now = new Date();

  const difference = Math.floor(
    (now.getTime() - date.getTime()) / 1000
  );

  if (difference < 60) {
    return "Just now";
  }

  if (difference < 3600) {
    return `${Math.floor(difference / 60)}m`;
  }

  if (difference < 86400) {
    return `${Math.floor(difference / 3600)}h`;
  }

  if (difference < 604800) {
    return `${Math.floor(difference / 86400)}d`;
  }

  return date.toLocaleDateString();
};

export default function NotificationsScreen({
  navigation,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================================
     REAL-TIME NOTIFICATIONS
  ========================================= */

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(
        db,
        "users",
        currentUser.uid,
        "notifications"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const loadedNotifications =
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));

        setNotifications(loadedNotifications);
        setLoading(false);
      },
      (error) => {
        console.log(
          "Notifications listener error:",
          error
        );

        setLoading(false);

        Alert.alert(
          "Unable to load notifications",
          "Please check your internet connection and try again."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================
     OPEN NOTIFICATION
  ========================================= */

  const openNotification = async (notification) => {
    try {
      /* =====================================
         MARK AS READ
      ===================================== */

      if (!notification.read) {
        await updateDoc(
          doc(
            db,
            "users",
            auth.currentUser.uid,
            "notifications",
            notification.id
          ),
          {
            read: true,
          }
        );
      }

      /* =====================================
   COMMENT / LIKE
===================================== */

if (
  (notification.type === "comment" ||
    notification.type === "like") &&
  notification.postId
) {
  navigation.navigate("MainTabs", {
    screen: "SocialTab",
    params: {
      targetPostId: notification.postId,
      openComments:
        notification.type === "comment",
    },
  });

  return;
}

      /* =====================================
         MATCH
      ===================================== */

      if (notification.type === "match") {
        navigation.navigate("YourMatches");

        return;
      }

      /* =====================================
         FALLBACK
      ===================================== */

      Alert.alert(
        "Notification",
        notification.message ||
          "This notification cannot be opened."
      );
    } catch (error) {
      console.log(
        "Open notification error:",
        error
      );
    }
  };

  /* =========================================
     DELETE NOTIFICATION
  ========================================= */

  const deleteNotification = (
    notification
  ) => {
    Alert.alert(
      "Delete notification?",
      "This notification will be removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            try {
              await deleteDoc(
                doc(
                  db,
                  "users",
                  auth.currentUser.uid,
                  "notifications",
                  notification.id
                )
              );
            } catch (error) {
              console.log(
                "Delete notification error:",
                error
              );

              Alert.alert(
                "Delete failed",
                "We couldn't delete this notification."
              );
            }
          },
        },
      ]
    );
  };

  /* =========================================
     NOTIFICATION ITEM
  ========================================= */

  const renderNotification = ({
    item,
  }) => {
    const isUnread = item.read !== true;

    const icon =
      item.type === "like"
        ? "❤️"
        : item.type === "comment"
        ? "💬"
        : item.type === "match"
        ? "💝"
        : "🔔";

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread &&
            styles.unreadNotification,
        ]}
        onPress={() =>
          openNotification(item)
        }
        activeOpacity={0.75}
      >
        {/* AVATAR */}

        {item.fromUserPhoto ? (
          <Image
            source={{
              uri: item.fromUserPhoto,
            }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={
              styles.avatarPlaceholder
            }
          >
            <Text
              style={styles.avatarText}
            >
              {item.fromUserName
                ?.charAt(0)
                ?.toUpperCase() || "S"}
            </Text>
          </View>
        )}

        {/* CONTENT */}

        <View
          style={styles.notificationContent}
        >
          <View
            style={styles.notificationTop}
          >
            <Text style={styles.icon}>
              {icon}
            </Text>

            <Text
              style={styles.notificationTitle}
            >
              {item.title ||
                "New notification"}
            </Text>

            {isUnread && (
              <View
                style={styles.unreadDot}
              />
            )}
          </View>

          <Text
            style={styles.notificationMessage}
          >
            {item.message ||
              "You have a new notification."}
          </Text>

          <Text
            style={styles.notificationTime}
          >
            {formatTime(
              item.createdAt
            )}
          </Text>
        </View>

        {/* DELETE */}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            deleteNotification(item)
          }
          activeOpacity={0.7}
        >
          <Text
            style={styles.deleteText}
          >
            ✕
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />

        <Text
          style={styles.loadingText}
        >
          Loading notifications...
        </Text>
      </View>
    );
  }

  /* =========================================
     SCREEN
  ========================================= */

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={
          renderNotification
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 &&
            styles.emptyContent,
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>
              🔔 Notifications
            </Text>

            <Text style={styles.subtitle}>
              Stay updated with your
              student community.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyEmoji}
            >
              🔔
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No notifications yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              When students like or comment
              on your posts, you'll see it
              here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

/* =========================================
   STYLES
========================================= */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 10,
    fontSize: 13,
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  emptyContent: {
    flexGrow: 1,
  },

  /* HEADER */

  header: {
    marginTop: 18,
    marginBottom: 20,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
  },

  /* NOTIFICATION */

  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  unreadNotification: {
    borderColor: "#4F46E5",
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    marginRight: 11,
  },

  avatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  notificationContent: {
    flex: 1,
  },

  notificationTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    fontSize: 17,
    marginRight: 6,
  },

  notificationTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },

  notificationMessage: {
    color: "#D1D5DB",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  notificationTime: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 5,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
    marginLeft: 6,
  },

  deleteButton: {
    padding: 6,
    marginLeft: 5,
  },

  deleteText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "800",
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  emptyEmoji: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },
};