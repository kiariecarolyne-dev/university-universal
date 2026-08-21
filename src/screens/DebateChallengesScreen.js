import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    collection,
    doc,
    onSnapshot,
    query,
    updateDoc,
    where,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function DebateChallengesScreen({
  navigation,
}) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const challengesQuery = query(
      collection(db, "debateBattles"),
      where(
        "opponentId",
        "==",
        currentUserId
      ),
      where(
        "status",
        "==",
        "waiting"
      )
    );

    const unsubscribe = onSnapshot(
      challengesQuery,
      (snapshot) => {
        const data = snapshot.docs.map(
          (challengeDoc) => ({
            id: challengeDoc.id,
            ...challengeDoc.data(),
          })
        );

        setChallenges(data);
        setLoading(false);
      },
      (error) => {
        console.log(
          "Debate challenges error:",
          error
        );

        Alert.alert(
          "Error",
          "Unable to load debate challenges."
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUserId]);

  const acceptChallenge = async (challenge) => {
    try {
      const challengeRef = doc(
        db,
        "debateBattles",
        challenge.id
      );

      await updateDoc(challengeRef, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      navigation.replace(
  "DebateBattle",
  {
    battleId: challenge.id,
  }
);

    } catch (error) {
      console.log(
        "Accept challenge error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to accept the challenge."
      );
    }
  };

  const declineChallenge = async (challenge) => {
    try {
      const challengeRef = doc(
        db,
        "debateBattles",
        challenge.id
      );

      await updateDoc(challengeRef, {
        status: "declined",
      });

    } catch (error) {
      console.log(
        "Decline challenge error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to decline the challenge."
      );
    }
  };

  const renderChallenge = ({
    item,
  }) => {
    const creator =
      item.players?.[item.createdBy];

    return (
      <View style={styles.challengeCard}>

        <Text style={styles.challengeEmoji}>
          ⚔️
        </Text>

        <View style={styles.challengeContent}>

          <Text style={styles.challengeTitle}>
            Debate Challenge
          </Text>

          <Text style={styles.challengeFrom}>
            {creator?.name ||
              "A student"}{" "}
            wants to challenge you!
          </Text>

          <Text style={styles.category}>
            {item.category}
          </Text>

          <Text style={styles.topic}>
            {item.topic}
          </Text>


          <View style={styles.buttonsRow}>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() =>
                acceptChallenge(item)
              }
            >
              <Text
                style={styles.acceptText}
              >
                ⚔️ Accept
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.declineButton}
              onPress={() =>
                declineChallenge(item)
              }
            >
              <Text
                style={styles.declineText}
              >
                Decline
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </View>
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.center}>

          <ActivityIndicator
            size="large"
            color="#818CF8"
          />

          <Text style={styles.loadingText}>
            Loading challenges...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.container}>

        <Text style={styles.title}>
          ⚔️ Debate Challenges
        </Text>

        <Text style={styles.subtitle}>
          Test your ideas against another
          university student.
        </Text>


        <FlatList
          data={challenges}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={renderChallenge}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            challenges.length === 0
              ? styles.emptyList
              : styles.list
          }

          ListEmptyComponent={
            <View style={styles.emptyContainer}>

              <Text style={styles.emptyEmoji}>
                🧠
              </Text>

              <Text style={styles.emptyTitle}>
                No debate challenges
              </Text>

              <Text style={styles.emptyText}>
                When another student challenges
                you, their debate will appear here.
              </Text>

            </View>
          }
        />

      </View>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  container: {
    flex: 1,
    padding: 16,
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

  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 15,
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
  },

  list: {
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyContainer: {
    alignItems: "center",
    padding: 25,
  },

  emptyEmoji: {
    fontSize: 55,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },

  challengeCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    flexDirection: "row",
    marginBottom: 14,
  },

  challengeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },

  challengeContent: {
    flex: 1,
  },

  challengeTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  challengeFrom: {
    color: "#C7D2FE",
    fontSize: 13,
    marginTop: 5,
  },

  category: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 12,
    textTransform: "uppercase",
  },

  topic: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    marginTop: 5,
  },

  buttonsRow: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },

  acceptButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  acceptText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  declineButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1F2937",
    alignItems: "center",
  },

  declineText: {
    color: "#D1D5DB",
    fontWeight: "700",
  },

});