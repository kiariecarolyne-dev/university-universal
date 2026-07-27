import {
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import {
  auth,
  db,
} from "../services/firebase";

export default function useUser() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const userRef = doc(
      db,
      "users",
      currentUser.uid
    );

    const unsubscribe = onSnapshot(
      userRef,
      async (snapshot) => {
        if (!snapshot.exists()) return;

        let data = snapshot.data();

        // -----------------------------
        // DAILY VIDEO MINUTES RESET
        // -----------------------------
        const today = new Date()
          .toISOString()
          .split("T")[0];

        if (
          data.videoMinutesDate !== today
        ) {
          await updateDoc(userRef, {
            videoMinutesUsed: 0,
            videoMinutesDate: today,
          });

          data = {
            ...data,
            videoMinutesUsed: 0,
            videoMinutesDate: today,
          };
        }

        // -----------------------------
        // PREMIUM EXPIRY CHECK
        // -----------------------------
        if (
          data.isPremium &&
          data.premiumUntil
        ) {
          const now = new Date();

          const expiryDate = new Date(
            data.premiumUntil
          );

          if (now > expiryDate) {
            await updateDoc(userRef, {
              isPremium: false,
              premiumUntil: null,
            });

            data = {
              ...data,
              isPremium: false,
              premiumUntil: null,
            };
          }
        }

        setUserData(data);
      }
    );

    return () => unsubscribe();
  }, []);

  return userData;
}