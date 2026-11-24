/**
 * Family Bloom R16R11R1 — Web connected-preview subtree reservation for native.
 *
 * Ported from the approved Web/main reserveConnectedFamilySubtrees rules:
 *   one visual partner component => one atomic horizontal unit;
 *   reserve every descendant subtree bottom-up;
 *   spouseGap=72, siblingGap=52, independentComponentGap=112;
 *   first generation sits above the middle of its descendant region.
 *
 * Layout is derived and READ-ONLY. The owner selected below is a GEOMETRIC
 * placement parent, NOT a new parent, a family anchor or a Firebase mutation.
 * Never join distinct evidence-based components or collapse distinct IDs by name.
 */
import type { FamilyPerson, FamilyRelationship } from '../../types/familyGraph';
import { FAMILY_GRAPH_CANVAS } from './familyGraphPrototypeData';

export type FamilyGraphPlacedPoint = { x: number; y: number; generation: number };
export type FamilyGraphNativeSubtreeMetrics = {
  coupleGap: number;
  siblingGap: number;
  branchGap: number;
  nodeWidth: number;
};
export const WEB_PARITY_NATIVE_METRICS: FamilyGraphNativeSubtreeMetrics = {
  coupleGap: 72,
  siblingGap: 52,
  branchGap: 112,
  nodeWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
};

type Unit = {
  key: string;
  members: string[];
  generation: number;
  seed: number;
  width: number;
  span: number;
  owner: string | null;
  children: Unit[];
};
const byId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const birthYear = (p?: FamilyPerson) => {
  const y = p?.birthYear ?? (p?.birthDate ? Number(p.birthDate.slice(0, 4)) : NaN);
  return typeof y === 'number' && Number.isFinite(y) && y > 0 ? y : 9999;
};
const usableParent = (r: FamilyRelationship) => r.type === 'parent_child'
  && (r.subtype === 'biological' || r.subtype === 'adoptive' || r.subtype === 'step');
const usablePartner = (r: FamilyRelationship) => r.type === 'partner'
  && (r.partnerStatus === 'married' || r.partnerStatus === 'partner'
    || r.partnerStatus === 'divorced' || r.partnerStatus === 'widowed');

