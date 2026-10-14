import type { FamilyGraphSnapshot } from "../../types/familyGraph";

/** Visual/data revision: profile and relationship updates invalidate hydrated scenes. */
export const fingerprintFamilyGraphSnapshot = (snapshot: FamilyGraphSnapshot) => {
  const persons = snapshot.persons
    .map((item) => `${item.id}:${item.updatedAt}`)
    .sort()
    .join("|");
  const relationships = snapshot.relationships
    .map((item) => `${item.id}:${item.updatedAt}`)
    .sort()
    .join("|");
  return `${snapshot.familyId}::${persons}::${relationships}`;
};

/**
 * Layout revision intentionally ignores avatar/nickname/notes and relationship
 * metadata. Profile-only updates can hydrate onto cached x/y without relayout.
 * Name/birth fields remain because the current deterministic row ordering uses them.
 */
export const fingerprintFamilyGraphLayout = (snapshot: FamilyGraphSnapshot) => {
  const persons = snapshot.persons
    .map((item) => `${item.id}:${item.displayName}:${item.birthYear ?? ""}:${item.birthDate ?? ""}`)
    .sort()
    .join("|");
  const relationships = snapshot.relationships
    .map((item) => `${item.id}:${item.type}:${item.personAId}:${item.personBId}`)
    .sort()
    .join("|");
  return `${snapshot.familyId}::${persons}::${relationships}`;
};
