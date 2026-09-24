import { APP_CONFIG_DEFAULTS } from "../../constants/appConfiguration";
import type { FamilyGraphSnapshot, FamilyPerson, FamilyRelationship } from "../../types/familyGraph";
import {
  FAMILY_GRAPH_CANVAS,
  type FamilyGraphPrototypeConnection,
  type FamilyGraphPrototypePerson,
} from "./familyGraphPrototypeData";

const MAX_RENDER_GENERATION = 5;
const LAYOUT_CONFIG = APP_CONFIG_DEFAULTS.familyGraph.layout;
const ROW_SIDE_PADDING = LAYOUT_CONFIG.rowSidePadding;
const PARTNER_GAP = LAYOUT_CONFIG.partnerGap;
const SIBLING_UNIT_GAP = LAYOUT_CONFIG.siblingUnitGap;
const FAMILY_UNIT_GAP = LAYOUT_CONFIG.familyUnitGap;

export const getFamilyGraphGenerationY = (generation: number): number =>
  LAYOUT_CONFIG.generationTop + Math.max(0, generation - 1) * LAYOUT_CONFIG.generationStep;

export const getFamilyGraphCanvasHeight = (generationCount = MAX_RENDER_GENERATION): number =>
  getFamilyGraphGenerationY(Math.max(1, generationCount))
  + FAMILY_GRAPH_CANVAS.nodeHeight
  + LAYOUT_CONFIG.canvasBottomPadding;

const yearOf = (person: FamilyPerson): number | undefined => {
  if (person.birthYear) return person.birthYear;
  const fromDate = person.birthDate ? Number(person.birthDate.slice(0, 4)) : NaN;
  return Number.isFinite(fromDate) ? fromDate : undefined;
};

const deathYearOf = (person: FamilyPerson): number | undefined => {
  if (person.deathYear) return person.deathYear;
  const fromDate = person.deathDate ? Number(person.deathDate.slice(0, 4)) : NaN;
  return Number.isFinite(fromDate) ? fromDate : undefined;
};

const buildGenerationMap = (
  persons: FamilyPerson[],
  relationships: FamilyRelationship[],
  focusPersonId?: string | null,
): Map<string, number> => {
  const ids = new Set(persons.map((person) => person.id));
  const generation = new Map<string, number>();
  if (!persons.length) return generation;

  // Phase 6.3 perf: adjacency + BFS is O(P + R), replacing the previous
  // multi-pass O(P × R) propagation that became visible on dense trees.
  const adjacency = new Map<string, Array<{ id: string; delta: number }>>();
  const add = (from: string, to: string, delta: number) => {
    const items = adjacency.get(from) ?? [];
    items.push({ id: to, delta });
    adjacency.set(from, items);
  };
  for (const relationship of relationships) {
    if (!ids.has(relationship.personAId) || !ids.has(relationship.personBId)) continue;
    if (relationship.type === "partner") {
      add(relationship.personAId, relationship.personBId, 0);
      add(relationship.personBId, relationship.personAId, 0);
    } else {
      add(relationship.personAId, relationship.personBId, 1);
      add(relationship.personBId, relationship.personAId, -1);
    }
  }

  const fillComponent = (seedId: string) => {
    const queue = [seedId];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const currentGeneration = generation.get(current) ?? 3;
      for (const next of adjacency.get(current) ?? []) {
        if (generation.has(next.id)) continue;
        generation.set(next.id, currentGeneration + next.delta);
        queue.push(next.id);
      }
    }
  };

  const seedId = focusPersonId && ids.has(focusPersonId) ? focusPersonId : persons[0].id;
  generation.set(seedId, 3);
  fillComponent(seedId);

  for (const person of persons) {
    if (generation.has(person.id)) continue;
    generation.set(person.id, 3);
    fillComponent(person.id);
  }

  for (const [personId, value] of generation) {
    generation.set(personId, Math.max(1, Math.min(MAX_RENDER_GENERATION, value)));
  }
  return generation;
};

const buildRelationSummaryMap = (
  peopleById: Map<string, FamilyPerson>,
  relationships: FamilyRelationship[],
): Map<string, string[]> => {
  const summaries = new Map<string, string[]>();
  const name = (id: string) => peopleById.get(id)?.displayName ?? "Thành viên";
  const add = (personId: string, value: string) => {
    const summary = summaries.get(personId) ?? [];
    if (summary.length < 8) summary.push(value);
    summaries.set(personId, summary);
  };
  for (const relationship of relationships) {
    if (relationship.type === "partner") {
      add(relationship.personAId, `Vợ/Chồng: ${name(relationship.personBId)}`);
      add(relationship.personBId, `Vợ/Chồng: ${name(relationship.personAId)}`);
      continue;
    }
    add(relationship.personAId, `Con: ${name(relationship.personBId)}`);
    const parent = peopleById.get(relationship.personAId);
    add(relationship.personBId, `${parent?.gender === "female" ? "Mẹ" : parent?.gender === "male" ? "Cha" : "Cha/Mẹ"}: ${name(relationship.personAId)}`);
  }
  return summaries;
};

