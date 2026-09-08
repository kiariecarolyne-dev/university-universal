import { Image, Text, View } from "react-native";

import { getInterestLabel, getLookingForLabel } from "../utils/matching";

export default function MatchCard({ candidate, showScore = true }) {
  const photo = candidate.photo || "";
  const name = candidate.fullName || "Student";
  const university = candidate.university || "";
  const course = candidate.course || "";
  const year = candidate.year || "";
  const interests = candidate.interests || [];
  const lookingFor = candidate.lookingFor || [];
  const score = candidate.compatibilityScore || 0;
  const factors = candidate.factors || [];

  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      {/* PHOTO */}
      <View style={styles.imageContainer}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{initial}</Text>
          </View>
        )}

        {candidate.online && <View style={styles.onlineDot} />}

        {showScore && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>≈ {score}% Match</Text>
          </View>
        )}
      </View>

      {/* INFO */}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>

        {university ? (
          <Text style={styles.meta}>
            {course && course !== "Not set yet"
              ? `${course}${year && year !== "Not set yet" ? `  •  ${year}` : ""}`
              : university}
          </Text>
        ) : null}

        {university && course && course !== "Not set yet" ? (
          <Text style={styles.university}>{university}</Text>
        ) : null}

        {/* LOOKING-FOR CHIPS */}
        {lookingFor.length > 0 && (
          <View style={styles.tagRow}>
            {lookingFor.slice(0, 3).map((l) => (
              <View key={l} style={styles.tag}>
                <Text style={styles.tagText}>{getLookingForLabel(l)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* INTERESTS */}
        {interests.length > 0 && (
          <View style={styles.tagRow}>
            {interests.slice(0, 3).map((i) => (
              <View key={i} style={styles.interestTag}>
                <Text style={styles.interestTagText}>{getInterestLabel(i)}</Text>
              </View>
            ))}
            {interests.length > 3 && (
              <Text style={styles.moreText}>+{interests.length - 3}</Text>
            )}
          </View>
        )}

        {/* COMPATIBILITY FACTORS */}
        {showScore && factors.length > 0 && (
          <View style={styles.factorRow}>
            {factors.map((f, idx) => (
              <Text key={idx} style={styles.factorText}>
                {idx > 0 ? "  •  " : ""}{f.text}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = {
  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
    width: "100%",
  },
  imageContainer: {
    position: "relative",
  },
  photo: {
    width: "100%",
    height: 320,
    backgroundColor: "#1F2937",
  },
  placeholder: {
    width: "100%",
    height: 320,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#FFFFFF",
    fontSize: 72,
    fontWeight: "bold",
  },
  onlineDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#111827",
  },
  scoreBadge: {
    position: "absolute",
    bottom: 14,
    left: 14,
    backgroundColor: "rgba(79, 70, 229, 0.9)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  info: {
    padding: 16,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  meta: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
  },
  university: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 6,
    alignItems: "center",
  },
  tag: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  interestTag: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#374151",
  },
  interestTagText: {
    color: "#D1D5DB",
    fontSize: 11,
  },
  moreText: {
    color: "#6B7280",
    fontSize: 11,
    marginLeft: 4,
  },
  factorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  factorText: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "600",
  },
};
