import { useEffect, useRef, useState } from "react";

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
  collection,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useResolvedNames from "../hooks/useResolvedNames";
import {
  getDebatePlayers,
  isDebateFinished,
} from "../utils/debates";

export default function DebateBattleScreen({
  route,
  navigation,
}) {
  const { battleId } = route.params;

  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [position, setPosition] = useState(null);
  const [argument, setArgument] = useState("");
  const [response, setResponse] = useState("");
  const [finalResponse, setFinalResponse] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [voting, setVoting] = useState(false);

  const [votes, setVotes] = useState([]);

  // Guards so viewer counting and the finish write happen once only.
  const viewerAnnouncedRef = useRef(false);
  const finishAnnouncedRef = useRef(false);

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

  /* -------------------------------------------------
     AUDIENCE VOTES (subcollection, one doc per voter)
  ------------------------------------------------- */

  useEffect(() => {
    if (!battleId) return;

    const unsubscribe = onSnapshot(
      collection(
        db,
        "debateBattles",
        battleId,
        "votes"
      ),
      (snapshot) => {
        const loaded = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          loaded.push({
            uid: docSnap.id,
            votedFor: data.votedFor,
          });
        });

        setVotes(loaded);
      },
      (error) => {
        console.log(
          "Debate votes error:",
          error
        );
      }
    );

    return unsubscribe;
  }, [battleId]);

  /* -------------------------------------------------
     FINISH LIFECYCLE + LIVE VIEWER COUNT
  ------------------------------------------------- */

  useEffect(() => {
    if (!battle) return;

    const uid = auth.currentUser?.uid;

    const battleRef = doc(
      db,
      "debateBattles",
      battleId
    );

    const isParticipant = Boolean(
      battle.players?.[uid]
    );

    // Once both final defenses exist, participants mark the debate
    // as finished and pull it from the live feed. Idempotent with
    // last-write-wins, guarded by a ref so it only runs once.
    const finished = isDebateFinished(battle);

    if (
      finished &&
      isParticipant &&
      battle.status !== "finished" &&
      !finishAnnouncedRef.current
    ) {
      finishAnnouncedRef.current = true;

      updateDoc(battleRef, {
        status: "finished",
        isLive: false,
        endedAt: serverTimestamp(),
      }).catch(() => {
        finishAnnouncedRef.current = false;
      });
    }

    // Count spectators for the live feed (approximate; stale if the
    // app is force-killed while watching).
    const isViewer = !isParticipant;

    if (
      isViewer &&
      !viewerAnnouncedRef.current
    ) {
      viewerAnnouncedRef.current = true;

      updateDoc(battleRef, {
        liveViewers: increment(1),
      }).catch(() => {});
    }
  }, [battle]);

  useEffect(() => {
    return () => {
      if (viewerAnnouncedRef.current) {
        updateDoc(
          doc(db, "debateBattles", battleId),
          {
            liveViewers: increment(-1),
          }
        ).catch(() => {});
      }
    };
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

  // Spectators are read-only: only debate participants may submit.
  if (!battle?.players?.[currentUser.uid]) {
    Alert.alert(
      "Spectator Mode",
      "Only debate participants can submit responses."
    );
    return;
  }

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
    });

    Alert.alert(
      "Argument Submitted",
      "Your opening argument has been submitted."
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

const submitResponse = async () => {
  if (!response.trim()) {
    Alert.alert(
      "Write Your Response",
      "Please respond to your opponent's argument."
    );
    return;
  }

  if (!currentUser) return;

  // Spectators are read-only: only debate participants may submit.
  if (!battle?.players?.[currentUser.uid]) {
    Alert.alert(
      "Spectator Mode",
      "Only debate participants can submit responses."
    );
    return;
  }

  try {
    setSubmitting(true);

    const battleRef = doc(
      db,
      "debateBattles",
      battleId
    );

    await updateDoc(battleRef, {
      [`players.${currentUser.uid}.response`]:
        response.trim(),
    });

    Alert.alert(
      "Response Submitted",
      "Your response has been submitted."
    );

  } catch (error) {
    console.log(
      "Submit response error:",
      error
    );

    Alert.alert(
      "Error",
      "Unable to submit your response."
    );

  } finally {
    setSubmitting(false);
  }
};

const submitFinalResponse = async () => {
  if (!finalResponse.trim()) {
    Alert.alert(
      "Write Your Final Defense",
      "Please write your final response."
    );
    return;
  }

  if (!currentUser) return;

  // Spectators are read-only: only debate participants may submit.
  if (!battle?.players?.[currentUser.uid]) {
    Alert.alert(
      "Spectator Mode",
      "Only debate participants can submit responses."
    );
    return;
  }

  try {
    setSubmitting(true);

    const battleRef = doc(
      db,
      "debateBattles",
      battleId
    );

    await updateDoc(battleRef, {
      [`players.${currentUser.uid}.finalResponse`]:
        finalResponse.trim(),
    });

    Alert.alert(
      "Final Response Submitted",
      "Your final defense has been submitted."
    );

  } catch (error) {
    console.log(
      "Submit final response error:",
      error
    );

    Alert.alert(
      "Error",
      "Unable to submit your final response."
    );

  } finally {
    setSubmitting(false);
  }
};


// -------------------------------------------------
// AUDIENCE VOTING
// -------------------------------------------------

const voteForDebater = async (playerId) => {
  if (!currentUser) {
    Alert.alert(
      "Login Required",
      "Please log in to vote."
    );
    return;
  }

  // Any authenticated user (participant OR spectator) may vote once
  // the debate is finished. One vote doc per uid = one vote per user.

  // Make sure the selected player actually exists
  if (!playerId) {
    Alert.alert(
      "Voting Error",
      "That debater could not be found."
    );
    return;
  }

  // Only allow voting after the debate is finished
  if (!debateFinished) {
    Alert.alert(
      "Voting Not Open",
      "Audience voting will open when the debate is complete."
    );
    return;
  }

  try {
    setVoting(true);

    // One vote doc per voter (doc id = uid), so a user can never
    // vote more than once. Overwriting the same id changes the vote.
    const voteRef = doc(
      db,
      "debateBattles",
      battleId,
      "votes",
      currentUser.uid
    );

    await setDoc(voteRef, {
      votedFor: playerId,
      createdAt: serverTimestamp(),
    });

    Alert.alert(
      "Vote Cast",
      "Thanks for voting!"
    );

  } catch (error) {
    console.log(
      "Audience vote error:",
      error
    );

    Alert.alert(
      "Vote Failed",
      "Unable to submit your vote. Please try again."
    );

  } finally {
    setVoting(false);
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

const isParticipant = Boolean(myPlayer);

const isSpectator = !isParticipant;

// Deterministic player order: creator (challenger) is always player
// one, the opponent is always player two. Object.values() order is
// NOT reliable for Firestore maps, which caused the "A vs Student"
// mismatch.
const { playerOne, playerTwo } =
  getDebatePlayers(battle);

// Older battles stored "Student" as the creator's name (null auth
// displayName). Resolve the real name from the users collection.
const resolvedNames = useResolvedNames(
  battle
    ? Object.values(battle.players || {})
    : []
);

const displayName = (player, fallback = "Student") =>
  resolvedNames[player?.userId] ||
  player?.name ||
  fallback;

  const opponentId =
    Object.keys(battle.players || {}).find(
      (id) => id !== currentUser?.uid
    );

  const opponent =
    opponentId
      ? battle.players[opponentId]
      : null;

      const opponentArgument =
  opponent?.argument || "";

const opponentResponse =
  opponent?.response || "";

const myArgument =
  myPlayer?.argument || "";

const myResponse =
  myPlayer?.response || "";

const myFinalResponse =
  myPlayer?.finalResponse || "";

const opponentFinalResponse =
  opponent?.finalResponse || "";

const bothArgumentsSubmitted =
  Boolean(myArgument && opponentArgument);

const bothResponsesSubmitted =
  Boolean(myResponse && opponentResponse);

// Battle-level finish condition so BOTH participants and spectators
// (who have no myPlayer) agree on when voting opens: once both final
// defenses exist (or the battle has been marked finished).
const debateFinished = isDebateFinished(battle);

  // -------------------------------------------------
// LIVE ROUND STATUS
// -------------------------------------------------

const playerOneArgument =
  playerOne?.argument || "";

const playerTwoArgument =
  playerTwo?.argument || "";

const playerOneResponse =
  playerOne?.response || "";

const playerTwoResponse =
  playerTwo?.response || "";

const playerOneFinal =
  playerOne?.finalResponse || "";

const playerTwoFinal =
  playerTwo?.finalResponse || "";

const bothOpeningArguments =
  Boolean(
    playerOneArgument &&
    playerTwoArgument
  );

const bothRebuttals =
  Boolean(
    playerOneResponse &&
    playerTwoResponse
  );

const bothFinalResponses =
  Boolean(
    playerOneFinal &&
    playerTwoFinal
  );

// Current round for spectators
const spectatorRound =
  !bothOpeningArguments
    ? 1
    : !bothRebuttals
    ? 2
    : !bothFinalResponses
    ? 3
    : 4;

    // -------------------------------------------------
// AUDIENCE VOTE RESULTS
// -------------------------------------------------

const votesFor = (playerId) =>
  votes.filter(
    (vote) => vote.votedFor === playerId
  ).length;

const playerOneVotes = votesFor(
  playerOne?.userId
);

const playerTwoVotes = votesFor(
  playerTwo?.userId
);

const totalAudienceVotes =
  playerOneVotes + playerTwoVotes;

const playerOnePercentage =
  totalAudienceVotes > 0
    ? Math.round(
        (playerOneVotes / totalAudienceVotes) * 100
      )
    : 0;

const playerTwoPercentage =
  totalAudienceVotes > 0
    ? Math.round(
        (playerTwoVotes / totalAudienceVotes) * 100
      )
    : 0;

const myVote =
  currentUser
    ? votes.find(
        (vote) => vote.uid === currentUser.uid
      )?.votedFor || null
    : null;

  // Shared "who won" voting + result card shown to BOTH spectators and
  // participants once the debate is finished. Only rendered when
  // `debateFinished` (battle-level) is true.
  const renderVotingAndResult = () => {
    if (!debateFinished) return null;

    return (
      <View>

        {/* AUDIENCE VOTING */}

        <View style={styles.votingCard}>

          <Text style={styles.votingEmoji}>
            🗳️
          </Text>

          <Text style={styles.votingTitle}>
            Who Won This Debate?
          </Text>

          <Text style={styles.votingSubtitle}>
            Vote for the student you think argued
            better.
          </Text>

          {/* PLAYER ONE */}

          <View style={styles.voteResultCard}>

            <View style={styles.voteResultHeader}>

              <Text style={styles.votePlayerName}>
                🧠 {displayName(playerOne)}
              </Text>

              <Text style={styles.votePercentage}>
                {playerOnePercentage}%
              </Text>

            </View>

            <View style={styles.voteBarBackground}>

              <View
                style={[
                  styles.voteBarFill,
                  {
                    width: `${playerOnePercentage}%`,
                  },
                ]}
              />

            </View>

            <Text style={styles.voteCount}>
              {playerOneVotes}{" "}
              {playerOneVotes === 1
                ? "vote"
                : "votes"}
            </Text>

            <TouchableOpacity
              style={[
                styles.voteButton,
                myVote === playerOne?.userId &&
                  styles.selectedVoteButton,
              ]}
              disabled={voting}
              onPress={() =>
                voteForDebater(playerOne?.userId)
              }
            >
              <Text style={styles.voteButtonText}>
                {myVote === playerOne?.userId
                  ? "✅ You voted for this debater"
                  : `🗳️ Vote for ${displayName(playerOne)}`}
              </Text>
            </TouchableOpacity>

          </View>

          {/* PLAYER TWO */}

          <View style={styles.voteResultCard}>

            <View style={styles.voteResultHeader}>

              <Text style={styles.votePlayerName}>
                🧠 {displayName(playerTwo)}
              </Text>

              <Text style={styles.votePercentage}>
                {playerTwoPercentage}%
              </Text>

            </View>

            <View style={styles.voteBarBackground}>

              <View
                style={[
                  styles.voteBarFill,
                  {
                    width: `${playerTwoPercentage}%`,
                  },
                ]}
              />

            </View>

            <Text style={styles.voteCount}>
              {playerTwoVotes}{" "}
              {playerTwoVotes === 1
                ? "vote"
                : "votes"}
            </Text>

            <TouchableOpacity
              style={[
                styles.voteButton,
                myVote === playerTwo?.userId &&
                  styles.selectedVoteButton,
              ]}
              disabled={voting}
              onPress={() =>
                voteForDebater(playerTwo?.userId)
              }
            >
              <Text style={styles.voteButtonText}>
                {myVote === playerTwo?.userId
                  ? "✅ You voted for this debater"
                  : `🗳️ Vote for ${displayName(playerTwo)}`}
              </Text>
            </TouchableOpacity>

          </View>

          {/* TOTAL */}

          <Text style={styles.totalVotesText}>
            👥 {totalAudienceVotes} audience{" "}
            {totalAudienceVotes === 1
              ? "vote"
              : "votes"}
          </Text>

          {voting && (
            <ActivityIndicator
              size="small"
              color="#818CF8"
              style={{ marginTop: 10 }}
            />
          )}

        </View>

        {/* DEBATE COMPLETE */}

        <View style={styles.resultCard}>

          <Text style={styles.resultEmoji}>
            🏆
          </Text>

          <Text style={styles.resultTitle}>
            Debate Complete!
          </Text>

          <Text style={styles.resultText}>
            Both students have completed all three
            rounds of the debate.
          </Text>

          <View style={styles.finishedBadge}>

            <Text style={styles.finishedBadgeText}>
              🔥 LIVE DEBATE FINISHED
            </Text>

          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.submitText}>
              Done
            </Text>
          </TouchableOpacity>

        </View>

      </View>
    );
  };

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

      {battle.isPublic && (
  <View style={styles.liveBadge}>
    <View style={styles.liveDot} />

    <Text style={styles.liveBadgeText}>
      🔥 LIVE PUBLIC DEBATE
    </Text>
  </View>
)}

<Text style={styles.subtitle}>
  {isSpectator
    ? "👀 You're watching this debate live."
    : "Think carefully. Defend your position."}
</Text>


      {/* PLAYERS */}

      <View style={styles.playersCard}>

        <View style={styles.player}>
          <Text style={styles.playerEmoji}>
            🧠
          </Text>

          <Text style={styles.playerName}>
            {displayName(playerOne)}
          </Text>

          <Text style={styles.score}>
            {playerOne?.score || 0} XP
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
            {displayName(playerTwo)}
          </Text>

          <Text style={styles.score}>
            {playerTwo?.score || 0} XP
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


     {/* DEBATE ROUNDS */}

{isSpectator ? (

  /* 👀 SPECTATOR MODE */

  <View>

    {/* SPECTATOR HEADER */}

    <View style={styles.spectatorCard}>

      <Text style={styles.spectatorEmoji}>
        👀
      </Text>

      <Text style={styles.spectatorTitle}>
        You're Watching Live
      </Text>

      <Text style={styles.spectatorText}>
        Watch both students defend their ideas
        in real time.
      </Text>

    </View>


    {/* CURRENT ROUND */}

    {!debateFinished && (

      <View style={styles.liveRoundCard}>

        <View style={styles.liveRoundHeader}>

          <View style={styles.liveSmallBadge}>

            <View style={styles.liveDot} />

            <Text style={styles.liveSmallText}>
              LIVE NOW
            </Text>

          </View>

          <Text style={styles.roundNumber}>
            ROUND {spectatorRound}
          </Text>

        </View>


        <Text style={styles.liveRoundTitle}>

          {spectatorRound === 1
            ? "Opening Arguments"
            : spectatorRound === 2
            ? "Rebuttals"
            : "Final Defense"}

        </Text>


        <Text style={styles.liveRoundText}>

          {spectatorRound === 1
            ? "Both students are presenting their opening arguments."
            : spectatorRound === 2
            ? "Both students are challenging each other's arguments."
            : "Both students are making their strongest final defense."}

        </Text>

      </View>

    )}


    {/* ----------------------------------------- */}
    {/* ROUND 1 */}
    {/* ----------------------------------------- */}

    {spectatorRound >= 1 && (

      <View>

        <Text style={styles.roundBadge}>
          ROUND 1 • OPENING ARGUMENTS
        </Text>


        {[playerOne, playerTwo].map((player) => (

          <View
            key={`opening-${player?.userId}`}
            style={styles.publicArgumentCard}
          >

            <View style={styles.publicPlayerHeader}>

              <Text style={styles.publicPlayerName}>
                🧠 {displayName(player)}
              </Text>

              {player?.position && (

                <Text
                  style={[
                    styles.position,

                    player.position === "FOR"
                      ? styles.forText
                      : styles.againstText,
                  ]}
                >
                  {player.position}
                </Text>

              )}

            </View>


            <Text style={styles.publicArgument}>

              {player?.argument
                ? player.argument
                : "⏳ Waiting for opening argument..."}

            </Text>

          </View>

        ))}

      </View>

    )}


    {/* ----------------------------------------- */}
    {/* ROUND 2 */}
    {/* ----------------------------------------- */}

    {spectatorRound >= 2 && (

      <View>

        <Text style={styles.roundBadge}>
          🔥 ROUND 2 • REBUTTALS
        </Text>


        {[playerOne, playerTwo].map((player) => (

          <View
            key={`response-${player?.userId}`}
            style={styles.publicArgumentCard}
          >

            <Text style={styles.publicPlayerName}>
              🧠 {displayName(player)}'s rebuttal
            </Text>


            <Text style={styles.publicArgument}>

              {player?.response
                ? player.response
                : "⏳ Waiting for rebuttal..."}

            </Text>

          </View>

        ))}

      </View>

    )}


    {/* ----------------------------------------- */}
    {/* ROUND 3 */}
    {/* ----------------------------------------- */}

    {spectatorRound >= 3 && (

      <View>

        <Text style={styles.roundBadge}>
          🏆 ROUND 3 • FINAL DEFENSE
        </Text>


        {[playerOne, playerTwo].map((player) => (

          <View
            key={`final-${player?.userId}`}
            style={styles.publicArgumentCard}
          >

            <Text style={styles.publicPlayerName}>
              🧠 {displayName(player)}'s final defense
            </Text>


            <Text style={styles.publicArgument}>

              {player?.finalResponse
                ? player.finalResponse
                : "⏳ Waiting for final defense..."}

            </Text>

          </View>

        ))}

      </View>

    )}


{/* AUDIENCE VOTING + RESULT (shared with participants) */}

    {renderVotingAndResult()}

    {/* ----------------------------------------- */}
    {/* WAITING STATUS */}
    {/* ----------------------------------------- */}

    {!debateFinished && (

      <View style={styles.audienceStatusCard}>

        <Text style={styles.audienceStatusTitle}>

          {spectatorRound === 1
            ? "🧠 Students are presenting"
            : spectatorRound === 2
            ? "🔥 Students are rebutting"
            : "🏆 Students are giving their final defense"}

        </Text>


        <Text style={styles.audienceStatusText}>

          {spectatorRound === 1
            ? `${[playerOne, playerTwo].filter(
                (player) => player?.argument
              ).length}/2 opening arguments submitted`
            : spectatorRound === 2
            ? `${[playerOne, playerTwo].filter(
                (player) => player?.response
              ).length}/2 rebuttals submitted`
            : `${[playerOne, playerTwo].filter(
                (player) => player?.finalResponse
              ).length}/2 final defenses submitted`}

        </Text>

      </View>

    )}

  </View>

) : debateFinished ? (

  /* 🏆 DEBATE FINISHED — vote + result (same as spectators) */

  renderVotingAndResult()

) : !myArgument ? (

  /* ROUND 1 */

  <View>

    <Text style={styles.roundBadge}>
      ROUND 1 • OPENING ARGUMENT
    </Text>

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

    <Text style={styles.sectionTitle}>
      Your opening argument
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

    <TouchableOpacity
      style={styles.submitButton}
      disabled={submitting}
      onPress={submitArgument}
    >

      {submitting ? (

        <ActivityIndicator color="#FFFFFF" />

      ) : (

        <Text style={styles.submitText}>
          ⚔️ Submit Opening Argument
        </Text>

      )}

    </TouchableOpacity>

  </View>

) : !bothArgumentsSubmitted ? (

  <View style={styles.statusCard}>

    <Text style={styles.statusTitle}>
      ⏳ Waiting for your opponent
    </Text>

    <Text style={styles.statusText}>
      Your opening argument has been submitted.
      The next round will unlock when your
      opponent submits theirs.
    </Text>

  </View>

) : !myResponse ? (

  /* ROUND 2 */

  <View>

    <Text style={styles.roundBadge}>
      ROUND 2 • REBUTTAL
    </Text>

    <View style={styles.opponentCard}>

      <Text style={styles.opponentLabel}>
        🧠 {displayName(opponent, "Opponent")}'s argument
      </Text>

      <Text style={styles.opponentArgument}>
        {opponentArgument}
      </Text>

    </View>

    <Text style={styles.sectionTitle}>
      Your response
    </Text>

    <TextInput
      value={response}
      onChangeText={setResponse}
      placeholder="Challenge their reasoning..."
      placeholderTextColor="#6B7280"
      multiline
      textAlignVertical="top"
      style={styles.argumentInput}
    />

    <TouchableOpacity
      style={styles.submitButton}
      disabled={submitting}
      onPress={submitResponse}
    >

      {submitting ? (

        <ActivityIndicator color="#FFFFFF" />

      ) : (

        <Text style={styles.submitText}>
          🔥 Submit Rebuttal
        </Text>

      )}

    </TouchableOpacity>

  </View>

) : !bothResponsesSubmitted ? (

  <View style={styles.statusCard}>

    <Text style={styles.statusTitle}>
      ⏳ Waiting for your opponent's rebuttal
    </Text>

    <Text style={styles.statusText}>
      Your response has been submitted.
      The final defense will unlock when your
      opponent responds.
    </Text>

  </View>

) : !myFinalResponse ? (

  /* ROUND 3 */

  <View>

    <Text style={styles.roundBadge}>
      ROUND 3 • FINAL DEFENSE
    </Text>

    <View style={styles.opponentCard}>

      <Text style={styles.opponentLabel}>
        🧠 Your opponent's rebuttal
      </Text>

      <Text style={styles.opponentArgument}>
        {opponentResponse}
      </Text>

    </View>

    <Text style={styles.sectionTitle}>
      Your final defense
    </Text>

    <TextInput
      value={finalResponse}
      onChangeText={setFinalResponse}
      placeholder="Give your strongest final argument..."
      placeholderTextColor="#6B7280"
      multiline
      textAlignVertical="top"
      style={styles.argumentInput}
    />

    <TouchableOpacity
      style={styles.submitButton}
      disabled={submitting}
      onPress={submitFinalResponse}
    >

      {submitting ? (

        <ActivityIndicator color="#FFFFFF" />

      ) : (

        <Text style={styles.submitText}>
          🏆 Submit Final Defense
        </Text>

      )}

    </TouchableOpacity>

  </View>

) : (

  <View style={styles.statusCard}>

    <Text style={styles.statusTitle}>
      ⏳ Final defense submitted
    </Text>

    <Text style={styles.statusText}>
      You have completed the debate. Waiting for
      your opponent to submit their final defense.
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

  roundBadge: {
  color: "#A78BFA",
  fontSize: 12,
  fontWeight: "900",
  letterSpacing: 1,
  marginBottom: 15,
},

opponentCard: {
  backgroundColor: "#111827",
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: "#312E81",
  marginBottom: 20,
},

opponentLabel: {
  color: "#A5B4FC",
  fontSize: 13,
  fontWeight: "800",
  marginBottom: 10,
},

opponentArgument: {
  color: "#FFFFFF",
  fontSize: 14,
  lineHeight: 22,
},

resultCard: {
  backgroundColor: "#111827",
  borderRadius: 20,
  padding: 25,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#4F46E5",
  marginTop: 10,
},

resultEmoji: {
  fontSize: 55,
  marginBottom: 10,
},

resultTitle: {
  color: "#FFFFFF",
  fontSize: 22,
  fontWeight: "900",
  textAlign: "center",
},

resultText: {
  color: "#9CA3AF",
  textAlign: "center",
  lineHeight: 20,
  marginTop: 8,
  marginBottom: 20,
},

spectatorCard: {
  backgroundColor: "#0F172A",
  borderRadius: 18,
  padding: 18,
  marginBottom: 20,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#312E81",
},

spectatorEmoji: {
  fontSize: 35,
  marginBottom: 6,
},

spectatorTitle: {
  color: "#FFFFFF",
  fontSize: 18,
  fontWeight: "900",
},

spectatorText: {
  color: "#9CA3AF",
  fontSize: 13,
  lineHeight: 20,
  textAlign: "center",
  marginTop: 6,
},

publicArgumentCard: {
  backgroundColor: "#111827",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#1F2937",
},

publicPlayerHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},

publicPlayerName: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "900",
  flex: 1,
},

publicArgument: {
  color: "#E5E7EB",
  fontSize: 14,
  lineHeight: 22,
},

liveRoundCard: {
  backgroundColor: "#111827",
  borderRadius: 18,
  padding: 18,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: "#4F46E5",
},

liveRoundHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},

liveSmallBadge: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#450A0A",
  borderRadius: 20,
  paddingHorizontal: 9,
  paddingVertical: 5,
},

