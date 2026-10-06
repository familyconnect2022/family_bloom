import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, getDoc, getFirestore, setDoc } from "@react-native-firebase/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const nowIso = () => new Date().toISOString();
let lastTokenDocId: string | null = null;
let lastSyncAt = 0;
let lastSyncUid = "";
const SYNC_TTL_MS = 5 * 60 * 1000;

const hashToken = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const tokenDocId = (token: string) => `${Platform.OS}_${hashToken(token)}`;

const nativeToken = async (): Promise<string | null> => {
  if ((Platform.OS !== "android" && Platform.OS !== "ios") || !Device.isDevice) return null;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return null;
  const value = await Notifications.getDevicePushTokenAsync();
  const token = typeof value?.data === "string" ? value.data.trim() : "";
  return token || null;
};

const writeToken = async (uid: string, token: string, enabled: boolean) => {
  const db = getFirestore();
  const id = tokenDocId(token);
  const ref = doc(db, FIRESTORE_PATHS.userPushToken(uid, id));
  const existing = await getDoc(ref);
  const now = nowIso();
  const permission = await Notifications.getPermissionsAsync();
  await setDoc(ref, {
    token,
    platform: Platform.OS,
    enabled: enabled && permission.granted,
    permissionGranted: permission.granted,
    permissionRequestedAt: null,
    deviceName: Device.deviceName ?? null,
    osVersion: Device.osVersion ?? null,
    appVersion: Constants.expoConfig?.version ?? null,
    createdAt: existing.exists() && typeof existing.data()?.createdAt === "string" ? existing.data()?.createdAt : now,
    updatedAt: now,
    lastSeenAt: now,
  }, { merge: true });
  lastTokenDocId = id;
  lastSyncUid = uid;
  lastSyncAt = Date.now();
  return id;
};

export const pushTokenService = {
  /** Register only when OS permission already exists. Never opens a surprise prompt. */
  async syncCurrentDevice(uid: string, enabled: boolean, force = false) {
    if (!uid) return { registered: false as const, reason: "AUTH_REQUIRED" };
    if (!force && lastSyncUid === uid && Date.now() - lastSyncAt < SYNC_TTL_MS) {
      return { registered: !!lastTokenDocId, reason: "THROTTLED" };
    }
    const token = await nativeToken();
    if (!token) {
      lastSyncUid = uid;
      lastSyncAt = Date.now();
      return { registered: false as const, reason: "PERMISSION_OR_DEVICE" };
    }
    const id = await writeToken(uid, token, enabled);
    return { registered: true as const, tokenId: id };
  },

  async registerToken(uid: string, token: string, enabled: boolean) {
    const clean = token.trim();
    if (!uid || !clean) return;
    await writeToken(uid, clean, enabled);
  },

  /** Disable the last token before Firebase Auth signs out. */
  async disableCurrentDevice(uid: string) {
    if (!uid) return;
    let id = lastTokenDocId;
    if (!id) {
      const token = await nativeToken().catch(() => null);
      if (token) id = tokenDocId(token);
    }
    if (!id) return;
    const ref = doc(getFirestore(), FIRESTORE_PATHS.userPushToken(uid, id));
    const snap = await getDoc(ref).catch(() => null);
    if (!snap?.exists()) return;
    await setDoc(ref, { enabled: false, updatedAt: nowIso(), lastSeenAt: nowIso() }, { merge: true });
    lastTokenDocId = null;
    lastSyncAt = 0;
    lastSyncUid = "";
  },
};
