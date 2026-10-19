import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FamilyEvent, FamilyMember, MomentPost } from "../../types";

const PREFIX = "family-bloom:feature-cache:v2";
const LEGACY_PREFIX = "family-bloom:home-warm:v1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

type FamilyHomeWarmRecord = {
  version: 2;
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

type CacheFeature = "members" | "events" | "moments";
type FeatureEnvelope<T> = { version: 2; uid: string; familyId: string; updatedAt: number; data: T };

const memory = new Map<string, FamilyHomeWarmRecord>();
const MAX_MEMORY_FAMILY_RECORDS = 4;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const recordKey = (uid: string, familyId: string) => `${uid}:${familyId}`;
const featureKey = (uid: string, familyId: string, feature: CacheFeature) => `${PREFIX}:${uid}:${familyId}:${feature}`;
const legacyKey = (uid: string, familyId: string) => `${LEGACY_PREFIX}:${uid}:${familyId}`;

const setBoundedMemoryRecord = (key: string, record: FamilyHomeWarmRecord) => {
  memory.delete(key);
  memory.set(key, record);
  while (memory.size > MAX_MEMORY_FAMILY_RECORDS) {
    const oldest = memory.keys().next();
    if (oldest.done) break;
    memory.delete(oldest.value);
  }
};

const touchMemoryRecord = (key: string) => {
  const record = memory.get(key);
  if (!record) return null;
  memory.delete(key);
  memory.set(key, record);
  return record;
};

const emptyRecord = (uid: string, familyId: string): FamilyHomeWarmRecord => ({
  version: 2,
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

const validEnvelope = <T,>(value: unknown, uid: string, familyId: string): value is FeatureEnvelope<T> => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FeatureEnvelope<T>>;
  return item.version === 2 && item.uid === uid && item.familyId === familyId
    && typeof item.updatedAt === "number" && Date.now() - item.updatedAt <= MAX_AGE_MS && "data" in item;
};

const scheduleFeaturePersist = (uid: string, familyId: string, feature: CacheFeature, data: unknown, updatedAt: number) => {
  const key = featureKey(uid, familyId, feature);
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    const envelope: FeatureEnvelope<unknown> = { version: 2, uid, familyId, updatedAt, data };
    void AsyncStorage.setItem(key, JSON.stringify(envelope)).catch(() => undefined);
  }, 500));
};

const parse = (raw: string | null) => {
  if (!raw) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
};

const migrateLegacy = async (uid: string, familyId: string): Promise<FamilyHomeWarmRecord | null> => {
  try {
    const raw = await AsyncStorage.getItem(legacyKey(uid, familyId));
    const legacy = parse(raw) as any;
    if (!legacy || legacy.uid !== uid || legacy.familyId !== familyId || typeof legacy.updatedAt !== "number") return null;
    if (Date.now() - legacy.updatedAt > MAX_AGE_MS) return null;
    const next: FamilyHomeWarmRecord = {
      ...emptyRecord(uid, familyId),
      members: Array.isArray(legacy.members) ? legacy.members : [],
      upcomingEvents: Array.isArray(legacy.upcomingEvents) ? legacy.upcomingEvents : [],
      upcomingHasMore: !!legacy.upcomingHasMore,
      yearlyEvents: Array.isArray(legacy.yearlyEvents) ? legacy.yearlyEvents : [],
      moments: Array.isArray(legacy.moments) ? legacy.moments : [],
      momentsHaveMore: !!legacy.momentsHaveMore,
      updatedAt: legacy.updatedAt,
    };
    scheduleFeaturePersist(uid, familyId, "members", { members: next.members }, next.updatedAt);
    scheduleFeaturePersist(uid, familyId, "events", { upcomingEvents: next.upcomingEvents, upcomingHasMore: next.upcomingHasMore, yearlyEvents: next.yearlyEvents }, next.updatedAt);
    scheduleFeaturePersist(uid, familyId, "moments", { moments: next.moments, momentsHaveMore: next.momentsHaveMore }, next.updatedAt);
    void AsyncStorage.removeItem(legacyKey(uid, familyId)).catch(() => undefined);
    return next;
  } catch { return null; }
};

