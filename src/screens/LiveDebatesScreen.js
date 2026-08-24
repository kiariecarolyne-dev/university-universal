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
    orderBy,
    query,
    where,
} from "firebase/firestore";

import { db } from "../services/firebase";

export default function LiveDebatesScreen({ navigation }) {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const debatesQuery = query(
      collection(db, "debateBattles"),
      where("isPublic", "==", true),
      where("isLive", "==", true),
      orderBy("acceptedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      debatesQuery,
      (snapshot) => {
        const liveDebates = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDebates(liveDebates);
        setLoading(false);
      },
      (error) => {
        console.log(
          "Live debates error:",
          error
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const renderDebate = ({ item }) => {
    const players = Object.values(
      item.players || {}
    );

    const playerOne = players[0];
    const playerTwo = players[1];

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
            👀 Watch
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
              {playerOne?.name || "Student"}
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
              {playerTwo?.name || "Student"}
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