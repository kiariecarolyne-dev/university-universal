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

const API_URL =
  "https://university-universal-backend.onrender.com";

export default function PremiumScreen({ navigation }) {
  const [currency, setCurrency] = useState("kes");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = auth.currentUser?.uid;

  // =========================
  // FORMAT MPESA PHONE
  // =========================
  const formatPhone = (number) => {
    let cleaned = number.replace(/\s/g, "");

    if (cleaned.startsWith("07")) {
      return "254" + cleaned.substring(1);
    }

    if (cleaned.startsWith("01")) {
      return "254" + cleaned.substring(1);
    }

    if (cleaned.startsWith("254")) {
      return cleaned;
    }

    return null;
  };

  // =========================
  // LEMON SQUEEZY CARD PAYMENT
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
        `${API_URL}/create-lemon-checkout`,
        {
          userId,
          plan,
        }
      );

      const checkoutUrl = response.data?.url;

      if (!checkoutUrl) {
        Alert.alert(
          "Error",
          "Payment session not created."
        );
        return;
      }

      await Linking.openURL(checkoutUrl);

      Alert.alert(
        "Browser Opened",
        "Complete your payment on the secure Lemon Squeezy checkout page. When payment finishes, return to University Universal."
      );
    } catch (error) {
      console.log(
        "CARD PAYMENT ERROR:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Payment Error",
        error.response?.data?.error ||
          "Card payment failed."
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
    console.log("PHONE:", formattedPhone);

    const response = await axios.post(
      `${API_URL}/mpesa-payment`,
      {
        phone: formattedPhone,
        userId,
        plan,
      }
    );

    if (response.data?.success) {
      Alert.alert(
        "📲 M-Pesa Prompt Sent",
        `A payment request for KSh ${amount} has been sent to ${phone}.\n\n` +
          "Check your phone for the M-Pesa prompt and enter your M-Pesa PIN.\n\n" +
          "Your Premium will only be activated after M-Pesa confirms the payment.",
        [
          {
            text: "OK",
            style: "default",
          },
        ]
      );
    } else {
      Alert.alert(
        "❌ Payment Not Started",
        "M-Pesa could not start the payment request. Please try again."
      );
    }
  } catch (error) {
    console.log(
      "MPESA FRONTEND ERROR:",
      error.response?.data || error.message
    );

    Alert.alert(
      "❌ M-Pesa Error",
      error.response?.data?.error ||
        "We could not start the M-Pesa payment. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* =========================
          HEADER
      ========================= */}
      <View style={styles.header}>
        <Text style={styles.title}>
          🚀 Upgrade to Premium
        </Text>

        <Text style={styles.subtitle}>
          Unlock the full University Universal experience.
        </Text>
      </View>

      {/* =========================
          TRUST
      ========================= */}
      <View style={styles.trustBox}>
        <Text style={styles.trustTitle}>
          🔒 Safe & Secure Payments
        </Text>

        <Text style={styles.trustText}>
          Pay securely with M-Pesa or international cards.
          Card payments are processed securely by Lemon
          Squeezy.
        </Text>
      </View>

      {/* =========================
          FEATURES
      ========================= */}
      <Text style={styles.sectionTitle}>
        Why Upgrade?
      </Text>

      <View style={styles.featuresCard}>
        <Text style={styles.cardTitle}>
          Premium Features
        </Text>

        <Text style={styles.feature}>
          ✓ Chat privately with students worldwide
        </Text>

        <Text style={styles.feature}>
          ✓ Join unlimited video study rooms
        </Text>

        <Text style={styles.feature}>
          ✓ Access premium study notes
        </Text>

        <Text style={styles.feature}>
          ✓ Unlimited past-paper downloads
        </Text>

        <Text style={styles.feature}>
          ✓ Get priority visibility across the app
        </Text>
      </View>

      {/* =========================
          CURRENCY
      ========================= */}
      <Text style={styles.sectionTitle}>
        Choose Currency
      </Text>

      <View style={styles.row}>
        <TouchableOpacity
          disabled={loading}
          style={[
            styles.currencyBtn,
            currency === "kes" &&
              styles.activeCurrency,
          ]}
          onPress={() => setCurrency("kes")}
        >
          <Text style={styles.currencyText}>
            KES 🇰🇪
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          style={[
            styles.currencyBtn,
            currency === "usd" &&
              styles.activeCurrency,
          ]}
          onPress={() => setCurrency("usd")}
        >
          <Text style={styles.currencyText}>
            USD 🌎
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================
          MPESA NUMBER
      ========================= */}
      {currency === "kes" && (
        <TextInput
          style={styles.input}
          placeholder="M-Pesa Number (0712345678)"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={12}
        />
      )}

      {/* =========================
          WEEKLY PLAN
      ========================= */}
      <View
        style={[
          styles.planCard,
          styles.popularCard,
        ]}
      >
        <Text style={styles.popularBadge}>
          MOST POPULAR
        </Text>

        <Text style={styles.planTitle}>
          Weekly Premium
        </Text>

        <Text style={styles.planDesc}>
          Full Premium access for 7 days.
        </Text>

        <Text style={styles.price}>
          {currency === "kes"
            ? "KSh 50"
            : "$0.50"}
        </Text>

        <Text style={styles.duration}>
          per week
        </Text>

        {/* USD CARD */}
        {currency === "usd" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.primaryBtn}
            onPress={() =>
              handlePayment("weekly")
            }
          >
            <Text style={styles.primaryText}>
              💳 Pay with Card
            </Text>
          </TouchableOpacity>
        )}

        {/* KES MPESA */}
        {currency === "kes" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.secondaryBtn}
            onPress={() =>
              handleMpesaPayment(
                "weekly",
                50
              )
            }
          >
            <Text style={styles.secondaryText}>
              📲 Pay with M-Pesa
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* =========================
          MONTHLY PLAN
      ========================= */}
      <View
        style={[
          styles.planCard,
          styles.premiumCard,
        ]}
      >
        <Text style={styles.goldBadge}>
          ⭐ BEST VALUE
        </Text>

        <Text style={styles.planTitle}>
          Monthly Premium
        </Text>

        <Text style={styles.planDesc}>
          Full Premium access for one month.
        </Text>

        <Text style={styles.price}>
          {currency === "kes"
            ? "KSh 150"
            : "$1.50"}
        </Text>

        <Text style={styles.duration}>
          per month
        </Text>

        {/* USD CARD */}
        {currency === "usd" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.primaryBtn}
            onPress={() =>
              handlePayment("monthly")
            }
          >
            <Text style={styles.primaryText}>
              💳 Pay with Card
            </Text>
          </TouchableOpacity>
        )}

        {/* KES MPESA */}
        {currency === "kes" && (
          <TouchableOpacity
            disabled={loading}
            style={styles.secondaryBtn}
            onPress={() =>
              handleMpesaPayment(
                "monthly",
                150
              )
            }
          >
            <Text style={styles.secondaryText}>
              📲 Pay with M-Pesa
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* =========================
          WARNING
      ========================= */}
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>
          Keep your Premium access
        </Text>

        <Text style={styles.warningText}>
          Upgrade today to enjoy the full University
          Universal experience without restrictions.
        </Text>
      </View>

      {/* =========================
          SECURITY
      ========================= */}
      <Text style={styles.security}>
        🔒 Secure Payments • Protected Checkout
      </Text>

      {/* =========================
          LOADING
      ========================= */}
      {loading && (
  <Text style={styles.loading}>
    📲 Connecting to M-Pesa...
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
    textAlign: "center",
  },

  subtitle: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
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
    lineHeight: 20,
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
    marginTop: 6,
    lineHeight: 20,
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
    fontSize: 20,
  },

  planDesc: {
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,
  },

  price: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 2,
  },

  duration: {
    color: "#9CA3AF",
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
    fontWeight: "bold",
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
    lineHeight: 20,
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