liveSmallText: {
  color: "#FCA5A5",
  fontSize: 10,
  fontWeight: "900",
},

roundNumber: {
  color: "#A5B4FC",
  fontSize: 11,
  fontWeight: "900",
},

liveRoundTitle: {
  color: "#FFFFFF",
  fontSize: 19,
  fontWeight: "900",
},

liveRoundText: {
  color: "#9CA3AF",
  fontSize: 13,
  lineHeight: 20,
  marginTop: 5,
},

audienceStatusCard: {
  backgroundColor: "#0F172A",
  borderRadius: 15,
  padding: 16,
  marginTop: 5,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: "#312E81",
  alignItems: "center",
},

audienceStatusTitle: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "800",
  textAlign: "center",
},

audienceStatusText: {
  color: "#818CF8",
  fontSize: 12,
  fontWeight: "700",
  marginTop: 6,
  textAlign: "center",
},

finishedBadge: {
  backgroundColor: "#052E16",
  borderRadius: 20,
  paddingHorizontal: 12,
  paddingVertical: 7,
  marginBottom: 15,
},

finishedBadgeText: {
  color: "#86EFAC",
  fontSize: 10,
  fontWeight: "900",
},

votingCard: {
  backgroundColor: "#111827",
  borderRadius: 20,
  padding: 20,
  marginTop: 20,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: "#4F46E5",
  alignItems: "center",
},

