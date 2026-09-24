import type {
  FamilyGraphPrototypeConnection,
  FamilyGraphPrototypePerson,
} from "./familyGraphPrototypeData";
import type {
  FamilyGraphSpatialPoint,
  FamilyGraphSpatialRect,
} from "./familyGraphSpatialGrid";

export type FamilyGraphViewportSize = {
  width: number;
  height: number;
};

export type FamilyGraphCameraSnapshot = {
  centerX: number;
  centerY: number;
  scale: number;
};

export const rectsIntersect = (
  first: FamilyGraphSpatialRect,
  second: FamilyGraphSpatialRect,
): boolean => !(
  first.right < second.left
  || first.left > second.right
  || first.bottom < second.top
  || first.top > second.bottom
);

export const getFamilyGraphNodeRect = ({
  person,
  nodeSlotWidth,
  nodeCardWidth,
  nodeCardHeight,
  padding = 0,
}: {
  person: Pick<FamilyGraphPrototypePerson, "x" | "y">;
  nodeSlotWidth: number;
  nodeCardWidth: number;
  nodeCardHeight: number;
  padding?: number;
}): FamilyGraphSpatialRect => {
  const left = person.x + (nodeSlotWidth - nodeCardWidth) / 2;
  return {
    left: left - padding,
    top: person.y - padding,
    right: left + nodeCardWidth + padding,
    bottom: person.y + nodeCardHeight + padding,
  };
};

export const getPolylineBounds = (
  points: FamilyGraphSpatialPoint[],
  padding = 0,
): FamilyGraphSpatialRect => {
  if (!points.length) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }
  return {
    left: left - padding,
    top: top - padding,
    right: right + padding,
    bottom: bottom + padding,
  };
};

export const getFamilyGraphViewportRect = ({
  camera,
  viewport,
  canvasWidth,
  canvasHeight,
  overscanScreens,
}: {
  camera: FamilyGraphCameraSnapshot;
  viewport: FamilyGraphViewportSize;
  canvasWidth: number;
  canvasHeight: number;
  overscanScreens: number;
}): FamilyGraphSpatialRect => {
  const scale = Math.max(0.02, camera.scale || 1);
  const safeWidth = Math.max(1, viewport.width);
  const safeHeight = Math.max(1, viewport.height);
  const overscan = Math.max(0, overscanScreens);
  const halfVisibleWidth = safeWidth / (2 * scale);
  const halfVisibleHeight = safeHeight / (2 * scale);
  const halfWidth = halfVisibleWidth + (safeWidth * overscan) / scale;
  const halfHeight = halfVisibleHeight + (safeHeight * overscan) / scale;

  const clampX = (value: number) => Math.max(0, Math.min(canvasWidth, value));
  const clampY = (value: number) => Math.max(0, Math.min(canvasHeight, value));
  const left = clampX(camera.centerX - halfWidth);
  const right = clampX(camera.centerX + halfWidth);
  const top = clampY(camera.centerY - halfHeight);
  const bottom = clampY(camera.centerY + halfHeight);

  return {
    left: Math.min(left, right),
    top: Math.min(top, bottom),
    right: Math.max(left, right),
    bottom: Math.max(top, bottom),
  };
};

/**
 * Full-tree progressive order.
 *
 * The full graph remains the source of truth; this only chooses the order in
 * which visual branches are mounted. People closest to the current focus are
 * mounted first, then increasingly distant branches, then disconnected
 * components. No relationship is inferred or persisted here.
 */
export const buildProgressiveFamilyGraphOrder = (
  people: FamilyGraphPrototypePerson[],
  connections: FamilyGraphPrototypeConnection[],
  focusPersonId?: string | null,
): FamilyGraphPrototypePerson[] => {
  if (people.length <= 1) return people;

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const adjacency = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!peopleById.has(a) || !peopleById.has(b)) return;
    const items = adjacency.get(a) ?? new Set<string>();
    items.add(b);
    adjacency.set(a, items);
  };
  for (const connection of connections) {
    add(connection.fromId, connection.toId);
    add(connection.toId, connection.fromId);
  }

  const seedId = focusPersonId && peopleById.has(focusPersonId)
    ? focusPersonId
    : people[0].id;
  const distance = new Map<string, number>([[seedId, 0]]);
  const queue = [seedId];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const nextDistance = (distance.get(current) ?? 0) + 1;
    const neighbors = [...(adjacency.get(current) ?? [])].sort();
    for (const neighbor of neighbors) {
      if (distance.has(neighbor)) continue;
      distance.set(neighbor, nextDistance);
      queue.push(neighbor);
    }
  }

  return [...people].sort((a, b) => {
    const ad = distance.get(a.id) ?? Number.POSITIVE_INFINITY;
    const bd = distance.get(b.id) ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    if (a.generation !== b.generation) return a.generation - b.generation;
    return a.displayName.localeCompare(b.displayName, "vi") || a.id.localeCompare(b.id);
  });
};
