import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";


// -------------------------------------------------
// DAILY QUESTIONS
// -------------------------------------------------

const DAILY_QUESTIONS = [
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    correctAnswer: "Mars",
  },

  {
    question: "Which ocean is the largest in the world?",
    options: [
      "Atlantic Ocean",
      "Indian Ocean",
      "Pacific Ocean",
      "Arctic Ocean",
    ],
    correctAnswer: "Pacific Ocean",
  },

  {
    question: "What is the capital city of Kenya?",
    options: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
    correctAnswer: "Nairobi",
  },

  {
    question: "Which programming language is commonly used with React Native?",
    options: ["JavaScript", "SQL", "HTML", "CSS"],
    correctAnswer: "JavaScript",
  },

  {
    question: "How many continents are there?",
    options: ["5", "6", "7", "8"],
    correctAnswer: "7",
  },

  {
    question: "Which device is mainly used to connect computers to a network?",
    options: ["Router", "Monitor", "Keyboard", "Printer"],
    correctAnswer: "Router",
  },

  {
    question: "What is the largest organ in the human body?",
    options: ["Heart", "Brain", "Skin", "Liver"],
    correctAnswer: "Skin",
  },

  {
    question: "Which country is known as the Land of the Rising Sun?",
    options: ["China", "Japan", "India", "South Korea"],
    correctAnswer: "Japan",
  },

  {
    question: "What does CPU stand for?",
    options: [
      "Central Processing Unit",
      "Computer Personal Unit",
      "Central Program Utility",
      "Computer Processing Utility",
    ],
    correctAnswer: "Central Processing Unit",
  },

  {
    question: "Which language is mainly used to style web pages?",
    options: ["Python", "CSS", "Java", "SQL"],
    correctAnswer: "CSS",
  },
];


// -------------------------------------------------
// GET TODAY'S DATE
// -------------------------------------------------

function getTodayKey() {
  const now = new Date();

  return now.toISOString().split("T")[0];
}


// -------------------------------------------------
// GET YESTERDAY'S DATE
// -------------------------------------------------

function getYesterdayKey() {
  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);

  return yesterday.toISOString().split("T")[0];
}

// -------------------------------------------------
// GET CURRENT WEEK KEY
// -------------------------------------------------

function getWeekKey() {
  const now = new Date();

  const year = now.getUTCFullYear();

  const startOfYear = new Date(
    Date.UTC(year, 0, 1)
  );

  const daysSinceStart =
    Math.floor(
      (now - startOfYear) /
        (1000 * 60 * 60 * 24)
    );

  const weekNumber =
    Math.floor(daysSinceStart / 7) + 1;

  return `${year}-W${weekNumber}`;
}


// -------------------------------------------------
// GET TODAY'S QUESTION
// -------------------------------------------------

