import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../services/firebase";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const registerUser = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      Alert.alert(
        "Error",
        "Please fill in all fields."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak password",
        "Password must be at least 6 characters long."
      );
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // CREATE FIREBASE AUTHENTICATION ACCOUNT
      // ==========================================

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const firebaseUser = userCredential.user;

      // ==========================================
      // CREATE 3-DAY TRIAL
      // ==========================================

      const trialEndsAt = new Date();

      trialEndsAt.setDate(
        trialEndsAt.getDate() + 3
      );

      // ==========================================
      // CREATE USER PROFILE IN FIRESTORE
      // ==========================================

      await setDoc(
        doc(db, "users", firebaseUser.uid),
        {
          fullName: cleanName,

          email: cleanEmail,

          university: "Not set yet",

          course: "Not set yet",

          country: "Not set yet",

          year: "Not set yet",

          // PLAN
          plan: "trial",

          // PREMIUM
          isPremium: false,

          premiumUntil: null,

          // TRIAL
          trialEndsAt: trialEndsAt.toISOString(),

          // ACCOUNT CREATION
          createdAt: new Date().toISOString(),

          // VIDEO ROOM USAGE
          videoMinutesUsed: 0,

          videoMinutesDate: new Date().toDateString(),
        }
      );

      // ==========================================
      // SUCCESS
      // ==========================================

      Alert.alert(
        "Welcome! 🎉",
        "Your account has been created successfully.",
        [
          {
            text: "Continue",
            onPress: () => {
              navigation.replace("Login");
            },
          },
        ]
      );
    } catch (error) {
      console.log("REGISTER FIREBASE ERROR:", error.code, error.message);

      console.log(
        "REGISTRATION ERROR:",
        error
      );

      let message =
        "Unable to create your account. Please try again.";

      switch (error?.code) {
        case "auth/email-already-in-use":
          message =
            "An account with this email already exists.";
          break;

        case "auth/invalid-email":
          message =
            "Please enter a valid email address.";
          break;

        case "auth/weak-password":
          message =
            "Password must be at least 6 characters long.";
          break;

        case "auth/network-request-failed":
          message =
            "Network connection failed. Please check your internet connection and try again.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many attempts have been made. Please wait a few minutes and try again.";
          break;

        case "permission-denied":
          message =
            "Your account was created, but the user profile could not be saved because of a Firestore permission problem.";
          break;

        default:
          if (
            error?.message?.toLowerCase().includes("network")
          ) {
            message =
              "Network connection failed. Please check your internet connection.";
          }
          break;
      }

      Alert.alert(
        "Registration Failed",
        message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* =====================================
            HEADER
        ===================================== */}

        <View style={styles.header}>
          <Text style={styles.title}>
            Create Account
          </Text>

          <Text style={styles.subtitle}>
            Join the global student network 🌍
          </Text>
        </View>

        {/* =====================================
            FORM CARD
        ===================================== */}

        <View style={styles.card}>

          {/* FULL NAME */}

          <Text style={styles.label}>
            Full Name
          </Text>

          <TextInput
            placeholder="Enter full name"
            placeholderTextColor="#6B7280"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            textContentType="name"
            autoComplete="name"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />

          {/* EMAIL */}

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            placeholder="Enter email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
            returnKeyType="next"
          />

          {/* PASSWORD */}

          <Text style={styles.label}>
            Password
          </Text>

          <View style={styles.passwordContainer}>

            <TextInput
              placeholder="Enter password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={registerUser}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(!showPassword)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.showHideText}>
                {showPassword
                  ? "Hide"
                  : "Show"}
              </Text>
            </TouchableOpacity>

          </View>

          <Text style={styles.passwordHint}>
            Password must be at least 6 characters.
          </Text>

          {/* CREATE ACCOUNT BUTTON */}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              loading &&
                styles.primaryBtnDisabled,
            ]}
            onPress={registerUser}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryText}>
              {loading
                ? "Creating account..."
                : "Create Account"}
            </Text>
          </TouchableOpacity>

        </View>

        {/* =====================================
            LOGIN LINK
        ===================================== */}

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Login")
          }
          style={styles.secondaryBtn}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryText}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ==========================================
   STYLES
========================================== */

const styles = {
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  container: {
    flexGrow: 1,
    backgroundColor: "#05070A",
    padding: 20,
    justifyContent: "center",
  },

  header: {
    marginBottom: 30,
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
  },

  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 18,
    padding: 20,
  },

  label: {
    color: "#9CA3AF",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    color: "#FFFFFF",
    marginBottom: 10,
    fontSize: 14,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 14,
    fontSize: 14,
  },

  showHideText: {
    color: "#4F46E5",
    fontWeight: "600",
    fontSize: 13,
    paddingLeft: 10,
  },

  passwordHint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 10,
  },

  primaryBtn: {
    backgroundColor: "#4F46E5",
    padding: 15,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
  },

  primaryBtnDisabled: {
    opacity: 0.6,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    letterSpacing: 0.3,
    fontSize: 14,
  },

  secondaryBtn: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 10,
  },

  secondaryText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
};

