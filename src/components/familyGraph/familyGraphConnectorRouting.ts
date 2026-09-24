import type {
  FamilyGraphPrototypeConnection,
  FamilyGraphPrototypePerson,
} from "./familyGraphPrototypeData";
import {
  FamilyGraphSpatialGrid,
  expandSpatialRect,
  getSpatialSegmentBounds,
  type FamilyGraphSpatialRect,
  type FamilyGraphSpatialSegment,
} from "./familyGraphSpatialGrid";

export type FamilyGraphConnectorPort = "top" | "bottom" | "left" | "right";

export type FamilyGraphConnectorPoint = {
  x: number;
  y: number;
};

/** Return the immutable midpoint port for one visual node edge. */
export const getFamilyGraphConnectorPort = ({
  person,
  port,
  nodeSlotWidth,
  nodeCardWidth,
  nodeCardHeight,
  gap = 0,
}: {
  person: Pick<FamilyGraphPrototypePerson, "x" | "y">;
  port: FamilyGraphConnectorPort;
  nodeSlotWidth: number;
  nodeCardWidth: number;
  nodeCardHeight: number;
  gap?: number;
}): FamilyGraphConnectorPoint => {
  const centerX = person.x + nodeSlotWidth / 2;
  const left = person.x + (nodeSlotWidth - nodeCardWidth) / 2;
  const right = left + nodeCardWidth;
  const top = person.y;
  const bottom = top + nodeCardHeight;
  const centerY = top + nodeCardHeight / 2;

  switch (port) {
    case "top":
      return { x: centerX, y: top - gap };
    case "bottom":
      return { x: centerX, y: bottom + gap };
    case "left":
      return { x: left - gap, y: centerY };
    case "right":
      return { x: right + gap, y: centerY };
  }
};

export type FamilyGraphConnectorRoutingPlan = {
  familyKeyByChildId: Map<string, string>;
  laneOffsetByChildId: Map<string, number>;
  laneOffsetByConnectionId: Map<string, number>;
  directVerticalConnectionIds: Set<string>;
  sideAnchorConnectionIds: Set<string>;
  routeByConnectionId: Map<string, FamilyGraphConnectorRoute>;
  bottomOwnerFamilyKeyByParentId: Map<string, string>;
  portOccupancy: Map<string, string>;
};

type FamilyRouteGroup = {
  key: string;
  familyKey: string;
  corridorKey: string;
  left: number;
  right: number;
  connectionIds: string[];
  childIds: string[];
  maxHorizontalDistance: number;
  laneIndex?: number;
};

type RouteCandidate = {
  startPort: FamilyGraphConnectorPort;
  strategy: FamilyGraphConnectorRouteStrategy;
  points: FamilyGraphConnectorPoint[];
  baseScore: number;
};

type CandidateEvaluation = {
  score: number;
  crossingCount: number;
  overlapCount: number;
  invalid: boolean;
};

const centeredLaneOffset = (laneIndex: number, laneGap: number) => {
  if (laneIndex === 0) return 0;
  const magnitude = Math.ceil(laneIndex / 2) * laneGap;
  return laneIndex % 2 === 1 ? -magnitude : magnitude;
};

const almostEqual = (a: number, b: number, epsilon = 0.75) => Math.abs(a - b) <= epsilon;

const nodeRect = ({
  person,
  nodeSlotWidth,
  nodeCardWidth,
  nodeCardHeight,
}: {
  person: Pick<FamilyGraphPrototypePerson, "x" | "y">;
  nodeSlotWidth: number;
  nodeCardWidth: number;
  nodeCardHeight: number;
}): FamilyGraphSpatialRect => {
  const left = person.x + (nodeSlotWidth - nodeCardWidth) / 2;
  return {
    left,
    top: person.y,
    right: left + nodeCardWidth,
    bottom: person.y + nodeCardHeight,
  };
};

const orientation = (a: FamilyGraphConnectorPoint, b: FamilyGraphConnectorPoint, c: FamilyGraphConnectorPoint) => {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 0.001) return 0;
  return value > 0 ? 1 : 2;
};

