import type { FamilyGraphSnapshot } from "../../types/familyGraph";

export type CrossFamilyIdentityLink = {
  uid: string;
  familyAId: string;
  personAId: string;
  familyBId: string;
  personBId: string;
};

export type CrossFamilyGraphBridgeView = {
  familyIds: string[];
  identityLinks: CrossFamilyIdentityLink[];
};

/**
 * Experimental read-only bridge foundation.
 *
 * It NEVER creates/persists parent_child or partner edges between families.
 * The only safe automatic bridge we accept is identity evidence from the same
 * linkedUid appearing in more than one family snapshot the current user may read.
 * Rendering/collapsing these links is a future opt-in UI step after device perf gate.
 */
export const buildCrossFamilyIdentityBridge = (
  snapshots: FamilyGraphSnapshot[],
): CrossFamilyGraphBridgeView => {
  const byUid = new Map<string, Array<{ familyId: string; personId: string }>>();
  const familyIds = [...new Set(snapshots.map((snapshot) => snapshot.familyId).filter(Boolean))];

  snapshots.forEach((snapshot) => {
    snapshot.persons.forEach((person) => {
      if (!person.linkedUid) return;
      const list = byUid.get(person.linkedUid) ?? [];
      list.push({ familyId: snapshot.familyId, personId: person.id });
      byUid.set(person.linkedUid, list);
    });
  });

  const identityLinks: CrossFamilyIdentityLink[] = [];
  byUid.forEach((entries, uid) => {
    const distinct = entries.filter((entry, index, all) => all.findIndex(
      (other) => other.familyId === entry.familyId && other.personId === entry.personId,
    ) === index);
    for (let i = 0; i < distinct.length; i += 1) {
      for (let j = i + 1; j < distinct.length; j += 1) {
        if (distinct[i].familyId === distinct[j].familyId) continue;
        identityLinks.push({
          uid,
          familyAId: distinct[i].familyId,
          personAId: distinct[i].personId,
          familyBId: distinct[j].familyId,
          personBId: distinct[j].personId,
        });
      }
    }
  });

  return { familyIds, identityLinks };
};
