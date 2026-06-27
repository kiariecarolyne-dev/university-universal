import axios from "axios";
import { useState } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// FIREBASE AUTH
import { auth } from "../services/firebase";

// BACKEND URL
const API_URL = "https://university-universal-backend.onrender.com";

export default function PremiumScreen() {
  const [currency, setCurrency] = useState("kes");
  const [phone, setPhone] = useState("");

  const userId = auth.currentUser?.uid;

  // =========================
  // STRIPE PAYMENT
  // =========================
  const handlePayment = async (plan) => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in first.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/create-checkout-session`,
        {
          userId,
          plan,
          currency,
        }
      );

      const checkoutUrl = response.data.url;

      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert("Error", "Could not start payment.");
      }
    } catch (error) {
      console.log("Payment error:", error.response?.data || error.message);
      Alert.alert("Payment Error", "Something went wrong.");
    }
  };

  // =========================
  // MPESA PAYMENT
  // =========================
  const handleMpesaPayment = async (plan, amount) => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in first.");
      return;
    }

    if (!phone) {
      Alert.alert("Error", "Enter phone number.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/mpesa-payment`,
        {
          phone,
          amount,
          userId,
          plan,
        }
      );

      if (response.data.success) {
        Alert.alert(
          "M-Pesa Sent",
          "Check your phone and enter PIN."
        );
      }

    } catch (error) {
      console.log(
        "MPESA ERROR:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Payment Error",
        "M-Pesa payment failed."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>

      <Text style={styles.subtitle}>Choose Card Currency</Text>

      <View style={styles.currencyRow}>
        <TouchableOpacity
          style={[
            styles.currencyButton,
            currency === "kes" && styles.activeButton,
          ]}
          onPress={() => setCurrency("kes")}
        >
          <Text>KES 🇰🇪</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.currencyButton,
            currency === "usd" && styles.activeButton,
          ]}
          onPress={() => setCurrency("usd")}
        >
          <Text>USD 🇺🇸</Text>
        </TouchableOpacity>
      </View>

      {/* PHONE INPUT */}
      <TextInput
        style={styles.input}
        placeholder="254712345678"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      {/* 2 DAYS */}
      <TouchableOpacity
        style={styles.planButton}
        onPress={() => handlePayment("2days")}
      >
        <Text style={styles.planText}>
          Card: 2 Days — {currency === "kes" ? "KSh 100" : "$1.00"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mpesaButton}
        onPress={() => handleMpesaPayment("2days", 100)}
      >
        <Text style={styles.planText}>
          M-Pesa: 2 Days — KSh 100
        </Text>
      </TouchableOpacity>

      {/* WEEKLY */}
      <TouchableOpacity
        style={styles.planButton}
        onPress={() => handlePayment("weekly")}
      >
        <Text style={styles.planText}>
          Card: Weekly — {currency === "kes" ? "KSh 250" : "$2.50"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mpesaButton}
        onPress={() => handleMpesaPayment("weekly", 250)}
      >
        <Text style={styles.planText}>
          M-Pesa: Weekly — KSh 250
        </Text>
      </TouchableOpacity>

      {/* MONTHLY */}
      <TouchableOpacity
        style={styles.planButton}
        onPress={() => handlePayment("monthly")}
      >
        <Text style={styles.planText}>
          Card: Monthly — {currency === "kes" ? "KSh 1000" : "$10.00"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mpesaButton}
        onPress={() => handleMpesaPayment("monthly", 1000)}
      >
        <Text style={styles.planText}>
          M-Pesa: Monthly — KSh 1000
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },

  currencyRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },

  currencyButton: {
    padding: 12,
    marginHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
  },

  activeButton: {
    backgroundColor: "#d3f4ff",
  },

  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    borderRadius: 10,
  },

  planButton: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },

  mpesaButton: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 18,
  },

  planText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});