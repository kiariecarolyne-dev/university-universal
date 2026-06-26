import axios from "axios";
import { useState } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ IMPORT FIREBASE AUTH
import { auth } from "../services/firebase";

// ✅ YOUR REAL BACKEND URL
const API_URL = "https://university-universal-backend.onrender.com";

export default function PremiumScreen() {
  const [currency, setCurrency] = useState("kes");

  // ✅ REAL LOGGED IN USER ID
  const userId = auth.currentUser?.uid;

  const handlePayment = async (plan) => {
    // safety check
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
        // Open Stripe checkout page
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert("Error", "Could not start payment.");
      }
    } catch (error) {
      console.log("Payment error:", error.response?.data || error.message);
      Alert.alert("Payment Error", "Something went wrong.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>

      <Text style={styles.subtitle}>Choose Currency</Text>

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

      {/* 2 DAYS PLAN */}
      <TouchableOpacity
        style={styles.planButton}
        onPress={() => handlePayment("2days")}
      >
        <Text style={styles.planText}>
          2 Days — {currency === "kes" ? "KSh 100" : "$1.00"}
        </Text>
      </TouchableOpacity>

      {/* WEEKLY PLAN */}
      <TouchableOpacity
        style={styles.planButton}
        onPress={() => handlePayment("weekly")}
      >
        <Text style={styles.planText}>
          Weekly — {currency === "kes" ? "KSh 250" : "$2.50"}
        </Text>
      </TouchableOpacity>

      {/* MONTHLY PLAN */}
      <TouchableOpacity
        style={styles.planButton}
        onPress={() => handlePayment("monthly")}
      >
        <Text style={styles.planText}>
          Monthly — {currency === "kes" ? "KSh 1000" : "$10.00"}
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
    marginBottom: 30,
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

  planButton: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 15,
  },

  planText: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
  },
});