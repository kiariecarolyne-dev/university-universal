import { Platform } from "react-native";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5h0f_eaLt98xk_fIy5DdnSSKAhmnGuME",
  authDomain: "university-universal-e6787.firebaseapp.com",
  projectId: "university-universal-e6787",
  storageBucket: "university-universal-e6787.firebasestorage.app",
  messagingSenderId: "797477698455",
  appId: "1:797477698455:web:a0148627a70da53c2662d2",
};

/* =========================
   FIREBASE APP
========================= */

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

/* =========================
   AUTH — PLATFORM SPECIFIC
========================= */

// Android / React Native: use initializeAuth with
// getReactNativePersistence(AsyncStorage) so users are NOT logged out
// after closing/reopening the APK. This is the exact path the existing
// Android app has always used and MUST NOT be changed.
//
// Web: use Firebase's native browser persistence via getAuth(), which
// defaults to browserLocalPersistence (IndexedDB/localStorage). AsyncStorage
// and getReactNativePersistence are React Native-only, so they are only
// ever required (and executed) on native builds — the web bundle never
// loads that React Native persistence code.

let auth;

if (Platform.OS === "web") {
  // Browser persistence — proper web mechanism, not AsyncStorage.
  auth = getAuth(app);
} else {
  const { getReactNativePersistence } = require("firebase/auth");
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;

  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error?.code === "auth/already-initialized") {
      auth = getAuth(app);
    } else {
      console.error("Firebase Auth initialization error:", error);
      throw error;
    }
  }
}

export { auth };

/* =========================
   FIRESTORE
========================= */

export const db = getFirestore(app);

/* =========================
   STORAGE
========================= */

export const storage = getStorage(app);
