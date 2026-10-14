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

export const FAMILY_GRAPH_GEOMETRY_VERSION = 1;
export const FAMILY_GRAPH_NODE_CARD_WIDTH = 112;
export const FAMILY_GRAPH_NODE_CARD_HEIGHT = 124;
export const FAMILY_GRAPH_CONNECTOR_LANE_GAP = 11;

export type FamilyGraphPartnerUnitGeometry = {
  id: string;
  partnerAId: string;
  partnerBId: string;
  sharedChildIds: string[];
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
  for (const connection of layout.connections) {
    if (connection.type !== "parent_child") continue;
    const children = childrenByParent.get(connection.fromId) ?? new Set<string>();
    children.add(connection.toId);
    childrenByParent.set(connection.fromId, children);
  }

  const coveredParentChild = new Set<string>();
  const partnerUnits: FamilyGraphPartnerUnitGeometry[] = [];
  for (const connection of layout.connections) {
    if (connection.type !== "partner") continue;
    if (!peopleById.has(connection.fromId) || !peopleById.has(connection.toId)) continue;
    const childrenA = childrenByParent.get(connection.fromId) ?? new Set<string>();
    const childrenB = childrenByParent.get(connection.toId) ?? new Set<string>();
    const sharedChildIds = [...childrenA]
      .filter((childId) => childrenB.has(childId) && peopleById.has(childId))
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
    });
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
