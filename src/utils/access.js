// ==============================
// SAFE DATE PARSER (prevents crashes)
// ==============================
const safeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
};

// ==============================
// CHECK PREMIUM STATUS (SECURE)
// ==============================
export const isPremiumUser = (user) => {
  if (!user) return false;

  // MUST have backend truth flag
  const isPremium = user.isPremium === true;

  if (!isPremium) return false;

  const expiryDate = safeDate(user.premiumUntil);

  if (!expiryDate) return false;

  const now = new Date();

  // expired
  if (now > expiryDate) return false;

  return true;
};

// ==============================
// CHECK TRIAL PERIOD (SECURE)
// ==============================
export const isInTrialPeriod = (user) => {
  if (!user) return false;

  // Premium overrides trial
  if (isPremiumUser(user)) return false;

  const createdDate = safeDate(user.createdAt);

  if (!createdDate) return false;

  const now = new Date();

  const daysPassed =
    (now - createdDate) / (1000 * 60 * 60 * 24);

  return daysPassed <= 3;
};

// ==============================
// PLAN TYPE (SINGLE SOURCE OF TRUTH)
// ==============================
export const getUserPlan = (user) => {
  if (isPremiumUser(user)) return "premium";
  if (isInTrialPeriod(user)) return "trial";
  return "free";
};

// ==============================
// ACCESS RULES (LOCKED DOWN)
// ==============================

// Discover: trial OR premium
export const canAccessDiscover = (user) => {
  return isPremiumUser(user) || isInTrialPeriod(user);
};

// Groups: everyone
export const canAccessGroups = () => true;

// Create groups: trial OR premium
export const canCreateGroups = (user) => {
  return isPremiumUser(user) || isInTrialPeriod(user);
};

// Private chat: PREMIUM ONLY
export const canAccessPrivateChat = (user) => {
  return isPremiumUser(user);
};

// Video rooms: PREMIUM ONLY
export const canAccessVideoRoom = (user) => {
  return isPremiumUser(user);
};

// Notes marketplace: PREMIUM ONLY
export const canAccessNotes = (user) => {
  return isPremiumUser(user);
};