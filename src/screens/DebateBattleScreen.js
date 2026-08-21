import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    doc,
    onSnapshot,
    updateDoc
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function DebateBattleScreen({ route, navigation }) {
  const { battleId } = route.params;

  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [position, setPosition] = useState(null);
  const [argument, setArgument] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!battleId) return;

    const battleRef = doc(
      db,
      "debateBattles",
      battleId
    );

    const unsubscribe = onSnapshot(
      battleRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          Alert.alert(
            "Battle Not Found",
            "This debate no longer exists."
          );

          navigation.goBack();
          return;
        }

        setBattle({
          id: snapshot.id,
          ...snapshot.data(),
        });

        setLoading(false);
      },
      (error) => {
        console.log("Debate battle error:", error);

        Alert.alert(
          "Error",
          "Unable to load the debate."
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [battleId]);

  const submitArgument = async () => {
    if (!position) {
      Alert.alert(
        "Choose a Position",
        "Choose FOR or AGAINST before submitting."
      );
      return;
    }

    if (!argument.trim()) {
      Alert.alert(
        "Write Your Argument",
        "Please write your argument first."
      );
      return;
    }

    if (!currentUser) return;

    try {
      setSubmitting(true);

      const battleRef = doc(
        db,
        "debateBattles",
        battleId
      );

      await updateDoc(battleRef, {
        [`players.${currentUser.uid}.position`]: position,

        [`players.${currentUser.uid}.argument`]:
          argument.trim(),

        currentRound: 1,

        status: "argument_submitted",
      });

      Alert.alert(
        "Argument Submitted",
        "Your argument has been submitted."
      );
    } catch (error) {
      console.log(
        "Submit argument error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to submit your argument."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !battle) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#818CF8"
        />

        <Text style={styles.loadingText}>
          Loading debate...
        </Text>
      </View>
    );
  }

  const myPlayer =
    battle.players?.[currentUser?.uid];

  const opponentId =
    Object.keys(battle.players || {}).find(
      (id) => id !== currentUser?.uid
    );

  const opponent =
    opponentId
      ? battle.players[opponentId]
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* HEADER */}

      <Text style={styles.emoji}>
        ⚔️
      </Text>

      <Text style={styles.title}>
        Debate Battle
      </Text>

      <Text style={styles.subtitle}>
        Think carefully. Defend your position.
      </Text>


      {/* PLAYERS */}

      <View style={styles.playersCard}>

        <View style={styles.player}>
          <Text style={styles.playerEmoji}>
            🧠
          </Text>

          <Text style={styles.playerName}>
            {myPlayer?.name || "You"}
          </Text>

          <Text style={styles.score}>
            {myPlayer?.score || 0} XP
          </Text>
        </View>

        <Text style={styles.vs}>
          VS
        </Text>

        <View style={styles.player}>
          <Text style={styles.playerEmoji}>
            🧠
          </Text>

          <Text style={styles.playerName}>
            {opponent?.name || "Opponent"}
          </Text>

          <Text style={styles.score}>
            {opponent?.score || 0} XP
          </Text>
        </View>

      </View>


      {/* TOPIC */}

      <View style={styles.topicCard}>

        <Text style={styles.category}>
          {battle.category}
        </Text>

        <Text style={styles.topic}>
          {battle.topic}
        </Text>

      </View>


      {/* INSTRUCTIONS */}

      <View style={styles.infoCard}>

        <Text style={styles.infoTitle}>
          🧠 Think critically
        </Text>

        <Text style={styles.infoText}>
          Choose a position and explain why you
          believe it is correct. Strong reasoning
          matters more than simply choosing a side.
        </Text>

      </View>


      {/* POSITION */}

      <Text style={styles.sectionTitle}>
        Choose your position
      </Text>

      <View style={styles.positionRow}>

        <TouchableOpacity
          style={[
            styles.positionButton,
            position === "FOR" &&
              styles.selectedFor,
          ]}
          onPress={() => setPosition("FOR")}
        >
          <Text style={styles.positionEmoji}>
            👍
          </Text>

          <Text style={styles.positionText}>
            FOR
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[
            styles.positionButton,
            position === "AGAINST" &&
              styles.selectedAgainst,
          ]}
          onPress={() => setPosition("AGAINST")}
        >
          <Text style={styles.positionEmoji}>
            👎
          </Text>

          <Text style={styles.positionText}>
            AGAINST
          </Text>
        </TouchableOpacity>

      </View>


      {/* ARGUMENT */}

      <Text style={styles.sectionTitle}>
        Your argument
      </Text>

      <TextInput
        value={argument}
        onChangeText={setArgument}
        placeholder="Explain your reasoning..."
        placeholderTextColor="#6B7280"
        multiline
        textAlignVertical="top"
        style={styles.argumentInput}
      />


      {/* SUBMIT */}

      <TouchableOpacity
        style={styles.submitButton}
        disabled={submitting}
        onPress={submitArgument}
      >

        {submitting ? (

          <ActivityIndicator color="#FFFFFF" />

        ) : (

          <Text style={styles.submitText}>
            ⚔️ Submit Argument
          </Text>

        )}

      </TouchableOpacity>


      {/* STATUS */}

      {battle.status ===
        "argument_submitted" && (

        <View style={styles.statusCard}>

          <Text style={styles.statusTitle}>
            ⏳ Waiting for the other student
          </Text>

          <Text style={styles.statusText}>
            Your argument has been submitted.
            The next round will begin when your
            opponent responds.
          </Text>

        </View>

      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  loading: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },

  emoji: {
    fontSize: 50,
    textAlign: "center",
    marginTop: 10,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
  },

  subtitle: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },

  playersCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 15,
  },

  player: {
    alignItems: "center",
    flex: 1,
  },

  playerEmoji: {
    fontSize: 28,
  },

  playerName: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },

  score: {
    color: "#818CF8",
    fontSize: 12,
    marginTop: 4,
  },

  vs: {
    color: "#EF4444",
    fontWeight: "900",
    marginHorizontal: 10,
  },

  topicCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 15,
  },

  category: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "uppercase",
  },

  topic: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 27,
    fontWeight: "700",
  },

  infoCard: {
    backgroundColor: "#0F172A",
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  infoTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 6,
  },

  infoText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },

  positionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  positionButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  selectedFor: {
    backgroundColor: "#052E16",
    borderColor: "#22C55E",
  },

  selectedAgainst: {
    backgroundColor: "#450A0A",
    borderColor: "#EF4444",
  },

  positionEmoji: {
    fontSize: 25,
  },

  positionText: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 5,
  },

  argumentInput: {
    minHeight: 140,
    backgroundColor: "#111827",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 15,
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 15,
  },

  submitButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  submitText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  statusCard: {
    backgroundColor: "#0F172A",
    borderRadius: 15,
    padding: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  statusTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  statusText: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

});