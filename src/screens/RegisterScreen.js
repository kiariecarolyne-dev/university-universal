import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
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
        }
      );

      Alert.alert(
        "Success",
        "Account created successfully"
      );

      navigation.navigate("Login");

    } catch (error) {
      Alert.alert(
        "Error",
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

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
        />

        <Text style={styles.label}>
          Password
        </Text>

        <TextInput
          placeholder="Enter password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

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

    </View>
  );
}

/* =========================
   PREMIUM DARK UI
========================= */

const styles = {
  container: {
    flex: 1,
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