import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserFamilyMembership, UserProfile } from "../../types";

const CACHE_PREFIX = "family-bloom:boot-session:v1";
const MAX_CACHE_AGE_MS = 45 * 24 * 60 * 60 * 1000;

type BootSessionCache = {
  version: 1;
  uid: string;
  savedAt: number;
  profile: UserProfile;
  memberships: UserFamilyMembership[];
};

const keyFor = (uid: string) => `${CACHE_PREFIX}:${uid}`;

const validMembership = (value: unknown): value is UserFamilyMembership => {
  const item = value as Partial<UserFamilyMembership> | null;
  return !!item
    && typeof item.familyId === "string"
    && !!item.familyId
    && typeof item.familyName === "string"
    && typeof item.joinedAt === "string"
    && ["owner", "admin", "member", "child"].includes(String(item.role));
};

const validProfile = (uid: string, value: unknown): value is UserProfile => {
  const profile = value as Partial<UserProfile> | null;
  return !!profile
    && profile.uid === uid
    && typeof profile.displayName === "string"
    && typeof profile.updatedAt === "string";
};

export const bootSessionCache = {
  async read(uid: string): Promise<BootSessionCache | null> {
    try {
      const raw = await AsyncStorage.getItem(keyFor(uid));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<BootSessionCache>;
      if (parsed.version !== 1 || parsed.uid !== uid || !validProfile(uid, parsed.profile)) return null;
      if (!Array.isArray(parsed.memberships) || !parsed.memberships.every(validMembership)) return null;
      const savedAt = Number(parsed.savedAt || 0);
      if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_CACHE_AGE_MS) return null;
      return {
        version: 1,
        uid,
        savedAt,
        profile: parsed.profile,
        memberships: parsed.memberships,
      };
    } catch {
      return null;
    }
  },

  async write(uid: string, profile: UserProfile, memberships: UserFamilyMembership[]): Promise<void> {
    if (!uid || profile.uid !== uid) return;
    const payload: BootSessionCache = {
      version: 1,
      uid,
      savedAt: Date.now(),
      profile,
      memberships,
    };
    await AsyncStorage.setItem(keyFor(uid), JSON.stringify(payload));
  },

  async clear(uid: string): Promise<void> {
    if (!uid) return;
    await AsyncStorage.removeItem(keyFor(uid));
  },
};
