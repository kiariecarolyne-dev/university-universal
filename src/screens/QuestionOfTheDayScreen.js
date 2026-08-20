import { useEffect, useMemo, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";

/*
=========================================
QUESTION BANK
=========================================
*/

const QUESTIONS = [
  "If you could study at any university in the world for one semester, which would you choose and why?",

  "What is one skill every university student should learn before graduating?",

  "What is the hardest subject you have ever studied?",

  "If you could change one thing about university life, what would it be?",

  "What country would you love to visit for an international student exchange?",

  "What motivates you to keep studying when you feel like giving up?",

  "What is one piece of advice you would give to a first-year student?",

  "If money was not a problem, what career would you choose?",

  "What is your favorite way to relax after studying?",

  "Which is better for studying: studying alone or studying with friends?",

  "What technology do you think will change education the most?",

  "What is one thing you wish your university offered students?",

  "What is the most interesting course you have ever taken?",

  "If you could have dinner with any famous person, who would it be?",

  "What is one goal you want to achieve before you graduate?",

  "Which country has the education system you would most like to experience?",

  "What is the best study tip that has actually worked for you?",

  "What is your biggest challenge as a student right now?",

  "Would you rather have unlimited money or unlimited knowledge?",

  "What is one thing university has taught you outside the classroom?",
];

/*
=========================================
GET TODAY'S DATE
=========================================
*/

const getTodayKey = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
};

/*
=========================================
GET QUESTION FOR TODAY
=========================================
*/

const getQuestionForToday = () => {
  const today = getTodayKey();

  let number = 0;

  for (let i = 0; i < today.length; i++) {
    number += today.charCodeAt(i);
  }

  return QUESTIONS[number % QUESTIONS.length];
};

const MAX_ANSWER_LENGTH = 300;

