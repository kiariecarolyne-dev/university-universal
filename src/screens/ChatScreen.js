import { useEffect, useRef, useState } from "react";

import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import {
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
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";
import { isPremiumUser } from "../utils/access";

const API_URL =
  "https://university-universal-backend.onrender.com";

export default function ChatScreen({ route, navigation }) {
  const { group } = route.params;

  const user = useUser();

  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const flatListRef = useRef(null);

  // ============================================
  // CONTACT INFORMATION DETECTOR
  // ============================================

  const containsContactInfo = (text) => {
    const phoneRegex = /(\+254|07|01)\d{8}/;
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const whatsappRegex = /wa\.me|whatsapp/i;
    const telegramRegex = /t\.me|telegram/i;

    return (
      phoneRegex.test(text) ||
      emailRegex.test(text) ||
      whatsappRegex.test(text) ||
      telegramRegex.test(text)
    );
  };

  // ============================================
  // LOAD MESSAGES
  // ============================================

  useEffect(() => {
    if (!group?.id) return;

    const messagesRef = collection(
      db,
      "groups",
      group.id,
      "messages"
    );

    const q = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMessages(data);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({
            animated: true,
          });
        }, 150);
      },
      (error) => {
        console.log("CHAT LISTENER ERROR:", error);
      }
    );

    return unsubscribe;
  }, [group?.id]);

  // ============================================
  // PICK IMAGE
  // ============================================

  const pickImage = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow photo library access to send images."
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (!auth.currentUser) {
      Alert.alert(
        "Login Required",
        "Please log in again before sending an image."
      );
      return;
    }

    setUploadingImage(true);

    // ------------------------------------
    // CREATE REAL EXPO FILE
    // ------------------------------------

    const file = new File(asset.uri);

    console.log("CHAT FILE:", {
      uri: file.uri,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // ------------------------------------
    // CREATE FORMDATA
    // ------------------------------------

    const formData = new FormData();

    formData.append("media", file);

    formData.append(
      "userId",
      auth.currentUser.uid
    );

    formData.append(
      "mediaType",
      "image"
    );

    // ------------------------------------
    // UPLOAD
    // ------------------------------------

    const response = await fetch(
      `${API_URL}/upload-social-media`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    console.log("CHAT UPLOAD RESPONSE:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Image upload failed."
      );
    }

    // ------------------------------------
    // SAVE MESSAGE
    // ------------------------------------

    await addDoc(
      collection(
        db,
        "groups",
        group.id,
        "messages"
      ),
      {
        type: "image",

        mediaUrl: data.mediaUrl,

        sender:
          auth.currentUser.email,

        senderName:
          user?.fullName || "Student",

        senderPhoto:
          user?.photo || "",

        createdAt:
          serverTimestamp(),
      }
    );

    // ------------------------------------
    // SCROLL TO NEW MESSAGE
    // ------------------------------------

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }, 200);

  } catch (error) {
    console.log(
      "CHAT IMAGE ERROR:",
      error
    );

    Alert.alert(
      "Upload Failed",
      error?.message ||
        "Unable to send image."
    );

  } finally {
    setUploadingImage(false);
  }
};
  // ============================================
  // SEND TEXT MESSAGE
  // ============================================

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!auth.currentUser) {
      Alert.alert(
        "Not Signed In",
        "Please sign in again before sending a message."
      );
      return;
    }

    // FREE USERS CANNOT SHARE CONTACT INFORMATION

    if (
      !isPremiumUser(user) &&
      containsContactInfo(trimmedMessage)
    ) {
      Alert.alert(
        "Premium Feature",
        "Sharing contact details requires Premium."
      );
      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "groups",
          group.id,
          "messages"
        ),
        {
          text: trimmedMessage,

          sender:
            auth.currentUser.email || "",

          senderName:
            user?.fullName || "Student",

          senderPhoto:
            user?.photo || "",

          createdAt:
            serverTimestamp(),
        }
      );

      setMessage("");

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    } catch (error) {
      console.log(
        "SEND MESSAGE ERROR:",
        error
      );

      Alert.alert(
        "Message Failed",
        "Unable to send your message. Please try again."
      );
    }
  };

  // ============================================
  // RENDER MESSAGE
  // ============================================

  const renderMessage = ({ item }) => {
    const currentEmail =
      auth.currentUser?.email || "";

    const isMe =
      item.sender === currentEmail;

    return (
      <View
        style={[
          styles.messageCard,
          isMe && styles.myMessageCard,
        ]}
      >
        {/* SENDER */}

        <View style={styles.senderRow}>
          {item.senderPhoto ? (
            <Image
              source={{
                uri: item.senderPhoto,
              }}
              style={styles.chatAvatar}
            />
          ) : (
            <View style={styles.chatAvatar}>
              <Text style={styles.avatarLetter}>
                {(item.senderName || "S")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.sender}>
            {isMe
              ? "You"
              : item.senderName || "Student"}
          </Text>
        </View>

        {/* IMAGE MESSAGE */}

        {item.type === "image" ? (
          <Image
            source={{
              uri: item.mediaUrl,
            }}
            style={styles.chatImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.message}>
            {item.text}
          </Text>
        )}

        {/* TIME */}

        <Text style={styles.time}>
          {item.createdAt?.toDate
            ? item.createdAt
                .toDate()
                .toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
            : ""}
        </Text>
      </View>
    );
  };

  // ============================================
  // SCREEN
  // ============================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 0 : 0
        }
      >
        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text
                style={styles.title}
                numberOfLines={1}
              >
                💬 {group?.name || "Group Chat"}
              </Text>

              <Text style={styles.subtitle}>
                Collaborate with fellow students
              </Text>
            </View>

            <TouchableOpacity
              style={styles.membersButton}
              onPress={() =>
                navigation.navigate(
                  "Members",
                  {
                    groupId: group.id,
                    groupName: group.name,
                  }
                )
              }
            >
              <Text
                style={styles.membersButtonText}
              >
                👥 Members
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================= */}
        {/* MESSAGES */}
        {/* ================================= */}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messageList}
          contentContainerStyle={[
            styles.messageListContent,
            messages.length === 0 &&
              styles.emptyListContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({
              animated: false,
            });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                💬
              </Text>

              <Text style={styles.emptyTitle}>
                Start the conversation
              </Text>

              <Text style={styles.emptyText}>
                Ask a question, share notes, or
                help another student.
              </Text>
            </View>
          }
        />

        {/* ================================= */}
        {/* EMOJI PICKER */}
        {/* ================================= */}

        {showEmojiPicker && (
  <View style={styles.emojiContainer}>
    {[
      "😀",
      "😂",
      "😍",
      "🥰",
      "😊",
      "😎",
      "🤔",
      "😅",
      "😭",
      "😡",
      "👍",
      "👎",
      "👏",
      "🙌",
      "❤️",
      "🔥",
      "🎉",
      "💯",
      "🙏",
      "📚",
      "🧠",
      "✍️",
      "🎓",
      "💻",
      "☕",
      "🚀",
    ].map((emoji) => (
      <TouchableOpacity
        key={emoji}
        onPress={() => {
          setMessage((prev) => prev + emoji);
        }}
        style={styles.emojiItem}
      >
        <Text style={styles.emojiText}>
          {emoji}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}

        {/* ================================= */}
        {/* INPUT AREA */}
        {/* ================================= */}

        <View
          style={[
            styles.inputArea,
            {
              paddingBottom:
                Math.max(insets.bottom, 6),
            },
          ]}
        >
          <View style={styles.inputRow}>
            {/* CAMERA */}

            <TouchableOpacity
              onPress={pickImage}
              disabled={uploadingImage}
              style={[
                styles.actionButton,
                uploadingImage &&
                  styles.disabledButton,
              ]}
            >
              <Text style={styles.actionIcon}>
                📷
              </Text>
            </TouchableOpacity>

            {/* EMOJI */}

            <TouchableOpacity
              onPress={() =>
                setShowEmojiPicker(
                  (prev) => !prev
                )
              }
              style={styles.actionButton}
            >
              <Text style={styles.actionIcon}>
                😊
              </Text>
            </TouchableOpacity>

            {/* TEXT INPUT */}

            <TextInput
              placeholder="Type your message..."
              placeholderTextColor="#6B7280"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
              style={styles.input}
              textAlignVertical="center"
              returnKeyType="default"
              blurOnSubmit={false}
              onFocus={() => {
                setShowEmojiPicker(false);

                setTimeout(() => {
                  flatListRef.current?.scrollToEnd(
                    {
                      animated: true,
                    }
                  );
                }, 150);
              }}
            />

            {/* SEND */}

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!message.trim()}
              style={[
                styles.sendButton,
                !message.trim() &&
                  styles.sendButtonDisabled,
              ]}
            >
              <Text style={styles.sendText}>
                ➤
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  // ================================================
  // HEADER
  // ================================================

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTextContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 3,
  },

  membersButton: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },

  membersButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
  },

  // ================================================
  // MESSAGE LIST
  // ================================================

  messageList: {
    flex: 1,
  },

  messageListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  // ================================================
  // MESSAGE
  // ================================================

  messageCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },

  myMessageCard: {
    backgroundColor: "#312E81",
    borderColor: "#4F46E5",
    alignSelf: "flex-end",
  },

  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  chatAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 9,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D1D5DB",
  },

  avatarLetter: {
    color: "#111827",
    fontWeight: "bold",
    fontSize: 15,
  },

  sender: {
    color: "#A5B4FC",
    fontWeight: "bold",
    fontSize: 13,
  },

  message: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
  },

  time: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 6,
    textAlign: "right",
  },

  chatImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginTop: 3,
  },

  // ================================================
  // EMPTY CHAT
  // ================================================

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyEmoji: {
    fontSize: 58,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
    marginTop: 14,
  },

  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  // ================================================
  // EMOJI
  // ================================================

  emojiContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  backgroundColor: "#111827",
  borderRadius: 12,
  padding: 8,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: "#1F2937",
},

emojiItem: {
  width: "12.5%",
  height: 42,
  justifyContent: "center",
  alignItems: "center",
},

emojiText: {
  fontSize: 24,
},

  // ================================================
  // INPUT AREA
  // ================================================

  inputArea: {
    backgroundColor: "#05070A",
    paddingHorizontal: 10,
    paddingTop: 6,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  actionButton: {
    width: 44,
    height: 48,
    backgroundColor: "#1F2937",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },

  disabledButton: {
    opacity: 0.5,
  },

  actionIcon: {
    fontSize: 22,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    maxHeight: 100,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: 15,
    marginRight: 5,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: {
    backgroundColor: "#252B45",
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "bold",
  },
};