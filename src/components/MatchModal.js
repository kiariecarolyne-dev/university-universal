import { Modal, Text, TouchableOpacity, View } from "react-native";

export default function MatchModal({ visible, candidate, onClose, onChat }) {
  if (!candidate) return null;

  const name = candidate.fullName || "Student";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>It's a Match!</Text>
          <Text style={styles.subtitle}>
            You and {name} liked each other.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.keepBtn}
              onPress={onClose}
            >
              <Text style={styles.keepBtnText}>Keep Swiping</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={onChat}
            >
              <Text style={styles.chatBtnText}>Say Hi →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    width: "100%",
    maxWidth: 340,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  keepBtn: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  keepBtnText: {
    color: "#D1D5DB",
    fontWeight: "700",
    fontSize: 14,
  },
  chatBtn: {
    flex: 1,
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  chatBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
};
