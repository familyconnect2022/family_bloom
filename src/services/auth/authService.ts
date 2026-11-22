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

/**
 * Google Play Services may be shared by dual/clone apps on one Android phone.
 * A forced remote-session eviction must NOT sign out the shared Google account:
 * it only revokes this app's Firebase login. See signOutFirebaseOnly below.
 */
export type GoogleLoginPhase = 'play-services' | 'account-picker' | 'firebase';
export class GoogleLoginTimeoutError extends Error {
  constructor(public readonly phase: GoogleLoginPhase) {
    super(phase === 'play-services'
      ? 'Google Play Services không phản hồi. Hãy kiểm tra dịch vụ Google và thử lại.'
      : phase === 'account-picker'
        ? 'Google chưa hoàn tất đăng nhập. Hãy đóng màn hình chọn tài khoản (nếu còn mở) rồi thử lại.'
        : 'Firebase xác thực quá lâu. Hãy kiểm tra kết nối rồi thử đăng nhập lại.');
    this.name = 'GoogleLoginTimeoutError';
  }
}
function withGoogleDeadline<T>(job: Promise<T>, phase: GoogleLoginPhase, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new GoogleLoginTimeoutError(phase)), milliseconds);
  });
  return Promise.race([job, timedOut]).finally(() => { if (timer) clearTimeout(timer); });
}

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

  async signInWithGoogle(onPhase?: (phase: GoogleLoginPhase) => void) {
    if (!ENV.googleWebClientId) throw new Error("GOOGLE_CLIENT_ID_MISSING");
    configureGoogle();
    onPhase?.('play-services');
    await withGoogleDeadline(GoogleSignin.hasPlayServices(), 'play-services', 15000);
    onPhase?.('account-picker');
    // Late completion of an OS account picker after the deadline never starts
    // a Firebase sign-in: only the awaited result can advance to the next step.
    const result = await withGoogleDeadline(GoogleSignin.signIn(), 'account-picker', 60000);
    if (result.type === "cancelled") {
      throw new AppError("AUTH_GOOGLE_CANCELLED", "AUTH");
    }
    if (result.type !== "success") {
      throw new AppError("AUTH_GOOGLE_FAILED", "AUTH", "Google Sign-In returned an unsupported response.");
    }
    const credential = GoogleAuthProvider.credential(result.data.idToken);
    onPhase?.('firebase');
    // Native Firebase promises can also stall in a clone app. An eventual
    // Firebase auth observer must still pass the separate session lease gate.
    await withGoogleDeadline(signInWithCredential(getAuth(), credential), 'firebase', 25000);
  },

  async sendPhoneCode(phoneNumber: string): Promise<ConfirmationResult> {
    return signInWithPhoneNumber(getAuth(), normalizePhoneNumber(phoneNumber));
  },

  async confirmPhoneCode(confirmation: ConfirmationResult, code: string) {
    await confirmation.confirm(code.trim());
  },

  // Called only on forced session replacement/invalidated Firebase credential.
  // NEVER call GoogleSignin.signOut here: another app clone may be signing in
  // through the same Google Play Services account broker at this exact time.
  async signOutFirebaseOnly() {
    await signOut(getAuth());
  },

  async signOut() {
    await signOut(getAuth());
    try {
      if (GoogleSignin.getCurrentUser()) {
        // Firebase logout has already succeeded. Never keep the app waiting
        // forever for the optional Google SDK cleanup.
        await withGoogleDeadline(GoogleSignin.signOut(), 'play-services', 5000);
      }
    } catch {
      // A clone/phone-auth user may not support a Google SDK sign-out.
    }
  },
};