type RowUnit = {
  persons: FamilyPerson[];
  anchorPersonId: string;
  parentKey: string | null;
  sortYear: number;
  sortName: string;
  width: number;
};

const personSort = (a: FamilyPerson, b: FamilyPerson) => {
  const ay = yearOf(a) ?? 9999;
  const by = yearOf(b) ?? 9999;
  return ay - by || a.displayName.localeCompare(b.displayName, "vi");
};

/**
 * Partner-connected people are an atomic visual unit. This is intentionally a
 * render-only concern: no persisted relationship semantics are changed.
 * A sibling/relative can therefore never be inserted between a couple.
 */
const buildRowUnits = (row: FamilyPerson[], relationships: FamilyRelationship[]): RowUnit[] => {
  const rowById = new Map(row.map((person) => [person.id, person]));
  const partnerAdjacency = new Map<string, Set<string>>();
  const incomingParents = new Map<string, number>();
  const parentIdsByChild = new Map<string, string[]>();

  for (const relationship of relationships) {
    if (relationship.type === "parent_child" && rowById.has(relationship.personBId)) {
      incomingParents.set(relationship.personBId, (incomingParents.get(relationship.personBId) ?? 0) + 1);
      const parentIds = parentIdsByChild.get(relationship.personBId) ?? [];
      parentIds.push(relationship.personAId);
      parentIdsByChild.set(relationship.personBId, parentIds);
      continue;
    }
    if (relationship.type !== "partner") continue;
    if (!rowById.has(relationship.personAId) || !rowById.has(relationship.personBId)) continue;
    const a = partnerAdjacency.get(relationship.personAId) ?? new Set<string>();
    a.add(relationship.personBId);
    partnerAdjacency.set(relationship.personAId, a);
    const b = partnerAdjacency.get(relationship.personBId) ?? new Set<string>();
    b.add(relationship.personAId);
    partnerAdjacency.set(relationship.personBId, b);
  }

  const visited = new Set<string>();
  const units: RowUnit[] = [];

  for (const seed of [...row].sort(personSort)) {
    if (visited.has(seed.id)) continue;
    const stack = [seed.id];
    const component: FamilyPerson[] = [];
    while (stack.length) {
      const id = stack.pop();
      if (!id || visited.has(id)) continue;
      visited.add(id);
      const person = rowById.get(id);
      if (person) component.push(person);
      partnerAdjacency.get(id)?.forEach((nextId) => {
        if (!visited.has(nextId)) stack.push(nextId);
      });
    }

    component.sort((a, b) => {
      const parentDelta = (incomingParents.get(b.id) ?? 0) - (incomingParents.get(a.id) ?? 0);
      return parentDelta || personSort(a, b);
    });

    const anchor = [...component].sort((a, b) => {
      const parentDelta = (incomingParents.get(b.id) ?? 0) - (incomingParents.get(a.id) ?? 0);
      return parentDelta || personSort(a, b);
    })[0];

    const lineageParents = [...new Set(parentIdsByChild.get(anchor.id) ?? [])].sort();
    units.push({
      persons: component,
      anchorPersonId: anchor.id,
      parentKey: lineageParents.length ? lineageParents.join("|") : null,
      sortYear: yearOf(anchor) ?? 9999,
      sortName: anchor.displayName,
      width: component.length * FAMILY_GRAPH_CANVAS.nodeWidth + Math.max(0, component.length - 1) * PARTNER_GAP,
    });
  }

  return units.sort((a, b) => a.sortYear - b.sortYear || a.sortName.localeCompare(b.sortName, "vi"));
};

const gapBetweenUnits = (left: RowUnit, right: RowUnit): number =>
  left.parentKey && right.parentKey && left.parentKey === right.parentKey
    ? SIBLING_UNIT_GAP
    : FAMILY_UNIT_GAP;

const rowRequiredWidth = (units: RowUnit[]) => {
  if (!units.length) return 0;
  let width = units.reduce((sum, unit) => sum + unit.width, 0);
  for (let index = 1; index < units.length; index += 1) {
    width += gapBetweenUnits(units[index - 1], units[index]);
  }
  return width;
};