const onSegment = (a: FamilyGraphConnectorPoint, b: FamilyGraphConnectorPoint, c: FamilyGraphConnectorPoint) =>
  b.x <= Math.max(a.x, c.x) + 0.001
  && b.x + 0.001 >= Math.min(a.x, c.x)
  && b.y <= Math.max(a.y, c.y) + 0.001
  && b.y + 0.001 >= Math.min(a.y, c.y);

const segmentsIntersect = (first: FamilyGraphSpatialSegment, second: FamilyGraphSpatialSegment) => {
  const o1 = orientation(first.a, first.b, second.a);
  const o2 = orientation(first.a, first.b, second.b);
  const o3 = orientation(second.a, second.b, first.a);
  const o4 = orientation(second.a, second.b, first.b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(first.a, second.a, first.b)) return true;
  if (o2 === 0 && onSegment(first.a, second.b, first.b)) return true;
  if (o3 === 0 && onSegment(second.a, first.a, second.b)) return true;
  if (o4 === 0 && onSegment(second.a, first.b, second.b)) return true;
  return false;
};

const segmentIntersectsRect = (segment: FamilyGraphSpatialSegment, rect: FamilyGraphSpatialRect) => {
  const bounds = getSpatialSegmentBounds(segment);
  if (bounds.right < rect.left || bounds.left > rect.right || bounds.bottom < rect.top || bounds.top > rect.bottom) {
    return false;
  }
  const pointInside = (point: FamilyGraphConnectorPoint) =>
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
  if (pointInside(segment.a) || pointInside(segment.b)) return true;
  const corners = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ];
  for (let index = 0; index < 4; index += 1) {
    if (segmentsIntersect(segment, { a: corners[index], b: corners[(index + 1) % 4] })) return true;
  }
  return false;
};

const sameAxisOverlap = (first: FamilyGraphSpatialSegment, second: FamilyGraphSpatialSegment) => {
  const firstHorizontal = almostEqual(first.a.y, first.b.y);
  const secondHorizontal = almostEqual(second.a.y, second.b.y);
  const firstVertical = almostEqual(first.a.x, first.b.x);
  const secondVertical = almostEqual(second.a.x, second.b.x);
  if (firstHorizontal && secondHorizontal && almostEqual(first.a.y, second.a.y)) {
    return Math.min(Math.max(first.a.x, first.b.x), Math.max(second.a.x, second.b.x))
      - Math.max(Math.min(first.a.x, first.b.x), Math.min(second.a.x, second.b.x));
  }
  if (firstVertical && secondVertical && almostEqual(first.a.x, second.a.x)) {
    return Math.min(Math.max(first.a.y, first.b.y), Math.max(second.a.y, second.b.y))
      - Math.max(Math.min(first.a.y, first.b.y), Math.min(second.a.y, second.b.y));
  }
  return 0;
};

const simplifyPolyline = (points: FamilyGraphConnectorPoint[]) => {
  const deduped: FamilyGraphConnectorPoint[] = [];
  for (const point of points) {
    const previous = deduped[deduped.length - 1];
    if (!previous || !almostEqual(previous.x, point.x, 0.01) || !almostEqual(previous.y, point.y, 0.01)) {
      deduped.push(point);
    }
  }
  if (deduped.length <= 2) return deduped;
  const simplified: FamilyGraphConnectorPoint[] = [deduped[0]];
  for (let index = 1; index < deduped.length - 1; index += 1) {
    const previous = simplified[simplified.length - 1];
    const current = deduped[index];
    const next = deduped[index + 1];
    const sameVertical = almostEqual(previous.x, current.x) && almostEqual(current.x, next.x);
    const sameHorizontal = almostEqual(previous.y, current.y) && almostEqual(current.y, next.y);
    if (!sameVertical && !sameHorizontal) simplified.push(current);
  }
  simplified.push(deduped[deduped.length - 1]);
  return simplified;
};

const polylineSegments = (points: FamilyGraphConnectorPoint[]) => {
  const segments: FamilyGraphSpatialSegment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    segments.push({ a: points[index - 1], b: points[index] });
  }
  return segments;
};

const polylineLength = (points: FamilyGraphConnectorPoint[]) =>
  polylineSegments(points).reduce((sum, segment) => sum + Math.hypot(segment.b.x - segment.a.x, segment.b.y - segment.a.y), 0);