votingEmoji: {
  fontSize: 38,
  marginBottom: 8,
},

votingTitle: {
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "900",
  textAlign: "center",
},

votingSubtitle: {
  color: "#9CA3AF",
  fontSize: 13,
  lineHeight: 20,
  textAlign: "center",
  marginTop: 6,
  marginBottom: 18,
},

voteButtonsRow: {
  width: "100%",
  gap: 10,
},

voteButton: {
  backgroundColor: "#312E81",
  borderRadius: 14,
  paddingVertical: 14,
  paddingHorizontal: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#6366F1",
},

voteButtonEmoji: {
  fontSize: 24,
  marginBottom: 5,
},

voteButtonText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "900",
  textAlign: "center",
},

voteResultCard: {
  width: "100%",
  backgroundColor: "#0F172A",
  borderRadius: 16,
  padding: 15,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#1F2937",
},

voteResultHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},

votePlayerName: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "900",
  flex: 1,
},

votePercentage: {
  color: "#A5B4FC",
  fontSize: 18,
  fontWeight: "900",
},

voteBarBackground: {
  height: 10,
  backgroundColor: "#1F2937",
  borderRadius: 10,
  overflow: "hidden",
},

voteBarFill: {
  height: "100%",
  backgroundColor: "#6366F1",
  borderRadius: 10,
},

voteCount: {
  color: "#9CA3AF",
  fontSize: 11,
  fontWeight: "700",
  marginTop: 7,
  marginBottom: 10,
},

totalVotesText: {
  color: "#818CF8",
  fontSize: 12,
  fontWeight: "800",
  marginTop: 5,
},

selectedVoteButton: {
  backgroundColor: "#166534",
  borderColor: "#22C55E",
},

});