import { doc, getDoc, getFirestore, updateDoc } from "@react-native-firebase/firestore";
import type { FamilyActivity, FamilyActivityImportance, FamilyEvent, SmartReminderPreferences } from "../../types";
import { DEFAULT_SMART_REMINDER_PREFERENCES } from "../../types";
import { getEffectiveEventDate, startOfLocalDay, toDateKey } from "../../utils/event";
import { eventService } from "../event/eventService";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { momentsService } from "../moments/momentsService";

export type SmartReminderPage = {
  items: FamilyActivity[];
  lastSeenAt: string | null;
  unreadBadgeCount: number;
};

type EventWindowCache = { expiresAt: number; items: FamilyEvent[] };
type MemoryCache = { expiresAt: number; items: Awaited<ReturnType<typeof momentsService.listOnThisDay>> };
type SeenCache = { expiresAt: number; lastSeenAt: string | null };

const EVENT_CACHE_TTL_MS = 5 * 60 * 1000;
const MEMORY_CACHE_TTL_MS = 20 * 60 * 1000;
const SEEN_CACHE_TTL_MS = 30 * 1000;
const eventWindowCache = new Map<string, EventWindowCache>();
const memoryCache = new Map<string, MemoryCache>();
const seenCache = new Map<string, SeenCache>();

const cleanPreferences = (value?: Partial<SmartReminderPreferences> | null): SmartReminderPreferences => ({
  birthdays: typeof value?.birthdays === "boolean" ? value.birthdays : DEFAULT_SMART_REMINDER_PREFERENCES.birthdays,
  memorials: typeof value?.memorials === "boolean" ? value.memorials : DEFAULT_SMART_REMINDER_PREFERENCES.memorials,
  events: typeof value?.events === "boolean" ? value.events : DEFAULT_SMART_REMINDER_PREFERENCES.events,
  onThisDay: typeof value?.onThisDay === "boolean" ? value.onThisDay : DEFAULT_SMART_REMINDER_PREFERENCES.onThisDay,
});

const startOfDay = (date: Date) => startOfLocalDay(date);
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const importanceFor = (event: FamilyEvent): FamilyActivityImportance => {
  if (event.notificationLevel === "important") return "important";
  if (event.notificationLevel === "notable") return "notable";
  if (event.eventType === "birthday" || event.eventType === "memorial") return "notable";
  return "normal";
};

const eventTypeAllowed = (event: FamilyEvent, preferences: SmartReminderPreferences) => {
  if (event.eventType === "birthday") return preferences.birthdays;
  if (event.eventType === "memorial") return preferences.memorials;
  return preferences.events;
};

const eventAppliesToUser = (event: FamilyEvent, uid: string) =>
  event.participantsMode === "all" || event.participantIds.includes(uid);

const eventLabel = (event: FamilyEvent) => {
  if (event.eventType === "birthday") return "sinh nhật";
  if (event.eventType === "memorial") return "ngày giỗ";
  if (event.eventType === "anniversary") return "ngày kỷ niệm";
  if (event.eventType === "wedding") return "cưới hỏi";
  if (event.eventType === "gathering") return "buổi họp mặt";
  if (event.eventType === "travel") return "chuyến đi";
  return "sự kiện";
};