const occupancyKey = (personId: string, port: FamilyGraphConnectorPort) => `${personId}:${port}`;

const evaluateCandidate = ({
  candidate,
  grid,
  familyKey,
  parentId,
  childId,
  canvasWidth,
  nodePadding,
}: {
  candidate: RouteCandidate;
  grid: FamilyGraphSpatialGrid;
  familyKey: string;
  parentId: string;
  childId: string;
  canvasWidth: number;
  nodePadding: number;
}): CandidateEvaluation => {
  const points = simplifyPolyline(candidate.points);
  if (points.some((point) => point.x < 0 || point.x > canvasWidth)) {
    return { score: Number.POSITIVE_INFINITY, crossingCount: 0, overlapCount: 0, invalid: true };
  }

  let crossingCount = 0;
  let overlapCount = 0;
  let score = candidate.baseScore + polylineLength(points) * 0.07 + Math.max(0, points.length - 2) * 12;

  for (const segment of polylineSegments(points)) {
    for (const entry of grid.querySegment(segment, nodePadding)) {
      if (entry.kind === "node") {
        if (entry.id === parentId || entry.id === childId) continue;
        if (segmentIntersectsRect(segment, entry.rect)) {
          return { score: Number.POSITIVE_INFINITY, crossingCount, overlapCount, invalid: true };
        }
        continue;
      }

      if (!segmentsIntersect(segment, entry.segment)) continue;
      const overlap = sameAxisOverlap(segment, entry.segment);
      const sameFamily = entry.familyKey === familyKey;
      if (overlap > 1.5) {
        overlapCount += 1;
        if (!sameFamily) {
          return { score: Number.POSITIVE_INFINITY, crossingCount, overlapCount, invalid: true };
        }
        score -= Math.min(24, overlap * 0.08);
        continue;
      }

      if (!sameFamily) {
        crossingCount += 1;
        score += 1400;
      } else {
        score += 4;
      }
    }
  }

  return { score, crossingCount, overlapCount, invalid: false };
};

const registerPolyline = ({
  grid,
  routeId,
  familyKey,
  points,
}: {
  grid: FamilyGraphSpatialGrid;
  routeId: string;
  familyKey: string;
  points: FamilyGraphConnectorPoint[];
}) => {
  polylineSegments(points).forEach((segment, index) => {
    grid.insertConnector(`${routeId}:${index}`, familyKey, segment);
  });
};

/**
 * Build a render-only routing plan from explicit graph truth.
 *
 * Rules:
 * - exact parent set => semantic family group;
 * - bottom-center can be owned/shared only by the same family group;
 * - otherwise route from left/right center and score both sides;
 * - routes are checked against a spatial grid containing nodes + already routed
 *   connector segments;
 * - anchors never move away from the four immutable edge midpoints.
 */
