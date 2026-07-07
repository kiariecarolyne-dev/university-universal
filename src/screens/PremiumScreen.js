import axios from "axios";
import { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "../services/firebase";

const API_URL = "https://university-universal-backend.onrender.com";

export default function PremiumScreen() {
  const [currency, setCurrency] = useState("kes");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = auth.currentUser?.uid;

  const formatPhone = (number) => {
    let cleaned = number.replace(/\s/g, "");

    if (cleaned.startsWith("07")) return "254" + cleaned.substring(1);
    if (cleaned.startsWith("01")) return "254" + cleaned.substring(1);
    if (cleaned.startsWith("254")) return cleaned;

    return null;
  };

  // =========================
  // CARD PAYMENT
  // =========================
  const handlePayment = async (plan) => {
    if (!userId) {
      Alert.alert("Error", "Please login first");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      console.log("STARTING CARD PAYMENT");
      console.log("PLAN:", plan);

      const response = await axios.post(
        `${API_URL}/create-checkout-session`,
        {
          userId,
          plan,
          currency,
        }
      );

      const checkoutUrl = response.data?.url;

      if (!checkoutUrl) {
        Alert.alert("Error", "Payment session not created");
        return;
      }

      await Linking.openURL(checkoutUrl);

      Alert.alert(
        "Complete Payment",
        "Finish payment in browser, then return to app."
      );
    } catch (error) {
      console.log(
        "CARD PAYMENT ERROR:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.error || "Card payment failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // MPESA PAYMENT
  // =========================
  const handleMpesaPayment = async (plan, amount) => {
    if (!userId) {
      Alert.alert("Error", "Please login first");
      return;
    }

    if (loading) return;

    const formattedPhone = formatPhone(phone);

    if (!formattedPhone) {
      Alert.alert(
        "Invalid Number",
        "Enter number like 0712345678"
      );
      return;
    }

    try {
      setLoading(true);

      console.log("STARTING MPESA PAYMENT");
      console.log("PLAN:", plan);
      console.log("AMOUNT:", amount);

      const response = await axios.post(
        `${API_URL}/mpesa-payment`,
        {
          phone: formattedPhone,
          amount,     // MUST MATCH BACKEND
          userId,
          plan,
        }
      );

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Check your phone for M-Pesa prompt."
        );
      }
    } catch (error) {
  console.log("MPESA FRONTEND ERROR:", error.message);

  console.log(
    "SERVER RESPONSE:",
    error.response?.data
  );

  Alert.alert(
    "Error",
    JSON.stringify(
      error.response?.data || error.message
    )
  );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>
  🚀 Upgrade to Premium
</Text>
        <Text style={styles.subtitle}>
  Unlock messaging, notes, study rooms and more.
</Text>
      </View>

      <View style={styles.trustBox}>
        <Text style={styles.trustTitle}>
  🔒 Safe & Secure Payments
</Text>

<Text style={styles.trustText}>
  Pay securely with M-Pesa or international cards powered by Stripe.
</Text>
      </View>

      <Text style={styles.sectionTitle}>
  Why Upgrade?
</Text>

      <View style={styles.featuresCard}>
        <Text style={styles.cardTitle}>Premium Features</Text>
        <Text style={styles.feature}>✓ Chat privately with students worldwide</Text>
        <Text style={styles.feature}>✓ Join unlimited video study rooms</Text>
        <Text style={styles.feature}>✓ Access premium study notes</Text>
        <Text style={styles.feature}>✓ Upload Notes & Earn</Text>
        <Text style={styles.feature}>✓ Get priority visibility across the app</Text>
      </View>

      <Text style={styles.sectionTitle}>Choose Currency</Text>

      <View style={styles.row}>
        <TouchableOpacity
          disabled={loading}
          style={[
            styles.currencyBtn,
            currency === "kes" && styles.activeCurrency,
          ]}
          onPress={() => setCurrency("kes")}
        >
          <Text style={styles.currencyText}>KES 🇰🇪</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          style={[
            styles.currencyBtn,
            currency === "usd" && styles.activeCurrency,
          ]}
          onPress={() => setCurrency("usd")}
        >
          <Text style={styles.currencyText}>USD 🇺🇸</Text>
        </TouchableOpacity>
      </View>

      {currency === "kes" && (
        <TextInput
          style={styles.input}
          placeholder="M-Pesa Number (0712345678)"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      )}

            {/* 2 DAYS */}
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>Starter Plan</Text>
        <Text style={styles.planDesc}>
          Perfect for testing premium access
        </Text>

        <Text style={styles.price}>
          {currency === "kes" ? "KSh 50" : "$0.50"}
        </Text>

        {currency === "usd" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.primaryBtn}
            onPress={() => handlePayment("2days")}
          >
            <Text style={styles.primaryText}>
              Subscribe with Card
            </Text>
          </TouchableOpacity>
        )}

        {currency === "kes" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.secondaryBtn}
            onPress={() => handleMpesaPayment("2days", 50)}
          >
            <Text style={styles.secondaryText}>
              Instant M-Pesa Payment
            </Text>
          </TouchableOpacity>
        )}
      </View>


      {/* WEEKLY */}
      <View style={[styles.planCard, styles.popularCard]}>
        <Text style={styles.popularBadge}>MOST POPULAR</Text>
        <Text style={styles.planTitle}>Student Pro</Text>

        <Text style={styles.planDesc}>
          Best for active university students
        </Text>

        <Text style={styles.price}>
          {currency === "kes" ? "KSh 150" : "$1.50"}
        </Text>

        {currency === "usd" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.primaryBtn}
            onPress={() => handlePayment("weekly")}
          >
            <Text style={styles.primaryText}>
              Subscribe with Card
            </Text>
          </TouchableOpacity>
        )}

        {currency === "kes" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.secondaryBtn}
            onPress={() => handleMpesaPayment("weekly", 150)}
          >
            <Text style={styles.secondaryText}>
              Instant M-Pesa Payment
            </Text>
          </TouchableOpacity>
        )}
      </View>


      {/* MONTHLY */}
      <View style={[styles.planCard, styles.premiumCard]}>
        <Text style={styles.goldBadge}>UNLIMITED PREMIUM ⭐</Text>
        <Text style={styles.planTitle}>Unlimited Access</Text>

        <Text style={styles.planDesc}>
          Full unrestricted premium experience
        </Text>

        <Text style={styles.price}>
          {currency === "kes" ? "KSh 500" : "$5.00"}
        </Text>

        {currency === "usd" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.primaryBtn}
            onPress={() => handlePayment("monthly")}
          >
            <Text style={styles.primaryText}>
              💳 Pay with Card
            </Text>
          </TouchableOpacity>
        )}

        {currency === "kes" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.secondaryBtn}
            onPress={() => handleMpesaPayment("monthly", 500)}
          >
            <Text style={styles.secondaryText}>
              📲 Pay with M-Pesa
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>
          Don't lose access to Premium features
        </Text>

        <Text style={styles.warningText}>
          Upgrade today to continue messaging, studying and earning without interruption.
        </Text>
      </View>

      <Text style={styles.security}>
        🔒 Secure Payments • Protected Checkout
      </Text>

      {loading && (
        <Text style={styles.loading}>
          🔄 Preparing secure checkout...
        </Text>
      )}
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
    padding: 16,
  },

  header: {
    marginTop: 45,
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
  },

  trustBox: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 14,
    marginBottom: 18,
  },

  trustTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  trustText: {
    color: "#9CA3AF",
    marginTop: 4,
  },

  featuresCard: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  cardTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 10,
    fontSize: 16,
  },

  feature: {
    color: "#9CA3AF",
    marginTop: 4,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },

  currencyBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    marginHorizontal: 8,
    minWidth: 100,
    alignItems: "center",
  },

  activeCurrency: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },

  currencyText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    color: "#FFFFFF",
    marginBottom: 18,
  },

  planCard: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 16,
  },

  popularCard: {
    borderColor: "#4F46E5",
    borderWidth: 2,
  },

  premiumCard: {
    borderColor: "#F59E0B",
    borderWidth: 2,
  },

  popularBadge: {
    color: "#4F46E5",
    fontWeight: "bold",
    marginBottom: 6,
  },

  goldBadge: {
    color: "#F59E0B",
    fontWeight: "bold",
    marginBottom: 6,
  },

  planTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },

  planDesc: {
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 8,
  },

  price: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },

  primaryBtn: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },

  primaryText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "bold",
  },

  secondaryBtn: {
    backgroundColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
  },

  secondaryText: {
    color: "#FFFFFF",
    textAlign: "center",
  },

  warningBox: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 14,
    marginTop: 8,
  },

  warningTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  warningText: {
    color: "#9CA3AF",
    marginTop: 4,
  },

  security: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },

  loading: {
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 30,
  },
};