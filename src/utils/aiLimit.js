export const canUseAI = (user) => {
  if (!user) return false;

  // Premium users = unlimited
  if (user.isPremium) return true;

  // Free users = limit (example 5/day)
  const limit = 5;

  return (user.aiUsageToday || 0) < limit;
};