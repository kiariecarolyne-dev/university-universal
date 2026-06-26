export const isPremiumUser = (user) => {
  return user?.isPremium === true;
};

export const requirePremium = (user, action) => {
  if (!isPremiumUser(user)) {
    return false;
  }
  return true;
};