import { useEffect, useRef } from "react";

import { Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";
import { isPremiumUser } from "../utils/access";


export default function VideoRoomScreen({ route, navigation }) {
  const user = useUser();

  const sessionStartRef = useRef(null);

  const today = new Date().toDateString();

 const roomName =
  route.params?.roomName || "GlobalStudyHall";

const safeRoomName = String(roomName)
  .replace(/[^a-zA-Z0-9_-]/g, "")
  .slice(0, 50);

useEffect(() => {
  if (!auth.currentUser || !user) return;

  const participantRef = doc(
    db,
    "videoRooms",
    safeRoomName,
    "participants",
    auth.currentUser.uid
  );

  const joinRoom = async () => {
    try {
      if (
        !isPremiumUser(user) &&
        (user.videoMinutesDate || today) !== today
      ) {
        await updateDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            videoMinutesUsed: 0,
            videoMinutesDate: today,
          }
        );
      }

      await setDoc(participantRef, {
  userId: auth.currentUser.uid,
  fullName: user.fullName || "Student",
  photo: user.photo || "",
  joinedAt: serverTimestamp(),
});

      if (!isPremiumUser(user)) {
        sessionStartRef.current = Date.now();
      }
    } catch (error) {
      console.log(
        "Failed to join room:",
        error
      );
    }
  };

  joinRoom();

  return () => {
    const leaveRoom = async () => {
      try {
        if (
          !isPremiumUser(user) &&
          sessionStartRef.current
        ) {
          const sessionMinutes = Math.ceil(
            (Date.now() -
              sessionStartRef.current) /
              (1000 * 60)
          );

          await updateDoc(
            doc(
              db,
              "users",
              auth.currentUser.uid
            ),
            {
              videoMinutesUsed:
                (user.videoMinutesUsed || 0) +
                sessionMinutes,
            }
          );
        }

        await deleteDoc(participantRef);
      } catch (error) {
        console.log(
          "Failed to leave room:",
          error
        );
      }
    };

    leaveRoom();
  };
}, [safeRoomName, user]);

if (!user) return null;

const isAllowed = isPremiumUser(user);

const FREE_MINUTES_PER_DAY = 30;

const videoMinutesUsed =
  user.videoMinutesUsed || 0;

const videoMinutesDate =
  user.videoMinutesDate || today;

const roomTitle =
  roomName === "GlobalStudyHall"
    ? "🌍 Global Study Hall"
    : `📚 ${roomName}`;

if (
  !isAllowed &&
  videoMinutesDate === today &&
  videoMinutesUsed >= FREE_MINUTES_PER_DAY
) {
  return (
    <View style={styles.lockContainer}>
      <Text style={styles.lockTitle}>
        ⏳ Daily limit reached
      </Text>

      <Text style={styles.lockText}>
        You have used your free 30 study minutes
        for today.

        {"\n\n"}

        Upgrade to Premium for unlimited
        video study rooms.
      </Text>

      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={() =>
          navigation.navigate("Premium")
        }
      >
        <Text style={styles.upgradeText}>
          Upgrade to Premium
        </Text>
      </TouchableOpacity>
    </View>
  );
}

  /*
   ==================================
   IMPROVED JITSI CONFIG (STAGE 1)
   ==================================
  */

  const jitsiUrl =
    `https://meet.jit.si/UniversityUniversal_${safeRoomName}` +
    "#config.startWithAudioMuted=true" +
    "&config.startWithVideoMuted=false" +
    "&config.prejoinPageEnabled=false" +
    "&config.disableDeepLinking=true" +
    "&config.resolution=360" +
    "&config.enableWelcomePage=false" +
    "&config.toolbarButtons=" +
    JSON.stringify([
      "microphone",
      "camera",
      "chat",
      "participants-pane",
      "raisehand",
      "tileview",
      "desktop",
      "hangup",
    ]);

  return (
    <View style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <Text style={styles.title}>
          🎥 Video Study Room
        </Text>

        <Text style={styles.subtitle}>
          Join the study hall and collaborate in real time.
        </Text>

        <View style={styles.roomBadge}>
          <Text style={styles.roomText}>
            {roomTitle}
          </Text>
        </View>

        <Text style={styles.hint}>
          🎙️ Microphone OFF by default
        </Text>

        <Text style={styles.hint}>
          📷 Camera ON by default
        </Text>

        <Text style={styles.hint}>
          ✋ Raise your hand to speak
        </Text>
      </View>

      {/* VIDEO */}

      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: jitsiUrl }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          originWhitelist={["*"]}
        />
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 13,
  },

  roomBadge: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#4F46E5",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  roomText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
  },

  hint: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 6,
  },

  videoContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  webview: {
    flex: 1,
    backgroundColor: "#000",
  },

  lockContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  lockTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  lockText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginBottom: 20,
    lineHeight: 22,
  },

  upgradeBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
};