const reminderForEvent = (
  event: FamilyEvent,
  uid: string,
  now: Date,
): FamilyActivity | null => {
  if (!eventAppliesToUser(event, uid)) return null;
  const occurrence = event.recurrence === "yearly" ? getEffectiveEventDate(event, now) : new Date(event.dateISO);
  if (Number.isNaN(occurrence.getTime())) return null;

  const today = startOfDay(now);
  const eventDay = startOfDay(occurrence);
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0 || diffDays > 1) return null;

  const importance = importanceFor(event);
  const isSpecialAnnual = event.eventType === "birthday" || event.eventType === "memorial";
  let stage: "tomorrow" | "today" | "soon" = diffDays === 1 ? "tomorrow" : "today";
  let createdAt = today.toISOString();
  let badgeEligible = false;

  if (diffDays === 0 && !event.allDay) {
    const msUntil = occurrence.getTime() - now.getTime();
    if (msUntil < -60 * 60 * 1000) return null;
    if (msUntil >= 0 && msUntil <= 3 * 60 * 60 * 1000) {
      stage = "soon";
      createdAt = new Date(occurrence.getTime() - 3 * 60 * 60 * 1000).toISOString();
    }
  }

  if (isSpecialAnnual) badgeEligible = true;
  else if (importance === "important" || importance === "notable") badgeEligible = true;
  else if (stage === "soon") badgeEligible = true;

  const label = eventLabel(event);
  const title = stage === "tomorrow"
    ? `Ngày mai là ${label} · ${event.title}`
    : stage === "soon"
      ? `Sắp đến giờ · ${event.title}`
      : event.eventType === "memorial"
        ? `Hôm nay là ${label} · ${event.title}`
        : `Hôm nay có ${label} · ${event.title}`;
  const location = event.location ? ` · ${event.location}` : "";
  const body = stage === "soon"
    ? `Còn không lâu nữa là đến giờ${location}.`
    : event.eventType === "memorial"
      ? `Một lời nhắc nhẹ để gia đình cùng nhớ đến ngày này${location}.`
      : `Bloom nhắc bạn để cả nhà không bỏ lỡ${location}.`;

  return {
    id: `reminder-${event.id}-${toDateKey(occurrence)}-${stage}-${uid}`,
    familyId: event.familyId,
    kind: "event",
    audience: "target",
    targetUid: uid,
    actorUid: "bloom",
    actorName: "Bloom",
    title,
    body,
    sourceType: "event",
    sourceId: event.id,
    importance,
    badgeEligible,
    createdAt,
  };
};

const groupIfNeeded = (items: FamilyActivity[], familyId: string, uid: string, now: Date): FamilyActivity[] => {
  if (items.length < 3) return items;
  const important = items.some((item) => item.importance === "important");
  const notable = items.some((item) => item.importance === "notable");
  const newest = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const names = items.slice(0, 2).map((item) => item.title.replace(/^Ngày mai là |^Hôm nay có |^Hôm nay là |^Sắp đến giờ · /, ""));
  return [{
    id: `reminder-group-${toDateKey(now)}-${uid}`,
    familyId,
    kind: "event",
    audience: "target",
    targetUid: uid,
    actorUid: "bloom",
    actorName: "Bloom",
    title: `${items.length} điều đáng nhớ đang đến gần`,
    body: `${names.join(" · ")}${items.length > 2 ? ` · và ${items.length - 2} việc khác` : ""}.`,
    sourceType: "event",
    sourceId: null,
    importance: important ? "important" : notable ? "notable" : "normal",
    badgeEligible: items.some((item) => item.badgeEligible),
    createdAt: newest?.createdAt ?? new Date().toISOString(),
  }];
};

const loadEventWindow = async (familyId: string, now: Date, force = false) => {
  const key = `${familyId}:${toDateKey(now)}`;
  const cached = eventWindowCache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.items;
  const start = startOfDay(now);
  const end = endOfDay(addDays(now, 1));
  const items = await eventService.listReminderWindow(familyId, start, end);
  eventWindowCache.set(key, { items, expiresAt: Date.now() + EVENT_CACHE_TTL_MS });
  return items;
};

