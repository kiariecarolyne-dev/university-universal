import { doc, getDoc } from "firebase/firestore";
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

      if (snapshot.exists()) {
        setUserData(snapshot.data());
      }
    };

    fetchUser();
  }, []);

  return userData;
}