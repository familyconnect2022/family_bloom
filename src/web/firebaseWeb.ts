import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

declare const process: { env: Record<string, string | undefined> };

// Firebase web config is public by design. EXPO_PUBLIC_* can override these
// values for another Firebase project without changing source code.
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
export const webDb = (() => {
  try {
    return initializeFirestore(firebaseWebApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Hot reload can reach this path after Firestore was already initialized.
    return getFirestore(firebaseWebApp);
  }
})();
export const webGoogleProvider = new GoogleAuthProvider();
webGoogleProvider.setCustomParameters({ prompt: "select_account" });

let persistenceReady: Promise<void> | null = null;
export const ensureWebAuthPersistence = () => {
  if (!persistenceReady) {
    persistenceReady = setPersistence(webAuth, browserLocalPersistence).catch(() => undefined);
  }
  return persistenceReady;
};
