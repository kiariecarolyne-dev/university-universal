import { useEffect, useRef, useState } from "react";

import { doc, getDoc } from "firebase/firestore";

import { db } from "../services/firebase";

// Returns { [userId]: fullName } for any passed player whose on-file
// name is missing or is the "Student" placeholder. Older clients wrote
// "Student" because Firebase Auth's displayName was null (RegisterScreen
// never calls updateProfile). The real name must come from users/{uid}.
export default function useResolvedNames(players) {
  const [names, setNames] = useState({});

  const resolvedRef = useRef({});

  useEffect(() => {
    let cancelled = false;

    const needed = (players || []).filter(
      (player) =>
        player &&
        player.userId &&
        (!player.name ||
          player.name === "Student") &&
        !resolvedRef.current[player.userId]
    );

    if (needed.length === 0) {
      return;
    }

    (async () => {
      const resolved = {
        ...resolvedRef.current,
      };

      await Promise.all(
        needed.map(async (player) => {
          try {
            const snapshot = await getDoc(
              doc(db, "users", player.userId)
            );

            if (cancelled) return;

            if (snapshot.exists()) {
              const fullName =
                snapshot.data().fullName;

              if (fullName) {
                resolved[player.userId] = fullName;
              }
            }
          } catch (error) {
            console.log(
              "Resolve name error:",
              error
            );
          }
        })
      );

      if (!cancelled) {
        resolvedRef.current = resolved;
        setNames(resolved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [players]);

  return names;
}