const loadOnThisDay = async (familyId: string, now: Date, force = false) => {
  const key = `${familyId}:${toDateKey(now)}`;
  const cached = memoryCache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.items;
  const items = await momentsService.listOnThisDay(familyId, now, 6, 8);
  memoryCache.set(key, { items, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
  return items;
};

const lastSeenFor = async (familyId: string, uid: string) => {
  const key = `${familyId}:${uid}`;
  const cached = seenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.lastSeenAt;
  const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyMember(familyId, uid)));
  if (!snapshot.exists()) {
    seenCache.set(key, { lastSeenAt: null, expiresAt: Date.now() + SEEN_CACHE_TTL_MS });
    return null;
  }
  const raw = snapshot.data() as Record<string, unknown>;
  const lastSeenAt = typeof raw.smartReminderLastSeenAt === "string" && raw.smartReminderLastSeenAt.trim()
    ? raw.smartReminderLastSeenAt.trim()
    : null;
  seenCache.set(key, { lastSeenAt, expiresAt: Date.now() + SEEN_CACHE_TTL_MS });
  return lastSeenAt;
};

export const smartReminderService = {
  async listForUser(
    familyId: string,
    uid: string,
    preferencesInput?: Partial<SmartReminderPreferences> | null,
    options?: { includeDiscovery?: boolean; force?: boolean; now?: Date },
  ): Promise<SmartReminderPage> {
    if (!familyId || !uid) return { items: [], lastSeenAt: null, unreadBadgeCount: 0 };
    const preferences = cleanPreferences(preferencesInput);
    const now = options?.now ?? new Date();
    const [events, lastSeenAt] = await Promise.all([
      loadEventWindow(familyId, now, options?.force === true),
      lastSeenFor(familyId, uid),
    ]);

    const eventReminders = groupIfNeeded(
      events
        .filter((event) => eventTypeAllowed(event, preferences))
        .map((event) => reminderForEvent(event, uid, now))
        .filter((item): item is FamilyActivity => !!item)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      familyId,
      uid,
      now,
    );

    const discovery: FamilyActivity[] = [];
    if (options?.includeDiscovery && preferences.onThisDay) {
      const memories = await loadOnThisDay(familyId, now, options?.force === true).catch(() => []);
      const first = memories[0];
      if (first) {
        const yearsAgo = Math.max(1, now.getFullYear() - new Date(first.createdAt).getFullYear());
        discovery.push({
          id: `on-this-day-${familyId}-${toDateKey(now)}-${uid}`,
          familyId,
          kind: "moment",
          audience: "target",
          targetUid: uid,
          actorUid: "bloom",
          actorName: "Bloom",
          title: `Ngày này ${yearsAgo} năm trước`,
          body: first.caption?.trim() || "Một kỷ niệm của cả nhà đang nở lại hôm nay.",
          sourceType: "moment",
          sourceId: first.id,
          importance: "normal",
          badgeEligible: false,
          createdAt: startOfDay(now).toISOString(),
        });
      }
    }

    const items = [...eventReminders, ...discovery].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const unreadBadgeCount = items.filter((item) => item.badgeEligible && (!lastSeenAt || item.createdAt > lastSeenAt)).length;
    return { items, lastSeenAt, unreadBadgeCount };
  },

  async unreadBadgeCount(
    familyId: string,
    uid: string,
    preferences?: Partial<SmartReminderPreferences> | null,
  ) {
    const page = await smartReminderService.listForUser(familyId, uid, preferences, { includeDiscovery: false });
    return page.unreadBadgeCount;
  },

  async markAllSeen(familyId: string, uid: string) {
    const timestamp = new Date().toISOString();
    await updateDoc(doc(getFirestore(), FIRESTORE_PATHS.familyMember(familyId, uid)), {
      smartReminderLastSeenAt: timestamp,
    });
    seenCache.set(`${familyId}:${uid}`, { lastSeenAt: timestamp, expiresAt: Date.now() + SEEN_CACHE_TTL_MS });
    return timestamp;
  },

  invalidate(familyId?: string) {
    if (!familyId) {
      eventWindowCache.clear();
      memoryCache.clear();
      seenCache.clear();
      return;
    }
    for (const key of Array.from(eventWindowCache.keys())) if (key.startsWith(`${familyId}:`)) eventWindowCache.delete(key);
    for (const key of Array.from(memoryCache.keys())) if (key.startsWith(`${familyId}:`)) memoryCache.delete(key);
  },
};