export default function QuestionOfTheDayScreen({
  navigation,
}) {
  const user = useUser();

  const [answer, setAnswer] = useState("");

  const [answers, setAnswers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [posting, setPosting] = useState(false);

  /*
  =========================================
  TODAY'S QUESTION
  =========================================
  */

  const todayKey = useMemo(
    () => getTodayKey(),
    []
  );

  const question = useMemo(
    () => getQuestionForToday(),
    []
  );

  /*
  =========================================
  LISTEN TO TODAY'S ANSWERS
  =========================================
  */

  useEffect(() => {
    const answersQuery = query(
      collection(
        db,
        "dailyQuestions",
        todayKey,
        "answers"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      answersQuery,
      (snapshot) => {
        const loadedAnswers =
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));

        setAnswers(loadedAnswers);
        setLoading(false);

        /*
        Automatically load current user's
        existing answer.
        */

        if (auth.currentUser) {
          const myAnswer =
            loadedAnswers.find(
              (item) =>
                item.userId ===
                auth.currentUser.uid
            );

          if (myAnswer) {
            setAnswer(myAnswer.text || "");
          }
        }
      },
      (error) => {
        console.log(
          "Daily answers error:",
          error
        );

        setLoading(false);

        Alert.alert(
          "Unable to load answers",
          "Please check your internet connection and try again."
        );
      }
    );

    return () => unsubscribe();
  }, [todayKey]);

  /*
  =========================================
  SUBMIT / UPDATE ANSWER
  =========================================
  */

  const submitAnswer = async () => {
    const text = answer.trim();

    if (!text) {
      Alert.alert(
        "Write an answer",
        "Please write something before submitting."
      );

      return;
    }

    if (text.length > MAX_ANSWER_LENGTH) {
      Alert.alert(
        "Answer too long",
        `Your answer can contain up to ${MAX_ANSWER_LENGTH} characters.`
      );

      return;
    }

    if (!auth.currentUser || !user) {
      Alert.alert(
        "Login required",
        "Please log in before answering."
      );

      return;
    }

    try {
      setPosting(true);

      const existingAnswer =
        answers.find(
          (item) =>
            item.userId ===
            auth.currentUser.uid
        );

      if (existingAnswer) {
        await updateDoc(
          doc(
            db,
            "dailyQuestions",
            todayKey,
            "answers",
            existingAnswer.id
          ),
          {
            text,
            updatedAt: serverTimestamp(),
          }
        );

        Alert.alert(
          "Answer updated",
          "Your answer has been updated."
        );
      } else {
        await addDoc(
          collection(
            db,
            "dailyQuestions",
            todayKey,
            "answers"
          ),
          {
            userId:
              auth.currentUser.uid,

            fullName:
              user.fullName ||
              "University Student",

            country:
              user.country ||
              "Unknown",

            photo:
              user.photo ||
              "",

            text,

            likes: [],

            createdAt:
              serverTimestamp(),
          }
        );

        Alert.alert(
          "Answer posted! 🎉",
          "Your answer is now visible to students worldwide."
        );
      }
    } catch (error) {
      console.log(
        "Submit answer error:",
        error
      );

      Alert.alert(
        "Something went wrong",
        "We couldn't save your answer. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  /*
  =========================================
  LIKE ANSWER
  =========================================
  */

  const toggleLike = async (item) => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;

    const likes = Array.isArray(item.likes)
      ? item.likes
      : [];

    const alreadyLiked =
      likes.includes(uid);

    try {
      const answerRef = doc(
        db,
        "dailyQuestions",
        todayKey,
        "answers",
        item.id
      );

      if (alreadyLiked) {
        await updateDoc(answerRef, {
          likes: arrayRemove(uid),
        });
      } else {
        await updateDoc(answerRef, {
          likes: arrayUnion(uid),
        });
      }
    } catch (error) {
      console.log(
        "Like answer error:",
        error
      );
    }
  };

  /*
  =========================================
  TIME
  =========================================
  */

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    const now = new Date();

    const difference = Math.floor(
      (now.getTime() - date.getTime()) /
        1000
    );

    if (difference < 60) {
      return "Just now";
    }

    if (difference < 3600) {
      return `${Math.floor(
        difference / 60
      )}m`;
    }

    if (difference < 86400) {
      return `${Math.floor(
        difference / 3600
      )}h`;
    }

    return `${Math.floor(
      difference / 86400
    )}d`;
  };

  /*
  =========================================
  ANSWER CARD
  =========================================
  */

  const renderAnswer = ({ item }) => {
    const likes = Array.isArray(item.likes)
      ? item.likes
      : [];

    const liked =
      auth.currentUser &&
      likes.includes(
        auth.currentUser.uid
      );

    return (
      <View style={styles.answerCard}>
        <View style={styles.answerHeader}>
          {item.photo ? (
            <Image
              source={{
                uri: item.photo,
              }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={
                styles.avatarPlaceholder
              }
            >
              <Text
                style={styles.avatarText}
              >
                {item.fullName
                  ?.charAt(0)
                  ?.toUpperCase() || "S"}
              </Text>
            </View>
          )}

          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {item.fullName ||
                "University Student"}
            </Text>

            <Text style={styles.meta}>
              {item.country ||
                "Worldwide"}{" "}
              • {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>

        <Text style={styles.answerText}>
          {item.text}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              toggleLike(item)
            }
          >
            <Text style={styles.actionEmoji}>
              {liked ? "❤️" : "🤍"}
            </Text>

            <Text
              style={[
                styles.actionText,
                liked &&
                  styles.likedText,
              ]}
            >
              {likes.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
  style={styles.actionButton}
  onPress={() =>
    Alert.alert(
      "Coming next",
      "Discussion for daily answers is coming next."
    )
  }
>
  <Text style={styles.actionEmoji}>
    💬
  </Text>

  <Text style={styles.actionText}>
    Discuss
  </Text>
</TouchableOpacity>
        </View>
      </View>
    );
  };

  /*
  =========================================
  LOADING
  =========================================
  */

  if (loading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />

        <Text style={styles.loadingText}>
          Loading today's question...
        </Text>
      </View>
    );
  }

  /*
  =========================================
  SCREEN
  =========================================
  */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <FlatList
        data={answers}
        keyExtractor={(item) => item.id}
        renderItem={renderAnswer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        ListHeaderComponent={
          <>
            {/* HEADER */}

            <View style={styles.header}>
              <Text style={styles.smallTitle}>
                🎯 DAILY QUESTION
              </Text>

              <Text style={styles.title}>
                Question of the Day
              </Text>

              <Text style={styles.subtitle}>
                One question. Students
                worldwide. One conversation.
              </Text>
            </View>

            {/* QUESTION */}

            <View style={styles.questionCard}>
              <Text
                style={styles.questionEmoji}
              >
                🌍
              </Text>

              <Text
                style={styles.questionLabel}
              >
                TODAY'S QUESTION
              </Text>

              <Text
                style={styles.questionText}
              >
                {question}
              </Text>

              <View
                style={styles.dateBadge}
              >
                <Text
                  style={styles.dateText}
                >
                  📅 {todayKey}
                </Text>
              </View>
            </View>

            {/* ANSWER BOX */}

            <View style={styles.answerBox}>
              <Text
                style={styles.answerPrompt}
              >
                💬 What's your answer?
              </Text>

              <TextInput
                value={answer}
                onChangeText={setAnswer}
                placeholder="Share your thoughts with students worldwide..."
                placeholderTextColor="#6B7280"
                multiline
                maxLength={
                  MAX_ANSWER_LENGTH
                }
                style={styles.input}
                textAlignVertical="top"
              />

              <View
                style={styles.answerBottom}
              >
                <Text
                  style={styles.characterCount}
                >
                  {answer.length}/
                  {MAX_ANSWER_LENGTH}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!answer.trim() ||
                      posting) &&
                      styles.disabledButton,
                  ]}
                  onPress={
                    submitAnswer
                  }
                  disabled={
                    !answer.trim() ||
                    posting
                  }
                >
                  {posting ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.submitText
                      }
                    >
                      {answers.some(
                        (item) =>
                          item.userId ===
                          auth.currentUser
                            ?.uid
                      )
                        ? "Update"
                        : "Answer"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ANSWERS HEADER */}

            <View
              style={styles.answersHeader}
            >
              <Text
                style={styles.answersTitle}
              >
                🌎 Student Answers
              </Text>

              <Text
                style={styles.answersSubtitle}
              >
                See what students around the
                world think.
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>
              🌍
            </Text>

            <Text style={styles.emptyTitle}>
              No answers yet
            </Text>

            <Text style={styles.emptyText}>
              Be the first student to answer
              today's question!
            </Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

/*
=========================================
STYLES
=========================================
*/

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#05070A",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#9CA3AF",
    marginTop: 10,
    fontSize: 13,
  },

  /* HEADER */

  header: {
    marginTop: 20,
    marginBottom: 20,
  },

  smallTitle: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 5,
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },

  /* QUESTION */

  questionCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#312E81",
    marginBottom: 15,
  },

  questionEmoji: {
    fontSize: 35,
    marginBottom: 10,
  },

  questionLabel: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  questionText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 8,
  },

  dateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0F172A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 15,
  },

  dateText: {
    color: "#9CA3AF",
    fontSize: 10,
  },

  /* ANSWER BOX */

  answerBox: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  answerPrompt: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#0F172A",
    borderRadius: 13,
    minHeight: 90,
    padding: 13,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  answerBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  characterCount: {
    color: "#6B7280",
    fontSize: 10,
  },

  submitButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 11,
    minWidth: 75,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.4,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* ANSWERS */

  answersHeader: {
    marginBottom: 12,
  },

  answersTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  answersSubtitle: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 3,
  },

  answerCard: {
    backgroundColor: "#111827",
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },

  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  authorInfo: {
    flex: 1,
  },

  authorName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  meta: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
  },

  answerText: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    marginTop: 12,
    paddingTop: 10,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 25,
  },

  actionEmoji: {
    fontSize: 16,
    marginRight: 5,
  },

  actionText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },

  likedText: {
    color: "#F87171",
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#111827",
    borderRadius: 17,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  emptyEmoji: {
    fontSize: 35,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },
};