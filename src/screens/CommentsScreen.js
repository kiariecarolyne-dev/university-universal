import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";

const MAX_COMMENT_LENGTH = 300;

export default function CommentsScreen({ route }) {
  const { postId } = route.params;

  const user = useUser();

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  /* =========================================
     REAL-TIME COMMENTS
  ========================================= */

  useEffect(() => {
    if (!postId) return;

    const commentsQuery = query(
      collection(
        db,
        "posts",
        postId,
        "comments"
      ),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const loadedComments =
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));

        setComments(loadedComments);
        setLoading(false);
      },
      (error) => {
        console.log(
          "Comments listener error:",
          error
        );

        setLoading(false);

        Alert.alert(
          "Unable to load comments",
          "Please check your internet connection and try again."
        );
      }
    );

    return () => unsubscribe();
  }, [postId]);

  /* =========================================
     ADD COMMENT
  ========================================= */

  const addComment = async () => {
    const text = commentText.trim();

    if (!text) {
      Alert.alert(
        "Write something",
        "Your comment cannot be empty."
      );

      return;
    }

    if (text.length > MAX_COMMENT_LENGTH) {
      Alert.alert(
        "Comment too long",
        `Your comment can contain up to ${MAX_COMMENT_LENGTH} characters.`
      );

      return;
    }

    if (!auth.currentUser || !user) {
      Alert.alert(
        "Login required",
        "Please log in before commenting."
      );

      return;
    }

    try {
      setPosting(true);

      await addDoc(
        collection(
          db,
          "posts",
          postId,
          "comments"
        ),
        {
          userId: auth.currentUser.uid,

          fullName:
            user.fullName ||
            "University Student",

          country:
            user.country ||
            "Unknown",

          photo:
            user.photo ||
            "",

          text,

          createdAt: serverTimestamp(),
        }
      );

      setCommentText("");
    } catch (error) {
      console.log(
        "Add comment error:",
        error
      );

      Alert.alert(
        "Comment failed",
        "We couldn't publish your comment. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  /* =========================================
     DELETE COMMENT
  ========================================= */

  const deleteComment = (comment) => {
    if (!auth.currentUser) return;

    if (
      comment.userId !==
      auth.currentUser.uid
    ) {
      return;
    }

    Alert.alert(
      "Delete comment?",
      "This comment will be permanently removed.",
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
                  "posts",
                  postId,
                  "comments",
                  comment.id
                )
              );
            } catch (error) {
              console.log(
                "Delete comment error:",
                error
              );

              Alert.alert(
                "Delete failed",
                "We couldn't delete this comment."
              );
            }
          },
        },
      ]
    );
  };

  /* =========================================
     TIME
  ========================================= */

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    const now = new Date();

    const difference = Math.floor(
      (now.getTime() - date.getTime()) /
        1000
    );

    if (difference < 60) {
      return "Just now";
    }

    if (difference < 3600) {
      return `${Math.floor(
        difference / 60
      )}m`;
    }

    if (difference < 86400) {
      return `${Math.floor(
        difference / 3600
      )}h`;
    }

    if (difference < 604800) {
      return `${Math.floor(
        difference / 86400
      )}d`;
    }

    return date.toLocaleDateString();
  };

  /* =========================================
     COMMENT ITEM
  ========================================= */

  const renderComment = ({ item }) => {
    const isOwnComment =
      auth.currentUser &&
      item.userId ===
        auth.currentUser.uid;

    return (
      <View style={styles.commentCard}>
        {/* AVATAR */}

        {item.photo ? (
          <Image
            source={{ uri: item.photo }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarText}>
              {item.fullName
                ?.charAt(0)
                ?.toUpperCase() || "S"}
            </Text>
          </View>
        )}

        {/* CONTENT */}

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.fullName ||
                  "University Student"}
              </Text>

              <Text style={styles.meta}>
                {item.country ||
                  "Worldwide"}{" "}
                • {formatTime(item.createdAt)}
              </Text>
            </View>

            {isOwnComment && (
              <TouchableOpacity
                onPress={() =>
                  deleteComment(item)
                }
                style={styles.moreButton}
              >
                <Text style={styles.moreText}>
                  ⋮
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.commentText}>
            {item.text}
          </Text>
        </View>
      </View>
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

        <Text style={styles.loadingText}>
          Loading comments...
        </Text>
      </View>
    );
  }

  /* =========================================
     SCREEN
  ========================================= */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,

          comments.length === 0 &&
            styles.emptyContent,
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>
              💬 Comments
            </Text>

            <Text style={styles.subtitle}>
              Join the conversation.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>
              💬
            </Text>

            <Text style={styles.emptyTitle}>
              No comments yet
            </Text>

            <Text style={styles.emptyText}>
              Be the first student to start
              the conversation.
            </Text>
          </View>
        }
      />

      {/* =====================================
          COMMENT INPUT
      ===================================== */}

      <View style={styles.inputContainer}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write a comment..."
          placeholderTextColor="#6B7280"
          multiline
          maxLength={MAX_COMMENT_LENGTH}
          style={styles.input}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,

            (!commentText.trim() ||
              posting) &&
              styles.sendButtonDisabled,
          ]}
          onPress={addComment}
          disabled={
            !commentText.trim() ||
            posting
          }
        >
          {posting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.sendText}>
              ➤
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* =================================================
   STYLES
================================================= */

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
    paddingBottom: 20,
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

  /* COMMENT */

  commentCard: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 11,
  },

  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  commentContent: {
    flex: 1,
  },

  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  meta: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
  },

  moreButton: {
    paddingHorizontal: 5,
  },

  moreText: {
    color: "#9CA3AF",
    fontSize: 21,
  },

  commentText: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
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
    fontSize: 38,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  /* INPUT */

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#0B0F17",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },

  input: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#FFFFFF",
    fontSize: 13,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
};