import { Text, TouchableOpacity, View } from "react-native";

export default function EmptyState({
  emoji,
  title,
  text,
  actionLabel,
  onAction,
  card = true,
}) {
  return (
    <View
      style={[
        styles.wrap,
        card && styles.card,
        { paddingVertical: card ? 44 : 36 },
      ]}
    >
      {emoji ? (
        <Text style={styles.emoji}>
          {emoji}
        </Text>
      ) : null}

      <Text style={styles.title}>
        {title}
      </Text>

      {text ? (
        <Text style={styles.text}>
          {text}
        </Text>
      ) : null}

      {actionLabel && typeof onAction === "function" ? (
        <TouchableOpacity
          style={styles.action}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={styles.actionText}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = {
  wrap: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 18,
  },

  emoji: {
    fontSize: 36,
    marginBottom: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  text: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 290,
  },

  action: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 18,
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
};