const unitParentAnchor = (
  unit: RowUnit,
  relationships: FamilyRelationship[],
  positioned: Map<string, { x: number; y: number; generation: number }>,
): number | null => {
  const childIds = new Set(unit.persons.map((person) => person.id));
  const parentCenters: number[] = [];
  for (const relationship of relationships) {
    if (relationship.type !== "parent_child" || !childIds.has(relationship.personBId)) continue;
    const parentPosition = positioned.get(relationship.personAId);
    if (!parentPosition) continue;
    parentCenters.push(parentPosition.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2);
  }
  if (!parentCenters.length) return null;
  return parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length;
};

/**
 * Place one generation by real genealogy anchors instead of birth-year-only rows.
 * Partner components remain atomic; units with parents are ordered around the
 * actual parent/couple centre. This keeps a child under its own branch and
 * prevents another family branch child from visually looking like a sibling.
 */
const positionGenerationUnits = (
  units: RowUnit[],
  generation: number,
  provisionalCanvasWidth: number,
  relationships: FamilyRelationship[],
  positioned: Map<string, { x: number; y: number; generation: number }>,
) => {
  if (!units.length) return;
  const fallbackRowWidth = rowRequiredWidth(units);
  const fallbackStart = (provisionalCanvasWidth - fallbackRowWidth) / 2;
  let fallbackCursor = fallbackStart;

  const desired = units.map((unit, index) => {
    if (index > 0) fallbackCursor += gapBetweenUnits(units[index - 1], unit);
    const parentAnchor = unitParentAnchor(unit, relationships, positioned);
    const fallbackCenter = fallbackCursor + unit.width / 2;
    fallbackCursor += unit.width;
    return {
      unit,
      desiredCenter: parentAnchor ?? fallbackCenter,
      anchored: parentAnchor !== null,
    };
  }).sort((a, b) => {
    if (a.desiredCenter !== b.desiredCenter) return a.desiredCenter - b.desiredCenter;
    if (a.anchored !== b.anchored) return a.anchored ? -1 : 1;
    return a.unit.sortYear - b.unit.sortYear || a.unit.sortName.localeCompare(b.unit.sortName, "vi");
  });

  const centers: number[] = [];
  desired.forEach((item, index) => {
    if (index === 0) {
      centers.push(item.desiredCenter);
      return;
    }
    const prev = desired[index - 1];
    const minCenter = centers[index - 1]
      + prev.unit.width / 2
      + gapBetweenUnits(prev.unit, item.unit)
      + item.unit.width / 2;
    centers.push(Math.max(item.desiredCenter, minCenter));
  });

  // Forward collision resolution pushes a sibling group to the right. Shift
  // the whole row back toward its barycentric anchors so children remain
  // visually centred around the correct parent family unit.
  const averageDelta = desired.reduce((sum, item, index) => sum + (item.desiredCenter - centers[index]), 0) / desired.length;
  for (let index = 0; index < centers.length; index += 1) centers[index] += averageDelta;

  desired.forEach((item, unitIndex) => {
    const left = centers[unitIndex] - item.unit.width / 2;
    item.unit.persons.forEach((person, personIndex) => {
      positioned.set(person.id, {
        x: left + personIndex * (FAMILY_GRAPH_CANVAS.nodeWidth + PARTNER_GAP),
        y: getFamilyGraphGenerationY(generation),
        generation,
      });
    });
  });
};

export type FamilyGraphVisualData = {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  canvasWidth: number;
  canvasHeight: number;
};