export const buildFamilyGraphConnectorRoutingPlan = ({
  people,
  connections,
  nodeWidth,
  nodeCardWidth = nodeWidth,
  nodeCardHeight = 124,
  laneGap = 10,
  canvasWidth: requestedCanvasWidth,
  gridCellSize,
}: {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  nodeWidth: number;
  nodeCardWidth?: number;
  nodeCardHeight?: number;
  laneGap?: number;
  canvasWidth?: number;
  gridCellSize?: number;
}): FamilyGraphConnectorRoutingPlan => {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const connectionsById = new Map(connections.map((connection) => [connection.id, connection]));
  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, Set<string>>();

  for (const connection of connections) {
    if (connection.type !== "parent_child") continue;
    if (!peopleById.has(connection.fromId) || !peopleById.has(connection.toId)) continue;
    const parents = parentsByChild.get(connection.toId) ?? [];
    parents.push(connection.fromId);
    parentsByChild.set(connection.toId, parents);
    const children = childrenByParent.get(connection.fromId) ?? new Set<string>();
    children.add(connection.toId);
    childrenByParent.set(connection.fromId, children);
  }

  const familyKeyByChildId = new Map<string, string>();
  for (const [childId, parentIds] of parentsByChild) {
    const canonicalParents = [...new Set(parentIds)].sort();
    familyKeyByChildId.set(childId, `parents:${canonicalParents.join("|")}`);
  }

  // Keep the old deterministic lane metadata for couple/shared-child rendering.
  const groups = new Map<string, FamilyRouteGroup>();
  for (const connection of connections) {
    if (connection.type !== "parent_child") continue;
    const parent = peopleById.get(connection.fromId);
    const child = peopleById.get(connection.toId);
    if (!parent || !child) continue;
    const familyKey = familyKeyByChildId.get(child.id) ?? `parents:${parent.id}`;
    const corridorKey = `${Math.round(parent.y)}>${Math.round(child.y)}`;
    const key = `${corridorKey}::${familyKey}`;
    const parentCenter = parent.x + nodeWidth / 2;
    const childCenter = child.x + nodeWidth / 2;
    const left = Math.min(parentCenter, childCenter);
    const right = Math.max(parentCenter, childCenter);
    const existing = groups.get(key);
    if (existing) {
      existing.left = Math.min(existing.left, left);
      existing.right = Math.max(existing.right, right);
      existing.connectionIds.push(connection.id);
      if (!existing.childIds.includes(child.id)) existing.childIds.push(child.id);
      existing.maxHorizontalDistance = Math.max(existing.maxHorizontalDistance, Math.abs(childCenter - parentCenter));
    } else {
      groups.set(key, {
        key,
        familyKey,
        corridorKey,
        left,
        right,
        connectionIds: [connection.id],
        childIds: [child.id],
        maxHorizontalDistance: Math.abs(childCenter - parentCenter),
      });
    }
  }

  const groupsByCorridor = new Map<string, FamilyRouteGroup[]>();
  for (const group of groups.values()) {
    const corridor = groupsByCorridor.get(group.corridorKey) ?? [];
    corridor.push(group);
    groupsByCorridor.set(group.corridorKey, corridor);
  }
  const clearance = Math.max(12, nodeCardWidth * 0.18);
  for (const corridorGroups of groupsByCorridor.values()) {
    corridorGroups.sort((a, b) => a.left - b.left || a.right - b.right || a.familyKey.localeCompare(b.familyKey));
    const laneRightEdges: number[] = [];
    for (const group of corridorGroups) {
      let laneIndex = 0;
      while (laneIndex < laneRightEdges.length && laneRightEdges[laneIndex] + clearance >= group.left) laneIndex += 1;
      if (laneIndex === laneRightEdges.length) laneRightEdges.push(group.right);
      else laneRightEdges[laneIndex] = group.right;
      group.laneIndex = laneIndex;
    }
  }

  const laneOffsetByChildId = new Map<string, number>();
  const laneOffsetByConnectionId = new Map<string, number>();
  for (const group of groups.values()) {
    const laneOffset = centeredLaneOffset(group.laneIndex ?? 0, laneGap);
    group.childIds.forEach((childId) => laneOffsetByChildId.set(childId, laneOffset));
    group.connectionIds.forEach((connectionId) => laneOffsetByConnectionId.set(connectionId, laneOffset));
  }

  const canvasWidth = requestedCanvasWidth
    ?? Math.max(320, ...people.map((person) => person.x + nodeWidth + 48));
  const cellSize = gridCellSize ?? Math.max(72, nodeWidth);
  const grid = new FamilyGraphSpatialGrid(cellSize);
  const nodePadding = Math.max(5, nodeCardWidth * 0.045);
  for (const person of people) {
    grid.insertNode(
      person.id,
      expandSpatialRect(nodeRect({ person, nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight }), nodePadding),
    );
  }

  // Resolve partner unions exactly as the renderer does and reserve their
  // facing side ports + visual segments before single-parent routing.
  const coveredSingleEdges = new Set<string>();
  const portOccupancy = new Map<string, string>();
  for (const connection of connections) {
    if (connection.type !== "partner") continue;
    const partnerA = peopleById.get(connection.fromId);
    const partnerB = peopleById.get(connection.toId);
    if (!partnerA || !partnerB) continue;
    const aCenter = partnerA.x + nodeWidth / 2;
    const bCenter = partnerB.x + nodeWidth / 2;
    const leftPartner = aCenter <= bCenter ? partnerA : partnerB;
    const rightPartner = aCenter <= bCenter ? partnerB : partnerA;
    const partnerFamilyKey = `partner:${[partnerA.id, partnerB.id].sort().join("|")}`;
    portOccupancy.set(occupancyKey(leftPartner.id, "right"), partnerFamilyKey);
    portOccupancy.set(occupancyKey(rightPartner.id, "left"), partnerFamilyKey);
    const leftPort = getFamilyGraphConnectorPort({
      person: leftPartner, port: "right", nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight,
    });
    const rightPort = getFamilyGraphConnectorPort({
      person: rightPartner, port: "left", nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight,
    });
    registerPolyline({ grid, routeId: `${connection.id}:partner`, familyKey: partnerFamilyKey, points: [leftPort, rightPort] });

    const childrenA = childrenByParent.get(partnerA.id) ?? new Set<string>();
    const childrenB = childrenByParent.get(partnerB.id) ?? new Set<string>();
    const sharedChildIds = [...childrenA].filter((childId) => childrenB.has(childId));
    if (sharedChildIds.length === 0) continue;

    const partnerY = (leftPort.y + rightPort.y) / 2;
    const unionX = (aCenter + bCenter) / 2;
    const branchStartY = Math.max(
      getFamilyGraphConnectorPort({ person: partnerA, port: "bottom", nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight }).y,
      getFamilyGraphConnectorPort({ person: partnerB, port: "bottom", nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight }).y,
    );
    registerPolyline({
      grid,
      routeId: `${connection.id}:union-stem`,
      familyKey: partnerFamilyKey,
      points: [{ x: unionX, y: partnerY + 12 }, { x: unionX, y: branchStartY }],
    });

    for (const childId of sharedChildIds) {
      const child = peopleById.get(childId);
      if (!child) continue;
      coveredSingleEdges.add(`${partnerA.id}->${childId}`);
      coveredSingleEdges.add(`${partnerB.id}->${childId}`);
      const childTop = getFamilyGraphConnectorPort({
        person: child, port: "top", nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight,
      });
      const familyKey = familyKeyByChildId.get(childId) ?? partnerFamilyKey;
      const laneOffset = laneOffsetByChildId.get(childId) ?? 0;
      const turnY = Math.max(branchStartY + 8, Math.min(childTop.y - 8, (branchStartY + childTop.y) / 2 + laneOffset));
      registerPolyline({
        grid,
        routeId: `${connection.id}:shared:${childId}`,
        familyKey,
        points: simplifyPolyline([
          { x: unionX, y: branchStartY },
          { x: unionX, y: turnY },
          { x: childTop.x, y: turnY },
          childTop,
        ]),
      });
    }
  }

  const singleConnections = connections
    .filter((connection) => connection.type === "parent_child")
    .filter((connection) => !coveredSingleEdges.has(`${connection.fromId}->${connection.toId}`))
    .filter((connection) => peopleById.has(connection.fromId) && peopleById.has(connection.toId));

  // Bottom-center is semantic occupancy, not a generic shared socket. For each
  // parent choose the family group whose child branch is most naturally below.
  const groupScoreByParent = new Map<string, Map<string, number>>();
  for (const connection of singleConnections) {
    const parent = peopleById.get(connection.fromId)!;
    const child = peopleById.get(connection.toId)!;
    const familyKey = familyKeyByChildId.get(child.id) ?? `parents:${parent.id}`;
    const distance = Math.abs((parent.x + nodeWidth / 2) - (child.x + nodeWidth / 2));
    const scores = groupScoreByParent.get(parent.id) ?? new Map<string, number>();
    scores.set(familyKey, Math.min(scores.get(familyKey) ?? Number.POSITIVE_INFINITY, distance));
    groupScoreByParent.set(parent.id, scores);
  }

  const bottomOwnerFamilyKeyByParentId = new Map<string, string>();
  const bottomLateralLimit = Math.max(20, nodeCardWidth * 0.30);
  for (const [parentId, scoreMap] of groupScoreByParent) {
    const best = [...scoreMap.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
    if (!best || best[1] > bottomLateralLimit) continue;
    bottomOwnerFamilyKeyByParentId.set(parentId, best[0]);
    portOccupancy.set(occupancyKey(parentId, "bottom"), best[0]);
  }

  // Route the bottom-owner groups first so later family groups see those lines
  // in the spatial grid and cannot accidentally merge/cross them.
  singleConnections.sort((a, b) => {
    const parentA = peopleById.get(a.fromId)!;
    const parentB = peopleById.get(b.fromId)!;
    const childA = peopleById.get(a.toId)!;
    const childB = peopleById.get(b.toId)!;
    const familyA = familyKeyByChildId.get(childA.id) ?? `parents:${parentA.id}`;
    const familyB = familyKeyByChildId.get(childB.id) ?? `parents:${parentB.id}`;
    const ownerA = bottomOwnerFamilyKeyByParentId.get(parentA.id) === familyA ? 0 : 1;
    const ownerB = bottomOwnerFamilyKeyByParentId.get(parentB.id) === familyB ? 0 : 1;
    return ownerA - ownerB
      || parentA.y - parentB.y
      || childA.y - childB.y
      || parentA.x - parentB.x
      || childA.x - childB.x
      || a.id.localeCompare(b.id);
  });

  const routeByConnectionId = new Map<string, FamilyGraphConnectorRoute>();
  const directVerticalConnectionIds = new Set<string>();
  const sideAnchorConnectionIds = new Set<string>();
  const directAxisTolerance = 1.5;
  const sideLead = Math.max(16, nodeCardWidth * 0.16);
  const sideLaneSteps = [0, 22, 44, 66];
  const approachOffsets = [14, 28, 42];

  for (const connection of singleConnections) {
    const parent = peopleById.get(connection.fromId)!;
    const child = peopleById.get(connection.toId)!;
    const familyKey = familyKeyByChildId.get(child.id) ?? `parents:${parent.id}`;
    const parentBottom = getFamilyGraphConnectorPort({
      person: parent, port: "bottom", nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight,
    });
    const childTop = getFamilyGraphConnectorPort({
      person: child, port: "top", nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight,
    });
    const deltaX = childTop.x - parentBottom.x;
    const verticalGap = childTop.y - parentBottom.y;
    const bottomOwner = bottomOwnerFamilyKeyByParentId.get(parent.id) === familyKey;
    const candidates: RouteCandidate[] = [];

    if (bottomOwner && verticalGap > 4) {
      if (Math.abs(deltaX) <= directAxisTolerance) {
        candidates.push({
          startPort: "bottom",
          strategy: "bottom-direct",
          points: [parentBottom, { x: parentBottom.x, y: childTop.y }],
          baseScore: -180,
        });
      } else if (Math.abs(deltaX) <= bottomLateralLimit) {
        const baseTurn = parentBottom.y + verticalGap * 0.48;
        const laneOffset = laneOffsetByConnectionId.get(connection.id) ?? 0;
        for (const adjustment of [laneOffset, laneOffset - 12, laneOffset + 12]) {
          const turnY = Math.max(parentBottom.y + 12, Math.min(childTop.y - 12, baseTurn + adjustment));
          candidates.push({
            startPort: "bottom",
            strategy: "bottom-step",
            points: [
              parentBottom,
              { x: parentBottom.x, y: turnY },
              { x: childTop.x, y: turnY },
              childTop,
            ],
            baseScore: -72,
          });
        }
      }
    }

    for (const side of ["left", "right"] as const) {
      const occupiedBy = portOccupancy.get(occupancyKey(parent.id, side));
      if (occupiedBy && occupiedBy !== familyKey) continue;
      const sidePort = getFamilyGraphConnectorPort({
        person: parent, port: side, nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight,
      });
      const direction = side === "right" ? 1 : -1;
      const directionPenalty = deltaX === 0
        ? 12
        : Math.sign(deltaX) === direction ? -24 : 74;
      for (const laneStep of sideLaneSteps) {
        const corridorX = sidePort.x + direction * (sideLead + laneStep);
        for (const approachOffset of approachOffsets) {
          const approachY = Math.max(sidePort.y + 18, childTop.y - approachOffset);
          if (approachY >= childTop.y - 2) continue;
          candidates.push({
            startPort: side,
            strategy: side === "left" ? "side-left" : "side-right",
            points: [
              sidePort,
              { x: corridorX, y: sidePort.y },
              { x: corridorX, y: approachY },
              { x: childTop.x, y: approachY },
              childTop,
            ],
            baseScore: 28 + directionPenalty + laneStep * 0.14 + approachOffset * 0.04,
          });
        }
      }
    }

    let best: { candidate: RouteCandidate; evaluation: CandidateEvaluation } | null = null;
    for (const candidate of candidates) {
      const points = simplifyPolyline(candidate.points);
      const normalizedCandidate = { ...candidate, points };
      const evaluation = evaluateCandidate({
        candidate: normalizedCandidate,
        grid,
        familyKey,
        parentId: parent.id,
        childId: child.id,
        canvasWidth,
        nodePadding,
      });
      if (evaluation.invalid) continue;
      if (!best || evaluation.score < best.evaluation.score) best = { candidate: normalizedCandidate, evaluation };
    }

    // Emergency fallback: preserve truth/center ports even in an extremely
    // crowded graph. It may cross an existing connector, but never moves an
    // anchor or cuts through another node intentionally.
    if (!best) {
      const preferredSide = deltaX >= 0 ? "right" : "left";
      const sidePort = getFamilyGraphConnectorPort({
        person: parent, port: preferredSide, nodeSlotWidth: nodeWidth, nodeCardWidth, nodeCardHeight,
      });
      const direction = preferredSide === "right" ? 1 : -1;
      const corridorX = Math.max(2, Math.min(canvasWidth - 2, sidePort.x + direction * (sideLead + 66)));
      const approachY = Math.max(sidePort.y + 18, childTop.y - 28);
      const candidate: RouteCandidate = {
        startPort: preferredSide,
        strategy: "fallback",
        points: simplifyPolyline([
          sidePort,
          { x: corridorX, y: sidePort.y },
          { x: corridorX, y: approachY },
          { x: childTop.x, y: approachY },
          childTop,
        ]),
        baseScore: 9999,
      };
      best = {
        candidate,
        evaluation: { score: 9999 + polylineLength(candidate.points), crossingCount: 0, overlapCount: 0, invalid: false },
      };
    }

    const route: FamilyGraphConnectorRoute = {
      connectionId: connection.id,
      familyKey,
      startPort: best.candidate.startPort,
      strategy: best.candidate.strategy,
      points: best.candidate.points,
      score: best.evaluation.score,
      crossingCount: best.evaluation.crossingCount,
      overlapCount: best.evaluation.overlapCount,
    };
    routeByConnectionId.set(connection.id, route);
    if (route.strategy === "bottom-direct") directVerticalConnectionIds.add(connection.id);
    if (route.startPort === "left" || route.startPort === "right") sideAnchorConnectionIds.add(connection.id);
    if (!portOccupancy.has(occupancyKey(parent.id, route.startPort))) {
      portOccupancy.set(occupancyKey(parent.id, route.startPort), familyKey);
    }
    registerPolyline({ grid, routeId: connection.id, familyKey, points: route.points });
  }

  // Keep old side/direct flags meaningful for any legacy renderer path.
  for (const group of groups.values()) {
    for (const connectionId of group.connectionIds) {
      if (routeByConnectionId.has(connectionId)) continue;
      const connection = connectionsById.get(connectionId);
      if (!connection) continue;
      const parent = peopleById.get(connection.fromId);
      const child = peopleById.get(connection.toId);
      if (!parent || !child) continue;
      const horizontalDistance = Math.abs((child.x + nodeWidth / 2) - (parent.x + nodeWidth / 2));
      if (horizontalDistance <= directAxisTolerance) directVerticalConnectionIds.add(connectionId);
    }
  }

  return {
    familyKeyByChildId,
    laneOffsetByChildId,
    laneOffsetByConnectionId,
    directVerticalConnectionIds,
    sideAnchorConnectionIds,
    routeByConnectionId,
    bottomOwnerFamilyKeyByParentId,
    portOccupancy,
  };
};
