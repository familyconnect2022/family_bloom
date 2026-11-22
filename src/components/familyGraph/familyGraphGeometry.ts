import { APP_CONFIG_DEFAULTS } from "../../constants/appConfiguration";
import {
  buildFamilyGraphConnectorRoutingPlan,
  type FamilyGraphConnectorRoutingPlan,
} from "./familyGraphConnectorRouting";
import type { FamilyGraphLayout } from "./familyGraphSceneBuilder";
import { FAMILY_GRAPH_CANVAS } from "./familyGraphPrototypeData";
import {
  getFamilyGraphBshGeometry,
  putFamilyGraphBshGeometry,
} from "./familyGraphBshCache";

export const FAMILY_GRAPH_GEOMETRY_VERSION = 5;
export const FAMILY_GRAPH_NODE_CARD_WIDTH = 132;
export const FAMILY_GRAPH_NODE_CARD_HEIGHT = 176;
export const FAMILY_GRAPH_CONNECTOR_LANE_GAP = 11;

export type FamilyGraphPartnerUnitGeometry = {
  id: string;
  partnerAId: string;
  partnerBId: string;
  /** Children with BOTH verified parent-child edges. */
  sharedChildIds: string[];
  /** Sole-parent children displayed with this verified partner group only; never fake parents. */
  privateChildren: Array<{ childId: string; parentId: string }>;
  partnerStatus?: "married" | "partner" | "separated" | "divorced" | "widowed" | null;
};

export type FamilyGraphSingleParentGeometry = {
  id: string;
  parentId: string;
  childId: string;
};

/**
 * BSH Geometry stage.
 *
 * All connector classification and route planning is completed before React
 * renders. Camera movement is therefore never allowed to change line geometry.
 */
export type FamilyGraphGeometry = {
  geometryVersion: number;
  geometryKey: string;
  layoutKey: string;
  partnerUnits: FamilyGraphPartnerUnitGeometry[];
  singleParentLinks: FamilyGraphSingleParentGeometry[];
  routingPlan: FamilyGraphConnectorRoutingPlan;
};

export const buildFamilyGraphGeometry = (
  layout: FamilyGraphLayout,
): FamilyGraphGeometry => {
  const geometryKey = `geometry${FAMILY_GRAPH_GEOMETRY_VERSION}:${layout.layoutKey}`;
  const cached = getFamilyGraphBshGeometry<FamilyGraphGeometry>(geometryKey);
  if (cached) return cached;

  const peopleById = new Map(layout.people.map((person) => [person.id, person]));
  const childrenByParent = new Map<string, Set<string>>();
  const edgesByPair = new Map<string, typeof layout.connections[number]>();
  for (const connection of layout.connections) {
    if (connection.type !== "parent_child") continue;
    edgesByPair.set(`${connection.fromId}->${connection.toId}`, connection);
    // Step-parent links are social edges, not evidence of shared biological/adoptive parenthood.
    if (connection.subtype === "step") continue;
    const children = childrenByParent.get(connection.fromId) ?? new Set<string>();
    children.add(connection.toId);
    childrenByParent.set(connection.fromId, children);
  }

  const coveredParentChild = new Set<string>();
  const partnerUnits: FamilyGraphPartnerUnitGeometry[] = [];
  const parentEdgesByChild = new Map<string, typeof layout.connections>();
  for (const edge of layout.connections) {
    if (edge.type !== "parent_child" || edge.subtype === "step" || edge.subtype === "unknown" || edge.subtype == null) continue;
    const list = parentEdgesByChild.get(edge.toId) ?? [];
    list.push(edge);
    parentEdgesByChild.set(edge.toId, list);
  }
  for (const connection of layout.connections) {
    if (connection.type !== "partner") continue;
    if (!peopleById.has(connection.fromId) || !peopleById.has(connection.toId)) continue;
    const childrenA = childrenByParent.get(connection.fromId) ?? new Set<string>();
    const childrenB = childrenByParent.get(connection.toId) ?? new Set<string>();
    const sharedChildIds = [...childrenA]
      .filter((childId) => {
        if (!childrenB.has(childId) || !peopleById.has(childId)) return false;
        const left = edgesByPair.get(`${connection.fromId}->${childId}`);
        const right = edgesByPair.get(`${connection.toId}->${childId}`);
        // Missing or unknown subtype is not proof of a shared-child union.
        if (!left || !right || left.subtype == null || right.subtype == null) return false;
        if (left.subtype === "unknown" || right.subtype === "unknown") return false;
        return left.subtype === right.subtype;
      })
      .sort((a, b) => (peopleById.get(a)?.x ?? 0) - (peopleById.get(b)?.x ?? 0));
    for (const childId of sharedChildIds) {
      coveredParentChild.add(`${connection.fromId}->${childId}`);
      coveredParentChild.add(`${connection.toId}->${childId}`);
    }
    partnerUnits.push({
      id: connection.id,
      partnerAId: connection.fromId,
      partnerBId: connection.toId,
      sharedChildIds,
      privateChildren: [],
      partnerStatus: connection.partnerStatus ?? null,
    });
  }

  // Visual grouping like Web GRAPH-LINE-01. A lone biological/adoptive edge
  // may join exactly ONE recorded active partner family WITH a shared child.
  // It is still a sole-parent edge in Firestore, never an inferred second parent.
  for (const [childId, edges] of parentEdgesByChild) {
    if (edges.length !== 1) continue;
    const parentId = edges[0].fromId;
    const eligible = partnerUnits.filter((unit) =>
      unit.partnerStatus === "partner"
      && (unit.partnerAId === parentId || unit.partnerBId === parentId)
      && unit.sharedChildIds.length > 0
      && !unit.sharedChildIds.includes(childId)
      && peopleById.has(childId),
    );
    if (eligible.length !== 1) continue; // Ambiguous multiple partner groups: never guess.
    eligible[0].privateChildren.push({ childId, parentId });
    coveredParentChild.add(`${parentId}->${childId}`);
  }

  const singleParentLinks: FamilyGraphSingleParentGeometry[] = layout.connections
    .filter((connection) => connection.type === "parent_child")
    .filter((connection) => !coveredParentChild.has(`${connection.fromId}->${connection.toId}`))
    .filter((connection) => peopleById.has(connection.fromId) && peopleById.has(connection.toId))
    .map((connection) => ({
      id: connection.id,
      parentId: connection.fromId,
      childId: connection.toId,
    }));

  const routingPlan = buildFamilyGraphConnectorRoutingPlan({
    people: layout.people,
    connections: layout.connections,
    nodeWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
    nodeCardWidth: FAMILY_GRAPH_NODE_CARD_WIDTH,
    nodeCardHeight: FAMILY_GRAPH_NODE_CARD_HEIGHT,
    laneGap: FAMILY_GRAPH_CONNECTOR_LANE_GAP,
    canvasWidth: layout.canvasWidth,
    gridCellSize: APP_CONFIG_DEFAULTS.familyGraph.layout.connectorGridCellSize,
  });

  const geometry: FamilyGraphGeometry = {
    geometryVersion: FAMILY_GRAPH_GEOMETRY_VERSION,
    geometryKey,
    layoutKey: layout.layoutKey,
    partnerUnits,
    singleParentLinks,
    routingPlan,
  };
  putFamilyGraphBshGeometry(geometryKey, geometry);
  return geometry;
};
