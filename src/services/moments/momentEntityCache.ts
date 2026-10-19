import type { MomentPost } from "../../types/moments";

type FamilyMomentCache = { entities: Map<string, MomentPost>; touchedAt: number };
const familyCaches = new Map<string, FamilyMomentCache>();
const MAX_FAMILY_CACHES = 2;
const MAX_MOMENTS_PER_FAMILY = 600;

const touch = (familyId: string) => {
  let cache = familyCaches.get(familyId);
  if (!cache) {
    cache = { entities: new Map(), touchedAt: Date.now() };
    familyCaches.set(familyId, cache);
  }
  cache.touchedAt = Date.now();
  if (familyCaches.size > MAX_FAMILY_CACHES) {
    const oldest = [...familyCaches.entries()].filter(([id]) => id !== familyId).sort((a, b) => a[1].touchedAt - b[1].touchedAt)[0];
    if (oldest) familyCaches.delete(oldest[0]);
  }
  return cache;
};

const trim = (cache: FamilyMomentCache) => {
  while (cache.entities.size > MAX_MOMENTS_PER_FAMILY) {
    const first = cache.entities.keys().next();
    if (first.done) break;
    cache.entities.delete(first.value);
  }
};

export const canonicalizeFamilyMoment = (familyId: string, candidate: MomentPost) => {
  const cache = touch(familyId);
  const current = cache.entities.get(candidate.id);
  if (current) {
    const sameVersion = current.updatedAt === candidate.updatedAt
      && current.moderationStatus === candidate.moderationStatus
      && current.caption === candidate.caption
      && current.media?.length === candidate.media?.length;
    if (sameVersion) return current;
  }
  cache.entities.delete(candidate.id);
  cache.entities.set(candidate.id, candidate);
  trim(cache);
  return candidate;
};

export const canonicalizeFamilyMoments = (familyId: string, items: MomentPost[]) =>
  items.map((item) => canonicalizeFamilyMoment(familyId, item));

export const canonicalizeFamilyMomentsStable = (familyId: string, previous: MomentPost[], items: MomentPost[]) => {
  const next = canonicalizeFamilyMoments(familyId, items);
  return previous.length === next.length && previous.every((item, index) => item === next[index]) ? previous : next;
};
