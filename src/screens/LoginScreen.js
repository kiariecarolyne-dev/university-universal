import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
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

import { auth } from "../services/firebase";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      Alert.alert("Success", "Login successful");

      navigation.replace("Home");
    } catch (error) {
  let message = "Login failed. Please try again.";

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      message = "Incorrect email or password.";
      break;

    case "auth/user-not-found":
      message = "No account found with this email.";
      break;

    case "auth/invalid-email":
      message = "Please enter a valid email address.";
      break;

    case "auth/network-request-failed":
      message = "No internet connection. Please check your network.";
      break;

    case "auth/too-many-requests":
      message =
        "Too many failed login attempts. Please try again later or reset your password.";
      break;

    default:
      message = "Unable to log in. Please try again.";
  }

  Alert.alert("Login Failed", message);
} finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
  if (!email.trim()) {
    Alert.alert(
      "Reset Password",
      "Please enter your email address first."
    );
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());

    Alert.alert(
      "Password Reset",
      "A password reset link has been sent to your email."
    );
  } catch (error) {
    let message = "Unable to send password reset email.";

    switch (error.code) {
      case "auth/user-not-found":
        message = "No account found with this email.";
        break;

      case "auth/invalid-email":
        message = "Please enter a valid email address.";
        break;

      case "auth/network-request-failed":
        message = "No internet connection.";
        break;
    }

    Alert.alert("Reset Password", message);
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

      {/* BRAND SECTION */}
      <View style={styles.brandSection}>
        <Text style={styles.brand}>University Universal</Text>

        <Text style={styles.tagline}>
          The Global Student Network 🌍
        </Text>

        <Text style={styles.welcome}>
          Welcome back. Continue building your academic future.
        </Text>
      </View>

      {/* LOGIN CARD */}
      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Login to your account
        </Text>

        <Text style={styles.label}>Email Address</Text>

        <TextInput
  placeholder="Enter your email"
  placeholderTextColor="#6B7280"
  value={email}
  onChangeText={setEmail}
  autoCapitalize="none"
  keyboardType="email-address"
  autoComplete="email"
  textContentType="emailAddress"
  autoCorrect={false}
  returnKeyType="next"
  style={styles.input}
/>

        <Text style={styles.label}>Password</Text>

        <TextInput
  placeholder="Enter your password"
  placeholderTextColor="#6B7280"
  secureTextEntry
  value={password}
  onChangeText={setPassword}
  autoComplete="password"
  textContentType="password"
  returnKeyType="done"
  style={styles.input}
  onSubmitEditing={loginUser}
/>

        <TouchableOpacity
  onPress={forgotPassword}
  style={styles.forgotPasswordBtn}
>
  <Text style={styles.forgotPasswordText}>
    Forgot Password?
  </Text>
</TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={loginUser}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>
              Login
            </Text>
          )}
        </TouchableOpacity>

      </View>

      {/* REGISTER */}
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={styles.secondaryText}>
          New here? Create Account
        </Text>
      </TouchableOpacity>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =========================
   PREMIUM LOGIN UI
========================= */

const styles = {
  container: {
  flexGrow: 1,
  backgroundColor: "#05070A",
  justifyContent: "center",
  padding: 22,
},

  brandSection: {
    marginBottom: 35,
  },

  brand: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },

  tagline: {
    color: "#4F46E5",
    marginTop: 6,
    fontWeight: "600",
    fontSize: 14,
  },

  welcome: {
    color: "#9CA3AF",
    marginTop: 10,
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 18,
    padding: 20,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
  },

  label: {
    color: "#9CA3AF",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 13,
  },

  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 15,
    borderRadius: 12,
    color: "#FFFFFF",
    marginBottom: 10,
  },

  forgotPasswordBtn: {
  alignSelf: "flex-end",
  marginTop: 4,
  marginBottom: 10,
},

forgotPasswordText: {
  color: "#4F46E5",
  fontSize: 13,
  fontWeight: "600",
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
    fontSize: 15,
  },

  secondaryBtn: {
    marginTop: 22,
    alignItems: "center",
  },

  secondaryText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
};