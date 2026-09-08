import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import { INTERESTS_CATALOG } from "../utils/matching";

// Step 4 choices — "What brings you to University Universal?"
// Reuses the app's existing lookingFor storage shape (array of keys).
// "Friendship" reuses the existing catalog key so it still matches.
const GOAL_OPTIONS = [
  { key: "friendship", label: "🤝 Friends" },
  { key: "study_partners", label: "📚 Study partners" },
  { key: "networking", label: "💼 Networking" },
  { key: "mentorship", label: "🧭 Mentorship" },
];

const TOTAL_STEPS = 5;

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [course, setCourse] = useState("");
  const [university, setUniversity] = useState("");
  const [interests, setInterests] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const uid = auth.currentUser?.uid;

  /* ------------------------------------------------
     PRE-FILL FROM EXISTING PROFILE (if any)
  ------------------------------------------------ */

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!uid) return;

      try {
        const snap = await getDoc(doc(db, "users", uid));

        if (snap.exists() && mounted) {
          const data = snap.data();

          setCourse(
            data.course && data.course !== "Not set yet"
              ? data.course
              : ""
          );

          setUniversity(
            data.university &&
              data.university !== "Not set yet"
              ? data.university
              : ""
          );

          setInterests(data.interests || []);
          setLookingFor(data.lookingFor || []);
        }
      } catch (error) {
        console.log("Onboarding load profile error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [uid]);

  /* ------------------------------------------------
     HELPERS
  ------------------------------------------------ */

  const toggleInterest = (key) => {
    setInterests((prev) => {
      if (prev.includes(key)) {
        return prev.filter((i) => i !== key);
      }

      if (prev.length >= 10) return prev;

      return [...prev, key];
    });
  };

  const toggleGoal = (key) => {
    setLookingFor((prev) =>
      prev.includes(key)
        ? prev.filter((g) => g !== key)
        : [...prev, key]
    );
  };

  const next = () => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  /* ------------------------------------------------
     COMPLETE ONBOARDING
     Only writes the collected fields with a merge
     update — never touches isAdmin / isPremium /
     premiumUntil / createdAt / photo / plan.
  ------------------------------------------------ */

  const completeOnboarding = async () => {
    if (!uid) return;

    setSaving(true);

    try {
      const payload = {};

      if (course.trim()) payload.course = course.trim();
      if (university.trim())
        payload.university = university.trim();
      if (interests.length) payload.interests = interests;
      if (lookingFor.length)
        payload.lookingFor = lookingFor;

      payload.onboardingCompleted = true;
      payload.onboardingCompletedAt =
        new Date().toISOString();

      await setDoc(
        doc(db, "users", uid),
        payload,
        { merge: true }
      );

      // Move to Home. If the AppNavigator profile
      // listener already flipped the stack, this reset
      // simply targets the still-registered MainTabs.
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      } catch (resetError) {
        console.log("Onboarding navigation error:", resetError);
      }
    } catch (error) {
      console.log("Onboarding save error:", error);

      Alert.alert(
        "Couldn't save",
        "Something went wrong while setting up your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------
     LOADING
  ------------------------------------------------ */

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}>
          <ActivityIndicator
            size="large"
            color="#4F46E5"
          />

          <Text style={styles.loaderText}>
            Getting ready for you...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios" ? "padding" : "height"
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PROGRESS */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map(
              (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index <= step && styles.dotActive,
                  ]}
                />
              )
            )}
          </View>

          <Text style={styles.stepLabel}>
            Step {step + 1} of {TOTAL_STEPS}
          </Text>

          {step === 0 && (
            <View style={styles.step}>
              <View style={styles.heroIcon}>
                <Text style={styles.heroEmoji}>🌍</Text>
              </View>

              <Text style={styles.title}>
                Welcome to University Universal 🌍
              </Text>

              <Text style={styles.subtitle}>
                Your space to study, connect, grow, and discover
                opportunities with students around the world.
              </Text>

              <View style={styles.goalsPreview}>
                <View style={styles.goalPill}>
                  <Text style={styles.goalPillText}>
                    📚 Study
                  </Text>
                </View>

                <View style={styles.goalPill}>
                  <Text style={styles.goalPillText}>
                    🤝 Connect
                  </Text>
                </View>

                <View style={styles.goalPill}>
                  <Text style={styles.goalPillText}>
                    🌱 Grow
                  </Text>
                </View>

                <View style={styles.goalPill}>
                  <Text style={styles.goalPillText}>
                    💼 Opportunities
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={next}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryText}>
                  Let's Get Started
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 1 && (
            <View style={styles.step}>
              <Text style={styles.title}>
                What are you studying?
              </Text>

              <Text style={styles.subtitle}>
                This helps us find students and groups that
                match you. You can change it later.
              </Text>

              <Text style={styles.label}>Course / Program</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Computer Science"
                placeholderTextColor="#6B7280"
                value={course}
                onChangeText={setCourse}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <Text style={styles.label}>Where do you study?</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. University of Nairobi"
                placeholderTextColor="#6B7280"
                value={university}
                onChangeText={setUniversity}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={back}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtnFlex}
                  onPress={next}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.step}>
              <Text style={styles.title}>
                What are you interested in?
              </Text>

              <Text style={styles.subtitle}>
                Pick as many as you like — up to 10. These help
                us connect you with the right people.
              </Text>

              <View style={styles.chipRow}>
                {INTERESTS_CATALOG.map((item) => {
                  const selected = interests.includes(
                    item.key
                  );

                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.chip,
                        selected && styles.chipActive,
                      ]}
                      onPress={() =>
                        toggleInterest(item.key)
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected &&
                            styles.chipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={back}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtnFlex}
                  onPress={next}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.step}>
              <Text style={styles.title}>
                What brings you to University Universal?
              </Text>

              <Text style={styles.subtitle}>
                Choose all that apply.
              </Text>

              <View style={styles.chipRow}>
                {GOAL_OPTIONS.map((item) => {
                  const selected = lookingFor.includes(
                    item.key
                  );

                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.chip,
                        selected && styles.chipActive,
                      ]}
                      onPress={() => toggleGoal(item.key)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected &&
                            styles.chipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={back}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtnFlex}
                  onPress={next}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.step}>
              <View style={styles.finishIcon}>
                <Text style={styles.finishEmoji}>🎉</Text>
              </View>

              <Text style={styles.title}>
                You're all set! 🎉
              </Text>

              <Text style={styles.subtitle}>
                University Universal is ready to help you find
                students, groups, study resources,
                opportunities, and more.
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  saving && styles.primaryBtnDisabled,
                ]}
                onPress={completeOnboarding}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>
                    Explore University Universal
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ==========================================
   STYLES
========================================== */

const styles = {
  safe: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  flex: {
    flex: 1,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loaderText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 12,
  },

  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },

  dot: {
    width: 26,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1F2937",
  },

  dotActive: {
    backgroundColor: "#4F46E5",
  },

  stepLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 28,
  },

  step: {
    flex: 1,
  },

  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 22,
  },

  heroEmoji: {
    fontSize: 42,
  },

  finishIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 22,
  },

  finishEmoji: {
    fontSize: 42,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 31,
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },

  goalsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 28,
  },

  goalPill: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  goalPillText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
  },

  label: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 22,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 14,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 22,
  },

  chip: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  chipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },

  chipText: {
    color: "#D1D5DB",
    fontSize: 14,
  },

  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
  },

  secondaryBtn: {
    paddingVertical: 15,
    paddingHorizontal: 8,
    minWidth: 90,
    alignItems: "center",
  },

  secondaryText: {
    color: "#9CA3AF",
    fontSize: 14,
  },

  primaryBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 34,
  },

  primaryBtnFlex: {
    flex: 1,
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginLeft: 12,
  },

  primaryBtnDisabled: {
    opacity: 0.6,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
};