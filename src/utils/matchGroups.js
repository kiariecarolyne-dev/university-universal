import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export const getRecommendedGroups = async (user) => {
  const snapshot = await getDocs(collection(db, "groups"));

  const groups = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // PRIORITY MATCHING LOGIC
  return groups.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Match course
    if (a.course === user.course) scoreA += 3;
    if (b.course === user.course) scoreB += 3;

    // Match university
    if (a.university === user.university) scoreA += 2;
    if (b.university === user.university) scoreB += 2;

    return scoreB - scoreA;
  });
};