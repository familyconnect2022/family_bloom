import type { FamilyEvent } from "../../types";

type FamilyEventCache = {
  entities: Map<string, FamilyEvent>;
  touchedAt: number;
};

const MAX_FAMILY_CACHES = 2;
const MAX_EVENTS_PER_FAMILY = 800;
const familyCaches = new Map<string, FamilyEventCache>();

const eventVersionTime = (event: FamilyEvent) => Date.parse(event.updatedAt || event.createdAt || event.dateISO) || 0;

const touchFamilyCache = (familyId: string) => {
  let cache = familyCaches.get(familyId);
  if (!cache) {
    cache = { entities: new Map<string, FamilyEvent>(), touchedAt: Date.now() };
    familyCaches.set(familyId, cache);
  }
  cache.touchedAt = Date.now();

  if (familyCaches.size > MAX_FAMILY_CACHES) {
    const oldest = [...familyCaches.entries()]
      .filter(([id]) => id !== familyId)
      .sort((a, b) => a[1].touchedAt - b[1].touchedAt)[0];
    if (oldest) familyCaches.delete(oldest[0]);
  }
  return cache;
};

const trimFamilyCache = (cache: FamilyEventCache) => {
  if (cache.entities.size <= MAX_EVENTS_PER_FAMILY) return;
  const excess = cache.entities.size - MAX_EVENTS_PER_FAMILY;
  let removed = 0;
  for (const id of cache.entities.keys()) {
    cache.entities.delete(id);
    removed += 1;
    if (removed >= excess) break;
  }
};

export const canonicalizeFamilyEvent = (familyId: string, candidate: FamilyEvent): FamilyEvent => {
  const cache = touchFamilyCache(familyId);
  const current = cache.entities.get(candidate.id);
  if (!current) {
    cache.entities.set(candidate.id, candidate);
    trimFamilyCache(cache);
    return candidate;
  }

  const currentVersion = eventVersionTime(current);
  const candidateVersion = eventVersionTime(candidate);
  if (candidateVersion < currentVersion) return current;

  const sameVersion = current.updatedAt === candidate.updatedAt
    && current.moderationStatus === candidate.moderationStatus
    && current.dateISO === candidate.dateISO;
  if (candidateVersion === currentVersion && sameVersion) return current;

  cache.entities.delete(candidate.id);
  cache.entities.set(candidate.id, candidate);
  trimFamilyCache(cache);
  return candidate;
};

export const canonicalizeFamilyEvents = (familyId: string, events: FamilyEvent[]) =>
  events.map((event) => canonicalizeFamilyEvent(familyId, event));

export const canonicalizeFamilyEventsStable = (
  familyId: string,
  previous: FamilyEvent[],
  events: FamilyEvent[],
) => {
  const next = canonicalizeFamilyEvents(familyId, events);
  return previous.length === next.length && previous.every((event, index) => event === next[index])
    ? previous
    : next;
};
