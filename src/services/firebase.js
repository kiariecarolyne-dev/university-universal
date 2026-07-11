import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";

import {
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

/* NEW STORAGE */
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5h0f_eaLt98xk_fIy5DdnSSKAhmnGuME",
  authDomain: "university-universal-e6787.firebaseapp.com",
  projectId: "university-universal-e6787",
  storageBucket: "university-universal-e6787.firebasestorage.app",
  messagingSenderId: "797477698455",
  appId: "1:797477698455:web:a0148627a70da53c2662d2"
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

/* AUTH */
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

/* FIRESTORE */
export const db = getFirestore(app);

/* NEW STORAGE */
export const storage = getStorage(app);