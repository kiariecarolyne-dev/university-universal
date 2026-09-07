import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    collection,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";

import { db } from "../services/firebase";

import useResolvedNames from "../hooks/useResolvedNames";
import {
    getDebatePlayers,
    isDebateFinished,
} from "../utils/debates";

export default function LiveDebatesScreen({ navigation }) {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const allPlayers = debates.flatMap(
    (debate) =>
      Object.values(debate?.players || {})
  );

  const resolvedNames =
    useResolvedNames(allPlayers);

  useEffect(() => {
    const debatesQuery = query(
      collection(db, "debateBattles"),
      where("isPublic", "==", true),
      where("isLive", "==", true)
    );

    const unsubscribe = onSnapshot(
      debatesQuery,
      (snapshot) => {
        const liveDebates = [];

        snapshot.forEach((docSnap) => {
          const data = {
            id: docSnap.id,
            ...docSnap.data(),
          };

          // Finished debates (both final defenses submitted) are no
          // longer live. Filtering client-side avoids the composite
          // index that orderBy("acceptedAt") would require.
          if (isDebateFinished(data)) {
            return;
          }

          liveDebates.push(data);
        });

        // Newest accepted first.
        liveDebates.sort((a, b) => {
          const aTime =
            a.acceptedAt?.toMillis?.() || 0;
          const bTime =
            b.acceptedAt?.toMillis?.() || 0;

          return bTime - aTime;
        });

        setDebates(liveDebates);
        setLoading(false);
      },
      (error) => {
        console.log(
          "Live debates error:",
          error
        );

        setError(
          "Unable to load live debates. Please try again."
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const renderDebate = ({ item }) => {
    const { playerOne, playerTwo } =
      getDebatePlayers(item);

    const nameOf = (player) =>
      resolvedNames[player?.userId] ||
      player?.name ||
      "Student";

    return (
      <TouchableOpacity
        style={styles.debateCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("DebateBattle", {
            battleId: item.id,
            spectator: true,
          })
        }
      >

        {/* LIVE HEADER */}

        <View style={styles.liveRow}>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />

            <Text style={styles.liveText}>
              LIVE
            </Text>
          </View>

          <Text style={styles.watchText}>
            👥 {item.liveViewers || 0} watching
          </Text>

        </View>


        {/* CATEGORY */}

        <Text style={styles.category}>
          {item.category}
        </Text>


        {/* TOPIC */}

        <Text style={styles.topic}>
          {item.topic}
        </Text>


        {/* PLAYERS */}

        <View style={styles.playersRow}>

          <View style={styles.player}>

            <Text style={styles.playerEmoji}>
              🧠
            </Text>

            <Text
              style={styles.playerName}
              numberOfLines={1}
            >
              {nameOf(playerOne)}
            </Text>

            {playerOne?.position && (
              <Text
                style={[
                  styles.position,
                  playerOne.position === "FOR"
                    ? styles.forText
                    : styles.againstText,
                ]}
              >
                {playerOne.position}
              </Text>
            )}

          </View>


          <Text style={styles.vs}>
            VS
          </Text>


          <View style={styles.player}>

            <Text style={styles.playerEmoji}>
              🧠
            </Text>

            <Text
              style={styles.playerName}
              numberOfLines={1}
            >
              {nameOf(playerTwo)}
            </Text>

            {playerTwo?.position && (
              <Text
                style={[
                  styles.position,
                  playerTwo.position === "FOR"
                    ? styles.forText
                    : styles.againstText,
                ]}
              >
                {playerTwo.position}
              </Text>
            )}

          </View>

        </View>


        {/* ROUND */}

        <View style={styles.roundContainer}>

          <Text style={styles.roundText}>
            ⚔️ Round {item.currentRound || 1}
          </Text>

          <Text style={styles.joinText}>
            👀 Watch Debate →
          </Text>

        </View>

      </TouchableOpacity>
    );
  };


  // -------------------------------------------------
  // LOADING
  // -------------------------------------------------

  if (loading) {
    return (
      <View style={styles.center}>

        <ActivityIndicator
          size="large"
          color="#818CF8"
        />

        <Text style={styles.loadingText}>
          Finding live debates...
        </Text>

      </View>
    );
  }


  // -------------------------------------------------
  // ERROR
  // -------------------------------------------------

  if (error) {
    return (
      <View style={styles.center}>

        <Text style={styles.emptyEmoji}>
          ⚠️
        </Text>

        <Text style={styles.emptyTitle}>
          Something went wrong
        </Text>

        <Text style={styles.emptyText}>
          {error}
        </Text>

      </View>
    );
  }


  // -------------------------------------------------
  // EMPTY
  // -------------------------------------------------

  if (debates.length === 0) {
    return (
      <View style={styles.center}>

        <Text style={styles.emptyEmoji}>
          ⚔️
        </Text>

        <Text style={styles.emptyTitle}>
          No Live Debates
        </Text>

        <Text style={styles.emptyText}>
          There are no public debates happening
          right now.

          {"\n\n"}

          Start a debate and challenge another
          student to become the next live battle!
        </Text>

      </View>
    );
  }


  // -------------------------------------------------
  // LIVE DEBATES
  // -------------------------------------------------

  return (
    <View style={styles.container}>

      <View style={styles.header}>

        <Text style={styles.headerEmoji}>
          🔥
        </Text>

        <View style={{ flex: 1 }}>

          <Text style={styles.title}>
            Live Debates
          </Text>

          <Text style={styles.subtitle}>
            Watch students battle their ideas live
          </Text>

        </View>

      </View>


      <FlatList
        data={debates}
        keyExtractor={(item) => item.id}
        renderItem={renderDebate}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

    </View>
  );
}


// -------------------------------------------------
// STYLES
// -------------------------------------------------

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  center: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },

  headerEmoji: {
    fontSize: 36,
    marginRight: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 3,
  },

  list: {
    padding: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },

  debateCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#312E81",
  },

  liveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#450A0A",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginRight: 6,
  },

  liveText: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "900",
  },

  watchText: {
    color: "#A5B4FC",
    fontSize: 12,
    fontWeight: "800",
  },

  category: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  topic: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: 18,
  },

  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  player: {
    flex: 1,
    alignItems: "center",
  },

  playerEmoji: {
    fontSize: 25,
  },

  playerName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 5,
    maxWidth: 110,
  },

  position: {
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },

  forText: {
    color: "#22C55E",
  },

  againstText: {
    color: "#EF4444",
  },

  vs: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "900",
    marginHorizontal: 10,
  },

  roundContainer: {
    marginTop: 18,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  roundText: {
    color: "#A5B4FC",
    fontSize: 12,
    fontWeight: "800",
  },

  joinText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "900",
  },

  emptyEmoji: {
    fontSize: 55,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },

});