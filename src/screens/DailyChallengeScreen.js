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
    increment,
    serverTimestamp,
    setDoc,
    updateDoc,
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

    try {
      setSubmitting(true);

      const today = getTodayKey();

      const isCorrect =
        selectedAnswer === question.correctAnswer;

      const earnedXP = isCorrect ? 10 : 0;

      const answerRef = doc(
        db,
        "dailyChallengeAnswers",
        `${currentUser.uid}_${today}`
      );

      // -------------------------------------------------
      // SAVE ANSWER
      // -------------------------------------------------

      await setDoc(answerRef, {
        userId: currentUser.uid,
        date: today,
        question: question.question,
        answer: selectedAnswer,
        correctAnswer: question.correctAnswer,
        correct: isCorrect,
        xpEarned: earnedXP,
        answeredAt: serverTimestamp(),
      });


      // -------------------------------------------------
      // ADD XP TO USER
      // -------------------------------------------------

      if (earnedXP > 0) {
        await updateDoc(
          doc(db, "users", currentUser.uid),
          {
            xp: increment(earnedXP),
          }
        );
      }


      setCorrect(isCorrect);
      setXpEarned(earnedXP);
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
                disabled={answered || submitting}
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


        {/* SUBMIT */}

        {!answered && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              !selectedAnswer &&
                styles.disabledButton,
            ]}
            disabled={!selectedAnswer || submitting}
            onPress={submitAnswer}
          >

            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
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
    marginBottom: 20,
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