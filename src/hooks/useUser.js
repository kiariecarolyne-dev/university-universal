import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";

export default function useUser() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) return;

      const userRef = doc(db, "users", currentUser.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) return;

      const data = snapshot.data();

      // CHECK PREMIUM EXPIRY
      if (data.isPremium && data.premiumUntil) {
        const now = new Date();
        const expiryDate = new Date(data.premiumUntil);

        // Premium expired
        if (now > expiryDate) {
          await updateDoc(userRef, {
            isPremium: false,
          });

          // update local state immediately
          setUserData({
            ...data,
            isPremium: false,
          });

          return;
        }
      }

      // Premium still valid
      setUserData(data);
    };

    fetchUser();
  }, []);

  return userData;
}