import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";

declare const process: { env: Record<string, string | undefined> };

// Firebase's browser config is public configuration, not an Admin secret.
// EXPO_PUBLIC_* can override these values for another Firebase project.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY || "AIzaSyCDwPD2ICsdKYnkcuCSRvQcy7sJ_6xHTww",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN || "family-connect-4184f.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID || "family-connect-4184f",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_WEB_STORAGE_BUCKET || "family-connect-4184f.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_WEB_MESSAGING_SENDER_ID || "132197806809",
  ...(process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID ? { appId: process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID } : {}),
};

export const firebaseWebApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const webAuth = getAuth(firebaseWebApp);

// W3 stability policy: Firestore Web uses memory cache intentionally.
// W2 used browser-wide IndexedDB coordination, which can emit client
// metadata/lease warnings on Safari/Chrome (including harmless 1 ms clock
// reversals during hot reload/multi-tab use). Family Bloom already has live
// Firestore listeners and Auth local persistence; for the web client we prefer
// deterministic startup/reconnect over browser-wide IndexedDB coordination.
export const webDb = initializeFirestore(firebaseWebApp, {
  localCache: memoryLocalCache(),
});

export const webGoogleProvider = new GoogleAuthProvider();
webGoogleProvider.setCustomParameters({ prompt: "select_account" });

let persistenceReady: Promise<void> | null = null;
export const ensureWebAuthPersistence = () => {
  if (!persistenceReady) {
    persistenceReady = setPersistence(webAuth, browserLocalPersistence).catch(() => undefined);
  }
  return persistenceReady;
};
