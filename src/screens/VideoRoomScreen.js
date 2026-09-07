import { useEffect, useRef, useState } from "react";

import { Alert, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

import { Camera } from "expo-camera";


import {
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";
import {
  getTodayKey,
  isPremiumUser,
} from "../utils/access";


export default function VideoRoomScreen({ route, navigation }) {
  const user = useUser();

  const userRef = useRef(user);

  // Joined only after the first user snapshot arrives.
  const userLoaded = Boolean(user);

  const timerRef = useRef(null);

  const heartbeatRef = useRef(null);

  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const today = getTodayKey();

  const FREE_MINUTES_PER_DAY = 30;

 const roomName =
  route.params?.roomName || "GlobalStudyHall";

const safeRoomName = String(roomName)
  .replace(/[^a-zA-Z0-9_-]/g, "")
  .slice(0, 50);

  // Present only when the room was entered through a private call.
  const callId = route.params?.callId || null;

  const selfEndedRef = useRef(false);

  // Mark the call ended when the local user leaves the call room.
  useEffect(() => {
    if (!callId) return;

    return () => {
      selfEndedRef.current = true;

      updateDoc(doc(db, "calls", callId), {
        status: "ended",
        endedAt: serverTimestamp(),
      }).catch(() => {});
    };
  }, [callId]);

  // Alert the user when the other side hangs up.
  useEffect(() => {
    if (!callId) return;

    const unsubscribe = onSnapshot(
      doc(db, "calls", callId),
      (snapshot) => {
        if (selfEndedRef.current) return;

        const data = snapshot.data();

        if (data && data.status === "ended") {
          Alert.alert(
            "Call Ended",
            "The other person has left the call."
          );

          navigation.goBack();
        }
      },
      (error) => {
        console.log(
          "Call status error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [callId]);

  useEffect(() => {
  const requestPermissions = async () => {

    const camera =
      await Camera.requestCameraPermissionsAsync();

    const microphone =
      await Camera.requestMicrophonePermissionsAsync();

    if (
      camera.status === "granted" &&
      microphone.status === "granted"
    ) {
      setPermissionsGranted(true);
    } else {
      alert(
        "Camera and microphone permissions are required for video rooms."
      );
    }
  };

  requestPermissions();

}, []);

// Keep a reference to the latest user data so the room
// join/leave effect can read fresh values WITHOUT depending
// on the user object identity (which changes on every
// Firestore snapshot and used to restart the whole session,
// charging >= 1 minute per restart).
useEffect(() => {
  userRef.current = user;
}, [user]);

useEffect(() => {
  const uid = auth.currentUser?.uid;
  const currentUserData = userRef.current;

  if (!uid || !userLoaded || !currentUserData) return;

  const participantRef = doc(
    db,
    "videoRooms",
    safeRoomName,
    "participants",
    uid
  );

  const userDocRef = doc(db, "users", uid);

  let disposed = false;
  let sessionActive = false;
  let lastCheckpoint = null;

  // Charge the exact seconds elapsed since the last checkpoint.
  const chargeElapsed = async () => {
    if (!sessionActive || !lastCheckpoint) return;

    const now = Date.now();
    const seconds = Math.floor(
      (now - lastCheckpoint) / 1000
    );
    lastCheckpoint = now;

    if (seconds <= 0) return;

    // Fractional minutes instead of rounding up every stay to 1 minute.
    const minutes =
      Math.round((seconds / 60) * 100) / 100;

    try {
      await updateDoc(userDocRef, {
        videoMinutesUsed: increment(minutes),
      });
    } catch (error) {
      console.log(
        "Study minutes update error:",
        error
      );
    }
  };

  // Stop charging and clear timers. No-op if nothing is active.
  const endSession = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (sessionActive) {
      await chargeElapsed();
      sessionActive = false;
      lastCheckpoint = null;
    }
  };

  const joinRoom = async () => {
    try {
      await setDoc(participantRef, {
        userId: uid,
        fullName:
          currentUserData.fullName || "Student",
        photo: currentUserData.photo || "",
        joinedAt: serverTimestamp(),
      });
    } catch (error) {
      console.log(
        "Failed to join room:",
        error
      );
      return;
    }

    // Premium users get unlimited rooms.
    if (isPremiumUser(currentUserData)) return;

    const usedMinutes = Number(
      currentUserData.videoMinutesUsed || 0
    );

    const remainingSeconds = Math.max(
      0,
      (FREE_MINUTES_PER_DAY - usedMinutes) * 60
    );

    // No free minutes left - undo the participant join and
    // let the locked screen show. Never charge a blocked user.
    if (remainingSeconds <= 0) {
      try {
        await deleteDoc(participantRef);
      } catch (error) {
        console.log(
          "Failed to leave room:",
          error
        );
      }
      return;
    }

    sessionActive = true;
    lastCheckpoint = Date.now();

    // Kick the user when today's free budget runs out.
    timerRef.current = setTimeout(async () => {
      if (disposed) return;

      await endSession();

      alert(
        "Your free 30 study minutes have ended for today."
      );

      navigation.replace("Premium");
    }, remainingSeconds * 1000);

    // Heartbeat charge every 15 seconds so a crash, force close
    // or backgrounding loses at most ~15 seconds of free time
    // and can never jump straight to the daily limit.
    heartbeatRef.current = setInterval(
      chargeElapsed,
      15000
    );
  };

  joinRoom();

  return () => {
    disposed = true;

    const leaveRoom = async () => {
      await endSession();

      try {
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
}, [safeRoomName, userLoaded]);

if (!user) return null;

const isAllowed = isPremiumUser(user);


let videoMinutesUsed = user.videoMinutesUsed || 0;
let videoMinutesDate = user.videoMinutesDate || today;

// New day? Reset locally.
if (videoMinutesDate !== today) {
  videoMinutesUsed = 0;
  videoMinutesDate = today;
}

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

if (!permissionsGranted) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#05070A",
      }}
    >
      <Text style={{ color: "white" }}>
        Requesting camera and microphone permissions...
      </Text>
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
    "&config.audioQuality=true" +
    "&config.enableNoiseSuppression=true" +
    "&config.enableEchoCancellation=true" +
    "&config.enableAutoGainControl=true" +
    "&config.prejoinPageEnabled=false" +
    "&config.disableDeepLinking=true" +
    "&config.disableAP=true" +
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

  javaScriptEnabled={true}

  domStorageEnabled={true}

  originWhitelist={["*"]}

  allowsInlineMediaPlayback={true}

  mediaPlaybackRequiresUserAction={false}

  mixedContentMode="always"

  allowsFullscreenVideo={true}

  thirdPartyCookiesEnabled={true}

  sharedCookiesEnabled={true}

  mediaCapturePermissionGrantType="grant"

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