import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

      navigation.navigate("Home");
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

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
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>

        <TextInput
          placeholder="Enter your password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

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

    </View>
  );
}

/* =========================
   PREMIUM LOGIN UI
========================= */

const styles = {
  container: {
    flex: 1,
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