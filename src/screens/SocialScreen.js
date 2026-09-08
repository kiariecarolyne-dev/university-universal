import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { fetch } from "expo/fetch";
import { useEffect, useRef, useState } from "react";

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

import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";
import { createNotification } from "../utils/notifications";

const MAX_POST_LENGTH = 500;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION = 5 * 60 * 1000;

const EMOJI_QUICK = ["😊", "🔥", "🎉", "🤩", "😂"];

const BACKEND_URL =
  "https://university-universal-backend.onrender.com";

/* =========================================================
   VIDEO PLAYER COMPONENT

   IMPORTANT:
   expo-video uses useVideoPlayer + VideoView.
   We keep this in its own component so the hook is used
   correctly and never conditionally.
========================================================= */

function PostVideo({ uri }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.postVideo}
      nativeControls
      contentFit="contain"
    />
  );
}

/* =========================================================
   SOCIAL SCREEN
========================================================= */

export default function SocialScreen({ navigation, route }) {
  const user = useUser();

  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
const handledNotificationRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* =========================================================
     UPLOAD POST MEDIA
  ========================================================= */

  const uploadPostMedia = async (media) => {
    if (!media?.uri) {
      throw new Error("No media selected.");
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("You must be logged in.");
    }

    /* ==============================
       VIDEO SIZE CHECK
    ============================== */

    if (
      media.type === "video" &&
      media.fileSize &&
      media.fileSize > MAX_VIDEO_SIZE
    ) {
      const sizeMB = (
        media.fileSize /
        (1024 * 1024)
      ).toFixed(1);

      throw new Error(
        `This video is ${sizeMB} MB. Please choose a video smaller than 100 MB.`
      );
    }

    const fileName =
      media.fileName ||
      `post-${Date.now()}.${
        media.type === "video" ? "mp4" : "jpg"
      }`;

    const mimeType =
      media.mimeType ||
      (media.type === "video"
        ? "video/mp4"
        : "image/jpeg");

    try {
      console.log("=================================");
      console.log("UPLOADING SOCIAL MEDIA");
      console.log("URI:", media.uri);
      console.log("FILE:", fileName);
      console.log("TYPE:", media.type);
      console.log("MIME:", mimeType);
      console.log("=================================");

      /* ==============================
         CREATE EXPO FILE
      ============================== */

      const file = new File(media.uri);

      console.log("FILE EXISTS:", file.exists);
      console.log("FILE SIZE:", file.size);

      /* ==============================
         FORM DATA
      ============================== */

      const formData = new FormData();

      formData.append("media", file);
      formData.append(
        "userId",
        currentUser.uid
      );
      formData.append(
        "mediaType",
        media.type
      );

      console.log(
        "SENDING MEDIA TO BACKEND..."
      );

      const response = await fetch(
        `${BACKEND_URL}/upload-social-media`,
        {
          method: "POST",
          body: formData,
        }
      );

      const responseText =
        await response.text();

      console.log(
        "SOCIAL MEDIA RESPONSE:",
        responseText
      );

      let data;

      try {
        data = JSON.parse(
          responseText
        );
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Media upload failed."
        );
      }

      console.log(
        "MEDIA UPLOAD SUCCESS:",
        data.mediaUrl
      );

      return {
        uri: data.mediaUrl,
        type:
          data.mediaType ||
          media.type,
        fileName:
          data.fileName ||
          fileName,
        mimeType:
          data.mimeType ||
          mimeType,
      };
    } catch (error) {
      console.log(
        "SOCIAL MEDIA UPLOAD ERROR:",
        error
      );

      throw error;
    }
  };

  /* =========================================================
     LISTEN TO POSTS
  ========================================================= */

  useEffect(() => {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe =
      onSnapshot(
        postsQuery,
        (snapshot) => {
          const loadedPosts =
            snapshot.docs.map(
              (docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
              })
            );

          setPosts(loadedPosts);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.log(
            "Posts listener error:",
            error
          );

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

  /* =========================================================
   OPEN POST FROM NOTIFICATION
========================================================= */

useEffect(() => {
  const targetPostId =
    route?.params?.targetPostId;

  if (!targetPostId || posts.length === 0) {
    return;
  }

  /* Prevent handling the same notification repeatedly */
  if (
    handledNotificationRef.current ===
    targetPostId
  ) {
    return;
  }

  const postIndex = posts.findIndex(
    (post) => post.id === targetPostId
  );

  if (postIndex === -1) {
    Alert.alert(
      "Post unavailable",
      "This post may have been deleted."
    );

    handledNotificationRef.current =
      targetPostId;

    navigation.setParams({
      targetPostId: undefined,
      openComments: undefined,
    });

    return;
  }

  handledNotificationRef.current =
    targetPostId;

  /* ==============================
     SCROLL TO THE POST
  ============================== */

  setTimeout(() => {
    flatListRef.current?.scrollToIndex({
      index: postIndex,
      animated: true,
      viewPosition: 0.2,
    });

    /* ==============================
       OPEN COMMENTS IF NEEDED
    ============================== */

    if (route?.params?.openComments) {
      setTimeout(() => {
        navigation.navigate("Comments", {
          postId: targetPostId,
        });
      }, 500);
    }

    /* ==============================
       CLEAR NAVIGATION PARAMETERS
    ============================== */

    navigation.setParams({
      targetPostId: undefined,
      openComments: undefined,
    });
  }, 300);
}, [
  posts,
  route?.params?.targetPostId,
  route?.params?.openComments,
  navigation,
]);

  /* =========================================================
     PICK PHOTO OR VIDEO
  ========================================================= */

  const pickPostMedia = async (
    type
  ) => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo and video access so you can share media."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              type === "image"
                ? ["images"]
                : ["videos"],

            allowsEditing: false,

            quality: 0.8,

            videoMaxDuration: 300,
          }
        );

      if (result.canceled) {
        return;
      }

      const asset =
        result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert(
          "Media error",
          "We couldn't read the selected media."
        );
        return;
      }

      /* ==============================
         VIDEO LIMITS
      ============================== */

      if (type === "video") {
        if (
          asset.duration &&
          asset.duration >
            MAX_VIDEO_DURATION
        ) {
          Alert.alert(
            "Video too long",
            "Please choose a video that is 5 minutes or shorter."
          );
          return;
        }

        if (
          asset.fileSize &&
          asset.fileSize >
            MAX_VIDEO_SIZE
        ) {
          const sizeMB = (
            asset.fileSize /
            (1024 * 1024)
          ).toFixed(1);

          Alert.alert(
            "Video too large",
            `This video is ${sizeMB} MB.\n\nPlease choose a video smaller than 100 MB.`
          );

          return;
        }
      }

      /* ==============================
         SAVE SELECTED MEDIA
      ============================== */

      setSelectedMedia({
        uri: asset.uri,

        type,

        mimeType:
          asset.mimeType ||
          null,

        fileName:
          asset.fileName ||
          null,

        fileSize:
          asset.fileSize ||
          null,

        width:
          asset.width ||
          null,

        height:
          asset.height ||
          null,

        duration:
          asset.duration ||
          null,
      });
    } catch (error) {
      console.log(
        "Pick media error:",
        error
      );

      Alert.alert(
        "Media error",
        "We couldn't select that file. Please try again."
      );
    }
  };

  /* =========================================================
     CREATE POST
  ========================================================= */

  const createPost = async () => {
    const text =
      postText.trim();

    if (
      !text &&
      !selectedMedia
    ) {
      Alert.alert(
        "Create a post",
        "Write something or select a photo/video to share."
      );

      return;
    }

    if (
      text.length >
      MAX_POST_LENGTH
    ) {
      Alert.alert(
        "Post too long",
        `Your post can contain up to ${MAX_POST_LENGTH} characters.`
      );

      return;
    }

    if (
      !auth.currentUser ||
      !user
    ) {
      Alert.alert(
        "Login required",
        "Please log in before creating a post."
      );

      return;
    }

    try {
      setPosting(true);

      const currentUser =
        auth.currentUser;

      let uploadedMedia =
        null;

      /* ==============================
         UPLOAD MEDIA
      ============================== */

      if (selectedMedia) {
        uploadedMedia =
          await uploadPostMedia(
            selectedMedia
          );
      }

      /* ==============================
         SAVE POST
      ============================== */

      await addDoc(
        collection(db, "posts"),
        {
          userId:
            currentUser.uid,

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

          media:
            uploadedMedia
              ? {
                  uri:
                    uploadedMedia.uri,

                  type:
                    uploadedMedia.type,

                  mimeType:
                    uploadedMedia.mimeType ||
                    null,

                  fileName:
                    uploadedMedia.fileName ||
                    null,
                }
              : null,

          likes: [],

          createdAt:
            serverTimestamp(),
        }
      );

      setPostText("");
      setSelectedMedia(null);

      Alert.alert(
        "Posted!",
        "Your post has been shared with the student community."
      );
    } catch (error) {
      console.log(
        "Create post error:",
        error
      );

      Alert.alert(
        "Post failed",
        error.message ||
          "We couldn't publish the post. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  /* =========================================================
     LIKE / UNLIKE
  ========================================================= */

const toggleLike = async (post) => {
  if (!auth.currentUser) {
    Alert.alert(
      "Login required",
      "Please log in to like posts."
    );

    return;
  }

  const currentUserId = auth.currentUser.uid;

  const likes = Array.isArray(post.likes)
    ? post.likes
    : [];

  const alreadyLiked = likes.includes(
    currentUserId
  );

  try {
    const postRef = doc(
      db,
      "posts",
      post.id
    );

    if (alreadyLiked) {
      await updateDoc(postRef, {
        likes: arrayRemove(currentUserId),
      });

      return;
    }

    /* =====================================
       ADD LIKE
    ===================================== */

    await updateDoc(postRef, {
      likes: arrayUnion(currentUserId),
    });

    /* =====================================
       DON'T NOTIFY YOURSELF
    ===================================== */

    if (post.userId === currentUserId) {
      return;
    }

    /* =====================================
       CREATE NOTIFICATION
    ===================================== */

    const actorName =
      user?.fullName ||
      "University Student";

    await createNotification({
  recipientId: post.userId,

  type: "like",

  title: "❤️ New like",

  message: `${actorName} liked your post.`,

  fromUserId: currentUserId,

  fromUserName: actorName,

  fromUserPhoto:
    user?.photo || "",

  postId: post.id,
});
  } catch (error) {
    console.log(
      "Like error:",
      error
    );

    Alert.alert(
      "Something went wrong",
      "We couldn't update your reaction."
    );
  }
};

  /* =========================================================
     DELETE POST
  ========================================================= */

  const deletePost = (
    post
  ) => {
    if (
      !auth.currentUser
    ) {
      return;
    }

    if (
      post.userId !==
      auth.currentUser.uid
    ) {
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

          onPress:
            async () => {
              try {
                await deleteDoc(
                  doc(
                    db,
                    "posts",
                    post.id
                  )
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

    /* =========================================================
     SHARE POST
  ========================================================= */

  const sharePost = async (post) => {
    try {
      if (!post?.media?.uri) {
        Alert.alert(
          "Nothing to share",
          "This post does not contain a photo or video."
        );
        return;
      }

      const available =
        await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          "Sharing unavailable",
          "Sharing is not available on this device."
        );
        return;
      }

      const remoteUrl =
        post.media.uri;

      console.log(
        "SHARE REMOTE URL:",
        remoteUrl
      );

      /* ==============================
         CREATE LOCAL FILE
      ============================== */

      const extension =
        post.media.type === "video"
          ? "mp4"
          : "jpg";

      const fileName =
        `UniversityUniversal-${Date.now()}.${extension}`;

      const localFile =
        new File(
          Paths.cache,
          fileName
        );

      /* ==============================
         DOWNLOAD MEDIA
      ============================== */

      console.log(
        "DOWNLOADING MEDIA FOR SHARING..."
      );

      const downloadResponse =
        await fetch(remoteUrl);

      if (!downloadResponse.ok) {
        throw new Error(
          "Unable to download the media."
        );
      }

      const bytes =
        await downloadResponse.bytes();

      localFile.write(bytes);

      console.log(
        "MEDIA SAVED LOCALLY:",
        localFile.uri
      );

      /* ==============================
         SHARE LOCAL FILE
      ============================== */

      await Sharing.shareAsync(
        localFile.uri,
        {
          dialogTitle:
            "Share this student post",

          mimeType:
            post.media.type === "video"
              ? "video/mp4"
              : "image/jpeg",
        }
      );

      console.log(
        "MEDIA SHARE SUCCESS"
      );
    } catch (error) {
      console.log(
        "Share post error:",
        error
      );

      Alert.alert(
        "Share failed",
        "We couldn't share this post. Please try again."
      );
    }
  };

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh =
    () => {
      setRefreshing(true);

      setTimeout(() => {
        setRefreshing(false);
      }, 800);
    };

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  const formatTime = (
    timestamp
  ) => {
    if (!timestamp) {
      return "Just now";
    }

    let date;

    try {
      if (
        typeof timestamp.toDate ===
        "function"
      ) {
        date =
          timestamp.toDate();
      } else {
        date =
          new Date(timestamp);
      }
    } catch {
      return "Just now";
    }

    if (
      !date ||
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Just now";
    }

    const now =
      new Date();

    const difference =
      Math.floor(
        (now.getTime() -
          date.getTime()) /
          1000
      );

    if (difference < 0) {
      return "Just now";
    }

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

  /* =========================================================
     POST CARD
  ========================================================= */

  const renderPost = ({
    item,
  }) => {
    const likes =
      Array.isArray(
        item.likes
      )
        ? item.likes
        : [];

    const likedByCurrentUser =
      !!auth.currentUser &&
      likes.includes(
        auth.currentUser.uid
      );

    const isOwnPost =
      !!auth.currentUser &&
      item.userId ===
        auth.currentUser.uid;

    const media =
      item.media;

    return (
      <View
        style={
          styles.postCard
        }
      >
        {/* ============================
            HEADER
        ============================ */}

        <View
          style={
            styles.postHeader
          }
        >
          {item.photo ? (
            <Image
              source={{
                uri: item.photo,
              }}
              style={
                styles.avatar
              }
            />
          ) : (
            <View
              style={
                styles.avatarPlaceholder
              }
            >
              <Text
                style={
                  styles.avatarText
                }
              >
                {item.fullName
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "S"}
              </Text>
            </View>
          )}

          <View
            style={
              styles.authorInfo
            }
          >
            <Text
              style={
                styles.authorName
              }
              numberOfLines={1}
            >
              {item.fullName ||
                "University Student"}
            </Text>

            <Text
              style={
                styles.authorMeta
              }
            >
              {item.country ||
                "Worldwide"}{" "}
              •{" "}
              {formatTime(
                item.createdAt
              )}
            </Text>
          </View>

          {isOwnPost && (
            <TouchableOpacity
              onPress={() =>
                deletePost(
                  item
                )
              }
              style={
                styles.moreButton
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.moreText
                }
              >
                ⋮
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ============================
            TEXT
        ============================ */}

        {item.text ? (
          <Text
            style={
              styles.postText
            }
          >
            {item.text}
          </Text>
        ) : null}

        {/* ============================
            MEDIA
        ============================ */}

        {media?.uri ? (
          <View
            style={
              styles.postMedia
            }
          >
            {media.type ===
            "image" ? (
              <Image
                source={{
                  uri: media.uri,
                }}
                style={
                  styles.postMediaImage
                }
                resizeMode="cover"
              />
            ) : (
              <PostVideo
                uri={media.uri}
              />
            )}
          </View>
        ) : null}

        {/* ============================
            ACTIONS
        ============================ */}

        <View
          style={
            styles.actions
          }
        >
          {/* LIKE */}

          <TouchableOpacity
            style={[
              styles.actionButton,
              likedByCurrentUser &&
                styles.actionButtonActive,
            ]}
            onPress={() =>
              toggleLike(
                item
              )
            }
            activeOpacity={0.7}
          >
            <Text
              style={
                styles.actionEmoji
              }
            >
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

          {/* COMMENT */}

          <TouchableOpacity
            style={
              styles.actionButton
            }
            onPress={() => {
              navigation.navigate(
                "Comments",
                {
                  postId:
                    item.id,
                },
              );
            }}
            activeOpacity={0.7}
          >
            <Text
              style={
                styles.actionEmoji
              }
            >
              💬
            </Text>

            <Text
              style={
                styles.actionText
              }
            >
              Comment
            </Text>
          </TouchableOpacity>

          {/* SHARE */}

          <TouchableOpacity
            style={
              styles.actionButton
            }
            onPress={() => sharePost(item)}
            activeOpacity={0.7}
          >
            <Text
              style={
                styles.actionEmoji
              }
            >
              ↗️
            </Text>

            <Text
              style={
                styles.actionText
              }
            >
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.loadingEmoji
          }
        >
          🌍
        </Text>

        <ActivityIndicator
          size="small"
          color="#4F46E5"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Finding your community...
        </Text>
      </View>
    );
  }

  /* =========================================================
     SCREEN
  ========================================================= */

  return (
    <KeyboardAvoidingView
      style={
        styles.container
      }
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <FlatList
  ref={flatListRef}
  data={posts}
  keyExtractor={(item) =>
    item.id
  }
        renderItem={
          renderPost
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
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
            {/* ==========================
                HEADER
            ========================== */}

            <View
              style={
                styles.header
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Student Community
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Connect, share, and
                learn with students
                worldwide.
              </Text>
            </View>

            {/* ==========================
                CREATE POST
            ========================== */}

            <View
              style={
                styles.createCard
              }
            >
              <View
                style={
                  styles.createHeader
                }
              >
                {user?.photo ? (
                  <Image
                    source={{
                      uri: user.photo,
                    }}
                    style={
                      styles.smallAvatar
                    }
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
                        ?.toUpperCase() ||
                        "S"}
                    </Text>
                  </View>
                )}

                <View>
                  <Text
                    style={
                      styles.createPrompt
                    }
                  >
                    What's on your
                    mind?
                  </Text>

                  <Text
                    style={
                      styles.createSubtext
                    }
                  >
                    Share with students
                    worldwide
                  </Text>
                </View>
              </View>

              {/* INPUT */}

              <TextInput
                ref={inputRef}
                value={
                  postText
                }
                onChangeText={
                  setPostText
                }
                placeholder="Write something to share..."
                placeholderTextColor="#6B7280"
                multiline
                maxLength={
                  MAX_POST_LENGTH
                }
                style={
                  styles.input
                }
                textAlignVertical="top"
              />

              {/* EMOJI QUICK ACTIONS */}

              <View
                style={
                  styles.emojiRow
                }
              >
                {EMOJI_QUICK.map(
                  (emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={
                        styles.emojiChip
                      }
                      onPress={() =>
                        setPostText(
                          (prev) =>
                            prev +
                            emoji
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={
                          styles.emojiChipText
                        }
                      >
                        {emoji}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* MEDIA PREVIEW */}

              {selectedMedia && (
                <View
                  style={
                    styles.mediaPreview
                  }
                >
                  {selectedMedia.type ===
                  "image" ? (
                    <Image
                      source={{
                        uri:
                          selectedMedia.uri,
                      }}
                      style={
                        styles.previewImage
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={
                        styles.videoPreview
                      }
                    >
                      <Text
                        style={
                          styles.videoPreviewEmoji
                        }
                      >
                        🎥
                      </Text>

                      <Text
                        style={
                          styles.videoPreviewText
                        }
                      >
                        Video selected
                      </Text>

                      <Text
                        style={
                          styles.videoPreviewSubtext
                        }
                      >
                        Ready to post
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={
                      styles.removeMediaButton
                    }
                    onPress={() =>
                      setSelectedMedia(
                        null
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        styles.removeMediaText
                      }
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* CREATE ACTIONS */}

              <View
                style={
                  styles.createBottom
                }
              >
                <View
                  style={
                    styles.mediaButtons
                  }
                >
                  {/* PHOTO */}

                  <TouchableOpacity
                    style={
                      styles.mediaButton
                    }
                    onPress={() =>
                      pickPostMedia(
                        "image"
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={
                        styles.mediaButtonEmoji
                      }
                    >
                      📷
                    </Text>

                    <Text
                      style={
                        styles.mediaButtonText
                      }
                    >
                      Photo
                    </Text>
                  </TouchableOpacity>

                  {/* VIDEO */}

                  <TouchableOpacity
                    style={
                      styles.mediaButton
                    }
                    onPress={() =>
                      pickPostMedia(
                        "video"
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={
                        styles.mediaButtonEmoji
                      }
                    >
                      🎥
                    </Text>

                    <Text
                      style={
                        styles.mediaButtonText
                      }
                    >
                      Video
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.postActionsRight
                  }
                >
                  <Text
                    style={
                      styles.characterCount
                    }
                  >
                    {postText.length}/
                    {MAX_POST_LENGTH}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.postButton,
                      (!postText.trim() &&
                        !selectedMedia) ||
                      posting
                        ? styles.postButtonDisabled
                        : null,
                    ]}
                    onPress={
                      createPost
                    }
                    disabled={
                      (!postText.trim() &&
                        !selectedMedia) ||
                      posting
                    }
                    activeOpacity={0.8}
                  >
                    {posting ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.postButtonText
                        }
                      >
                        Post
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ==========================
                FEED HEADER
            ========================== */}

            <View
              style={
                styles.feedHeader
              }
            >
              <View
                style={
                  styles.feedHeaderLeft
                }
              >
                <Text
                  style={
                    styles.feedTitle
                  }
                >
                  Community Feed
                </Text>

                <Text
                  style={
                    styles.feedSubtitle
                  }
                >
                  What students are
                  sharing right now
                </Text>
              </View>

              <View
                style={
                  styles.feedCountPill
                }
              >
                <Text
                  style={
                    styles.feedCount
                  }
                >
                  {posts.length}
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyEmoji
              }
            >
              💬
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              Start the conversation
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Share something with the student
              community and be the first to
              start a discussion.
            </Text>

            <TouchableOpacity
              style={
                styles.emptyButton
              }
              onPress={() =>
                inputRef.current?.focus()
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                ✍️ Create a Post
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          posts.length > 0 ? (
            <View
              style={
                styles.footer
              }
            >
              <Text
                style={
                  styles.footerText
                }
              >
                🌍 You're connected to
                students worldwide.
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  listContent: {
    padding: 16,
    paddingTop: 12,
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

  loadingEmoji: {
    fontSize: 30,
    marginBottom: 14,
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 13,
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

  /* CREATE CARD */

  createCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  createHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
  },

  smallAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  createSubtext: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 2,
  },

  input: {
    backgroundColor: "#111827",
    borderRadius: 12,
    minHeight: 86,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 21,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  /* EMOJI QUICK */

  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  emojiChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  emojiChipText: {
    fontSize: 17,
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
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
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

  /* MEDIA BUTTONS */

  mediaButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  mediaButtonEmoji: {
    fontSize: 16,
    marginRight: 5,
  },

  mediaButtonText: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
  },

  postActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  /* MEDIA PREVIEW */

  mediaPreview: {
    position: "relative",
    marginTop: 12,
    marginBottom: 5,
    borderRadius: 14,
    overflow: "hidden",
  },

  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 14,
  },

  videoPreview: {
    height: 150,
    backgroundColor: "#111827",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  videoPreviewEmoji: {
    fontSize: 34,
  },

  videoPreviewText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 7,
  },

  videoPreviewSubtext: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
  },

  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  removeMediaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* FEED HEADER */

  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 12,
  },

  feedHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },

  feedTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  feedSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 3,
  },

  feedCountPill: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  feedCount: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* POST */

  postCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 11,
    borderWidth: 2,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
  },

  avatarPlaceholder: {
    width: 44,
    height: 44,
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
    padding: 6,
  },

  moreText: {
    color: "#9CA3AF",
    fontSize: 20,
  },

  postText: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 13,
  },

  /* POST MEDIA */

  postMedia: {
    marginTop: 13,
    borderRadius: 16,
    overflow: "hidden",
  },

  postMediaImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
  },

  postVideo: {
    width: "100%",
    height: 220,
    backgroundColor: "#000000",
  },

  /* ACTIONS */

  actions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    marginTop: 13,
    paddingTop: 11,
    gap: 6,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  actionButtonActive: {
    backgroundColor: "#31141F",
    borderWidth: 1,
    borderColor: "#7F1D1D",
  },

  actionEmoji: {
    fontSize: 16,
    marginRight: 5,
  },

  actionText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },

  likedText: {
    color: "#F87171",
    fontWeight: "800",
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    marginTop: 4,
  },

  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },

  emptyButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 16,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* FOOTER */

  footer: {
    alignItems: "center",
    paddingVertical: 22,
  },

  footerText: {
    color: "#6B7280",
    fontSize: 12,
  },
};