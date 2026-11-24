/** Family Bloom Web parity — native dashboard summary, entirely derived.
 * No inferred roots, no name-based deduplication, no Firebase mutation.
 */
import type { FamilyGraphSnapshot, FamilyPerson, FamilyRelationship } from '../../types/familyGraph';

export type FamilyGraphDirectoryEntry = FamilyPerson & { relationCount: number };
export type FamilyGraphDashboardSummary = {
  people: number;
  relations: number;
  generations: number | null;
  provisional: boolean;
  unlinked: number;
  directory: FamilyGraphDirectoryEntry[];
};
const validParent = (r: FamilyRelationship) => r.type === 'parent_child'
  && (r.subtype === 'biological' || r.subtype === 'adoptive');
export function summarizeNativeFamilyGraph(
  snapshot: FamilyGraphSnapshot,
  roots: readonly string[] = [],
): FamilyGraphDashboardSummary {
  const people = new Map<string, FamilyPerson>();
  for (const person of snapshot.persons) {
    if (person.id && !people.has(person.id)) people.set(person.id, person);
  }
  const ids = new Set(people.keys());
  const seenLinks = new Set<string>();
  const relations = snapshot.relationships.filter(r => {
    if (!r.id || seenLinks.has(r.id) || r.personAId === r.personBId
      || !ids.has(r.personAId) || !ids.has(r.personBId)) return false;
    seenLinks.add(r.id);
    return true;
  });
  const counts = new Map([...ids].map(id => [id, 0]));
  for (const r of relations) {
    counts.set(r.personAId, (counts.get(r.personAId) ?? 0) + 1);
    counts.set(r.personBId, (counts.get(r.personBId) ?? 0) + 1);
  }
  const directory = [...people.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi')
    || (a.birthYear ?? 9999) - (b.birthYear ?? 9999) || a.id.localeCompare(b.id))
    .map(p => ({ ...p, relationCount: counts.get(p.id) ?? 0 }));
  const verifiedRoots = [...new Set(roots)].filter(id => ids.has(id));
  const parentEdges = relations.filter(validParent);
  if (!parentEdges.length) return {
    people: people.size, relations: relations.length, generations: verifiedRoots.length ? 1 : null,
    provisional: !verifiedRoots.length, unlinked: directory.filter(p => !p.relationCount).length, directory,
  };
  // Topologically evaluate only documented biological/adoptive edges.
  // Do not pass through spouses or stepchildren as ancestors.
  const next = new Map<string, Set<string>>();
  const incoming = new Map([...ids].map(id => [id, 0]));
  for (const r of parentEdges) {
    const children = next.get(r.personAId) ?? new Set<string>();
    if (!children.has(r.personBId)) {
      children.add(r.personBId);
      incoming.set(r.personBId, (incoming.get(r.personBId) ?? 0) + 1);
    }
    next.set(r.personAId, children);
  }
  const depth = new Map([...ids].map(id => [id, verifiedRoots.length ? 0 : 1]));
  const queue = [...incoming].filter(([, n]) => n === 0).map(([id]) => id).sort();
  for (const root of verifiedRoots) depth.set(root, 1);
  let visited = 0;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]; visited++;
    for (const child of next.get(id) ?? []) {
      const candidate = depth.get(id) ? depth.get(id)! + 1 : 0;
      depth.set(child, Math.max(depth.get(child) ?? 0, candidate));
      incoming.set(child, (incoming.get(child) ?? 0) - 1);
      if (incoming.get(child) === 0) queue.push(child);
    }
  }
  // Do not display an invented count for cyclic or contradictory records.
  const generationCount = visited === ids.size ? Math.max(...depth.values()) : null;
  return {
    people: people.size, relations: relations.length,
    generations: generationCount && generationCount > 0 ? generationCount : null,
    provisional: !verifiedRoots.length,
    unlinked: directory.filter(p => !p.relationCount).length, directory,
  };
}
