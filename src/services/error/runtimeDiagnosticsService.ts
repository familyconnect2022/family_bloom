import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuth } from "@react-native-firebase/auth";
import { doc, getFirestore, setDoc } from "@react-native-firebase/firestore";

type ErrorLike = { name?: unknown; code?: unknown };
const recent = new Map<string, number>();
let installed = false;

const safeToken = (value: unknown, fallback: string, max = 80) => {
  const clean = String(value ?? "").trim().replace(/[^A-Za-z0-9_.:-]+/g, "_").slice(0, max);
  return clean || fallback;
};

const makeId = () => `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const runtimeDiagnosticsService = {
  async report(error: unknown, context = "runtime", fatal = false) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    const source = (error && typeof error === "object" ? error : {}) as ErrorLike;
    const code = safeToken(source.code ?? source.name, "UNKNOWN");
    const safeContext = safeToken(context, "runtime", 120);
    const key = `${code}:${safeContext}:${fatal ? 1 : 0}`;
    const now = Date.now();
    if (now - (recent.get(key) ?? 0) < 60_000) return;
    recent.set(key, now);
    const id = makeId();
    // Privacy contract: do not upload raw messages, stack traces, form values,
    // family ids, names, media URLs or any user-generated content.
    await setDoc(doc(getFirestore(), `users/${uid}/diagnostics/${id}`), {
      id,
      code,
      context: safeContext,
      fatal,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? "unknown",
      createdAt: new Date(now).toISOString(),
    }).catch(() => undefined);
  },

  installGlobalHandler() {
    if (installed) return () => undefined;
    installed = true;
    const errorUtils = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void; setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void } }).ErrorUtils;
    if (!errorUtils?.setGlobalHandler) return () => undefined;
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, isFatal) => {
      void this.report(error, "global_js", !!isFatal);
      previous?.(error, isFatal);
    });
    return () => {
      if (previous && errorUtils.setGlobalHandler) errorUtils.setGlobalHandler(previous);
      installed = false;
    };
  },
};
