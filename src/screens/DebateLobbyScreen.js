import { useEffect, useState } from "react";

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
    addDoc,
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";


// -------------------------------------------------
// DEBATE TOPICS
// -------------------------------------------------

const DEBATE_TOPICS = [
  {
    topic:
      "Should university students be allowed to use AI for academic assignments?",
    category: "Technology & Education",
  },

  {
    topic:
      "Is a university degree still necessary for a successful career?",
    category: "Career",
  },

  {
    topic:
      "Should university education be completely free?",
    category: "Education",
  },

  {
    topic:
      "Does social media benefit university students more than it harms them?",
    category: "Society",
  },

  {
    topic:
      "Should employers prioritize skills over academic qualifications?",
    category: "Career",
  },

  {
    topic:
      "Should universities require students to attend classes physically?",
    category: "Education",
  },

  {
    topic:
      "Will artificial intelligence create more jobs than it destroys?",
    category: "Technology",
  },

  {
    topic:
      "Should university students be encouraged to start businesses before graduating?",
    category: "Entrepreneurship",
  },
];


// -------------------------------------------------
// GET RANDOM TOPIC
// -------------------------------------------------

function getRandomTopic() {
  const index = Math.floor(
    Math.random() * DEBATE_TOPICS.length
  );

  return DEBATE_TOPICS[index];
}


// -------------------------------------------------
// SCREEN
// -------------------------------------------------

export default function DebateLobbyScreen({
  route,
  navigation,
}) {
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const currentUser = auth.currentUser;


  // -------------------------------------------------
  // EXISTING BATTLE
  // -------------------------------------------------

  const battleId = route?.params?.battleId || null;
const opponent = route?.params?.opponent || null;


  // -------------------------------------------------
  // LISTEN TO BATTLE
  // -------------------------------------------------

  useEffect(() => {
    if (!battleId) {
      setLoading(false);
      return;
    }

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
            "This debate battle no longer exists."
          );

          navigation.goBack();
          return;
        }

        const data = snapshot.data();

        setBattle({
          id: snapshot.id,
          ...data,
        });

        setLoading(false);
      },
      (error) => {
        console.log(
          "Debate lobby error:",
          error
        );

        Alert.alert(
          "Error",
          "Unable to load the debate."
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [battleId]);


  // -------------------------------------------------
// ACCEPT DEBATE
// -------------------------------------------------

const acceptDebate = async () => {
  if (!currentUser || !battleId) {
    return;
  }

  try {
    setCreating(true);

    const battleRef = doc(
      db,
      "debateBattles",
      battleId
    );

    await updateDoc(battleRef, {
      status: "accepted",
      acceptedBy: currentUser.uid,
      acceptedAt: serverTimestamp(),
    });

    navigation.replace("DebateBattle", {
      battleId,
    });

  } catch (error) {
    console.log(
      "Accept debate error:",
      error
    );

    Alert.alert(
      "Error",
      "Unable to accept the debate."
    );

  } finally {
    setCreating(false);
  }
};

  // -------------------------------------------------
  // CREATE DEBATE
  // -------------------------------------------------

  const createDebate = async () => {
  if (!currentUser) {
    Alert.alert(
      "Login Required",
      "Please log in before starting a debate."
    );

    return;
  }

  if (!opponent?.id) {
    Alert.alert(
      "Opponent Required",
      "Please select a student to challenge."
    );

    return;
  }

  try {
    setCreating(true);

    const topic = getRandomTopic();

    const battleData = {
      topic: topic.topic,

      category: topic.category,

      status: "waiting",

      currentRound: 0,

      createdBy: currentUser.uid,

      opponentId: opponent.id,

      players: {
        [currentUser.uid]: {
          userId: currentUser.uid,

          name:
            currentUser.displayName ||
            "Student",

          email:
            currentUser.email || "",

          photo: "",

          position: null,

          argument: "",

          response: "",

          finalResponse: "",

          score: 0,
        },

        [opponent.id]: {
          userId: opponent.id,

          name:
            opponent.fullName ||
            "Student",

          email:
            opponent.email || "",

          photo:
            opponent.photo || "",

          position: null,

          argument: "",

          response: "",

          finalResponse: "",

          score: 0,
        },
      },

      createdAt: serverTimestamp(),
    };

    const battleRef = await addDoc(
      collection(db, "debateBattles"),
      battleData
    );

    navigation.replace("DebateLobby", {
      battleId: battleRef.id,
    });

  } catch (error) {
    console.log(
      "Create debate error:",
      error
    );

    Alert.alert(
      "Error",
      "Unable to create the debate."
    );

  } finally {
    setCreating(false);
  }
};

  // -------------------------------------------------
  // LOADING
  // -------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>

          <ActivityIndicator
            size="large"
            color="#818CF8"
          />

          <Text style={styles.loadingText}>
            Loading debate...
          </Text>

        </View>
      </SafeAreaView>
    );
  }


  // -------------------------------------------------
  // NO BATTLE YET
  // -------------------------------------------------

  if (!battle) {
    return (
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.container}>

          <Text style={styles.emoji}>
            ⚔️
          </Text>

          <Text style={styles.title}>
            Debate Battle
          </Text>

          <Text style={styles.subtitle}>
            Challenge another student and put
            your critical thinking to the test.
          </Text>


          <View style={styles.infoCard}>

            <Text style={styles.infoTitle}>
              🧠 How it works
            </Text>

            <Text style={styles.infoText}>
              Choose a position, make your argument,
              respond to your opponent and defend
              your ideas.
            </Text>

          </View>


          <TouchableOpacity
            style={styles.createButton}
            disabled={creating}
            onPress={createDebate}
          >

            {creating ? (

              <ActivityIndicator
                color="#FFFFFF"
              />

            ) : (

              <Text style={styles.createButtonText}>
  ⚔️ Send Debate Challenge
</Text>

            )}

          </TouchableOpacity>

        </View>

      </SafeAreaView>
    );
  }