export const familyHomeWarmCache = {
  peek(uid: string, familyId: string) {
    return touchMemoryRecord(recordKey(uid, familyId));
  },

  async read(uid: string, familyId: string) {
    const memoryKey = recordKey(uid, familyId);
    const existing = touchMemoryRecord(memoryKey);
    if (existing) return existing;
    try {
      const keys = (["members", "events", "moments"] as CacheFeature[]).map((feature) => featureKey(uid, familyId, feature));
      const rows = await AsyncStorage.multiGet(keys);
      const envelopes = rows.map(([, raw]) => parse(raw));
      if (!envelopes.some(Boolean)) {
        const migrated = await migrateLegacy(uid, familyId);
        if (migrated) setBoundedMemoryRecord(memoryKey, migrated);
        return migrated;
      }

      const next = emptyRecord(uid, familyId);
      let newest = 0;
      const membersEnvelope = envelopes[0];
      if (validEnvelope<{ members?: FamilyMember[] }>(membersEnvelope, uid, familyId)) {
        next.members = Array.isArray(membersEnvelope.data?.members) ? membersEnvelope.data.members : [];
        newest = Math.max(newest, membersEnvelope.updatedAt);
      }
      const eventsEnvelope = envelopes[1];
      if (validEnvelope<{ upcomingEvents?: FamilyEvent[]; upcomingHasMore?: boolean; yearlyEvents?: FamilyEvent[] }>(eventsEnvelope, uid, familyId)) {
        next.upcomingEvents = Array.isArray(eventsEnvelope.data?.upcomingEvents) ? eventsEnvelope.data.upcomingEvents : [];
        next.upcomingHasMore = !!eventsEnvelope.data?.upcomingHasMore;
        next.yearlyEvents = Array.isArray(eventsEnvelope.data?.yearlyEvents) ? eventsEnvelope.data.yearlyEvents : [];
        newest = Math.max(newest, eventsEnvelope.updatedAt);
      }
      const momentsEnvelope = envelopes[2];
      if (validEnvelope<{ moments?: MomentPost[]; momentsHaveMore?: boolean }>(momentsEnvelope, uid, familyId)) {
        next.moments = Array.isArray(momentsEnvelope.data?.moments) ? momentsEnvelope.data.moments : [];
        next.momentsHaveMore = !!momentsEnvelope.data?.momentsHaveMore;
        newest = Math.max(newest, momentsEnvelope.updatedAt);
      }
      next.updatedAt = newest || Date.now();
      setBoundedMemoryRecord(memoryKey, next);
      return next;
    } catch {
      return null;
    }
  },

  update(uid: string, familyId: string, patch: FamilyHomeWarmPatch) {
    if (!uid || !familyId) return;
    const key = recordKey(uid, familyId);
    const now = Date.now();
    const next: FamilyHomeWarmRecord = { ...(memory.get(key) ?? emptyRecord(uid, familyId)), ...patch, uid, familyId, version: 2, updatedAt: now };
    setBoundedMemoryRecord(key, next);

    if ("members" in patch) scheduleFeaturePersist(uid, familyId, "members", { members: next.members }, now);
    if ("upcomingEvents" in patch || "upcomingHasMore" in patch || "yearlyEvents" in patch) {
      scheduleFeaturePersist(uid, familyId, "events", {
        upcomingEvents: next.upcomingEvents,
        upcomingHasMore: next.upcomingHasMore,
        yearlyEvents: next.yearlyEvents,
      }, now);
    }
    if ("moments" in patch || "momentsHaveMore" in patch) {
      scheduleFeaturePersist(uid, familyId, "moments", { moments: next.moments, momentsHaveMore: next.momentsHaveMore }, now);
    }
  },

  async clearUser(uid: string) {
    if (!uid) return;
    [...memory.keys()].filter((key) => key.startsWith(`${uid}:`)).forEach((key) => memory.delete(key));
    [...timers.entries()].forEach(([key, timer]) => {
      if (!key.includes(`:${uid}:`)) return;
      clearTimeout(timer);
      timers.delete(key);
    });
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(`${PREFIX}:${uid}:`) || key.startsWith(`${LEGACY_PREFIX}:${uid}:`));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch {
      // Best-effort privacy cleanup; AuthContext clears in-memory sources synchronously.
    }
  },
};
