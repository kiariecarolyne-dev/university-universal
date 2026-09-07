import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

import { CALL_TIMEOUT_SECONDS } from "../utils/calls";

export default function OutgoingCallScreen({
  route,
  navigation,
}) {
  const callId = route?.params?.callId;

  const [call, setCall] = useState(null);

  const [calleeName, setCalleeName] = useState("");

  const statusRef = useRef("ringing");

  /* ------------------------------------------------
     LISTEN TO THE CALL DOC
  ------------------------------------------------ */

  useEffect(() => {
    if (!callId) {
      navigation.goBack();
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "calls", callId),
      (snapshot) => {
        if (!snapshot.exists()) {
          statusRef.current = "cancelled";
          navigation.goBack();
          return;
        }

        setCall({
          id: snapshot.id,
          ...snapshot.data(),
        });
      },
      (error) => {
        console.log(
          "Outgoing call error:",
          error
        );

        Alert.alert(
          "Call Error",
          "Unable to load the call."
        );

        navigation.goBack();
      }
    );

    return unsubscribe;
  }, [callId]);

  /* ------------------------------------------------
     HANDLE CALL TRANSITIONS
  ------------------------------------------------ */

  useEffect(() => {
    if (!call) return;

    statusRef.current = call.status;

    if (call.status === "accepted") {
      navigation.replace("VideoRoom", {
        roomName: call.room,
        callId: call.id,
      });
      return;
    }

    if (call.status === "rejected") {
      Alert.alert(
        "Call Declined",
        "The student declined your call.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    if (call.status === "timed-out") {
      Alert.alert(
        "No Answer",
        "The student did not answer your call.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    if (call.status === "cancelled") {
      navigation.goBack();
    }
  }, [call]);

  /* ------------------------------------------------
     AUTO TIMEOUT
  ------------------------------------------------ */

  useEffect(() => {
    if (!callId) return;

    const timer = setTimeout(() => {
      if (statusRef.current !== "ringing") return;

      updateDoc(doc(db, "calls", callId), {
        status: "timed-out",
      }).catch(() => {
        navigation.goBack();
      });
    }, CALL_TIMEOUT_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [callId]);

  /* ------------------------------------------------
     MARK CANCELLED IF THE CALLER LEAVES THE SCREEN
  ------------------------------------------------ */

  useEffect(() => {
    return () => {
      if (statusRef.current === "ringing") {
        updateDoc(doc(db, "calls", callId), {
          status: "cancelled",
        }).catch(() => {});
      }
    };
  }, [callId]);

  /* ------------------------------------------------
     CALLEE NAME
  ------------------------------------------------ */

  useEffect(() => {
    if (!call?.calleeId) return;

    getDoc(doc(db, "users", call.calleeId))
      .then((snapshot) => {
        if (snapshot.exists()) {
          setCalleeName(
            snapshot.data().fullName || "Student"
          );
        }
      })
      .catch(() => {});
  }, [call?.calleeId]);

  const cancelCall = () => {
    updateDoc(doc(db, "calls", callId), {
      status: "cancelled",
    }).catch(() => {});

    navigation.goBack();
  };

  /* ------------------------------------------------
     LOADING
  ------------------------------------------------ */

  if (!call) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#4F46E5"
          />

          <Text style={styles.loadingText}>
            Starting call...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------
     RINGING
  ------------------------------------------------ */

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        call.status === "accepted" &&
          styles.connected,
      ]}
    >
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(calleeName ||
              "Student").charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>
          {calleeName || "Student"}
        </Text>

        <Text style={styles.stateText}>
          {call.status === "ringing"
            ? "📞 Calling..."
            : "Connecting..."}
        </Text>

        <Text style={styles.hint}>
          Waiting for the student to accept...
        </Text>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelCall}
        >
          <Text style={styles.cancelText}>
            ✕ Cancel Call
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  connected: {
    backgroundColor: "#052E16",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#4F46E5",
    marginBottom: 25,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "900",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },

  stateText: {
    color: "#A5B4FC",
    fontSize: 15,
    marginTop: 10,
  },

  hint: {
    color: "#4B5563",
    fontSize: 12,
    marginTop: 4,
  },

  cancelButton: {
    marginTop: 50,
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    paddingHorizontal: 55,
    borderRadius: 50,
  },

  cancelText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});