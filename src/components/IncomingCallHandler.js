import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import { navigate } from "../utils/navigationRef";

// Global listener that shows a ringing incoming-call modal for the
// signed-in user. Works while the app is open (foreground or
// backgrounded); a fully closed app needs FCM push, which is not
// configured for this project yet.
export default function IncomingCallHandler() {
  const uid = auth.currentUser?.uid;

  const [ringingCall, setRingingCall] =
    useState(null);

  const [callerName, setCallerName] = useState("");

  const [actionBusy, setActionBusy] =
    useState(false);

  // Prevents re-showing the same call after it was handled.
  const lastHandledCallRef = useRef(null);

  useEffect(() => {
    if (!uid) return;

    const callsQuery = query(
      collection(db, "calls"),
      where("calleeId", "==", uid),
      where("status", "==", "ringing")
    );

    const unsubscribe = onSnapshot(
      callsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setRingingCall(null);
          return;
        }

        // If several calls ring at once, show the most recent one.
        let latest = null;

        snapshot.forEach((docSnap) => {
          const data = {
            id: docSnap.id,
            ...docSnap.data(),
          };

          const dataTime =
            data.createdAt?.toMillis?.() || 0;

          const latestTime =
            latest?.createdAt?.toMillis?.() || 0;

          if (!latest || dataTime > latestTime) {
            latest = data;
          }
        });

        if (
          latest &&
          lastHandledCallRef.current === latest.id
        ) {
          return;
        }

        setRingingCall(latest);
      },
      (error) => {
        console.log(
          "Incoming call listener error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [uid]);

  /* ------------------------------------------------
     CALLER NAME
  ------------------------------------------------ */

  useEffect(() => {
    if (!ringingCall?.callerId) return;

    getDoc(doc(db, "users", ringingCall.callerId))
      .then((snapshot) => {
        if (snapshot.exists()) {
          setCallerName(
            snapshot.data().fullName || "Student"
          );
        }
      })
      .catch(() => {});
  }, [ringingCall?.callerId]);

  /* ------------------------------------------------
     ACTIONS
  ------------------------------------------------ */

  const acceptCall = async () => {
    if (!ringingCall) return;

    const call = ringingCall;

    try {
      setActionBusy(true);

      await updateDoc(doc(db, "calls", call.id), {
        status: "accepted",
        answeredAt: serverTimestamp(),
      });

      lastHandledCallRef.current = call.id;

      setRingingCall(null);

      navigate("VideoRoom", {
        roomName: call.room,
        callId: call.id,
      });
    } catch (error) {
      console.log("Accept call error:", error);

      Alert.alert(
        "Error",
        "Unable to accept the call."
      );
    } finally {
      setActionBusy(false);
    }
  };

  const rejectCall = async () => {
    if (!ringingCall) return;

    const call = ringingCall;

    try {
      await updateDoc(doc(db, "calls", call.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
    } catch (error) {
      console.log("Reject call error:", error);
    } finally {
      lastHandledCallRef.current = call.id;
      setRingingCall(null);
      setCallerName("");
    }
  };

  if (!ringingCall) return null;

  return (
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={rejectCall}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(callerName || "S")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <Text style={styles.emoji}>
            📹
          </Text>

          <Text style={styles.title}>
            Incoming Video Call
          </Text>

          <Text style={styles.name}>
            {callerName || "Student"}
          </Text>

          <Text style={styles.subtitle}>
            Accepting starts a private video call.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={rejectCall}
              disabled={actionBusy}
            >
              <Text style={styles.buttonText}>
                ✕ Decline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={acceptCall}
              disabled={actionBusy}
            >
              {actionBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  ✓ Accept
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5, 7, 10, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  card: {
    width: "100%",
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#312E81",
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#4F46E5",
    marginBottom: 12,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
  },

  emoji: {
    fontSize: 26,
    marginBottom: 6,
  },

  title: {
    color: "#A5B4FC",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },

  buttons: {
    flexDirection: "row",
    marginTop: 25,
    gap: 12,
  },

  declineButton: {
    flex: 1,
    backgroundColor: "#1F2937",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  acceptButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});