import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";

const MAX_POST_LENGTH = 500;

export default function SocialScreen({ navigation }) {
  const user = useUser();

  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* =========================================
     LISTEN TO POSTS IN REAL TIME
  ========================================= */

  useEffect(() => {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const loadedPosts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setPosts(loadedPosts);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.log("Posts listener error:", error);
        setLoading(false);
        setRefreshing(false);

        Alert.alert(
          "Unable to load posts",
          "Please check your internet connection and try again."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================
     CREATE POST
  ========================================= */

  const createPost = async () => {
    const text = postText.trim();

    if (!text) {
      Alert.alert(
        "Write something",
        "Your post cannot be empty."
      );
      return;
    }

    if (text.length > MAX_POST_LENGTH) {
      Alert.alert(
        "Post too long",
        `Your post can contain up to ${MAX_POST_LENGTH} characters.`
      );
      return;
    }

    if (!auth.currentUser || !user) {
      Alert.alert(
        "Login required",
        "Please log in before creating a post."
      );
      return;
    }

    try {
      setPosting(true);

      await addDoc(collection(db, "posts"), {
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

        likes: [],

        createdAt: serverTimestamp(),
      });

      setPostText("");
    } catch (error) {
      console.log("Create post error:", error);

      Alert.alert(
        "Post failed",
        "We couldn't publish your post. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  /* =========================================
     LIKE / UNLIKE
  ========================================= */

  const toggleLike = async (post) => {
    if (!auth.currentUser) return;

    const currentUserId = auth.currentUser.uid;

    const likes = Array.isArray(post.likes)
      ? post.likes
      : [];

    const alreadyLiked = likes.includes(currentUserId);

    try {
      const postRef = doc(db, "posts", post.id);

      if (alreadyLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUserId),
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUserId),
        });
      }
    } catch (error) {
      console.log("Like error:", error);

      Alert.alert(
        "Something went wrong",
        "We couldn't update your reaction."
      );
    }
  };

  /* =========================================
     DELETE POST
  ========================================= */

  const deletePost = (post) => {
    if (!auth.currentUser) return;

    if (post.userId !== auth.currentUser.uid) {
      return;
    }

    Alert.alert(
      "Delete post?",
      "This post will be permanently removed.",
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
                doc(db, "posts", post.id)
              );
            } catch (error) {
              console.log(
                "Delete post error:",
                error
              );

              Alert.alert(
                "Delete failed",
                "We couldn't delete the post."
              );
            }
          },
        },
      ]
    );
  };

  /* =========================================
     REFRESH
  ========================================= */

  const handleRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  /* =========================================
     TIME FORMAT
  ========================================= */

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    const now = new Date();

    const difference =
      Math.floor(
        (now.getTime() - date.getTime()) / 1000
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
     POST CARD
  ========================================= */

  const renderPost = ({ item }) => {
    const likes = Array.isArray(item.likes)
      ? item.likes
      : [];

    const likedByCurrentUser =
      auth.currentUser &&
      likes.includes(auth.currentUser.uid);

    const isOwnPost =
      auth.currentUser &&
      item.userId === auth.currentUser.uid;

    return (
      <View style={styles.postCard}>
        {/* HEADER */}

        <View style={styles.postHeader}>
          {item.photo ? (
            <Image
              source={{ uri: item.photo }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.fullName
                  ?.charAt(0)
                  ?.toUpperCase() || "S"}
              </Text>
            </View>
          )}

          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {item.fullName ||
                "University Student"}
            </Text>

            <Text style={styles.authorMeta}>
              {item.country || "Worldwide"} •{" "}
              {formatTime(item.createdAt)}
            </Text>
          </View>

          {isOwnPost && (
            <TouchableOpacity
              onPress={() => deletePost(item)}
              style={styles.moreButton}
            >
              <Text style={styles.moreText}>
                ⋮
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* POST TEXT */}

        <Text style={styles.postText}>
          {item.text}
        </Text>

        {/* ACTIONS */}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(item)}
          >
            <Text style={styles.actionEmoji}>
              {likedByCurrentUser
                ? "❤️"
                : "🤍"}
            </Text>

            <Text
              style={[
                styles.actionText,
                likedByCurrentUser &&
                  styles.likedText,
              ]}
            >
              {likes.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
  style={styles.actionButton}
  onPress={() =>
    navigation.navigate("Comments", {
      postId: item.id,
    })
  }
>
            <Text style={styles.actionEmoji}>
              💬
            </Text>

            <Text style={styles.actionText}>
              Comment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Sharing posts will be available soon."
              )
            }
          >
            <Text style={styles.actionEmoji}>
              ↗️
            </Text>

            <Text style={styles.actionText}>
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />

        <Text style={styles.loadingText}>
          Loading student community...
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
    >
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 &&
            styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <>
            {/* HEADER */}

            <View style={styles.header}>
              <Text style={styles.title}>
                💬 Social
              </Text>

              <Text style={styles.subtitle}>
                Connect with students around the
                world.
              </Text>
            </View>

            {/* CREATE POST */}

            <View style={styles.createCard}>
              <View style={styles.createHeader}>
                {user?.photo ? (
                  <Image
                    source={{
                      uri: user.photo,
                    }}
                    style={styles.smallAvatar}
                  />
                ) : (
                  <View
                    style={
                      styles.smallAvatarPlaceholder
                    }
                  >
                    <Text
                      style={
                        styles.smallAvatarText
                      }
                    >
                      {user?.fullName
                        ?.charAt(0)
                        ?.toUpperCase() || "S"}
                    </Text>
                  </View>
                )}

                <Text style={styles.createPrompt}>
                  What's happening?
                </Text>
              </View>

              <TextInput
                value={postText}
                onChangeText={setPostText}
                placeholder="Share something with students worldwide..."
                placeholderTextColor="#6B7280"
                multiline
                maxLength={MAX_POST_LENGTH}
                style={styles.input}
                textAlignVertical="top"
              />

              <View style={styles.createBottom}>
                <Text style={styles.characterCount}>
                  {postText.length}/{MAX_POST_LENGTH}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.postButton,
                    (!postText.trim() ||
                      posting) &&
                      styles.postButtonDisabled,
                  ]}
                  onPress={createPost}
                  disabled={
                    !postText.trim() || posting
                  }
                >
                  {posting ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={styles.postButtonText}
                    >
                      Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* FEED TITLE */}

            <View style={styles.feedHeader}>
              <Text style={styles.feedTitle}>
                🌍 Student Community
              </Text>

              <Text style={styles.feedSubtitle}>
                What's happening around the world
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>
              🌍
            </Text>

            <Text style={styles.emptyTitle}>
              Be the first to post!
            </Text>

            <Text style={styles.emptyText}>
              Start the conversation and let
              students around the world know
              what's on your mind.
            </Text>
          </View>
        }
        ListFooterComponent={
          posts.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerEmoji}>
                🌍
              </Text>

              <Text style={styles.footerText}>
                You're connected to students
                worldwide.
              </Text>
            </View>
          ) : null
        }
      />
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

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  emptyListContent: {
    flexGrow: 1,
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
    fontSize: 13,
  },

  /* HEADER */

  header: {
    marginTop: 28,
    marginBottom: 20,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 5,
  },

  /* CREATE POST */

  createCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  createHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  smallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },

  smallAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  smallAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  createPrompt: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#0F172A",
    borderRadius: 13,
    minHeight: 90,
    padding: 13,
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 21,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  createBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  characterCount: {
    color: "#6B7280",
    fontSize: 11,
  },

  postButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 23,
    paddingVertical: 10,
    borderRadius: 11,
    minWidth: 70,
    alignItems: "center",
  },

  postButtonDisabled: {
    opacity: 0.45,
  },

  postButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  /* FEED HEADER */

  feedHeader: {
    marginBottom: 12,
  },

  feedTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  feedSubtitle: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 3,
  },

  /* POST */

  postCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    marginRight: 11,
  },

  avatarPlaceholder: {
    width: 43,
    height: 43,
    borderRadius: 22,
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

  authorInfo: {
    flex: 1,
  },

  authorName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  authorMeta: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 3,
  },

  moreButton: {
    padding: 5,
  },

  moreText: {
    color: "#9CA3AF",
    fontSize: 22,
  },

  postText: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 15,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    marginTop: 15,
    paddingTop: 12,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },

  actionEmoji: {
    fontSize: 17,
    marginRight: 5,
  },

  actionText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },

  likedText: {
    color: "#F87171",
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    marginTop: 5,
  },

  emptyEmoji: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },

  /* FOOTER */

  footer: {
    alignItems: "center",
    paddingVertical: 25,
  },

  footerEmoji: {
    fontSize: 24,
  },

  footerText: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 6,
  },
};