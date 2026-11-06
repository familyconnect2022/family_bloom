/** Opt-in for the verified developer's one-device, cloned-app testing.
 * It does not alter authoritative game-away logic, only short server-side availability.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "@react-native-firebase/auth";
import { isVerifiedDeveloperAccount } from "../../constants/performanceTest";

const key = (uid: string) => `familybloom:dev-dual-app-test:${uid}`;
let cachedUid: string | null = null;
let cachedEnabled = false;
const currentDev = (uid: string) => {
  const auth = getAuth().currentUser;
  return auth?.uid === uid && isVerifiedDeveloperAccount(auth);
};
export async function loadDualAppTestSetting(uid: string) {
  if (!currentDev(uid)) { cachedUid = null; cachedEnabled = false; return false; }
  if (cachedUid === uid) return cachedEnabled;
  cachedEnabled = await AsyncStorage.getItem(key(uid)) === "on";
  cachedUid = uid;
  return cachedEnabled;
}
export function isDualAppTestOn(uid: string) {
  return cachedUid === uid && cachedEnabled && currentDev(uid);
}
export async function setDualAppTestSetting(uid: string, enabled: boolean) {
  if (!currentDev(uid)) throw new Error("DEVELOPER_ONLY");
  await AsyncStorage.setItem(key(uid), enabled ? "on" : "off");
  cachedUid = uid; cachedEnabled = enabled;
}
export const DEV_DUAL_APP_LEASE_EVENT = "dev:dualapp:lease";
