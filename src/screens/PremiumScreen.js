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
const API_URL =
  "https://university-universal-backend.onrender.com";

export default function PremiumScreen() {
  const [currency, setCurrency] =
    useState("kes");

  const [phone, setPhone] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const userId =
    auth.currentUser?.uid;

  // =========================
  // FORMAT PHONE NUMBER
  // =========================
  const formatPhone = (number) => {
    let cleaned =
      number.replace(/\s/g, "");

    // 0712345678 → 254712345678
    if (cleaned.startsWith("07")) {
      return "254" + cleaned.substring(1);
    }

    // 0112345678 → 254112345678
    if (cleaned.startsWith("01")) {
      return "254" + cleaned.substring(1);
    }

    // already correct
    if (cleaned.startsWith("254")) {
      return cleaned;
    }

    return null;
  };

  // =========================
  // STRIPE PAYMENT
  // =========================
  const handlePayment =
    async (plan) => {
      if (!userId) {
        Alert.alert(
          "Error",
          "You must be logged in first."
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await axios.post(
            `${API_URL}/create-checkout-session`,
            {
              userId,
              plan,
              currency,
            }
          );

        const checkoutUrl =
          response.data.url;

        if (checkoutUrl) {
          await Linking.openURL(
            checkoutUrl
          );
        } else {
          Alert.alert(
            "Error",
            "Could not start payment."
          );
        }

      } catch (error) {
        console.log(
          "Payment error:",
          error.response?.data ||
            error.message
        );

        Alert.alert(
          "Payment Error",
          "Something went wrong."
        );

      } finally {
        setLoading(false);
      }
    };

  // =========================
  // MPESA PAYMENT
  // =========================
  const handleMpesaPayment =
    async (plan, amount) => {

      if (!userId) {
        Alert.alert(
          "Error",
          "You must be logged in first."
        );
        return;
      }

      const formattedPhone =
        formatPhone(phone);

      if (!formattedPhone) {
        Alert.alert(
          "Invalid Number",
          "Enter valid Safaricom number.\nExample: 0712345678"
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await axios.post(
            `${API_URL}/mpesa-payment`,
            {
              phone: formattedPhone,
              amount,
              userId,
              plan,
            }
          );

        if (response.data.success) {
          Alert.alert(
            "M-Pesa Sent",
            "Check phone and enter M-Pesa PIN."
          );
        }

      } catch (error) {
        console.log(
          "MPESA ERROR:",
          error.response?.data ||
            error.message
        );

        Alert.alert(
          "Payment Error",
          "M-Pesa payment failed."
        );

      } finally {
        setLoading(false);
      }
    };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Upgrade to Premium
      </Text>

      <Text style={styles.subtitle}>
        Choose Card Currency
      </Text>

      <View style={styles.currencyRow}>

        <TouchableOpacity
          disabled={loading}
          style={[
            styles.currencyButton,
            currency === "kes" &&
              styles.activeButton,
          ]}
          onPress={() =>
            setCurrency("kes")
          }
        >
          <Text>KES 🇰🇪</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          style={[
            styles.currencyButton,
            currency === "usd" &&
              styles.activeButton,
          ]}
          onPress={() =>
            setCurrency("usd")
          }
        >
          <Text>USD 🇺🇸</Text>
        </TouchableOpacity>

      </View>

      <TextInput
        style={styles.input}
        placeholder="0712345678"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      {/* 2 DAYS */}

      <TouchableOpacity
        disabled={loading}
        style={styles.planButton}
        onPress={() =>
          handlePayment("2days")
        }
      >
        <Text style={styles.planText}>
          Card: 2 Days —{" "}
          {currency === "kes"
            ? "KSh 100"
            : "$1.00"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={loading}
        style={styles.mpesaButton}
        onPress={() =>
          handleMpesaPayment(
            "2days",
            100
          )
        }
      >
        <Text style={styles.planText}>
          M-Pesa: 2 Days — KSh 100
        </Text>
      </TouchableOpacity>

      {/* WEEKLY */}

      <TouchableOpacity
        disabled={loading}
        style={styles.planButton}
        onPress={() =>
          handlePayment("weekly")
        }
      >
        <Text style={styles.planText}>
          Card: Weekly —{" "}
          {currency === "kes"
            ? "KSh 250"
            : "$2.50"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={loading}
        style={styles.mpesaButton}
        onPress={() =>
          handleMpesaPayment(
            "weekly",
            250
          )
        }
      >
        <Text style={styles.planText}>
          M-Pesa: Weekly — KSh 250
        </Text>
      </TouchableOpacity>

      {/* MONTHLY */}

      <TouchableOpacity
        disabled={loading}
        style={styles.planButton}
        onPress={() =>
          handlePayment("monthly")
        }
      >
        <Text style={styles.planText}>
          Card: Monthly —{" "}
          {currency === "kes"
            ? "KSh 1000"
            : "$10.00"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={loading}
        style={styles.mpesaButton}
        onPress={() =>
          handleMpesaPayment(
            "monthly",
            1000
          )
        }
      >
        <Text style={styles.planText}>
          M-Pesa: Monthly — KSh 1000
        </Text>
      </TouchableOpacity>

      {loading && (
        <Text
          style={{
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Processing payment...
        </Text>
      )}

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