// ==============================
// PRIVATE VIDEO CALL HELPERS
// ==============================

// Deterministic room key so both participants always derive the same
// Jitsi room name from the same pair of users (order-independent).
export function createPrivateRoomKey(uidA, uidB) {
  return uidA < uidB
    ? `private-${uidA}-${uidB}`
    : `private-${uidB}-${uidA}`;
}

// How long the caller waits before a call is considered "timed out".
export const CALL_TIMEOUT_SECONDS = 45;