import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FamilyEvent, FamilyMember, MomentPost } from "../../types";

const PREFIX = "family-bloom:home-warm:v1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

type FamilyHomeWarmRecord = {
  version: 1;
  uid: string;
  familyId: string;
  updatedAt: number;
  members: FamilyMember[];
  upcomingEvents: FamilyEvent[];
  upcomingHasMore: boolean;
  yearlyEvents: FamilyEvent[];
  moments: MomentPost[];
  momentsHaveMore: boolean;
};

type FamilyHomeWarmPatch = Partial<Pick<
  FamilyHomeWarmRecord,
  "members" | "upcomingEvents" | "upcomingHasMore" | "yearlyEvents" | "moments" | "momentsHaveMore"
>>;

const memory = new Map<string, FamilyHomeWarmRecord>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const keyFor = (uid: string, familyId: string) => `${PREFIX}:${uid}:${familyId}`;

const emptyRecord = (uid: string, familyId: string): FamilyHomeWarmRecord => ({
  version: 1,
  uid,
  familyId,
  updatedAt: Date.now(),
  members: [],
  upcomingEvents: [],
  upcomingHasMore: false,
  yearlyEvents: [],
  moments: [],
  momentsHaveMore: false,
});

const valid = (value: unknown, uid: string, familyId: string): value is FamilyHomeWarmRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<FamilyHomeWarmRecord>;
  return record.version === 1
    && record.uid === uid
    && record.familyId === familyId
    && typeof record.updatedAt === "number"
    && Date.now() - record.updatedAt <= MAX_AGE_MS
    && Array.isArray(record.members)
    && Array.isArray(record.upcomingEvents)
    && Array.isArray(record.yearlyEvents)
    && Array.isArray(record.moments);
};

const schedulePersist = (key: string, record: FamilyHomeWarmRecord) => {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    void AsyncStorage.setItem(key, JSON.stringify(record)).catch(() => undefined);
  }, 500));
};

export const familyHomeWarmCache = {
  peek(uid: string, familyId: string) {
    return memory.get(keyFor(uid, familyId)) ?? null;
  },

  async read(uid: string, familyId: string) {
    const key = keyFor(uid, familyId);
    const existing = memory.get(key);
    if (existing) return existing;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!valid(parsed, uid, familyId)) {
        await AsyncStorage.removeItem(key).catch(() => undefined);
        return null;
      }
      memory.set(key, parsed);
      return parsed;
    } catch {
      return null;
    }
  },

  update(uid: string, familyId: string, patch: FamilyHomeWarmPatch) {
    if (!uid || !familyId) return;
    const key = keyFor(uid, familyId);
    const next: FamilyHomeWarmRecord = {
      ...(memory.get(key) ?? emptyRecord(uid, familyId)),
      ...patch,
      uid,
      familyId,
      version: 1,
      updatedAt: Date.now(),
    };
    // Firestore cursors are intentionally excluded; a warm cache is display-only.
    memory.set(key, next);
    schedulePersist(key, next);
  },

  async clearUser(uid: string) {
    if (!uid) return;
    const prefix = `${PREFIX}:${uid}:`;
    [...memory.keys()].filter((key) => key.startsWith(prefix)).forEach((key) => memory.delete(key));
    [...timers.entries()].forEach(([key, timer]) => {
      if (!key.startsWith(prefix)) return;
      clearTimeout(timer);
      timers.delete(key);
    });
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch {
      // Best-effort privacy cleanup; AuthContext still clears all in-memory sources synchronously.
    }
  },
};
