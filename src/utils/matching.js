// ==============================
// INTERESTS CATALOG
// ==============================

export const INTERESTS_CATALOG = [
  { key: "music", label: "🎵 Music" },
  { key: "sports", label: "⚽ Sports" },
  { key: "gaming", label: "🎮 Gaming" },
  { key: "movies", label: "🎬 Movies" },
  { key: "reading", label: "📖 Reading" },
  { key: "travel", label: "✈️ Travel" },
  { key: "photography", label: "📷 Photography" },
  { key: "technology", label: "💻 Technology" },
  { key: "business", label: "💼 Business" },
  { key: "fitness", label: "💪 Fitness" },
  { key: "cooking", label: "🍳 Cooking" },
  { key: "art", label: "🎨 Art" },
  { key: "entrepreneurship", label: "🚀 Entrepreneurship" },
  { key: "volunteering", label: "🤝 Volunteering" },
  { key: "education", label: "📚 Education" },
  { key: "fashion", label: "👗 Fashion" },
  { key: "languages", label: "🌍 Languages" },
  { key: "dancing", label: "💃 Dancing" },
  { key: "hiking", label: "🥾 Hiking" },
  { key: "blogging", label: "✍️ Blogging" },
];

// ==============================
// LOOKING-FOR OPTIONS
// ==============================

export const LOOKING_FOR_OPTIONS = [
  { key: "friendship", label: "Friendship" },
  { key: "relationship", label: "Relationship" },
  { key: "conversation", label: "Conversation" },
  { key: "connections", label: "Connections" },
];

// ==============================
// HELPERS
// ==============================

export const getInterestLabel = (key) => {
  const found = INTERESTS_CATALOG.find((i) => i.key === key);
  return found ? found.label : key;
};

export const getLookingForLabel = (key) => {
  const found = LOOKING_FOR_OPTIONS.find((o) => o.key === key);
  return found ? found.label : key;
};

// ==============================
// COMPATIBILITY SCORE (v1)
// ==============================
// "app-generated compatibility estimate" — never "scientific/guaranteed"
//
// Shared interests:       +12 each, capped at +40
// Looking-for overlap:    +20 (at least 1 shared value)
// Same course:            +15
// Same university:        +15
// Same country:           +10
// Same year:              +5 (off by default, enabled via includeYear param)

export const computeCompatibilityScore = (me, candidate, { includeYear = false } = {}) => {
  let points = 0;
  const factors = [];

  // Shared interests
  const myInterests = me.interests || [];
  const theirInterests = candidate.interests || [];
  const sharedInterests = myInterests.filter((i) => theirInterests.includes(i));

  if (sharedInterests.length > 0) {
    const interestPoints = Math.min(sharedInterests.length * 12, 40);
    points += interestPoints;
    factors.push({
      text: `${sharedInterests.length} shared interest${sharedInterests.length > 1 ? "s" : ""}`,
    });
  }

  // Looking-for overlap
  const myLookingFor = me.lookingFor || [];
  const theirLookingFor = candidate.lookingFor || [];
  const sharedLookingFor = myLookingFor.filter((l) => theirLookingFor.includes(l));

  if (sharedLookingFor.length > 0) {
    points += 20;
    factors.push({ text: "Looking for similar things" });
  }

  // Same course
  if (
    me.course &&
    candidate.course &&
    me.course !== "Not set yet" &&
    candidate.course !== "Not set yet" &&
    me.course.toLowerCase().trim() === candidate.course.toLowerCase().trim()
  ) {
    points += 15;
    factors.push({ text: "Same course" });
  }

  // Same university
  if (
    me.university &&
    candidate.university &&
    me.university !== "Not set yet" &&
    candidate.university !== "Not set yet" &&
    me.university.toLowerCase().trim() === candidate.university.toLowerCase().trim()
  ) {
    points += 15;
    factors.push({ text: "Same university" });
  }

  // Same country
  if (
    me.country &&
    candidate.country &&
    me.country !== "Not set yet" &&
    candidate.country !== "Not set yet" &&
    me.country.toLowerCase().trim() === candidate.country.toLowerCase().trim()
  ) {
    points += 10;
    factors.push({ text: "Same country" });
  }

  // Same year (optional, off by default)
  if (includeYear && me.year && candidate.year && me.year === candidate.year) {
    points += 5;
    factors.push({ text: "Same year" });
  }

  const score = Math.min(100, points);

  return { score, factors };
};

// ==============================
// BUILD CANDIDATE BATCH
// ==============================
// Fetches a bounded batch of users, excludes self + swiped + blocked,
// scores them, and returns sorted by score desc.

export const buildCandidateBatch = ({
  allUsers,
  currentUserId,
  swipedIds,
  blockedIds,
  me,
  limit = 20,
}) => {
  const excluded = new Set([
    currentUserId,
    ...blockedIds,
    ...swipedIds,
  ]);

  const candidates = allUsers
    .filter(
      (u) =>
        u.id !== currentUserId &&
        (u.matchVisible !== false) &&
        !excluded.has(u.id)
    )
    .map((u) => {
      const { score, factors } = computeCompatibilityScore(me, u);
      return { ...u, compatibilityScore: score, factors };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);

  return candidates;
};
