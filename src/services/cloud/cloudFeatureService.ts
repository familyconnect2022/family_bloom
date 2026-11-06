/** Blaze preparedness: 1 global Firestore read on login/resume, not a root snapshot listener.
 * A failed read is fail-closed to Direct/Spark graph mode. Never stores secrets. */
import { AppState } from "react-native";
import { setCloudFunctionsRuntimeEnabled } from "../../constants/cloudRuntimeState";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "@react-native-firebase/firestore";
import { isVerifiedDeveloperAccount } from "../../constants/performanceTest";

export type CloudFeatureSwitches = { cloudFunctionsEnabled: boolean; remotePushEnabled: boolean };
const DEFAULT: CloudFeatureSwitches = { cloudFunctionsEnabled: false, remotePushEnabled: false };
let current: CloudFeatureSwitches = { ...DEFAULT };
let loadedForUid = "";
let loadedAt = 0;
const TTL_MS = 45_000;
const SETTINGS_PATH = "system/featureSwitches";
export const getCloudFunctionsRuntimeEnabled = () => current.cloudFunctionsEnabled;
export const cloudFeatureService = {
  snapshot(): CloudFeatureSwitches { return { ...current }; },
  reset() { current = { ...DEFAULT }; loadedForUid = ""; loadedAt = 0; setCloudFunctionsRuntimeEnabled(false); },
  async refresh(force = false): Promise<CloudFeatureSwitches> {
    const user = getAuth().currentUser;
    if (!user) { this.reset(); return { ...DEFAULT }; }
    if (!force && loadedForUid === user.uid && Date.now() - loadedAt < TTL_MS) return { ...current };
    try {
      const snap = await getDoc(doc(getFirestore(), SETTINGS_PATH));
      const raw = snap.exists() ? snap.data() : null;
      current = {
        cloudFunctionsEnabled: raw?.cloudFunctionsEnabled === true,
        remotePushEnabled: raw?.remotePushEnabled === true,
      };
      loadedForUid = user.uid;
      loadedAt = Date.now();
      setCloudFunctionsRuntimeEnabled(current.cloudFunctionsEnabled);
    } catch {
      // Unavailable, missing rules, or offline: NEVER turn on privileged backend implicitly.
      this.reset();
    }
    return { ...current };
  },
  async verifyDeployed(): Promise<boolean> {
    const user = getAuth().currentUser;
    if (!isVerifiedDeveloperAccount(user)) throw new Error("Chỉ tài khoản developer đã xác minh được kiểm tra Cloud.");
    const projectId = getApp().options.projectId;
    if (!projectId) throw new Error("Ứng dụng chưa có Firebase projectId.");
    const token = await user!.getIdToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const result = await fetch(`https://asia-southeast1-${projectId}.cloudfunctions.net/bloomCloudReadiness`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (!result.ok) return false;
      const data = await result.json();
      return data?.ok === true && data?.service === "family-bloom-blaze-ready-v1";
    } catch { return false; }
    finally { clearTimeout(timeout); }
  },
  async setEnabled(key: keyof CloudFeatureSwitches, enabled: boolean): Promise<CloudFeatureSwitches> {
    const user = getAuth().currentUser;
    if (!isVerifiedDeveloperAccount(user)) throw new Error("Chỉ developer đã xác minh được đổi chế độ hệ thống.");
    // Both controls depend on backend deployment; while off, no health call needed.
    if (enabled && !(await this.verifyDeployed())) throw new Error("Cloud Functions chưa được triển khai. Chạy BAT Blaze Setup sau khi nâng cấp gói.");
    const next = { ...(await this.refresh(true)), [key]: enabled };
    await setDoc(doc(getFirestore(), SETTINGS_PATH), {
      schemaVersion: 1,
      ...next,
      updatedByUid: user!.uid,
      updatedAt: new Date().toISOString(),
    });
    current = next;
    setCloudFunctionsRuntimeEnabled(next.cloudFunctionsEnabled);
    loadedForUid = user!.uid;
    loadedAt = Date.now();
    return { ...current };
  },
};

/** Called once from BloomPushBridge; refreshed on foreground with a 45s throttle. */
export function watchCloudFeatureSwitches(uid: string | undefined): () => void {
  if (!uid) { cloudFeatureService.reset(); return () => undefined; }
  void cloudFeatureService.refresh(true);
  const listener = AppState.addEventListener("change", (state) => {
    if (state === "active") void cloudFeatureService.refresh();
  });
  return () => { listener.remove(); cloudFeatureService.reset(); };
}
