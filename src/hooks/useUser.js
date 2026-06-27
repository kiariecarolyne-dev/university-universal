import {
  doc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";

import { useEffect, useState } from "react";

import {
  auth,
  db
} from "../services/firebase";

export default function useUser() {
  const [userData, setUserData] =
    useState(null);

  useEffect(() => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) return;

    const userRef = doc(
      db,
      "users",
      currentUser.uid
    );

    // REALTIME LISTENER
    const unsubscribe =
      onSnapshot(userRef, async (snapshot) => {
        if (!snapshot.exists()) return;

        const data =
          snapshot.data();

        // CHECK PREMIUM EXPIRY
        if (
          data.isPremium &&
          data.premiumUntil
        ) {
          const now =
            new Date();

          const expiryDate =
            new Date(
              data.premiumUntil
            );

          // Premium expired
          if (now > expiryDate) {
            await updateDoc(
              userRef,
              {
                isPremium: false,
                premiumUntil: null,
              }
            );

            setUserData({
              ...data,
              isPremium: false,
              premiumUntil: null,
            });

            return;
          }
        }

        // Premium valid
        setUserData(data);
      });

    return () => unsubscribe();
  }, []);

  return userData;
}