// -------------------------------------------------
// WAITING / ACCEPT DEBATE
// -------------------------------------------------

const isOpponent =
  currentUser?.uid === battle?.opponentId;

const isCreator =
  currentUser?.uid === battle?.createdBy;

const debateAccepted =
  battle?.status === "accepted";


// -------------------------------------------------
// GO TO BATTLE AFTER ACCEPTANCE
// -------------------------------------------------

if (debateAccepted) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <Text style={styles.emoji}>
          ⚔️
        </Text>

        <Text style={styles.title}>
          Debate Accepted!
        </Text>

        <Text style={styles.subtitle}>
          The battle is ready. Prepare to defend
          your ideas.
        </Text>

        <View style={styles.topicCard}>

          <Text style={styles.category}>
            {battle.category}
          </Text>

          <Text style={styles.topic}>
            {battle.topic}
          </Text>

        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() =>
            navigation.replace("DebateBattle", {
              battleId,
            })
          }
        >
          <Text style={styles.createButtonText}>
            ⚔️ Enter Debate Battle
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}


// -------------------------------------------------
// OPPONENT RECEIVES CHALLENGE
// -------------------------------------------------

if (isOpponent) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <Text style={styles.emoji}>
          ⚔️
        </Text>

        <Text style={styles.title}>
          Debate Challenge
        </Text>

        <Text style={styles.subtitle}>
          {battle.players?.[battle.createdBy]?.name ||
            "A student"}{" "}
          has challenged you to a critical-thinking
          battle.
        </Text>


        {/* TOPIC */}

        <View style={styles.topicCard}>

          <Text style={styles.category}>
            {battle.category}
          </Text>

          <Text style={styles.topic}>
            {battle.topic}
          </Text>

        </View>


        {/* ACCEPT */}

        <TouchableOpacity
          style={styles.createButton}
          disabled={creating}
          onPress={acceptDebate}
        >

          {creating ? (

            <ActivityIndicator
              color="#FFFFFF"
            />

          ) : (

            <Text style={styles.createButtonText}>
              ⚔️ Accept Challenge
            </Text>

          )}

        </TouchableOpacity>


        {/* DECLINE */}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >

          <Text style={styles.cancelText}>
            Decline
          </Text>

        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}


// -------------------------------------------------
// CREATOR WAITING
// -------------------------------------------------

return (
  <SafeAreaView style={styles.safeArea}>

    <View style={styles.container}>

      <Text style={styles.emoji}>
        ⚔️
      </Text>

      <Text style={styles.title}>
        Waiting for {opponent?.fullName || "Student"}
      </Text>

      <Text style={styles.subtitle}>
        Your debate challenge has been sent.
        Waiting for the other student to accept.
      </Text>


      {/* TOPIC */}

      <View style={styles.topicCard}>

        <Text style={styles.category}>
          {battle.category}
        </Text>

        <Text style={styles.topic}>
          {battle.topic}
        </Text>

      </View>


      {/* WAITING */}

      <View style={styles.waitingCard}>

        <ActivityIndicator
          size="small"
          color="#818CF8"
        />

        <Text style={styles.waitingText}>
          Waiting for opponent to accept...
        </Text>

      </View>


      {/* CANCEL */}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >

        <Text style={styles.cancelText}>
          Cancel
        </Text>

      </TouchableOpacity>

    </View>

  </SafeAreaView>
);
}

// -------------------------------------------------
// STYLES
// -------------------------------------------------

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
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

  emoji: {
    fontSize: 55,
    textAlign: "center",
    marginBottom: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 25,
  },

  infoCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 20,
  },

  infoTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },

  infoText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
  },

  createButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
    textTransform: "uppercase",
    marginBottom: 10,
  },

  topic: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 27,
    fontWeight: "700",
  },

  waitingCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  waitingText: {
    color: "#9CA3AF",
    marginLeft: 10,
    fontSize: 13,
  },

  cancelButton: {
    marginTop: 15,
    alignItems: "center",
    padding: 12,
  },

  cancelText: {
    color: "#9CA3AF",
    fontWeight: "700",
  },

});