export const adaptFamilyGraphSnapshot = (
  snapshot: FamilyGraphSnapshot,
  focusPersonId?: string | null,
): FamilyGraphVisualData => {
  // Visual truth: a Person only appears on the tree after at least one explicit
  // structural relationship has been confirmed. Unassigned Persons stay in the
  // admin Person list, but must never float on the genealogy canvas where their
  // position could visually imply a false family relationship.
  const allPeopleById = new Map(snapshot.persons.map((person) => [person.id, person]));
  const connectedPersonIds = new Set<string>();
  const renderRelationships = snapshot.relationships.filter((relationship) => {
    const valid = allPeopleById.has(relationship.personAId) && allPeopleById.has(relationship.personBId);
    if (valid) {
      connectedPersonIds.add(relationship.personAId);
      connectedPersonIds.add(relationship.personBId);
    }
    return valid;
  });
  const renderPersons = snapshot.persons.filter((person) => connectedPersonIds.has(person.id));
  const peopleById = new Map(renderPersons.map((person) => [person.id, person]));
  const effectiveFocusPersonId = focusPersonId && connectedPersonIds.has(focusPersonId)
    ? focusPersonId
    : renderPersons[0]?.id ?? null;
  const relationSummaries = buildRelationSummaryMap(peopleById, renderRelationships);
  const generationMap = buildGenerationMap(renderPersons, renderRelationships, effectiveFocusPersonId);
  const rows = new Map<number, FamilyPerson[]>();
  for (const person of renderPersons) {
    const generation = generationMap.get(person.id) ?? 3;
    const row = rows.get(generation) ?? [];
    row.push(person);
    rows.set(generation, row);
  }

  const rowUnits = new Map<number, RowUnit[]>();
  let widestRow = 0;
  for (let generation = 1; generation <= MAX_RENDER_GENERATION; generation += 1) {
    const units = buildRowUnits(rows.get(generation) ?? [], renderRelationships);
    rowUnits.set(generation, units);
    widestRow = Math.max(widestRow, rowRequiredWidth(units));
  }

  // Never shrink node spacing to fit a fixed surface. Dense generations expand
  // the logical canvas horizontally; pan/pinch handles navigation on mobile.
  const provisionalCanvasWidth = Math.max(
    FAMILY_GRAPH_CANVAS.width,
    Math.ceil(widestRow + ROW_SIDE_PADDING * 2),
  );
  const canvasHeight = Math.max(FAMILY_GRAPH_CANVAS.height, getFamilyGraphCanvasHeight(MAX_RENDER_GENERATION));

  const positioned = new Map<string, { x: number; y: number; generation: number }>();
  for (let generation = 1; generation <= MAX_RENDER_GENERATION; generation += 1) {
    const units = rowUnits.get(generation) ?? [];
    positionGenerationUnits(units, generation, provisionalCanvasWidth, renderRelationships, positioned);
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  positioned.forEach((position) => {
    minX = Math.min(minX, position.x);
    maxRight = Math.max(maxRight, position.x + FAMILY_GRAPH_CANVAS.nodeWidth);
  });
  if (!Number.isFinite(minX)) minX = ROW_SIDE_PADDING;
  if (!Number.isFinite(maxRight)) maxRight = provisionalCanvasWidth - ROW_SIDE_PADDING;
  const shiftX = minX < ROW_SIDE_PADDING ? ROW_SIDE_PADDING - minX : 0;
  if (shiftX) {
    positioned.forEach((position, personId) => positioned.set(personId, { ...position, x: position.x + shiftX }));
    maxRight += shiftX;
  }
  const canvasWidth = Math.max(provisionalCanvasWidth + shiftX, Math.ceil(maxRight + ROW_SIDE_PADDING));

  const people: FamilyGraphPrototypePerson[] = renderPersons.map((person) => {
    const position = positioned.get(person.id) ?? { x: canvasWidth / 2 - 64, y: getFamilyGraphGenerationY(3), generation: 3 };
    const born = yearOf(person);
    const died = deathYearOf(person);
    return {
      id: person.id,
      displayName: person.displayName,
      shortName: person.nickname || person.displayName.split(/\s+/).slice(-2).join(" "),
      gender: person.gender === "other" ? "unknown" : person.gender,
      birthYear: born,
      birthDate: person.birthDate ?? undefined,
      deathYear: died,
      deathDate: person.deathDate ?? undefined,
      generation: position.generation,
      linkedAccount: !!person.linkedUid,
      linkedUid: person.linkedUid ?? undefined,
      avatarUrl: person.avatarUrl ?? undefined,
      lifeStatus: person.lifeStatus,
      birthPlace: person.birthPlace ?? undefined,
      description: person.description ?? undefined,
      roleLabel: undefined,
      relationSummary: relationSummaries.get(person.id) ?? [],
      timeline: [
        ...(born ? [{ year: String(born), title: "Chào đời", description: person.birthPlace ? `Sinh tại ${person.birthPlace}.` : "Mốc năm sinh trong gia phả." }] : []),
        ...(died ? [{ year: String(died), title: "Qua đời", description: "Mốc thời gian được gia đình lưu lại." }] : []),
      ],
      albumLabels: [],
      x: position.x,
      y: position.y,
    };
  });

  const connections: FamilyGraphPrototypeConnection[] = renderRelationships.map((relationship) => ({
    id: relationship.id,
    fromId: relationship.personAId,
    toId: relationship.personBId,
    type: relationship.type,
  }));

  return { people, connections, canvasWidth, canvasHeight };
};
