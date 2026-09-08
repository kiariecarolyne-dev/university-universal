import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
import useUser from "../hooks/useUser";
import MatchCard from "../components/MatchCard";
import MatchModal from "../components/MatchModal";
import { buildCandidateBatch } from "../utils/matching";
import { createNotification } from "../utils/notifications";

export default function MatchSwipeScreen({ route, navigation }) {
  const { mode = "match" } = route.params || {};
  const user = useUser();

  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipedIds, setSwipedIds] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [swipedLoaded, setSwipedLoaded] = useState(false);
  const [blockedLoaded, setBlockedLoaded] = useState(false);
  const [matchCandidate, setMatchCandidate] = useState(null);
  const [matchVisible, setMatchVisible] = useState(false);

  const uid = auth.currentUser?.uid;

  // Load own likes (swiped IDs) — one-shot
  useEffect(() => {
    if (!uid) return;
    let mounted = true;

    const loadSwiped = async () => {
      try {
        const q = query(
          collection(db, "likes"),
          where("fromUid", "==", uid)
        );
        const snap = await getDocs(q);
        if (!mounted) return;
        setSwipedIds(snap.docs.map((d) => d.data().toUid));
      } catch (error) {
        console.log("Load swiped error:", error);
      } finally {
        if (mounted) setSwipedLoaded(true);
      }
    };

    loadSwiped();
    return () => { mounted = false; };
  }, [uid]);

  // Listen to own blocks — real-time (small collection)
  useEffect(() => {
    if (!uid) return;

    const blocksRef = collection(db, "users", uid, "blocks");
    const unsubscribe = onSnapshot(
      blocksRef,
      (snap) => {
        setBlockedIds(snap.docs.map((d) => d.id));
        setBlockedLoaded(true);
      },
      () => setBlockedLoaded(true)
    );

    return unsubscribe;
  }, [uid]);

  // Load candidates once both swiped + blocked are known (bounded batch).
  const loadCandidates = useCallback(async () => {
    if (!uid || !user) return;
    if (!swipedLoaded || !blockedLoaded) return;

    try {
      setLoading(true);

      const usersQuery = query(
        collection(db, "users"),
        limit(20)
      );

      const snap = await getDocs(usersQuery);

      const allUsers = snap.docs
        .filter((d) => d.id !== uid)
        .map((d) => ({ id: d.id, ...d.data() }));

      const batch = buildCandidateBatch({
        allUsers,
        currentUserId: uid,
        swipedIds,
        blockedIds,
        me: user,
        limit: 20,
      });

      setCandidates(batch);
      setCurrentIndex(0);
    } catch (error) {
      console.log("Load candidates error:", error);
    } finally {
      setLoading(false);
    }
  }, [uid, user, swipedLoaded, blockedLoaded, swipedIds, blockedIds]);

  useEffect(() => {
    if (!uid || !user) return;
    loadCandidates();
  }, [uid, user, swipedLoaded, blockedLoaded, loadCandidates]);

  // WRITE LIKE
  const handleLike = async () => {
    const candidate = candidates[currentIndex];
    if (!candidate || !uid) return;

    try {
      // Deterministic like doc ID: {fromUid}_{toUid} in author order
      const likeId = `${uid}_${candidate.id}`;

      await setDoc(doc(db, "likes", likeId), {
        fromUid: uid,
        toUid: candidate.id,
        status: "like",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Check if they already liked us (reverse doc: {theirId}_{myId})
      const theirLikeId = `${candidate.id}_${uid}`;
      const theirLikeSnap = await getDoc(doc(db, "likes", theirLikeId));

      if (
        theirLikeSnap.exists() &&
        theirLikeSnap.data().status === "like"
      ) {
        // MUTUAL MATCH — pairId uses sorted order to mirror privateChats
        const pairId =
          uid < candidate.id
            ? `${uid}_${candidate.id}`
            : `${candidate.id}_${uid}`;

        await setDoc(doc(db, "matches", pairId), {
          users: [uid, candidate.id].sort(),
          matchedAt: serverTimestamp(),
          status: "active",
        });

        await createNotification({
          recipientId: candidate.id,
          type: "match",
          title: "🎉 It's a Match!",
          message: `You and ${user.fullName || "a student"} matched!`,
          fromUserId: uid,
          fromUserName: user.fullName || "Student",
          fromUserPhoto: user.photo || "",
        });

        setMatchCandidate(candidate);
        setMatchVisible(true);
      }

      setSwipedIds((prev) => [...prev, candidate.id]);
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      console.log("Like error:", error);
      Alert.alert("Error", "Failed to record like. Please try again.");
    }
  };

  // WRITE PASS
  const handlePass = async () => {
    const candidate = candidates[currentIndex];
    if (!candidate || !uid) return;

    try {
      const likeId = `${uid}_${candidate.id}`;

      await setDoc(doc(db, "likes", likeId), {
        fromUid: uid,
        toUid: candidate.id,
        status: "pass",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSwipedIds((prev) => [...prev, candidate.id]);
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      console.log("Pass error:", error);
    }
  };

  // Block user
  const handleBlock = async () => {
    const candidate = candidates[currentIndex];
    if (!candidate || !uid) return;

    Alert.alert(
      "Block User",
      `Block ${candidate.fullName || "this student"}? They won't appear in your deck.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await setDoc(
                doc(db, "users", uid, "blocks", candidate.id),
                { blockedUid: candidate.id, blockedAt: serverTimestamp() }
              );
              setCurrentIndex((prev) => prev + 1);
            } catch (error) {
              console.log("Block error:", error);
            }
          },
        },
      ]
    );
  };

  // Match modal close
  const onMatchClose = () => {
    setMatchVisible(false);
    setMatchCandidate(null);
  };

  // Navigate to chat from match modal
  const onMatchChat = () => {
    setMatchVisible(false);
    const c = matchCandidate;
    setMatchCandidate(null);

    if (c) {
      navigation.navigate("PrivateChat", {
        student: {
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          photo: c.photo,
        },
      });
    }
  };

  // ALL HOOKS ABOVE — early returns below

  if (!user) return null;

  const currentCandidate = candidates[currentIndex];
  const exhausted = currentIndex >= candidates.length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Finding candidates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MatchModal
        visible={matchVisible}
        candidate={matchCandidate}
        onClose={onMatchClose}
        onChat={onMatchChat}
      />

      {exhausted ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>
            {mode === "friend" ? "🤝" : "❤️"}
          </Text>
          <Text style={styles.emptyTitle}>
            {mode === "friend"
              ? "You are all caught up"
              : "No more candidates"}
          </Text>
          <Text style={styles.emptyHint}>
            New students may appear soon. Update your interests in Match
            Preferences for more suggestions.
          </Text>
          <View style={styles.emptyBtnRow}>
            <TouchableOpacity
              style={styles.prefsBtn}
              onPress={() => navigation.navigate("MatchPreferences")}
            >
              <Text style={styles.prefsBtnText}>Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={loadCandidates}
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : currentCandidate ? (
        <>
          {/* MODE BADGE */}
          <View style={styles.modeRow}>
            <Text style={styles.modeText}>
              {mode === "friend" ? "🤝 Friendship Mode" : "❤️ Match Mode"}
            </Text>
            <Text style={styles.countText}>
              {currentIndex + 1} / {candidates.length}
            </Text>
          </View>

          {/* CARD */}
          <MatchCard candidate={currentCandidate} />

          {/* ACTION BUTTONS */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.passBtn}
              onPress={handlePass}
            >
              <Text style={styles.passBtnText}>✕ Pass</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.blockBtn}
              onPress={handleBlock}
            >
              <Text style={styles.blockBtnText}>🚫</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.likeBtn}
              onPress={handleLike}
            >
              <Text style={styles.likeBtnText}>❤️ Like</Text>
            </TouchableOpacity>
          </View>

          {/* DISCLAIMER */}
          <Text style={styles.disclaimer}>
            App-generated compatibility estimate
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },
  center: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 14,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 8,
  },
  modeText: {
    color: "#818CF8",
    fontSize: 14,
    fontWeight: "700",
  },
  countText: {
    color: "#6B7280",
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  passBtn: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  passBtnText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "800",
  },
  blockBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  blockBtnText: {
    fontSize: 20,
  },
  likeBtn: {
    flex: 1,
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  likeBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  disclaimer: {
    color: "#6B7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyHint: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  refreshBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  refreshBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  prefsBtn: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  prefsBtnText: {
    color: "#D1D5DB",
    fontWeight: "700",
    fontSize: 14,
  },
};