export function reserveFamilyGraphWebSubtrees(
  persons: readonly FamilyPerson[],
  relationships: readonly FamilyRelationship[],
  positions: Map<string, FamilyGraphPlacedPoint>,
  metrics: FamilyGraphNativeSubtreeMetrics = WEB_PARITY_NATIVE_METRICS,
): { groupCount: number; rootCount: number; positionedIds: number } {
  const { nodeWidth, coupleGap, siblingGap, branchGap } = metrics;
  const seen = new Set<string>();
  const validPeople = persons.filter(p => {
    if (!p.id || !positions.has(p.id) || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).sort((a, b) => byId(a.id, b.id));
  if (!validPeople.length) return { groupCount: 0, rootCount: 0, positionedIds: 0 };
  const records = new Map(validPeople.map(p => [p.id, p]));
  const validEdges = relationships.filter(r => records.has(r.personAId) && records.has(r.personBId)
    && r.personAId !== r.personBId);
  const partnerEdges = validEdges.filter(usablePartner);
  const parentEdges = validEdges.filter(usableParent);
  const spouseNeighbors = new Map(validPeople.map(p => [p.id, new Set<string>()]));
  for (const r of partnerEdges) {
    if (positions.get(r.personAId)?.generation !== positions.get(r.personBId)?.generation) continue;
    spouseNeighbors.get(r.personAId)?.add(r.personBId);
    spouseNeighbors.get(r.personBId)?.add(r.personAId);
  }
  const units: Unit[] = [];
  const unitOf = new Map<string, Unit>();
  const visited = new Set<string>();
  for (const person of validPeople) {
    if (visited.has(person.id)) continue;
    const queue = [person.id];
    visited.add(person.id);
    for (let i = 0; i < queue.length; i++) {
      for (const next of spouseNeighbors.get(queue[i]) ?? []) {
        if (!visited.has(next)) { visited.add(next); queue.push(next); }
      }
    }
    // Same stable ordering as Web: existing scene x, then id. For a new
    // generation this preserves the spouse ordering established by the adapter.
    const members = queue.sort((a, b) => (positions.get(a)?.x ?? 0)
      - (positions.get(b)?.x ?? 0) || byId(a, b));
    const unit: Unit = {
      key: [...members].sort(byId).join('|'), members,
      generation: positions.get(members[0])!.generation,
      seed: Math.min(...members.map(id => positions.get(id)!.x)),
      width: members.length * nodeWidth + (members.length - 1) * coupleGap,
      span: 0, owner: null, children: [],
    };
    units.push(unit);
    for (const id of members) unitOf.set(id, unit);
  }
  // A child unit may have two biological parents (same unit) or unrelated
  // recorded parent units. Choose one for *position only*, preserve all edges.
  const ownershipScores = new Map<Unit, Map<Unit, number>>();
  for (const r of parentEdges) {
    const parent = unitOf.get(r.personAId), child = unitOf.get(r.personBId);
    if (!parent || !child || parent === child || parent.generation >= child.generation) continue;
    const choices = ownershipScores.get(child) ?? new Map<Unit, number>();
    choices.set(parent, (choices.get(parent) ?? 0) + (r.subtype === 'step' ? 1 : 2));
    ownershipScores.set(child, choices);
  }
  for (const unit of units) {
    const choices = [...(ownershipScores.get(unit) ?? [])].sort((a, b) =>
      b[1] - a[1] || a[0].generation - b[0].generation
      || a[0].seed - b[0].seed || byId(a[0].key, b[0].key));
    if (choices.length) {
      const parent = choices[0][0];
      unit.owner = parent.key;
      parent.children.push(unit);
    }
  }
  const indexedParentEdges = new Map<string, FamilyRelationship[]>();
  for (const e of parentEdges) {
    const child = unitOf.get(e.personBId), parent = unitOf.get(e.personAId);
    if (!child || !parent) continue;
    const k = parent.key + '->' + child.key;
    const list = indexedParentEdges.get(k) ?? [];
    list.push(e);
    indexedParentEdges.set(k, list);
  }
  const childYear = (parent: Unit, child: Unit) => {
    const e = indexedParentEdges.get(parent.key + '->' + child.key) ?? [];
    return e.length ? Math.min(...e.map(r => birthYear(records.get(r.personBId)))) : 9999;
  };
  for (const unit of units) unit.children.sort((a, b) =>
    childYear(unit, a) - childYear(unit, b) || a.seed - b.seed || byId(a.key, b.key));
  const subtreeWidth = (unit: Unit): number => {
    const widths = unit.children.map(subtreeWidth);
    const total = widths.reduce((a, b) => a + b, 0) + siblingGap * Math.max(0, widths.length - 1);
    unit.span = Math.max(unit.width, total);
    return unit.span;
  };
  const roots = units.filter(u => u.owner === null).sort((a, b) =>
    a.generation - b.generation || a.seed - b.seed || byId(a.key, b.key));
  for (const root of roots) subtreeWidth(root);
  const place = (unit: Unit, left: number) => {
    const start = left + (unit.span - unit.width) / 2;
    unit.members.forEach((id, i) => { positions.get(id)!.x = start + i * (nodeWidth + coupleGap); });
    const childrenWidth = unit.children.reduce((sum, c) => sum + c.span, 0)
      + siblingGap * Math.max(0, unit.children.length - 1);
    let cursor = left + (unit.span - childrenWidth) / 2;
    for (const child of unit.children) { place(child, cursor); cursor += child.span + siblingGap; }
  };
  let cursor = 80;
  for (const root of roots) { place(root, cursor); cursor += root.span + branchGap; }
  return { groupCount: units.length, rootCount: roots.length, positionedIds: validPeople.length };
}
