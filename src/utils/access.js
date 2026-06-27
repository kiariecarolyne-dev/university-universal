export const isPremiumUser = (user) => {
  if (!user) return false;

  // If user is not premium
  if (user.isPremium !== true) {
    return false;
  }

  // If premium exists but no expiry date
  if (!user.premiumUntil) {
    return false;
  }

  const now = new Date();
  const expiryDate = new Date(user.premiumUntil);

  // Premium expired
  if (now > expiryDate) {
    return false;
  }

  // Premium still active
  return true;
};

export const requirePremium = (user, action) => {
  if (!isPremiumUser(user)) {
    return false;
  }

  return true;
};