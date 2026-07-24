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
    if (!fullName || !email || !password) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    try {
      setLoading(true);

      // CREATE AUTH USER
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      // CREATE 3 DAY TRIAL
      const trialEndsAt = new Date();
      trialEndsAt.setDate(
        trialEndsAt.getDate() + 3
      );

      // SAVE USER PROFILE
      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: fullName,      // NEW

          email: email,

          university: "Not set yet",
          course: "Not set yet",
          country: "Not set yet",
          year: "Not set yet",

          // PLAN SYSTEM
          plan: "trial",

          // PREMIUM
          isPremium: false,
          premiumUntil: null,

          // TRIAL
          trialEndsAt:
            trialEndsAt.toISOString(),

          createdAt:
            new Date().toISOString(),

            videoMinutesUsed: 0,
videoMinutesDate: new Date().toDateString(),
        }
      );

      Alert.alert(
  "Welcome!",
  "Your account has been created successfully. Please log in."
);

navigation.replace("Login");

    } catch (error) {
  let message = "Unable to create your account.";

  switch (error.code) {
    case "auth/email-already-in-use":
      message = "An account with this email already exists.";
      break;

    case "auth/invalid-email":
      message = "Please enter a valid email address.";
      break;

    case "auth/weak-password":
      message =
        "Password must be at least 6 characters long.";
      break;

    case "auth/network-request-failed":
      message =
        "No internet connection. Please check your network.";
      break;

    default:
      message = "Registration failed. Please try again.";
  }

  Alert.alert("Registration Failed", message);
} finally {
  setLoading(false);
}
  
  };

  return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Join the global student network 🌍
        </Text>
      </View>

      {/* FORM CARD */}
      <View style={styles.card}>

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
  returnKeyType="next"
/>

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
    autoComplete="new-password"
    textContentType="newPassword"
    returnKeyType="done"
    onSubmitEditing={registerUser}
  />

  <TouchableOpacity
    onPress={() => setShowPassword(!showPassword)}
  >
    <Text style={styles.showHideText}>
      {showPassword ? "Hide" : "Show"}
    </Text>
  </TouchableOpacity>
</View>

<Text style={styles.passwordHint}>
  Password must be at least 6 characters.
</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={registerUser}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading
              ? "Creating account..."
              : "Create Account"}
          </Text>
        </TouchableOpacity>

      </View>

      {/* FOOTER */}
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Login")
        }
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>

    </ScrollView>
</KeyboardAvoidingView>
  );
}

/* =========================
   PREMIUM DARK UI
========================= */

const styles = {
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
  },

  input: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    color: "#FFFFFF",
    marginBottom: 10,
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
},

showHideText: {
  color: "#4F46E5",
  fontWeight: "600",
  fontSize: 13,
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

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    marginTop: 20,
    alignItems: "center",
  },

  secondaryText: {
    color: "#9CA3AF",
  },
};