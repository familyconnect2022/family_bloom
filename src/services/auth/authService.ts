import {
  ConfirmationResult,
  GoogleAuthProvider,
  User,
  getAuth,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut,
} from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { ENV } from "../../config/env";
import { AppError } from "../../types/errors";

let configured = false;

const configureGoogle = () => {
  if (configured || !ENV.googleWebClientId) return;
  GoogleSignin.configure({ webClientId: ENV.googleWebClientId, offlineAccess: true });
  configured = true;
};

export const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim().replace(/[\s()-]/g, "");
  if (trimmed.startsWith("0")) return `+84${trimmed.slice(1)}`;
  return trimmed;
};

export const authService = {
  normalizePhoneNumber,
  subscribe(listener: (user: User | null) => void) {
    return getAuth().onAuthStateChanged(listener);
  },

  async signInWithGoogle() {
    if (!ENV.googleWebClientId) throw new Error("GOOGLE_CLIENT_ID_MISSING");
    configureGoogle();
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type === "cancelled") {
      throw new AppError("AUTH_GOOGLE_CANCELLED", "AUTH");
    }
    if (result.type !== "success") {
      throw new AppError("AUTH_GOOGLE_FAILED", "AUTH", `Google Sign-In returned ${result.type}.`);
    }
    const credential = GoogleAuthProvider.credential(result.data.idToken);
    await signInWithCredential(getAuth(), credential);
  },

  async sendPhoneCode(phoneNumber: string): Promise<ConfirmationResult> {
    return signInWithPhoneNumber(getAuth(), normalizePhoneNumber(phoneNumber));
  },

  async confirmPhoneCode(confirmation: ConfirmationResult, code: string) {
    await confirmation.confirm(code.trim());
  },

  async signOut() {
    await signOut(getAuth());
    try {
      if (GoogleSignin.getCurrentUser()) await GoogleSignin.signOut();
    } catch {
      // Phone-auth users may not have a Google session.
    }
  },
};
