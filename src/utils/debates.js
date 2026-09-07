// ==============================
// DEBATE PLAYER HELPERS
// ==============================

// In Firestore, map field key order is NOT guaranteed, so Object.values()
// order is unreliable. Always read players by their stable ids:
// playerOne = the creator (challenger), playerTwo = the opponent.
export function getDebatePlayers(battle) {
  const players = battle?.players || {};

  const byId = (id) =>
    id ? players[id] || null : null;

  const allPlayers = Object.values(players);

  const playerOne =
    byId(battle?.createdBy) ||
    allPlayers[0] ||
    null;

  const playerTwo =
    byId(battle?.opponentId) ||
    allPlayers[1] ||
    null;

  return { playerOne, playerTwo };
}

// Is the debate fully finished (both final defenses submitted)?
export function isDebateFinished(battle) {
  if (!battle) return false;

  if (battle.status === "finished") return true;

  const { playerOne, playerTwo } =
    getDebatePlayers(battle);

  return Boolean(
    playerOne?.finalResponse &&
      playerTwo?.finalResponse
  );
}