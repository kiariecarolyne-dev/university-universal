import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
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
   AUTH
========================= */

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
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