function getTodaysQuestion() {
  const today = getTodayKey();

  let hash = 0;

  for (let i = 0; i < today.length; i++) {
    hash = today.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index =
    Math.abs(hash) % DAILY_QUESTIONS.length;

  return DAILY_QUESTIONS[index];
}


// -------------------------------------------------
// SCREEN
// -------------------------------------------------

export default function DailyChallengeScreen({
  navigation,
}) {
  const [question, setQuestion] = useState(null);

  const [loading, setLoading] = useState(true);

  const [selectedAnswer, setSelectedAnswer] =
    useState(null);

  const [answered, setAnswered] = useState(false);

  const [correct, setCorrect] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [xpEarned, setXpEarned] = useState(0);

  const [currentStreak, setCurrentStreak] = useState(0);


  // -------------------------------------------------
  // LOAD QUESTION + CHECK IF ALREADY ANSWERED
  // -------------------------------------------------

  useEffect(() => {
    loadChallenge();
  }, []);


  const loadChallenge = async () => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const todaysQuestion = getTodaysQuestion();

      setQuestion(todaysQuestion);

      const today = getTodayKey();

      const answerRef = doc(
        db,
        "dailyChallengeAnswers",
        `${currentUser.uid}_${today}`
      );

      const answerSnap = await getDoc(answerRef);

      // -------------------------------------------------
      // LOAD USER STREAK
      // -------------------------------------------------

      const userRef = doc(
        db,
        "users",
        currentUser.uid
      );

      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        setCurrentStreak(userData.streak || 0);
      }


      // -------------------------------------------------
      // CHECK IF TODAY'S CHALLENGE WAS ALREADY ANSWERED
      // -------------------------------------------------

      if (answerSnap.exists()) {
        const data = answerSnap.data();

        setAnswered(true);

        setSelectedAnswer(data.answer);

        setCorrect(data.correct);

        setXpEarned(data.xpEarned || 0);
      }

    } catch (error) {
      console.log(
        "Daily challenge loading error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to load today's challenge."
      );

    } finally {
      setLoading(false);
    }
  };


  // -------------------------------------------------
  // SUBMIT ANSWER
  // -------------------------------------------------

  const submitAnswer = async () => {
    if (!selectedAnswer || answered || submitting) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert(
        "Login Required",
        "Please log in to play today's challenge."
      );

      return;
    }

    if (!question) {
      return;
    }

    try {
      setSubmitting(true);

      const today = getTodayKey();

const yesterday = getYesterdayKey();

const currentWeek = getWeekKey();

      const isCorrect =
        selectedAnswer === question.correctAnswer;

      // -------------------------------------------------
      // XP REWARD
      // -------------------------------------------------

      const earnedXP = isCorrect ? 10 : 0;


      const answerRef = doc(
        db,
        "dailyChallengeAnswers",
        `${currentUser.uid}_${today}`
      );

      const userRef = doc(
        db,
        "users",
        currentUser.uid
      );


      // -------------------------------------------------
      // FIRESTORE TRANSACTION
      // -------------------------------------------------

      const result = await runTransaction(
        db,
        async (transaction) => {

          // Check again inside transaction
          // to prevent duplicate rewards.

          const existingAnswer =
            await transaction.get(answerRef);

          if (existingAnswer.exists()) {
            return {
              alreadyAnswered: true,
              streak: 0,
            };
          }


          const userSnap =
            await transaction.get(userRef);

          const userData = userSnap.exists()
            ? userSnap.data()
            : {};


  // -------------------------------------------------
// CURRENT USER XP
// -------------------------------------------------

const currentXP =
  Number(userData.xp || 0);

const storedWeeklyXP =
  Number(userData.weeklyXP || 0);

const storedWeeklyXPWeek =
  userData.weeklyXPWeek || null;

const currentWeeklyXP =
  storedWeeklyXPWeek === currentWeek
    ? storedWeeklyXP
    : 0;


          // -------------------------------------------------
          // CURRENT STREAK
          // -------------------------------------------------

          const previousStreak =
            Number(userData.streak || 0);


          const lastChallengeDate =
            userData.lastChallengeDate || null;


          // -------------------------------------------------
          // CALCULATE NEW STREAK
          // -------------------------------------------------

          let newStreak = 1;


          // First-ever challenge
          if (!lastChallengeDate) {

            newStreak = 1;

          }

          // Consecutive day
          else if (
            lastChallengeDate === yesterday
          ) {

            newStreak = previousStreak + 1;

          }

          // Same day
          else if (
            lastChallengeDate === today
          ) {

            newStreak = previousStreak;

          }

          // Missed one or more days
          else {

            newStreak = 1;

          }


          // -------------------------------------------------
// TOTAL XP + WEEKLY XP
// -------------------------------------------------

const newXP =
  currentXP + earnedXP;

const newWeeklyXP =
  currentWeeklyXP + earnedXP;

          // -------------------------------------------------
          // SAVE USER XP + STREAK
          // -------------------------------------------------

          transaction.set(
  userRef,
  {
    xp: newXP,

    weeklyXP: newWeeklyXP,

    weeklyXPWeek: currentWeek,

    streak: newStreak,

    lastChallengeDate: today,
  },
  {
    merge: true,
  }
);


          // -------------------------------------------------
          // SAVE ANSWER
          // -------------------------------------------------

          transaction.set(
            answerRef,
            {
              userId: currentUser.uid,

              date: today,

              question: question.question,

              answer: selectedAnswer,

              correctAnswer:
                question.correctAnswer,

              correct: isCorrect,

              xpEarned: earnedXP,

              streak: newStreak,

              answeredAt: serverTimestamp(),
            }
          );


          return {
            alreadyAnswered: false,
            streak: newStreak,
          };
        }
      );


      // -------------------------------------------------
      // ALREADY ANSWERED
      // -------------------------------------------------

      if (result.alreadyAnswered) {

        Alert.alert(
          "Already Completed",
          "You have already completed today's challenge."
        );

        setAnswered(true);

        return;
      }


      // -------------------------------------------------
      // UPDATE SCREEN
      // -------------------------------------------------

      setCorrect(isCorrect);

      setXpEarned(earnedXP);

      setCurrentStreak(result.streak);

      setAnswered(true);


    } catch (error) {

      console.log(
        "Daily challenge submission error:",
        error
      );

      Alert.alert(
        "Error",
        "Your answer could not be submitted. Please try again."
      );

    } finally {

      setSubmitting(false);

    }
  };


  // -------------------------------------------------
  // LOADING
  // -------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>

        <ActivityIndicator
          size="large"
          color="#818CF8"
        />

        <Text style={styles.loadingText}>
          Loading today's challenge...
        </Text>

      </View>
    );
  }


  // -------------------------------------------------
  // ERROR
  // -------------------------------------------------

  if (!question) {
    return (
      <View style={styles.loadingContainer}>

        <Text style={styles.errorText}>
          Unable to load today's challenge.
        </Text>

      </View>
    );
  }


  // -------------------------------------------------
  // UI
  // -------------------------------------------------

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <Text style={styles.emoji}>
          🎯
        </Text>

        <Text style={styles.title}>
          Daily Challenge
        </Text>

        <Text style={styles.subtitle}>
          One question. One chance. Every day.
        </Text>

      </View>


      {/* STREAK / XP SUMMARY */}

      <View style={styles.statsRow}>

        <View style={styles.statCard}>

          <Text style={styles.statEmoji}>
            🔥
          </Text>

          <View>
            <Text style={styles.statValue}>
              {currentStreak}
            </Text>

            <Text style={styles.statLabel}>
              Day Streak
            </Text>
          </View>

        </View>


        <View style={styles.statCard}>

          <Text style={styles.statEmoji}>
            ⭐
          </Text>

          <View>
            <Text style={styles.statValue}>
              +{xpEarned}
            </Text>

            <Text style={styles.statLabel}>
              Today's XP
            </Text>
          </View>

        </View>

      </View>


      {/* QUESTION CARD */}

      <View style={styles.card}>

        <Text style={styles.questionNumber}>
          TODAY'S QUESTION
        </Text>

        <Text style={styles.question}>
          {question.question}
        </Text>


        {/* ANSWERS */}

        <View style={styles.optionsContainer}>

          {question.options.map((option) => {

            const isSelected =
              selectedAnswer === option;


            const isCorrectAnswer =
              answered &&
              option === question.correctAnswer;


            const isWrongSelected =
              answered &&
              isSelected &&
              !correct;


            return (
              <TouchableOpacity
                key={option}
                disabled={
                  answered ||
                  submitting
                }
                style={[
                  styles.option,

                  isSelected &&
                    !answered &&
                    styles.selectedOption,

                  isCorrectAnswer &&
                    styles.correctOption,

                  isWrongSelected &&
                    styles.wrongOption,
                ]}
                onPress={() =>
                  setSelectedAnswer(option)
                }
              >

                <Text
                  style={[
                    styles.optionText,

                    isSelected &&
                      !answered &&
                      styles.selectedOptionText,

                    isCorrectAnswer &&
                      styles.correctOptionText,

                    isWrongSelected &&
                      styles.wrongOptionText,
                  ]}
                >
                  {option}
                </Text>

              </TouchableOpacity>
            );
          })}

        </View>


        {/* RESULT */}

        {answered && (

          <View
            style={[
              styles.resultCard,

              correct
                ? styles.resultCorrect
                : styles.resultWrong,
            ]}
          >

            <Text style={styles.resultTitle}>

              {correct
                ? "🎉 Correct!"
                : "❌ Not quite!"}

            </Text>


            {correct ? (

              <Text style={styles.resultText}>
                Great job! You earned +10 XP.
              </Text>

            ) : (

              <Text style={styles.resultText}>
                The correct answer is{" "}
                {question.correctAnswer}.
              </Text>

            )}

          </View>

        )}


        {/* STREAK REWARD */}

        {answered && (

          <View style={styles.rewardCard}>

            <Text style={styles.rewardEmoji}>
              🔥
            </Text>

            <View>

              <Text style={styles.rewardTitle}>
                {currentStreak} Day Streak
              </Text>

              <Text style={styles.rewardText}>
                Keep answering every day to
                build your streak.
              </Text>

            </View>

          </View>

        )}


        {/* SUBMIT */}

        {!answered && (

          <TouchableOpacity
            style={[
              styles.submitButton,

              !selectedAnswer &&
                styles.disabledButton,
            ]}
            disabled={
              !selectedAnswer ||
              submitting
            }
            onPress={submitAnswer}
          >

            {submitting ? (

              <ActivityIndicator
                color="#FFFFFF"
              />

            ) : (

              <Text style={styles.submitText}>
                Submit Answer
              </Text>

            )}

          </TouchableOpacity>

        )}


        {/* ALREADY ANSWERED */}

        {answered && (

          <View style={styles.completedBox}>

            <Text style={styles.completedText}>
              ✅ Today's challenge completed
            </Text>

            <Text style={styles.completedSubtext}>
              Come back tomorrow for a new challenge.
            </Text>

          </View>

        )}

      </View>


      {/* FOOTER */}

      <View style={styles.footer}>

        <Text style={styles.footerText}>
          🌍 Students worldwide are answering today's
          challenge.
        </Text>

      </View>

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
    padding: 16,
  },


  loadingContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },


  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 14,
  },


  errorText: {
    color: "#FFFFFF",
    fontSize: 16,
  },


  header: {
    marginTop: 25,
    marginBottom: 15,
  },


  emoji: {
    fontSize: 35,
    marginBottom: 7,
  },


  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },


  subtitle: {
    color: "#9CA3AF",
    marginTop: 5,
    fontSize: 14,
  },


  // -------------------------------------------------
  // STATS
  // -------------------------------------------------

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },


  statCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: "#1F2937",
    flexDirection: "row",
    alignItems: "center",
  },


  statEmoji: {
    fontSize: 24,
    marginRight: 10,
  },


  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },


  statLabel: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
  },


  // -------------------------------------------------
  // QUESTION CARD
  // -------------------------------------------------

  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },


  questionNumber: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },


  question: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 29,
    fontWeight: "700",
    marginBottom: 20,
  },


  // -------------------------------------------------
  // OPTIONS
  // -------------------------------------------------

  optionsContainer: {
    gap: 10,
  },


  option: {
    backgroundColor: "#0F172A",
    borderRadius: 13,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },


  selectedOption: {
    borderColor: "#818CF8",
    backgroundColor: "#1E1B4B",
  },


  correctOption: {
    backgroundColor: "#052E16",
    borderColor: "#22C55E",
  },


  wrongOption: {
    backgroundColor: "#450A0A",
    borderColor: "#EF4444",
  },


  optionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },


  selectedOptionText: {
    color: "#C7D2FE",
  },


  correctOptionText: {
    color: "#86EFAC",
  },


  wrongOptionText: {
    color: "#FCA5A5",
  },


  // -------------------------------------------------
  // SUBMIT BUTTON
  // -------------------------------------------------

  submitButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },


  disabledButton: {
    opacity: 0.4,
  },


  submitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },


  // -------------------------------------------------
  // RESULT
  // -------------------------------------------------

  resultCard: {
    borderRadius: 13,
    padding: 15,
    marginTop: 16,
  },


  resultCorrect: {
    backgroundColor: "#052E16",
    borderWidth: 1,
    borderColor: "#166534",
  },


  resultWrong: {
    backgroundColor: "#450A0A",
    borderWidth: 1,
    borderColor: "#991B1B",
  },


  resultTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },


  resultText: {
    color: "#D1D5DB",
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },


  // -------------------------------------------------
  // REWARD
  // -------------------------------------------------

  rewardCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },


  rewardEmoji: {
    fontSize: 28,
    marginRight: 13,
  },


  rewardTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },


  rewardText: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
    maxWidth: 280,
  },


  // -------------------------------------------------
  // COMPLETED
  // -------------------------------------------------

  completedBox: {
    marginTop: 16,
    alignItems: "center",
  },


  completedText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "700",
  },


  completedSubtext: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 5,
    textAlign: "center",
  },


  // -------------------------------------------------
  // FOOTER
  // -------------------------------------------------

  footer: {
    marginTop: 20,
    alignItems: "center",
  },


  footerText: {
    color: "#6B7280",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
  },

});