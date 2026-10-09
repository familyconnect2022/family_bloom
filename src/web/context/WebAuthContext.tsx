import type { ConfirmationResult, User } from "firebase/auth";
import {
  RecaptchaVerifier,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ensureWebAuthPersistence, webAuth, webGoogleProvider } from "../firebaseWeb";

type WebAuthValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  phonePending: boolean;
  signInGoogle(): Promise<void>;
  sendPhoneCode(phone: string): Promise<void>;
  confirmPhoneCode(code: string): Promise<void>;
  logout(): Promise<void>;
};

const Ctx = createContext<WebAuthValue | null>(null);

const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("0")) return `+84${compact.slice(1)}`;
  return `+84${compact}`;
};

export function WebAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    let live = true;
    void ensureWebAuthPersistence().finally(() => {
      if (!live) return;
      const stop = onAuthStateChanged(webAuth, (next) => {
        setUser(next);
        setLoading(false);
      }, (err) => {
        setError(err.message);
        setLoading(false);
      });
      cleanup = stop;
    });
    let cleanup: (() => void) | undefined;
    return () => {
      live = false;
      cleanup?.();
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  const signInGoogle = useCallback(async () => {
    setError(null);
    await ensureWebAuthPersistence();
    try {
      await signInWithPopup(webAuth, webGoogleProvider);
    } catch (err) {
      const code = String((err as { code?: unknown })?.code ?? "");
      if (code.includes("popup-blocked") || code.includes("cancelled-popup-request")) {
        await signInWithRedirect(webAuth, webGoogleProvider);
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const sendPhoneCode = useCallback(async (phone: string) => {
    setError(null);
    await ensureWebAuthPersistence();
    recaptchaRef.current?.clear();
    const verifier = new RecaptchaVerifier(webAuth, "bloom-phone-send", { size: "invisible" });
    recaptchaRef.current = verifier;
    try {
      confirmationRef.current = await signInWithPhoneNumber(webAuth, normalizePhone(phone), verifier);
    } catch (err) {
      verifier.clear();
      recaptchaRef.current = null;
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (!confirmationRef.current) throw new Error("Bạn hãy yêu cầu mã OTP trước.");
    setError(null);
    try {
      await confirmationRef.current.confirm(code.trim());
      confirmationRef.current = null;
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    confirmationRef.current = null;
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    await signOut(webAuth);
  }, []);

  const value = useMemo<WebAuthValue>(() => ({
    user,
    loading,
    error,
    phonePending: !!confirmationRef.current,
    signInGoogle,
    sendPhoneCode,
    confirmPhoneCode,
    logout,
  }), [confirmPhoneCode, error, loading, logout, sendPhoneCode, signInGoogle, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWebAuth = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useWebAuth must be used inside WebAuthProvider");
  return value;
};
