import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { fetch } from "expo/fetch";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from "firebase/firestore";

import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";
import { createNotification } from "../utils/notifications";

const MAX_POST_LENGTH = 500;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 5 * 60;
const FEED_PAGE_SIZE = 20;

const COMMENT_PREVIEW_COUNT = 3;
const COMMENT_PREVIEW_ROTATE_MS = 3500;
const COMMENT_PREVIEW_BOTTOM = 162;

const EMOJI_QUICK = ["😊", "🔥", "🎉", "🤩", "😂"];

const FEED_TABS = [
  { key: "foryou", label: "For You" },
  { key: "latest", label: "Latest" },
];

const BACKEND_URL =
  "https://university-universal-backend.onrender.com";

const SCREEN_HEIGHT = Math.round(
  Dimensions.get("window").height
);
const SCREEN_WIDTH = Math.round(
  Dimensions.get("window").width
);

const FEED_ITEM_HEIGHT = SCREEN_HEIGHT;

const FEED_GRADIENT_HEIGHT = Math.round(
  FEED_ITEM_HEIGHT * 0.45
);

const INTERACTION_BAR_BOTTOM = 140;

function formatCount(count) {
  const value = Math.max(0, Number(count) || 0);

  if (value >= 1000000) {
    const millions = (value / 1000000).toFixed(1);
    return `${millions.replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    const thousands = (value / 1000).toFixed(1);
    return `${thousands.replace(/\.0$/, "")}K`;
  }

  return `${value}`;
}

function postFromDoc(docSnap) {
  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

const SAVED_MEDIA_DIR_NAME = "saved-media";

/* Detects the file extension of a post's media. The backend preserves the
   original fileName (most reliable), so that is checked first, then the
   download URL, and finally we fall back to the media type. */
const detectMediaExtension = (post) => {
  const candidates = [
    post?.media?.fileName,
    (post?.media?.uri || "").split("?")[0],
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const match = /\.([A-Za-z0-9]{2,5})$/.exec(candidate);

    if (match) {
      return match[1].toLowerCase();
    }
  }

  return post?.media?.type === "video" ? "mp4" : "jpg";
};

/* Best-effort MIME type for the native share sheet. Uses the stored
   mimeType when available, otherwise maps a known extension. */
const detectMimeType = (post, extension) => {
  if (post?.media?.mimeType) {
    return post.media.mimeType;
  }

  const mimeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
  };

  return (
    mimeMap[extension] ||
    (post?.media?.type === "video"
      ? "video/mp4"
      : "image/jpeg")
  );
};

const buildMediaFileName = (extension, purpose) => {
  const prefix =
    purpose === "save"
      ? "UniversityUniversal-Saved"
      : "UniversityUniversal";

  return `${prefix}-${Date.now()}.${extension}`;
};

/* =========================================================
   POST VIDEO — visibility-aware

   IMPORTANT:
   expo-video uses useVideoPlayer + VideoView.
   We keep this in its own component so the hook is used
   correctly and never conditionally.

   When isActive === true: play, loop, muted
   When isActive === false: pause
========================================================= */

const PostVideo = memo(
  function PostVideo({ uri, isActive, isMuted }) {
    const playerRef = useRef(null);

    const player = useVideoPlayer(uri, (p) => {
      p.loop = true;
      p.muted = true;
      playerRef.current = p;
    });

    useEffect(() => {
      if (!playerRef.current) return;

      if (isActive) {
        try {
          playerRef.current.play();
        } catch (e) {
          console.log("Video play error:", e);
        }
      } else {
        try {
          playerRef.current.pause();
        } catch (e) {
          console.log("Video pause error:", e);
        }
      }
    }, [isActive]);

    useEffect(() => {
      if (playerRef.current) {
        try {
          playerRef.current.muted = isMuted;
        } catch (e) {
          console.log("Video mute error:", e);
        }
      }
    }, [isMuted]);

    useEffect(() => {
      return () => {
        if (playerRef.current) {
          try {
            playerRef.current.pause();
          } catch (_) {
            /* cleanup */
          }
        }
      };
    }, []);

    const { status } = useEvent(
      player,
      "statusChange",
      { status: player.status }
    );

    const isLoading =
      status === "loading" || status === "idle";

    const hasError = status === "error";

    return (
      <View style={styles.feedVideoWrap}>
        <VideoView
          player={player}
          style={styles.feedVideo}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
        />

        {isLoading && (
          <View
            style={styles.videoStatusOverlay}
            pointerEvents="none"
          >
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          </View>
        )}

        {hasError && (
          <View
            style={styles.videoStatusOverlay}
            pointerEvents="none"
          >
            <Text style={styles.videoStatusEmoji}>
              ⚠️
            </Text>
            <Text style={styles.videoStatusText}>
              Video unavailable
            </Text>
          </View>
        )}
      </View>
    );
  }
);

/* =========================================================
   INTERACTION BAR — right-side vertical column
========================================================= */

function InteractionBar({
  post,
  isLiked,
  onLike,
  onComment,
  onShare,
  onMore,
  isShareBusy,
  style,
}) {
  const likes = Array.isArray(post.likes)
    ? post.likes
    : [];

  return (
    <View
      style={[styles.interactionBar, style]}
    >
      {/* LIKE */}
      <TouchableOpacity
        style={styles.interactionButton}
        onPress={onLike}
        activeOpacity={0.7}
        accessibilityLabel={
          isLiked ? "Unlike post" : "Like post"
        }
      >
        <View
          style={[
            styles.interactionIconCircle,
            isLiked && styles.interactionIconLiked,
          ]}
        >
          <Text style={styles.interactionEmoji}>
            {isLiked ? "❤️" : "🤍"}
          </Text>
        </View>
        <Text
          style={[
            styles.interactionCount,
            isLiked && styles.interactionCountLiked,
          ]}
        >
          {formatCount(likes.length)}
        </Text>
      </TouchableOpacity>

      {/* COMMENT */}
      <TouchableOpacity
        style={styles.interactionButton}
        onPress={onComment}
        activeOpacity={0.7}
        accessibilityLabel="Open comments"
      >
        <View style={styles.interactionIconCircle}>
          <Text style={styles.interactionEmoji}>
            💬
          </Text>
        </View>
        <Text style={styles.interactionLabel}>
          Comment
        </Text>
      </TouchableOpacity>

      {/* SHARE */}
      <TouchableOpacity
        style={styles.interactionButton}
        onPress={onShare}
        disabled={isShareBusy}
        activeOpacity={0.7}
        accessibilityLabel="Share post"
      >
        <View style={styles.interactionIconCircle}>
          {isShareBusy ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.interactionEmoji}>
              ↗️
            </Text>
          )}
        </View>
        <Text style={styles.interactionLabel}>
          Share
        </Text>
      </TouchableOpacity>

      {/* MORE */}
      <TouchableOpacity
        style={styles.interactionButton}
        onPress={onMore}
        activeOpacity={0.7}
        accessibilityLabel="More options"
      >
        <View style={styles.interactionIconCircle}>
          <Text style={styles.interactionEmoji}>
            ⋯
          </Text>
        </View>
        <Text style={styles.interactionLabel}>
          More
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const InteractionBarMemo = memo(InteractionBar);

/* =========================================================
   FEED BOTTOM GRADIENT — layered dark fade for legibility
   (pure React Native views; no extra dependency required)
========================================================= */

const BOTTOM_GRADIENT_STOPS = 48;

function FeedBottomGradient() {
  // Strips must tile the gradient box at integer pixel heights. A `flex: 1`
  // layout on a fractional-height container leaves sub-pixel gaps between
  // translucent strips, which render as horizontal lines across the video.
  const baseHeight = Math.floor(
    FEED_GRADIENT_HEIGHT / BOTTOM_GRADIENT_STOPS
  );
  const overflowPixels =
    FEED_GRADIENT_HEIGHT -
    baseHeight * BOTTOM_GRADIENT_STOPS;

  return (
    <View
      style={styles.feedGradient}
      pointerEvents="none"
    >
      {Array.from(
        { length: BOTTOM_GRADIENT_STOPS },
        (_, i) => {
          const progress =
            i / (BOTTOM_GRADIENT_STOPS - 1);
          const alpha =
            0.05 + 0.9 * progress;

          return (
            <View
              key={i}
              style={{
                height:
                  baseHeight +
                  (i >
                  BOTTOM_GRADIENT_STOPS -
                    overflowPixels
                    ? 1
                    : 0),
                backgroundColor: `rgba(0, 0, 0, ${alpha.toFixed(3)})`,
              }}
            />
          );
        }
      )}
    </View>
  );
}

const FeedBottomGradientMemo = memo(FeedBottomGradient);

/* =========================================================
   COMMENT PREVIEW — rotating comment chip for video posts

   Reuses the existing posts/{postId}/comments structure (same
   fields the Comments screen writes: userId/fullName/country/
   photo/text/createdAt). Data is fetched with a one-shot getDocs
   only while the feed item is active, and rotation timers are
   cleaned up whenever the item becomes inactive or unmounts.
========================================================= */

function CommentPreview({
  postId,
  active,
  bottom,
  onOpenComments,
}) {
  const [comments, setComments] = useState([]);
  const [commentIndex, setCommentIndex] =
    useState(0);
  const [previewAnim] = useState(
    () => new Animated.Value(0)
  );
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!active || !postId) return;

    cancelledRef.current = false;
    let isMounted = true;

    getDocs(
      query(
        collection(db, "posts", postId, "comments"),
        orderBy("createdAt", "desc"),
        limit(COMMENT_PREVIEW_COUNT)
      )
    )
      .then((snapshot) => {
        if (!isMounted) return;

        const loaded = snapshot.docs
          .map(postFromDoc)
          .filter(
            (comment) =>
              comment.text &&
              comment.text.trim().length > 0
          );

        setComments(loaded);
        setCommentIndex(0);
        previewAnim.setValue(0);
        Animated.timing(previewAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      })
      .catch((error) => {
        console.log(
          "Comment preview error:",
          error
        );
      });

    return () => {
      isMounted = false;
      cancelledRef.current = true;
    };
  }, [active, postId, previewAnim]);

  useEffect(() => {
    if (!active || comments.length < 2) {
      return;
    }

    const interval = setInterval(() => {
      previewAnim.stopAnimation();

      Animated.timing(previewAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelledRef.current) {
          return;
        }

        setCommentIndex(
          (prev) => (prev + 1) % comments.length
        );

        Animated.timing(previewAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }).start();
      });
    }, COMMENT_PREVIEW_ROTATE_MS);

    return () => clearInterval(interval);
  }, [active, comments, previewAnim]);

  if (!active) {
    return null;
  }

  const currentComment = comments[commentIndex];

  if (!currentComment) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.commentPreview,
        { bottom },
        {
          opacity: previewAnim,
          transform: [
            {
              translateY: previewAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.commentPreviewCard}
        onPress={onOpenComments}
        activeOpacity={0.8}
        accessibilityLabel="See comments"
      >
        {currentComment.photo ? (
          <Image
            source={{ uri: currentComment.photo }}
            style={styles.commentPreviewAvatar}
          />
        ) : (
          <View
            style={
              styles.commentPreviewAvatarPlaceholder
            }
          >
            <Text
              style={styles.commentPreviewAvatarText}
            >
              {currentComment.fullName
                ?.charAt(0)
                ?.toUpperCase() || "S"}
            </Text>
          </View>
        )}

        <View style={styles.commentPreviewBody}>
          <Text
            style={styles.commentPreviewName}
            numberOfLines={1}
          >
            {currentComment.fullName ||
              "University Student"}
          </Text>
          <Text
            style={styles.commentPreviewText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {currentComment.text}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* =========================================================
   FEED ITEM — full-screen card for each post
========================================================= */

const FeedItem = memo(
  function FeedItem({
    item,
    isActive,
    onLike,
    onComment,
    onShare,
    onMore,
    onProfilePress,
    isLiked,
    isVideoMuted,
    onToggleMute,
    formatTime,
    isShareBusy,
  }) {
    const heartAnim = useRef(
      new Animated.Value(0)
    ).current;

    const insets = useSafeAreaInsets();

    const lastTapRef = useRef(0);

    const showHeart = useCallback(() => {
      heartAnim.setValue(0);
      Animated.sequence([
        Animated.spring(heartAnim, {
          toValue: 1,
          friction: 5,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnim, {
          toValue: 1.05,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnim, {
          toValue: 1,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.delay(340),
        Animated.timing(heartAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }, [heartAnim]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (
      now - lastTapRef.current <
      DOUBLE_TAP_DELAY
    ) {
      if (!isLiked) {
        onLike();
      }
      showHeart();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [isLiked, onLike, showHeart]);

  const media = item.media;
  const isVideo =
    media?.type === "video" && media?.uri;
  const isImage =
    media?.type === "image" && media?.uri;
  const isTextOnly = !media?.uri;

  return (
    <View
      style={[
        styles.feedItem,
        isTextOnly && styles.feedItemTextOnly,
      ]}
    >
      {/* ============================
          MEDIA BACKGROUND
      ============================ */}

      {isVideo && (
        <View style={styles.feedMediaContainer}>
          <PostVideo
            uri={media.uri}
            isActive={isActive}
            isMuted={isVideoMuted}
          />
        </View>
      )}

      {isImage && (
        <View style={styles.feedMediaContainer}>
          <Image
            source={{ uri: media.uri }}
            style={styles.feedImage}
            resizeMode="cover"
          />
        </View>
      )}

      {isTextOnly && (
        <View
          style={[
            styles.feedMediaContainer,
            styles.textPostBackground,
          ]}
        >
          <Text
            style={styles.textPostEmoji}
          >
            💬
          </Text>
        </View>
      )}

      {/* ============================
          BOTTOM GRADIENT OVERLAY
      ============================ */}

      <FeedBottomGradientMemo />

      {/* ============================
          DOUBLE-TAP HEART ANIMATION
      ============================ */}

      <View
        style={styles.doubleTapLayer}
        pointerEvents="none"
      >
        <Animated.View
          style={[
            styles.doubleTapSplash,
            {
              opacity: heartAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.45, 0],
              }),
              transform: [
                {
                  scale: heartAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1.9],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.doubleTapHeart,
            {
              opacity: heartAnim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [
                {
                  scale: heartAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1.1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.doubleTapHeartText}>
            ❤️
          </Text>
        </Animated.View>
      </View>

      {/* ============================
          TAP AREA (double-tap detection)
      ============================ */}

      <TouchableOpacity
        style={styles.feedTapArea}
        onPress={handleTap}
        activeOpacity={1}
      />

      {/* ============================
          RIGHT-SIDE INTERACTION BAR
      ============================ */}

      <InteractionBarMemo
        post={item}
        isLiked={isLiked}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onMore={onMore}
        isShareBusy={isShareBusy}
        style={{
          bottom: insets.bottom + INTERACTION_BAR_BOTTOM,
        }}
      />

      {/* ============================
          MUTE TOGGLE
      ============================ */}

      {isVideo && (
        <TouchableOpacity
          style={[
            styles.muteButton,
            {
              bottom: insets.bottom + 88,
            },
          ]}
          onPress={onToggleMute}
          activeOpacity={0.7}
          accessibilityLabel={
            isVideoMuted
              ? "Unmute video"
              : "Mute video"
          }
        >
          <Text style={styles.muteButtonText}>
            {isVideoMuted ? "🔇" : "🔊"}
          </Text>
        </TouchableOpacity>
      )}

      {/* ============================
          BOTTOM INFO OVERLAY
      ============================ */}

      <TouchableOpacity
        style={[
          styles.feedBottomInfo,
          {
            bottom: insets.bottom + 20,
          },
        ]}
        onPress={onProfilePress}
        activeOpacity={0.8}
      >
        {/* PROFILE ROW */}
        <View style={styles.feedProfileRow}>
          {item.photo ? (
            <Image
              source={{ uri: item.photo }}
              style={styles.feedAvatar}
            />
          ) : (
            <View style={styles.feedAvatarPlaceholder}>
              <Text style={styles.feedAvatarText}>
                {item.fullName
                  ?.charAt(0)
                  ?.toUpperCase() || "S"}
              </Text>
            </View>
          )}

          <View style={styles.feedAuthorInfo}>
            <Text
              style={styles.feedAuthorName}
              numberOfLines={1}
            >
              {item.fullName ||
                "University Student"}
            </Text>
          </View>
        </View>

        {/* CAPTION */}
        {item.text ? (
          <Text
            style={styles.feedCaption}
            numberOfLines={3}
          >
            {item.text}
          </Text>
        ) : null}

        {/* META */}
        <Text style={styles.feedMeta}>
          {item.country || "Worldwide"} •{" "}
          {formatTime(item.createdAt)}
        </Text>
      </TouchableOpacity>

      {/* ============================
          COMMENT PREVIEW (video posts only)
      ============================ */}

      {isVideo && (
        <CommentPreview
          postId={item.id}
          active={isActive}
          bottom={
            insets.bottom + COMMENT_PREVIEW_BOTTOM
          }
          onOpenComments={onComment}
        />
      )}
    </View>
  );
  }
);

/* =========================================================
   SOCIAL SCREEN
========================================================= */

export default function SocialScreen({
  navigation,
  route,
}) {
  const user = useUser();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [selectedMedia, setSelectedMedia] =
    useState(null);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const handledNotificationRef = useRef(null);

  // Pagination cursor: the last post of the newest loaded page. Kept in a
  // ref because it is only touched inside async handlers, never rendered.
  const lastVisibleRef = useRef(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const paginationGenerationRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] =
    useState(false);
  const [loadingMore, setLoadingMore] =
    useState(false);

  const [currentPostIndex, setCurrentPostIndex] =
    useState(0);

  const [feedTab, setFeedTab] = useState("foryou");
  const [createVisible, setCreateVisible] =
    useState(false);
  const [feedMuted, setFeedMuted] = useState(true);

  // Media download operations (Share / Save). Synchronous refs prevent
  // duplicate simultaneous downloads; the state drives the small
  // non-blocking busy indicator.
  const shareBusyRef = useRef(false);
  const saveBusyRef = useRef(false);
  const [busyMediaAction, setBusyMediaAction] =
    useState(null);

  /* =========================================================
     FEED ORDERING — For You / Latest
  ========================================================= */

  const feedPosts = useMemo(() => {
    if (feedTab === "latest") {
      return posts;
    }

    // "For You" has no recommendation backend, so we use a safe
    // deterministic fallback built only from existing post/user data:
    // posts from the current user's country rank first, then every other
    // post. Within each group the original newest-first order from
    // Firestore is preserved (index tie-breaker guarantees stability
    // regardless of the sort implementation).
    const myCountry = user?.country || null;

    if (!myCountry) {
      return posts;
    }

    return posts
      .map((post, index) => ({
        post,
        index,
        isHomeCountry:
          !!post.country &&
          post.country === myCountry,
      }))
      .sort((a, b) => {
        if (a.isHomeCountry !== b.isHomeCountry) {
          return a.isHomeCountry ? -1 : 1;
        }
        return a.index - b.index;
      })
      .map(({ post }) => post);
  }, [feedTab, posts, user]);

  const switchFeedTab = useCallback(
    (tabKey) => {
      setFeedTab(tabKey);
      setCurrentPostIndex(0);
      flatListRef.current?.scrollToOffset({
        offset: 0,
        animated: false,
      });
    },
    []
  );

  const openCreateModal = useCallback(() => {
    setCreateVisible(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 350);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateVisible(false);
  }, []);

  /* =========================================================
     VIEWABILITY CONFIG
  ========================================================= */

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 60,
  });

  const onViewableItemsChangedRef = useRef(
    (info) => {
      if (
        info.viewableItems &&
        info.viewableItems.length > 0
      ) {
        const first = info.viewableItems[0];
        if (
          first &&
          typeof first.index === "number"
        ) {
          setCurrentPostIndex(first.index);
        }
      }
    }
  );

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

    if (
      media.type === "video" &&
      media.fileSize &&
      media.fileSize > MAX_VIDEO_SIZE
    ) {
      const sizeMB = (
        media.fileSize / (1024 * 1024)
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

      const file = new File(media.uri);

      console.log("FILE EXISTS:", file.exists);
      console.log("FILE SIZE:", file.size);

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
        data = JSON.parse(responseText);
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
          data.error || "Media upload failed."
        );
      }

      console.log(
        "MEDIA UPLOAD SUCCESS:",
        data.mediaUrl
      );

      return {
        uri: data.mediaUrl,
        type:
          data.mediaType || media.type,
        fileName:
          data.fileName || fileName,
        mimeType:
          data.mimeType || mimeType,
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
    // Single real-time listener limited to the newest page only. The
    // snapshot callback folds that page into the feed (new posts appear
    // live, updates to the top posts are applied) while older pages that
    // were already loaded through pagination are preserved. The full
    // historical posts collection is never downloaded.
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(FEED_PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const snapshotPosts =
          snapshot.docs.map(postFromDoc);

        if (snapshotPosts.length > 0) {
          lastVisibleRef.current =
            snapshot.docs[snapshot.docs.length - 1];
        }

        hasMoreRef.current =
          snapshot.docs.length === FEED_PAGE_SIZE;

        setPosts((prevPosts) => {
          // Until the user has paginated past the first page the snapshot
          // is the authoritative feed (deletions are reflected).
          if (
            prevPosts.length <=
            snapshotPosts.length
          ) {
            return snapshotPosts;
          }

          const snapshotIds = new Set(
            snapshotPosts.map((post) => post.id)
          );

          // Keep already-loaded posts that were pushed below the newest
          // page by newer arrivals, then put the fresh page on top.
          // Duplication is impossible: any id in the snapshot replaces its
          // earlier copy before the tail is rebuilt.
          const keptTail = prevPosts.filter(
            (post) => !snapshotIds.has(post.id)
          );

          return [...snapshotPosts, ...keptTail];
        });

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
     PAGINATION — load the next page when the user nears the end
  ========================================================= */

  const loadMorePosts = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!hasMoreRef.current) return;

    const lastVisible = lastVisibleRef.current;
    if (!lastVisible) return;

    const generation =
      paginationGenerationRef.current;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const nextQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(FEED_PAGE_SIZE)
      );

      const snapshot = await getDocs(nextQuery);

      // A refresh may have reset the pagination while this request was
      // in flight — discarding it keeps stale data from being appended.
      if (
        generation !==
        paginationGenerationRef.current
      ) {
        return;
      }

      if (snapshot.docs.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      const nextPosts =
        snapshot.docs.map(postFromDoc);

      setPosts((prevPosts) => {
        const existingIds = new Set(
          prevPosts.map((post) => post.id)
        );
        const freshPosts = nextPosts.filter(
          (post) => !existingIds.has(post.id)
        );

        return freshPosts.length > 0
          ? [...prevPosts, ...freshPosts]
          : prevPosts;
      });

      lastVisibleRef.current =
        snapshot.docs[snapshot.docs.length - 1];

      hasMoreRef.current =
        snapshot.docs.length === FEED_PAGE_SIZE;
    } catch (error) {
      console.log(
        "Load more posts error:",
        error
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  /* =========================================================
     OPEN POST FROM NOTIFICATION
  ========================================================= */

  useEffect(() => {
    const targetPostId =
      route?.params?.targetPostId;

    if (
      !targetPostId ||
      feedPosts.length === 0
    ) {
      return;
    }

    if (
      handledNotificationRef.current ===
      targetPostId
    ) {
      return;
    }

    const postIndex = feedPosts.findIndex(
      (post) => post.id === targetPostId
    );

    if (postIndex === -1) {
      handledNotificationRef.current =
        targetPostId;

      navigation.setParams({
        targetPostId: undefined,
        openComments: undefined,
      });

      // The feed only fetches the newest page, so a deep link to an older
      // post can legitimately miss the loaded window. Verify it once: if
      // the post still exists we open the Comments screen, which loads the
      // post by id itself. Documented limitation of the paginated feed:
      // like-notifications to posts outside the loaded window open the
      // post's comments view instead of scrolling the feed to it.
      getDoc(doc(db, "posts", targetPostId))
        .then((snap) => {
          if (!snap.exists()) {
            Alert.alert(
              "Post unavailable",
              "This post may have been deleted."
            );
            return;
          }

          navigation.navigate("Comments", {
            postId: targetPostId,
          });
        })
        .catch((error) => {
          console.log(
            "Deep link post fetch error:",
            error
          );

          Alert.alert(
            "Post unavailable",
            "This post may have been deleted."
          );
        });

      return;
    }

    handledNotificationRef.current =
      targetPostId;

    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: postIndex,
        animated: true,
        viewPosition: 0,
      });

      if (
        route?.params?.openComments
      ) {
        setTimeout(() => {
          navigation.navigate("Comments", {
            postId: targetPostId,
          });
        }, 500);
      }

      navigation.setParams({
        targetPostId: undefined,
        openComments: undefined,
      });
    }, 300);
  }, [
    feedPosts,
    route?.params?.targetPostId,
    route?.params?.openComments,
    navigation,
  ]);

  /* =========================================================
     PICK PHOTO OR VIDEO
  ========================================================= */

  const pickPostMedia = async (type) => {
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

      if (type === "video") {
        if (
          asset.duration &&
          asset.duration >
            MAX_VIDEO_DURATION_SECONDS
        ) {
          Alert.alert(
            "Video too long",
            "Please choose a video that is 5 minutes or shorter."
          );
          return;
        }

        if (
          asset.fileSize &&
          asset.fileSize > MAX_VIDEO_SIZE
        ) {
          const sizeMB = (
            asset.fileSize / (1024 * 1024)
          ).toFixed(1);

          Alert.alert(
            "Video too large",
            `This video is ${sizeMB} MB.\n\nPlease choose a video smaller than 100 MB.`
          );

          return;
        }
      }

      setSelectedMedia({
        uri: asset.uri,
        type,
        mimeType: asset.mimeType || null,
        fileName: asset.fileName || null,
        fileSize: asset.fileSize || null,
        width: asset.width || null,
        height: asset.height || null,
        duration: asset.duration || null,
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
    const text = postText.trim();

    if (!text && !selectedMedia) {
      Alert.alert(
        "Create a post",
        "Write something or select a photo/video to share."
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

      const currentUser = auth.currentUser;

      let uploadedMedia = null;

      if (selectedMedia) {
        uploadedMedia = await uploadPostMedia(
          selectedMedia
        );
      }

      await addDoc(
        collection(db, "posts"),
        {
          userId: currentUser.uid,

          fullName:
            user.fullName ||
            "University Student",

          country:
            user.country || "Unknown",

          photo: user.photo || "",

          text,

          media: uploadedMedia
            ? {
                uri: uploadedMedia.uri,

                type: uploadedMedia.type,

                mimeType:
                  uploadedMedia.mimeType ||
                  null,

                fileName:
                  uploadedMedia.fileName ||
                  null,
              }
            : null,

          likes: [],

          createdAt: serverTimestamp(),
        }
      );

      setPostText("");
      setSelectedMedia(null);

      closeCreateModal();

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

  const toggleLike = useCallback(
    async (post) => {
    if (!auth.currentUser) {
      Alert.alert(
        "Login required",
        "Please log in to like posts."
      );

      return;
    }

    const currentUserId =
      auth.currentUser.uid;

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

      await updateDoc(postRef, {
        likes: arrayUnion(currentUserId),
      });

      if (
        post.userId === currentUserId
      ) {
        return;
      }

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
  },
  [user]
);

  /* =========================================================
     DELETE POST
  ========================================================= */

  const deletePost = (post) => {
    if (!auth.currentUser) {
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

  /* =========================================================
     SHARE POST
  ========================================================= */

  const sharePost = async (post) => {
    if (!post?.media?.uri) {
      Alert.alert(
        "Nothing to share",
        "This post does not contain a photo or video."
      );
      return;
    }

    if (
      shareBusyRef.current ||
      saveBusyRef.current
    ) {
      return;
    }

    shareBusyRef.current = true;

    setBusyMediaAction({
      kind: "share",
      postId: post.id,
      label: "Preparing share…",
    });

    let localFile = null;

    try {
      const available =
        await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          "Sharing unavailable",
          "Sharing is not available on this device."
        );
        return;
      }

      const remoteUrl = post.media.uri;

      console.log(
        "SHARE REMOTE URL:",
        remoteUrl
      );

      const extension =
        detectMediaExtension(post);

      const mimeType = detectMimeType(
        post,
        extension
      );

      const fileName = buildMediaFileName(
        extension,
        "cache"
      );

      localFile = new File(
        Paths.cache,
        fileName
      );

      console.log(
        "DOWNLOADING MEDIA FOR SHARING..."
      );

      await File.downloadFileAsync(
        remoteUrl,
        localFile,
        { idempotent: true }
      );

      console.log(
        "MEDIA SAVED LOCALLY:",
        localFile.uri
      );

      await Sharing.shareAsync(
        localFile.uri,
        {
          dialogTitle:
            "Share this student post",
          mimeType,
        }
      );

      console.log("MEDIA SHARE SUCCESS");
    } catch (error) {
      console.log(
        "Share post error:",
        error
      );

      Alert.alert(
        "Share failed",
        "We couldn't share this post. Please try again."
      );
    } finally {
      if (localFile && localFile.exists) {
        try {
          localFile.delete();
        } catch (cleanupError) {
          console.log(
            "Share temp file cleanup error:",
            cleanupError
          );
        }
      }

      shareBusyRef.current = false;
      setBusyMediaAction(null);
    }
  };

  /* =========================================================
     SAVE POST MEDIA (video or image)
  ========================================================= */

  const savePostMedia = async (post) => {
    if (!post?.media?.uri) {
      return;
    }

    const isVideo =
      post.media.type === "video";

    if (
      shareBusyRef.current ||
      saveBusyRef.current
    ) {
      return;
    }

    saveBusyRef.current = true;

    setBusyMediaAction({
      kind: "save",
      postId: post.id,
      label: isVideo
        ? "Saving video…"
        : "Saving image…",
    });

    try {
      const remoteUrl = post.media.uri;

      const extension =
        detectMediaExtension(post);

      const fileName = buildMediaFileName(
        extension,
        "save"
      );

      const savedDirectory = new Directory(
        Paths.document,
        SAVED_MEDIA_DIR_NAME
      );

      savedDirectory.create({
        idempotent: true,
        intermediates: true,
      });

      const destination = new File(
        savedDirectory,
        fileName
      );

      console.log(
        "SAVING MEDIA TO:",
        destination.uri
      );

      await File.downloadFileAsync(
        remoteUrl,
        destination,
        { idempotent: true }
      );

      console.log(
        "MEDIA SAVED:",
        destination.uri
      );

      Alert.alert(
        isVideo
          ? "Video saved successfully"
          : "Image saved successfully",
        isVideo
          ? "The video was saved to your device."
          : "The image was saved to your device."
      );
    } catch (error) {
      console.log(
        "Save media error:",
        error
      );

      Alert.alert(
        "Save failed",
        isVideo
          ? "We couldn't save this video. Please try again."
          : "We couldn't save this image. Please try again."
      );
    } finally {
      saveBusyRef.current = false;
      setBusyMediaAction(null);
    }
  };

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  const formatTime = useCallback(
    (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    let date;

    try {
      if (
        typeof timestamp.toDate ===
        "function"
      ) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
    } catch {
      return "Just now";
    }

    if (
      !date ||
      Number.isNaN(date.getTime())
    ) {
      return "Just now";
    }

    const now = new Date();

    const difference = Math.floor(
      (now.getTime() - date.getTime()) / 1000
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
  },
  []
);

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh = useCallback(() => {
    // Bump the generation so any in-flight "load more" request is
    // discarded, reset pagination, and reload the newest page.
    paginationGenerationRef.current += 1;
    hasMoreRef.current = true;

    setRefreshing(true);

    const freshQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(FEED_PAGE_SIZE)
    );

    getDocs(freshQuery)
      .then((snapshot) => {
        // Commit the refresh: invalidate any request started while this
        // query was in flight, then replace the feed with the newest page.
        paginationGenerationRef.current += 1;

        const freshPosts =
          snapshot.docs.map(postFromDoc);

        setPosts(freshPosts);

        lastVisibleRef.current =
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;

        hasMoreRef.current =
          freshPosts.length === FEED_PAGE_SIZE;

        setCurrentPostIndex(0);
      })
      .catch((error) => {
        console.log(
          "Refresh posts error:",
          error
        );
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, []);

  /* =========================================================
     MORE MENU — placeholder for Phase 2
  ========================================================= */

  const showMoreMenu = useCallback(
    (post) => {
      const isOwnPost =
        auth.currentUser &&
        post.userId ===
          auth.currentUser.uid;

      const saveAction = post?.media?.uri
        ? [
            {
              text:
                post.media.type === "video"
                  ? "⬇ Save Video"
                  : "⬇ Save Image",
              onPress: () =>
                savePostMedia(post),
            },
          ]
        : [];

      const options = isOwnPost
        ? [
            ...saveAction,
            {
              text: "Delete",
              style: "destructive",
              onPress: () =>
                deletePost(post),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        : [
            ...saveAction,
            {
              text: "Report",
              onPress: () => {
                Alert.alert(
                  "Report Submitted",
                  "Thanks for letting us know. Our team will review this post."
                );
              },
            },
            {
              text: "Not Interested",
              onPress: () => {
                Alert.alert(
                  "Noted",
                  "We'll show you fewer posts like this."
                );
              },
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ];

      Alert.alert(
        "More Options",
        undefined,
        options
      );
    },
    []
  );

  /* =========================================================
     RENDER FEED ITEM
  ========================================================= */

  const renderFeedItem = useCallback(
    ({ item, index }) => {
      const likes = Array.isArray(
        item.likes
      )
        ? item.likes
        : [];

      const likedByCurrentUser =
        !!auth.currentUser &&
        likes.includes(auth.currentUser.uid);

      const isOwnPost =
        !!auth.currentUser &&
        item.userId ===
          auth.currentUser.uid;

      return (
        <FeedItem
          item={item}
          formatTime={formatTime}
          isActive={
            index === currentPostIndex
          }
          isLiked={likedByCurrentUser}
          isVideoMuted={feedMuted}
          onToggleMute={() =>
            setFeedMuted((prev) => !prev)
          }
          onLike={() => toggleLike(item)}
          onComment={() => {
            navigation.navigate(
              "Comments",
              {
                postId: item.id,
              }
            );
          }}
          onShare={() => sharePost(item)}
          isShareBusy={
            busyMediaAction?.kind === "share" &&
            busyMediaAction.postId === item.id
          }
          onMore={() =>
            showMoreMenu(item)
          }
          onProfilePress={() => {
            if (
              isOwnPost
            ) {
              navigation.navigate(
                "ProfileTab"
              );
              return;
            }

            navigation.navigate(
              "StudentProfile",
              {
                member: {
                  id: item.userId,
                  userId: item.userId,
                  fullName:
                    item.fullName,
                  photo:
                    item.photo || "",
                  country:
                    item.country,
                },
              }
            );
          }}
        />
      );
    },
    [
      currentPostIndex,
      navigation,
      formatTime,
      showMoreMenu,
      feedMuted,
      toggleLike,
      busyMediaAction,
    ]
  );

  const keyExtractor = useCallback(
    (item) => item.id,
    []
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: FEED_ITEM_HEIGHT,
      offset: FEED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>
          🌍
        </Text>

        <ActivityIndicator
          size="small"
          color="#4F46E5"
        />

        <Text style={styles.loadingText}>
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
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      {/* ============================
          VERTICALLY PAGED FULL-SCREEN FEED
      ============================ */}

      <FlatList
        ref={flatListRef}
        data={feedPosts}
        keyExtractor={keyExtractor}
        renderItem={renderFeedItem}
        getItemLayout={getItemLayout}
        style={styles.feedList}
        showsVerticalScrollIndicator={
          false
        }
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={
          onViewableItemsChangedRef.current
        }
        viewabilityConfig={
          viewabilityConfigRef.current
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
        contentContainerStyle={
          posts.length === 0
            ? styles.emptyListContent
            : undefined
        }
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={false}
        ListFooterComponent={
          loadingMore ? (
            <View
              style={styles.feedLoadingFooter}
            >
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyBadge}>
                <Text style={styles.emptyEmoji}>
                  🌍
                </Text>
              </View>

              <Text style={styles.emptyTitle}>
                Your student community is
                waiting
              </Text>

              <Text style={styles.emptyText}>
                Be one of the first students
                to share something. New
                posts from students around
                the world will appear here.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openCreateModal}
              activeOpacity={0.85}
            >
              <Text
                style={styles.emptyButtonText}
              >
                ✍️ Create a Post
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ============================
          OVERLAY TOP BAR — For You / Latest + Create
      ============================ */}

      <View
        pointerEvents="box-none"
        style={[
          styles.feedTopOverlay,
          { paddingTop: insets.top + 6 },
        ]}
      >
        <View style={styles.tabBar}>
          {FEED_TABS.map((tab) => {
            const active = feedTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.feedTab,
                  active &&
                    styles.feedTabActive,
                ]}
                onPress={() =>
                  switchFeedTab(tab.key)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.feedTabText,
                    active &&
                      styles.feedTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.createFab}
          onPress={openCreateModal}
          activeOpacity={0.8}
          accessibilityLabel="Create a post"
        >
          <Text style={styles.createFabText}>
            ＋
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================
          MEDIA OPERATION BUSY INDICATOR
      ============================ */}

      {busyMediaAction && (
        <View
          pointerEvents="none"
          style={[
            styles.mediaBusyChip,
            { top: insets.top + 64 },
          ]}
        >
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />

          <Text style={styles.mediaBusyChipText}>
            {busyMediaAction.label}
          </Text>
        </View>
      )}

      {/* ============================
          CREATE POST MODAL
      ============================ */}

      <Modal
        visible={createVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCreateModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <View style={styles.modalHandle} />

          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>
              Create Post
            </Text>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={closeCreateModal}
              activeOpacity={0.7}
              accessibilityLabel="Close create post"
            >
              <Text
                style={styles.modalCloseText}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

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

            <TextInput
              ref={inputRef}
              value={postText}
              onChangeText={setPostText}
              placeholder="What's on your mind?"
              placeholderTextColor="#6B7280"
              multiline
              maxLength={MAX_POST_LENGTH}
              style={styles.createInput}
              textAlignVertical="top"
            />
          </View>

          {/* EMOJI QUICK ACTIONS */}

          <View style={styles.emojiRow}>
            {EMOJI_QUICK.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiChip}
                onPress={() =>
                  setPostText(
                    (prev) => prev + emoji
                  )
                }
                activeOpacity={0.7}
              >
                <Text
                  style={styles.emojiChipText}
                >
                  {emoji}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* MEDIA PREVIEW */}

          {selectedMedia && (
            <View
              style={styles.mediaPreview}
            >
              {selectedMedia.type ===
              "image" ? (
                <Image
                  source={{
                    uri: selectedMedia.uri,
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
                </View>
              )}

              <TouchableOpacity
                style={
                  styles.removeMediaButton
                }
                onPress={() =>
                  setSelectedMedia(null)
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
            style={styles.createBottom}
          >
            <View style={styles.mediaButtons}>
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() =>
                  pickPostMedia("image")
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

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() =>
                  pickPostMedia("video")
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
                style={styles.characterCount}
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
                onPress={createPost}
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
        </KeyboardAvoidingView>
      </Modal>
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

  /* FULL-SCREEN FEED LIST */

  feedList: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  /* PAGINATION FOOTER — small spinner while the next page loads */

  feedLoadingFooter: {
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  /* OVERLAY TOP BAR — For You / Latest + Create */

  feedTopOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(5, 7, 10, 0.45)",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },

  mediaBusyChip: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 30,
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 6,
  },

  mediaBusyChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 9,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },

  feedTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 86,
    alignItems: "center",
  },

  feedTabActive: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
  },

  feedTabText: {
    color: "#C7D2FE",
    fontSize: 13,
    fontWeight: "700",
  },

  feedTabTextActive: {
    color: "#0B0F17",
  },

  createFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  createFabText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26,
  },

  /* CREATE POST MODAL */

  modalContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#374151",
    alignSelf: "center",
    marginBottom: 14,
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  createHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
  },

  smallAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  smallAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  createInput: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 10,
    minHeight: 40,
    maxHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 19,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  /* EMOJI QUICK */

  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  emojiChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  emojiChipText: {
    fontSize: 15,
  },

  createBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  characterCount: {
    color: "#6B7280",
    fontSize: 10,
  },

  postButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: "center",
  },

  postButtonDisabled: {
    opacity: 0.45,
  },

  postButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  /* MEDIA BUTTONS */

  mediaButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  mediaButtonEmoji: {
    fontSize: 14,
    marginRight: 4,
  },

  mediaButtonText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "700",
  },

  postActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  /* MEDIA PREVIEW */

  mediaPreview: {
    position: "relative",
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
  },

  previewImage: {
    width: "100%",
    height: 140,
    borderRadius: 10,
  },

  videoPreview: {
    height: 100,
    backgroundColor: "#111827",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  videoPreviewEmoji: {
    fontSize: 28,
  },

  videoPreviewText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
  },

  removeMediaButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  removeMediaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* FEED ITEM — full-screen card */

  feedItem: {
    height: FEED_ITEM_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: "#000000",
    position: "relative",
    overflow: "hidden",
  },

  feedItemTextOnly: {
    backgroundColor: "#0B0F17",
  },

  feedMediaContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  feedVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },

  feedVideoWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    overflow: "hidden",
  },

  videoStatusOverlay: {
    position: "absolute",
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(5, 7, 10, 0.35)",
  },

  videoStatusEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },

  videoStatusText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  feedImage: {
    width: "100%",
    height: "100%",
  },

  textPostBackground: {
    backgroundColor: "#0B0F17",
    justifyContent: "center",
    alignItems: "center",
  },

  textPostEmoji: {
    fontSize: 60,
    opacity: 0.15,
  },

  /* BOTTOM GRADIENT OVERLAY */

  feedGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FEED_GRADIENT_HEIGHT,
    overflow: "hidden",
  },

  /* DOUBLE-TAP HEART */

  doubleTapLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  doubleTapSplash: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  doubleTapHeart: {
    position: "absolute",
  },

  doubleTapHeartText: {
    fontSize: 88,
    textShadowColor:
      "rgba(255, 77, 109, 0.55)",
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 18,
  },

  /* TAP AREA */

  feedTapArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 60,
    bottom: 0,
    zIndex: 5,
  },

  /* INTERACTION BAR — right side */

  interactionBar: {
    position: "absolute",
    right: 8,
    alignItems: "center",
    zIndex: 20,
    gap: 14,
  },

  interactionButton: {
    alignItems: "center",
  },

  interactionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  interactionIconLiked: {
    backgroundColor: "rgba(239, 68, 68, 0.28)",
    borderColor: "rgba(248, 113, 113, 0.35)",
  },

  interactionEmoji: {
    fontSize: 21,
  },

  interactionCount: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textShadowColor:
      "rgba(0, 0, 0, 0.8)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  interactionCountLiked: {
    color: "#F87171",
  },

  interactionLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textShadowColor:
      "rgba(0, 0, 0, 0.8)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  /* MUTE TOGGLE */

  muteButton: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 21,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  muteButtonText: {
    fontSize: 18,
  },

  /* BOTTOM INFO OVERLAY */

  feedBottomInfo: {
    position: "absolute",
    left: 14,
    right: 66,
    zIndex: 20,
  },

  feedProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  feedAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },

  feedAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },

  feedAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  feedAuthorInfo: {
    flex: 1,
  },

  feedAuthorName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
    textShadowColor:
      "rgba(0, 0, 0, 0.8)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  feedCaption: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 8,
    textShadowColor:
      "rgba(0, 0, 0, 0.8)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  feedMeta: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor:
      "rgba(0, 0, 0, 0.8)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  /* COMMENT PREVIEW */

  commentPreview: {
    position: "absolute",
    left: 14,
    right: 66,
    zIndex: 22,
  },

  commentPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 4,
  },

  commentPreviewAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 9,
  },

  commentPreviewAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  commentPreviewAvatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  commentPreviewBody: {
    flex: 1,
  },

  commentPreviewName: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 1,
  },

  commentPreviewText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    lineHeight: 15,
  },

  /* LOADING */

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

  /* EMPTY STATE */

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 100,
  },

  emptyContainer: {
    width: "100%",
    alignItems: "center",
  },

  emptyCard: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  emptyBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(79, 70, 229, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  emptyEmoji: {
    fontSize: 36,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 26,
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },

  emptyButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 24,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 6,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
};
