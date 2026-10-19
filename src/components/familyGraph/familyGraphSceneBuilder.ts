import type { FamilyGraphSnapshot } from "../../types/familyGraph";
import { createFamilyGraphQueryEngine, type FamilyGraphQueryEngine } from "../../services/familyGraph/familyGraphQueryEngine";
import {
  adaptFamilyGraphSnapshot,
  refreshFamilyGraphVisualProfiles,
  type FamilyGraphVisualData,
} from "./familyGraphLiveAdapter";
import { FAMILY_GRAPH_CANVAS } from "./familyGraphPrototypeData";
import { buildFamilyGraphGeometry, type FamilyGraphGeometry } from "./familyGraphGeometry";
import {
  fingerprintFamilyGraphLayout,
  fingerprintFamilyGraphSnapshot,
} from "./familyGraphRevision";
import {
  getFamilyGraphBshLayout,
  getFamilyGraphBshModel,
  getFamilyGraphBshScene,
  putFamilyGraphBshLayout,
  putFamilyGraphBshModel,
  putFamilyGraphBshScene,
} from "./familyGraphBshCache";
import {
  getFamilyGraphFocusBshLayout,
  getFamilyGraphFocusBshModel,
  getFamilyGraphFocusBshScene,
  putFamilyGraphFocusBshLayout,
  putFamilyGraphFocusBshModel,
  putFamilyGraphFocusBshScene,
} from "./familyGraphFocusBshCache";

export const FAMILY_GRAPH_BSH_VERSION = 1;
export const FAMILY_GRAPH_SCENE_VERSION = 4;
export const FAMILY_GRAPH_LAYOUT_VERSION = 1;
export const FAMILY_GRAPH_FOCUS_ENTRY_SCALE = 0.95;
export const FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y = 0.42;

export type FamilyGraphSceneMode = "fullTree" | "focusBranch";

export type BuildFamilyGraphRenderSceneOptions = {
  mode: FamilyGraphSceneMode;
  focusPersonId?: string | null;
};


export type FamilyGraphBuildCancellation = {
  isCancelled: () => boolean;
};

const yieldFamilyGraphBuild = () => new Promise<void>((resolve) => {
  // BSH P2.11.3: intentionally yield back to the JS/native event loop between
  // expensive stages. Android Back / the header Back button must get a chance
  // to cancel an in-flight Focus build instead of waiting for the whole pipeline.
  setTimeout(resolve, 0);
});


const createFamilyGraphBuildCheckpoint = (
  cancellation?: FamilyGraphBuildCancellation,
  budgetMs = 5,
) => {
  let sliceStartedAt = Date.now();
  return async (force = false) => {
    if (cancellation?.isCancelled()) return false;
    if (!force && Date.now() - sliceStartedAt < budgetMs) return true;
    await yieldFamilyGraphBuild();
    sliceStartedAt = Date.now();
    return !(cancellation?.isCancelled() ?? false);
  };
};

/** Stage 1: topology only. No pixel coordinates live here. */
export type FamilyGraphModel = {
  bshVersion: number;
  modelKey: string;
  familyId: string;
  mode: FamilyGraphSceneMode;
  focusPersonId: string | null;
  personIds: string[];
  relationshipIds: string[];
  contextPersonIds: string[];
  truncated: boolean;
  requestedMaxPeople: number;
  topologyRevision: string;
};

/** Stage 2: all node positions are finalized before React renders anything. */
export type FamilyGraphLayout = FamilyGraphVisualData & {
  bshVersion: number;
  layoutVersion: number;
  layoutKey: string;
  layoutRevision: string;
  modelKey: string;
  bounds: { left: number; top: number; right: number; bottom: number };
};

export type FamilyGraphSceneCameraSpec = {
  canvasPoint: { x: number; y: number };
  viewportAnchor: { x: number; y: number };
  scale: number;
};

/** Stage 3: renderer-ready scene. React may cull it, but may not change topology/layout. */
export type FamilyGraphRenderScene = FamilyGraphVisualData & {
  bshVersion: number;
  sceneVersion: number;
  sceneKey: string;
  modelKey: string;
  layoutKey: string;
  geometryKey: string;
  geometry: FamilyGraphGeometry;
  mode: FamilyGraphSceneMode;
  focusPersonId: string | null;
  personIds: string[];
  contextPersonIds: string[];
  bootstrapPersonIds: string[];
  truncated: boolean;
  requestedMaxPeople: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  initialCamera: FamilyGraphSceneCameraSpec | null;
  topologyRevision: string;
  layoutRevision: string;
  visualRevision: string;
};

// P2.13 BSH hot revisit cache. The Firestore graph hook publishes immutable
// snapshot objects. Keeping renderer-ready scenes by snapshot identity lets a
// Focus View reopened against the exact same data return synchronously without
// recomputing fingerprints or walking Model/Layout/Geometry caches. WeakMap
// ownership means old snapshots disappear automatically and correctness still
// comes from snapshot replacement when any graph data changes.
const mainSnapshotSceneCache = new WeakMap<FamilyGraphSnapshot, Map<string, FamilyGraphRenderScene>>();
const focusSnapshotSceneCache = new WeakMap<FamilyGraphSnapshot, Map<string, FamilyGraphRenderScene>>();
const REVISION_SCENE_CACHE_LIMIT = 48;
const mainRevisionSceneCache = new Map<string, FamilyGraphRenderScene>();
const focusRevisionSceneCache = new Map<string, FamilyGraphRenderScene>();

const snapshotSceneCacheFor = (mode: FamilyGraphSceneMode) =>
  mode === "focusBranch" ? focusSnapshotSceneCache : mainSnapshotSceneCache;
const revisionSceneCacheFor = (mode: FamilyGraphSceneMode) =>
  mode === "focusBranch" ? focusRevisionSceneCache : mainRevisionSceneCache;

const snapshotSceneSlot = (options: BuildFamilyGraphRenderSceneOptions) =>
  `${options.mode}:${options.focusPersonId?.trim() || "none"}`;

/**
 * P2.16.2 zero-work hot revisit probe.
 *
 * This intentionally checks snapshot identity only: no snapshot fingerprint, no
 * topology walk and no LRU mutation happens on the user's press path. The graph
 * hook preserves the same immutable snapshot object while Firestore data is
 * unchanged, so an identity hit is both revision-safe and O(1). A changed graph
 * gets a new snapshot object and therefore cannot accidentally reuse stale pixels.
 */
export const peekFamilyGraphRenderSceneIdentity = (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
): FamilyGraphRenderScene | null =>
  snapshotSceneCacheFor(options.mode).get(snapshot)?.get(snapshotSceneSlot(options)) ?? null;

// Firestore may publish a new immutable snapshot object even when no graph value
// changed. WeakMap identity alone therefore made a second Focus open look cold.
// This key follows BSH correctness instead: exact graph revision + mode + focus.
const revisionSceneSlot = (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
) => `${FAMILY_GRAPH_SCENE_VERSION}:${fingerprintFamilyGraphSnapshot(snapshot)}:${snapshotSceneSlot(options)}`;

const touchRevisionScene = (mode: FamilyGraphSceneMode, key: string) => {
  const cache = revisionSceneCacheFor(mode);
  const value = cache.get(key) ?? null;
  if (!value) return null;
  cache.delete(key);
  cache.set(key, value);
  return value;
};

export const peekFamilyGraphRenderScene = (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
): FamilyGraphRenderScene | null => {
  const identityHit = snapshotSceneCacheFor(options.mode).get(snapshot)?.get(snapshotSceneSlot(options)) ?? null;
  if (identityHit) return identityHit;

  const revisionKey = revisionSceneSlot(snapshot, options);
  const revisionHit = touchRevisionScene(options.mode, revisionKey);
  if (!revisionHit) return null;

  // Rebind the hot revision scene to this new immutable snapshot object so every
  // later lookup in the same render cycle is O(1) by identity again.
  const snapshotCache = snapshotSceneCacheFor(options.mode);
  let bucket = snapshotCache.get(snapshot);
  if (!bucket) {
    bucket = new Map();
    snapshotCache.set(snapshot, bucket);
  }
  bucket.set(snapshotSceneSlot(options), revisionHit);
  return revisionHit;
};

const rememberFamilyGraphRenderScene = (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
  scene: FamilyGraphRenderScene | null,
) => {
  if (!scene) return scene;
  const snapshotCache = snapshotSceneCacheFor(options.mode);
  let bucket = snapshotCache.get(snapshot);
  if (!bucket) {
    bucket = new Map();
    snapshotCache.set(snapshot, bucket);
  }
  bucket.set(snapshotSceneSlot(options), scene);

  const revisionKey = revisionSceneSlot(snapshot, options);
  const revisionCache = revisionSceneCacheFor(options.mode);
  revisionCache.delete(revisionKey);
  revisionCache.set(revisionKey, scene);
  while (revisionCache.size > REVISION_SCENE_CACHE_LIMIT) {
    const oldest = revisionCache.keys().next();
    if (oldest.done) break;
    revisionCache.delete(oldest.value);
  }
  return scene;
};

const shortRevision = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const fingerprintFamilyGraphTopology = (snapshot: FamilyGraphSnapshot) => {
  const personIds = snapshot.persons.map((person) => person.id).sort().join("|");
  const relationships = snapshot.relationships
    .map((item) => `${item.id}:${item.type}:${item.personAId}:${item.personBId}`)
    .sort()
    .join("|");
  return shortRevision(`${snapshot.familyId}::${personIds}::${relationships}`);
};

const materializeModelSnapshot = (
  snapshot: FamilyGraphSnapshot,
  model: FamilyGraphModel,
): FamilyGraphSnapshot => {
  const personIds = new Set(model.personIds);
  const relationshipIds = new Set(model.relationshipIds);
  return {
    ...snapshot,
    persons: snapshot.persons.filter((person) => personIds.has(person.id)),
    relationships: snapshot.relationships.filter((relationship) => relationshipIds.has(relationship.id)),
  };
};

/**
 * BSH Stage 1 — normalize/select topology.
 *
 * Full Tree receives all graph values. Focus receives the selected Person and
 * extracts the directional branch once. No renderer ever calls the query engine.
 */
export const buildFamilyGraphModel = (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
): FamilyGraphModel | null => {
  const focusPersonId = options.focusPersonId?.trim() || null;
  if (options.mode === "focusBranch" && !focusPersonId) return null;

  const topologyRevision = fingerprintFamilyGraphTopology(snapshot);
  const modelKey = [
    `bsh${FAMILY_GRAPH_BSH_VERSION}`,
    snapshot.familyId,
    topologyRevision,
    options.mode,
    focusPersonId ?? "none",
  ].join(":");
  const cached = options.mode === "focusBranch"
    ? getFamilyGraphFocusBshModel<FamilyGraphModel>(modelKey)
    : getFamilyGraphBshModel<FamilyGraphModel>(modelKey);
  if (cached) return cached;

  if (options.mode === "fullTree") {
    const model: FamilyGraphModel = {
      bshVersion: FAMILY_GRAPH_BSH_VERSION,
      modelKey,
      familyId: snapshot.familyId,
      mode: "fullTree",
      focusPersonId,
      personIds: snapshot.persons.map((person) => person.id),
      relationshipIds: snapshot.relationships.map((relationship) => relationship.id),
      contextPersonIds: [],
      truncated: false,
      requestedMaxPeople: snapshot.persons.length,
      topologyRevision,
    };
    putFamilyGraphBshModel(modelKey, model);
    return model;
  }

  const queryEngine = createFamilyGraphQueryEngine(snapshot);
  const fullDepth = Math.max(1, snapshot.persons.length);
  const subgraph = queryEngine.getFocusBranchSubgraph(focusPersonId!, {
    descendantDepth: fullDepth,
    includeDescendantPartners: true,
    maxPeople: fullDepth,
  });
  if (!subgraph) return null;

  const personIds = new Set(subgraph.personIds);
  const contextPersonIds = new Set<string>();
  for (const relationship of subgraph.snapshot.relationships) {
    if (
      relationship.type === "parent_child"
      && relationship.personBId === focusPersonId
      && personIds.has(relationship.personAId)
    ) {
      contextPersonIds.add(relationship.personAId);
    }
  }

  const model: FamilyGraphModel = {
    bshVersion: FAMILY_GRAPH_BSH_VERSION,
    modelKey,
    familyId: snapshot.familyId,
    mode: "focusBranch",
    focusPersonId,
    personIds: subgraph.personIds,
    relationshipIds: subgraph.snapshot.relationships.map((relationship) => relationship.id),
    contextPersonIds: [...contextPersonIds],
    truncated: subgraph.truncated,
    requestedMaxPeople: subgraph.requestedMaxPeople,
    topologyRevision,
  };
  putFamilyGraphFocusBshModel(modelKey, model);
  return model;
};


/**
 * Cooperative Stage-1 Focus topology.
 *
 * Full Tree continues to use the synchronous build path during background BSH
 * hydration. Focus uses this path so Back/reopen can cancel inside descendant
 * traversal rather than waiting for an entire query-engine call to finish.
 */
const buildFamilyGraphFocusModelInterruptible = async (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
  cancellation?: FamilyGraphBuildCancellation,
  queryEngineHint?: FamilyGraphQueryEngine | null,
  topologyRevisionHint?: string | null,
): Promise<FamilyGraphModel | null> => {
  const focusPersonId = options.focusPersonId?.trim() || null;
  if (options.mode !== "focusBranch" || !focusPersonId) return null;
  if (cancellation?.isCancelled()) return null;

  const checkpoint = createFamilyGraphBuildCheckpoint(cancellation);
  // The Full-Tree scene and route query engine were already hydrated before the
  // user could open Focus. Reuse both when available instead of rebuilding the
  // graph index/fingerprint on every Focus request.
  const topologyRevision = topologyRevisionHint ?? fingerprintFamilyGraphTopology(snapshot);
  if (!(await checkpoint(true))) return null;
  const modelKey = [
    `bsh${FAMILY_GRAPH_BSH_VERSION}`,
    snapshot.familyId,
    topologyRevision,
    options.mode,
    focusPersonId,
  ].join(":");
  const cached = getFamilyGraphFocusBshModel<FamilyGraphModel>(modelKey);
  if (cached) return cached;

  const queryEngine = queryEngineHint ?? createFamilyGraphQueryEngine(snapshot);
  if (!(await checkpoint(true))) return null;
  const fullDepth = Math.max(1, snapshot.persons.length);
  const subgraph = await queryEngine.getFocusBranchSubgraphInterruptible(
    focusPersonId,
    {
      descendantDepth: fullDepth,
      includeDescendantPartners: true,
      maxPeople: fullDepth,
    },
    cancellation,
    5,
  );
  if (!subgraph || cancellation?.isCancelled()) return null;

  const personIds = new Set(subgraph.personIds);
  const contextPersonIds = new Set<string>();
  for (const relationship of subgraph.snapshot.relationships) {
    if (
      relationship.type === "parent_child"
      && relationship.personBId === focusPersonId
      && personIds.has(relationship.personAId)
    ) {
      contextPersonIds.add(relationship.personAId);
    }
    if (!(await checkpoint())) return null;
  }

  const relationshipIds: string[] = [];
  for (const relationship of subgraph.snapshot.relationships) {
    relationshipIds.push(relationship.id);
    if (!(await checkpoint())) return null;
  }

  const model: FamilyGraphModel = {
    bshVersion: FAMILY_GRAPH_BSH_VERSION,
    modelKey,
    familyId: snapshot.familyId,
    mode: "focusBranch",
    focusPersonId,
    personIds: subgraph.personIds,
    relationshipIds,
    contextPersonIds: [...contextPersonIds],
    truncated: subgraph.truncated,
    requestedMaxPeople: subgraph.requestedMaxPeople,
    topologyRevision,
  };
  putFamilyGraphFocusBshModel(modelKey, model);
  return model;
};

/** BSH Stage 2 — compute and cache all world/canvas coordinates. */
export const buildFamilyGraphLayout = (
  snapshot: FamilyGraphSnapshot,
  model: FamilyGraphModel,
): FamilyGraphLayout => {
  const modelSnapshot = materializeModelSnapshot(snapshot, model);
  const layoutRevision = shortRevision(fingerprintFamilyGraphLayout(modelSnapshot));
  const layoutKey = [
    `layout${FAMILY_GRAPH_LAYOUT_VERSION}`,
    model.modelKey,
    layoutRevision,
  ].join(":");
  const cached = model.mode === "focusBranch"
    ? getFamilyGraphFocusBshLayout<FamilyGraphLayout>(layoutKey)
    : getFamilyGraphBshLayout<FamilyGraphLayout>(layoutKey);
  if (cached) return cached;

  const visual = adaptFamilyGraphSnapshot(
    modelSnapshot,
    model.focusPersonId,
    model.mode === "focusBranch" ? { preserveGenerationHierarchy: true } : undefined,
  );
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const person of visual.people) {
    left = Math.min(left, person.x);
    top = Math.min(top, person.y);
    right = Math.max(right, person.x + FAMILY_GRAPH_CANVAS.nodeWidth);
    bottom = Math.max(bottom, person.y + FAMILY_GRAPH_CANVAS.nodeHeight);
  }
  const bounds = Number.isFinite(left)
    ? { left, top, right, bottom }
    : { left: 0, top: 0, right: visual.canvasWidth, bottom: visual.canvasHeight };

  const layout: FamilyGraphLayout = {
    ...visual,
    bshVersion: FAMILY_GRAPH_BSH_VERSION,
    layoutVersion: FAMILY_GRAPH_LAYOUT_VERSION,
    layoutKey,
    layoutRevision,
    modelKey: model.modelKey,
    bounds,
  };
  if (model.mode === "focusBranch") putFamilyGraphFocusBshLayout(layoutKey, layout);
  else putFamilyGraphBshLayout(layoutKey, layout);
  return layout;
};

const buildBootstrapPersonIds = (
  model: FamilyGraphModel,
  layout: FamilyGraphLayout,
): string[] => {
  if (!model.focusPersonId) return [];
  const allowed = new Set(layout.people.map((person) => person.id));
  const ids = new Set<string>();
  if (allowed.has(model.focusPersonId)) ids.add(model.focusPersonId);
  for (const contextId of model.contextPersonIds) {
    if (allowed.has(contextId)) ids.add(contextId);
  }
  for (const connection of layout.connections) {
    if (connection.type === "partner") {
      if (connection.fromId === model.focusPersonId && allowed.has(connection.toId)) ids.add(connection.toId);
      if (connection.toId === model.focusPersonId && allowed.has(connection.fromId)) ids.add(connection.fromId);
      continue;
    }
    // P2.12 Full/3/5 retained rendering also needs a deterministic first-frame
    // anchor before the viewport has reported dimensions. Keep direct parents
    // alongside the selected Person; descendants still load spatially on demand.
    if (connection.type === "parent_child" && connection.toId === model.focusPersonId && allowed.has(connection.fromId)) {
      ids.add(connection.fromId);
    }
  }
  return [...ids];
};

/** BSH Stage 3 — hydrate a renderer-ready scene from cached layout + current profiles. */
export const buildFamilyGraphScene = (
  snapshot: FamilyGraphSnapshot,
  model: FamilyGraphModel,
  layout: FamilyGraphLayout,
  geometry: FamilyGraphGeometry = buildFamilyGraphGeometry(layout),
): FamilyGraphRenderScene => {
  const modelSnapshot = materializeModelSnapshot(snapshot, model);
  const visualRevision = shortRevision(fingerprintFamilyGraphSnapshot(modelSnapshot));
  const sceneKey = [
    `scene${FAMILY_GRAPH_SCENE_VERSION}`,
    layout.layoutKey,
    geometry.geometryKey,
    visualRevision,
  ].join(":");
  const cached = model.mode === "focusBranch"
    ? getFamilyGraphFocusBshScene<FamilyGraphRenderScene>(sceneKey)
    : getFamilyGraphBshScene<FamilyGraphRenderScene>(sceneKey);
  if (cached) return cached;

  // Profile/avatar/notes changes hydrate onto the already computed coordinates.
  // If identity unexpectedly diverges, refresh returns null and we safely fall
  // back to the layout's visual data; revision keys ensure correctness first.
  const hydratedVisual = refreshFamilyGraphVisualProfiles(layout, modelSnapshot) ?? layout;
  const focusPerson = model.focusPersonId
    ? hydratedVisual.people.find((person) => person.id === model.focusPersonId) ?? null
    : null;
  const initialCamera: FamilyGraphSceneCameraSpec | null = model.mode === "focusBranch" && focusPerson
    ? {
        canvasPoint: {
          x: focusPerson.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2,
          y: focusPerson.y + FAMILY_GRAPH_CANVAS.nodeHeight / 2,
        },
        viewportAnchor: { x: 0.5, y: FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y },
        scale: FAMILY_GRAPH_FOCUS_ENTRY_SCALE,
      }
    : focusPerson
      ? {
          canvasPoint: {
            x: focusPerson.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2,
            y: focusPerson.y + FAMILY_GRAPH_CANVAS.nodeHeight / 2,
          },
          viewportAnchor: { x: 0.5, y: 0.46 },
          scale: 0.86,
        }
      : null;

  const scene: FamilyGraphRenderScene = {
    people: hydratedVisual.people,
    connections: hydratedVisual.connections,
    canvasWidth: hydratedVisual.canvasWidth,
    canvasHeight: hydratedVisual.canvasHeight,
    bshVersion: FAMILY_GRAPH_BSH_VERSION,
    sceneVersion: FAMILY_GRAPH_SCENE_VERSION,
    sceneKey,
    modelKey: model.modelKey,
    layoutKey: layout.layoutKey,
    geometryKey: geometry.geometryKey,
    geometry,
    mode: model.mode,
    focusPersonId: model.focusPersonId,
    personIds: model.personIds,
    contextPersonIds: model.contextPersonIds,
    bootstrapPersonIds: buildBootstrapPersonIds(model, layout),
    truncated: model.truncated,
    requestedMaxPeople: model.requestedMaxPeople,
    bounds: layout.bounds,
    initialCamera,
    topologyRevision: model.topologyRevision,
    layoutRevision: layout.layoutRevision,
    visualRevision,
  };
  if (model.mode === "focusBranch") putFamilyGraphFocusBshScene(sceneKey, scene);
  else putFamilyGraphBshScene(sceneKey, scene);
  return scene;
};


/**
 * P2.15.2 Focus projection.
 *
 * The main family screen already owns a fully hydrated Full-Tree BSH scene. A
 * Focus branch does not need to repeat the expensive layout + connector routing
 * stages just to hide unrelated people. Project the branch from that immutable
 * scene instead: topology selection remains revision-correct, while coordinates
 * and routes are reused verbatim. This keeps Focus construction bounded and,
 * critically, leaves no multi-second synchronous Geometry job alive after Back.
 */
const buildFamilyGraphFocusProjectionScene = (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
  baseScene: FamilyGraphRenderScene,
  model: FamilyGraphModel,
): FamilyGraphRenderScene | null => {
  if (options.mode !== "focusBranch" || !model.focusPersonId) return null;

  const allowedPersonIds = new Set(model.personIds);
  const allowedRelationshipIds = new Set(model.relationshipIds);
  const people = baseScene.people.filter((person) => allowedPersonIds.has(person.id));
  if (!people.some((person) => person.id === model.focusPersonId)) return null;

  const connections = baseScene.connections.filter((connection) =>
    allowedRelationshipIds.has(connection.id)
    && allowedPersonIds.has(connection.fromId)
    && allowedPersonIds.has(connection.toId));
  const allowedConnectionIds = new Set(connections.map((connection) => connection.id));

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const person of people) {
    left = Math.min(left, person.x);
    top = Math.min(top, person.y);
    right = Math.max(right, person.x + FAMILY_GRAPH_CANVAS.nodeWidth);
    bottom = Math.max(bottom, person.y + FAMILY_GRAPH_CANVAS.nodeHeight);
  }
  const bounds = Number.isFinite(left)
    ? { left, top, right, bottom }
    : { left: 0, top: 0, right: baseScene.canvasWidth, bottom: baseScene.canvasHeight };

  const projectionRevision = shortRevision(`${baseScene.layoutKey}:${model.modelKey}`);
  const layoutKey = `focusProjectionLayout${FAMILY_GRAPH_LAYOUT_VERSION}:${projectionRevision}`;
  const geometryKey = `focusProjectionGeometry:${baseScene.geometryKey}:${projectionRevision}`;
  const baseRouting = baseScene.geometry.routingPlan;
  const routingPlan = {
    familyKeyByChildId: new Map([...baseRouting.familyKeyByChildId].filter(([childId]) => allowedPersonIds.has(childId))),
    laneOffsetByChildId: new Map([...baseRouting.laneOffsetByChildId].filter(([childId]) => allowedPersonIds.has(childId))),
    laneOffsetByConnectionId: new Map([...baseRouting.laneOffsetByConnectionId].filter(([connectionId]) => allowedConnectionIds.has(connectionId))),
    directVerticalConnectionIds: new Set([...baseRouting.directVerticalConnectionIds].filter((connectionId) => allowedConnectionIds.has(connectionId))),
    sideAnchorConnectionIds: new Set([...baseRouting.sideAnchorConnectionIds].filter((connectionId) => allowedConnectionIds.has(connectionId))),
    routeByConnectionId: new Map([...baseRouting.routeByConnectionId].filter(([connectionId]) => allowedConnectionIds.has(connectionId))),
    bottomOwnerFamilyKeyByParentId: new Map([...baseRouting.bottomOwnerFamilyKeyByParentId].filter(([parentId]) => allowedPersonIds.has(parentId))),
    portOccupancy: new Map([...baseRouting.portOccupancy].filter(([key]) => allowedPersonIds.has(key.split(":", 1)[0] ?? ""))),
  };

  const geometry: FamilyGraphGeometry = {
    geometryVersion: baseScene.geometry.geometryVersion,
    geometryKey,
    layoutKey,
    partnerUnits: baseScene.geometry.partnerUnits
      .filter((unit) => allowedConnectionIds.has(unit.id) && allowedPersonIds.has(unit.partnerAId) && allowedPersonIds.has(unit.partnerBId))
      .map((unit) => ({ ...unit, sharedChildIds: unit.sharedChildIds.filter((childId) => allowedPersonIds.has(childId)) })),
    singleParentLinks: baseScene.geometry.singleParentLinks
      .filter((link) => allowedConnectionIds.has(link.id) && allowedPersonIds.has(link.parentId) && allowedPersonIds.has(link.childId)),
    routingPlan,
  };

  const focusPerson = people.find((person) => person.id === model.focusPersonId)!;
  const bootstrapIds = new Set<string>([model.focusPersonId, ...model.contextPersonIds.filter((id) => allowedPersonIds.has(id))]);
  for (const connection of connections) {
    if (connection.type === "partner") {
      if (connection.fromId === model.focusPersonId) bootstrapIds.add(connection.toId);
      if (connection.toId === model.focusPersonId) bootstrapIds.add(connection.fromId);
    } else if (connection.type === "parent_child" && connection.toId === model.focusPersonId) {
      bootstrapIds.add(connection.fromId);
    }
  }

  const modelSnapshot = materializeModelSnapshot(snapshot, model);
  const visualRevision = shortRevision(fingerprintFamilyGraphSnapshot(modelSnapshot));
  const sceneKey = `scene${FAMILY_GRAPH_SCENE_VERSION}:${layoutKey}:${geometryKey}:${visualRevision}`;
  const cached = getFamilyGraphBshScene<FamilyGraphRenderScene>(sceneKey);
  if (cached) return rememberFamilyGraphRenderScene(snapshot, options, cached);

  const scene: FamilyGraphRenderScene = {
    people,
    connections,
    canvasWidth: baseScene.canvasWidth,
    canvasHeight: baseScene.canvasHeight,
    bshVersion: FAMILY_GRAPH_BSH_VERSION,
    sceneVersion: FAMILY_GRAPH_SCENE_VERSION,
    sceneKey,
    modelKey: model.modelKey,
    layoutKey,
    geometryKey,
    geometry,
    mode: "focusBranch",
    focusPersonId: model.focusPersonId,
    personIds: model.personIds,
    contextPersonIds: model.contextPersonIds,
    bootstrapPersonIds: [...bootstrapIds],
    truncated: model.truncated,
    requestedMaxPeople: model.requestedMaxPeople,
    bounds,
    initialCamera: {
      canvasPoint: {
        x: focusPerson.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2,
        y: focusPerson.y + FAMILY_GRAPH_CANVAS.nodeHeight / 2,
      },
      viewportAnchor: { x: 0.5, y: FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y },
      scale: FAMILY_GRAPH_FOCUS_ENTRY_SCALE,
    },
    topologyRevision: model.topologyRevision,
    layoutRevision: `${baseScene.layoutRevision}:focus:${projectionRevision}`,
    visualRevision,
  };
  putFamilyGraphBshScene(sceneKey, scene);
  return rememberFamilyGraphRenderScene(snapshot, options, scene);
};


/**
 * Cooperative Focus projection from the already-hydrated Full Tree scene.
 * Every potentially large filter/materialization loop yields on a short budget.
 * This is the final guarantee behind "Back always wins": even projection/routing
 * cannot hold the JS thread until completion.
 */
const buildFamilyGraphFocusProjectionSceneInterruptible = async (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
  baseScene: FamilyGraphRenderScene,
  model: FamilyGraphModel,
  cancellation?: FamilyGraphBuildCancellation,
): Promise<FamilyGraphRenderScene | null> => {
  if (options.mode !== "focusBranch" || !model.focusPersonId) return null;
  const checkpoint = createFamilyGraphBuildCheckpoint(cancellation);
  const allowedPersonIds = new Set(model.personIds);
  const allowedRelationshipIds = new Set(model.relationshipIds);

  const people: FamilyGraphRenderScene["people"] = [];
  for (const person of baseScene.people) {
    if (allowedPersonIds.has(person.id)) people.push(person);
    if (!(await checkpoint())) return null;
  }
  if (!people.some((person) => person.id === model.focusPersonId)) return null;

  const connections: FamilyGraphRenderScene["connections"] = [];
  for (const connection of baseScene.connections) {
    if (
      allowedRelationshipIds.has(connection.id)
      && allowedPersonIds.has(connection.fromId)
      && allowedPersonIds.has(connection.toId)
    ) connections.push(connection);
    if (!(await checkpoint())) return null;
  }
  const allowedConnectionIds = new Set<string>();
  for (const connection of connections) {
    allowedConnectionIds.add(connection.id);
    if (!(await checkpoint())) return null;
  }

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const person of people) {
    left = Math.min(left, person.x);
    top = Math.min(top, person.y);
    right = Math.max(right, person.x + FAMILY_GRAPH_CANVAS.nodeWidth);
    bottom = Math.max(bottom, person.y + FAMILY_GRAPH_CANVAS.nodeHeight);
    if (!(await checkpoint())) return null;
  }
  const bounds = Number.isFinite(left)
    ? { left, top, right, bottom }
    : { left: 0, top: 0, right: baseScene.canvasWidth, bottom: baseScene.canvasHeight };

  const projectionRevision = shortRevision(`${baseScene.layoutKey}:${model.modelKey}`);
  const layoutKey = `focusProjectionLayout${FAMILY_GRAPH_LAYOUT_VERSION}:${projectionRevision}`;
  const geometryKey = `focusProjectionGeometry:${baseScene.geometryKey}:${projectionRevision}`;
  const baseRouting = baseScene.geometry.routingPlan;

  const familyKeyByChildId = new Map<string, string>();
  for (const [childId, value] of baseRouting.familyKeyByChildId) {
    if (allowedPersonIds.has(childId)) familyKeyByChildId.set(childId, value);
    if (!(await checkpoint())) return null;
  }
  const laneOffsetByChildId = new Map<string, number>();
  for (const [childId, value] of baseRouting.laneOffsetByChildId) {
    if (allowedPersonIds.has(childId)) laneOffsetByChildId.set(childId, value);
    if (!(await checkpoint())) return null;
  }
  const laneOffsetByConnectionId = new Map<string, number>();
  for (const [connectionId, value] of baseRouting.laneOffsetByConnectionId) {
    if (allowedConnectionIds.has(connectionId)) laneOffsetByConnectionId.set(connectionId, value);
    if (!(await checkpoint())) return null;
  }
  const directVerticalConnectionIds = new Set<string>();
  for (const connectionId of baseRouting.directVerticalConnectionIds) {
    if (allowedConnectionIds.has(connectionId)) directVerticalConnectionIds.add(connectionId);
    if (!(await checkpoint())) return null;
  }
  const sideAnchorConnectionIds = new Set<string>();
  for (const connectionId of baseRouting.sideAnchorConnectionIds) {
    if (allowedConnectionIds.has(connectionId)) sideAnchorConnectionIds.add(connectionId);
    if (!(await checkpoint())) return null;
  }
  const routeByConnectionId = new Map(baseRouting.routeByConnectionId);
  routeByConnectionId.clear();
  for (const [connectionId, value] of baseRouting.routeByConnectionId) {
    if (allowedConnectionIds.has(connectionId)) routeByConnectionId.set(connectionId, value);
    if (!(await checkpoint())) return null;
  }
  const bottomOwnerFamilyKeyByParentId = new Map<string, string>();
  for (const [parentId, value] of baseRouting.bottomOwnerFamilyKeyByParentId) {
    if (allowedPersonIds.has(parentId)) bottomOwnerFamilyKeyByParentId.set(parentId, value);
    if (!(await checkpoint())) return null;
  }
  const portOccupancy = new Map<string, string>();
  for (const [key, value] of baseRouting.portOccupancy) {
    if (allowedPersonIds.has(key.split(":", 1)[0] ?? "")) portOccupancy.set(key, value);
    if (!(await checkpoint())) return null;
  }

  const partnerUnits: FamilyGraphGeometry["partnerUnits"] = [];
  for (const unit of baseScene.geometry.partnerUnits) {
    if (
      allowedConnectionIds.has(unit.id)
      && allowedPersonIds.has(unit.partnerAId)
      && allowedPersonIds.has(unit.partnerBId)
    ) {
      partnerUnits.push({
        ...unit,
        sharedChildIds: unit.sharedChildIds.filter((childId) => allowedPersonIds.has(childId)),
      });
    }
    if (!(await checkpoint())) return null;
  }
  const singleParentLinks: FamilyGraphGeometry["singleParentLinks"] = [];
  for (const link of baseScene.geometry.singleParentLinks) {
    if (
      allowedConnectionIds.has(link.id)
      && allowedPersonIds.has(link.parentId)
      && allowedPersonIds.has(link.childId)
    ) singleParentLinks.push(link);
    if (!(await checkpoint())) return null;
  }

  const geometry: FamilyGraphGeometry = {
    geometryVersion: baseScene.geometry.geometryVersion,
    geometryKey,
    layoutKey,
    partnerUnits,
    singleParentLinks,
    routingPlan: {
      familyKeyByChildId,
      laneOffsetByChildId,
      laneOffsetByConnectionId,
      directVerticalConnectionIds,
      sideAnchorConnectionIds,
      routeByConnectionId,
      bottomOwnerFamilyKeyByParentId,
      portOccupancy,
    },
  };

  const focusPerson = people.find((person) => person.id === model.focusPersonId)!;
  const bootstrapIds = new Set<string>([model.focusPersonId]);
  for (const id of model.contextPersonIds) {
    if (allowedPersonIds.has(id)) bootstrapIds.add(id);
    if (!(await checkpoint())) return null;
  }
  for (const connection of connections) {
    if (connection.type === "partner") {
      if (connection.fromId === model.focusPersonId) bootstrapIds.add(connection.toId);
      if (connection.toId === model.focusPersonId) bootstrapIds.add(connection.fromId);
    } else if (connection.type === "parent_child" && connection.toId === model.focusPersonId) {
      bootstrapIds.add(connection.fromId);
    }
    if (!(await checkpoint())) return null;
  }

  // The projection reuses immutable Full-Tree visual objects. Its visual identity
  // therefore changes whenever either the Full-Tree visual revision or Focus
  // topology/model changes; no second O(n) snapshot fingerprint is needed here.
  const visualRevision = shortRevision(`${baseScene.visualRevision}:focus:${model.modelKey}`);
  if (!(await checkpoint(true))) return null;
  const sceneKey = `scene${FAMILY_GRAPH_SCENE_VERSION}:${layoutKey}:${geometryKey}:${visualRevision}`;
  const cached = getFamilyGraphFocusBshScene<FamilyGraphRenderScene>(sceneKey);
  if (cached) return rememberFamilyGraphRenderScene(snapshot, options, cached);

  const scene: FamilyGraphRenderScene = {
    people,
    connections,
    canvasWidth: baseScene.canvasWidth,
    canvasHeight: baseScene.canvasHeight,
    bshVersion: FAMILY_GRAPH_BSH_VERSION,
    sceneVersion: FAMILY_GRAPH_SCENE_VERSION,
    sceneKey,
    modelKey: model.modelKey,
    layoutKey,
    geometryKey,
    geometry,
    mode: "focusBranch",
    focusPersonId: model.focusPersonId,
    personIds: model.personIds,
    contextPersonIds: model.contextPersonIds,
    bootstrapPersonIds: [...bootstrapIds],
    truncated: model.truncated,
    requestedMaxPeople: model.requestedMaxPeople,
    bounds,
    initialCamera: {
      canvasPoint: {
        x: focusPerson.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2,
        y: focusPerson.y + FAMILY_GRAPH_CANVAS.nodeHeight / 2,
      },
      viewportAnchor: { x: 0.5, y: FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y },
      scale: FAMILY_GRAPH_FOCUS_ENTRY_SCALE,
    },
    topologyRevision: model.topologyRevision,
    layoutRevision: `${baseScene.layoutRevision}:focus:${projectionRevision}`,
    visualRevision,
  };
  putFamilyGraphFocusBshScene(sceneKey, scene);
  return rememberFamilyGraphRenderScene(snapshot, options, scene);
};

/**
 * Public BSH facade. Full Tree and Focus differ only by the Stage-1 input mode.
 * Every later stage is shared.
 */
export const buildFamilyGraphRenderScene = (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
): FamilyGraphRenderScene | null => {
  const hot = peekFamilyGraphRenderScene(snapshot, options);
  if (hot) return hot;
  const model = buildFamilyGraphModel(snapshot, options);
  if (!model) return null;
  const layout = buildFamilyGraphLayout(snapshot, model);
  const geometry = buildFamilyGraphGeometry(layout);
  return rememberFamilyGraphRenderScene(snapshot, options, buildFamilyGraphScene(snapshot, model, layout, geometry));
};


/**
 * Cancel-first BSH facade used by Focus View.
 *
 * The synchronous stage functions remain the source of truth (and keep their
 * independent caches), but Focus construction yields between Model, Layout and
 * Scene. This gives Back/cancel events a scheduling boundary at every stage.
 * Completed stages may stay cached because cache correctness is revision-keyed;
 * cancelled presentation work is never committed to React.
 */
export const buildFamilyGraphRenderSceneInterruptible = async (
  snapshot: FamilyGraphSnapshot,
  options: BuildFamilyGraphRenderSceneOptions,
  cancellation?: FamilyGraphBuildCancellation,
  baseScene?: FamilyGraphRenderScene | null,
  queryEngineHint?: FamilyGraphQueryEngine | null,
): Promise<FamilyGraphRenderScene | null> => {
  const cancelled = () => cancellation?.isCancelled() ?? false;

  if (cancelled()) return null;
  // A revisited Focus branch must not pay the cancel-first scheduling pipeline.
  // It is already a complete immutable Scene for this exact snapshot.
  const hot = peekFamilyGraphRenderScene(snapshot, options);
  if (hot) return hot;

  await yieldFamilyGraphBuild();
  if (cancelled()) return null;

  const model = options.mode === "focusBranch"
    ? await buildFamilyGraphFocusModelInterruptible(
        snapshot,
        options,
        cancellation,
        queryEngineHint,
        baseScene?.topologyRevision ?? null,
      )
    : buildFamilyGraphModel(snapshot, options);
  if (!model || cancelled()) return null;

  // Focus never recomputes pixel layout/routing when a renderer-ready Full Tree
  // scene is already alive. Projection itself is cooperative: every large loop
  // contains cancellation checkpoints so Back does not wait for filtering/routing.
  if (options.mode === "focusBranch" && baseScene) {
    await yieldFamilyGraphBuild();
    if (cancelled()) return null;
    return buildFamilyGraphFocusProjectionSceneInterruptible(
      snapshot,
      options,
      baseScene,
      model,
      cancellation,
    );
  }

  await yieldFamilyGraphBuild();
  if (cancelled()) return null;

  const layout = buildFamilyGraphLayout(snapshot, model);
  if (cancelled()) return null;

  await yieldFamilyGraphBuild();
  if (cancelled()) return null;

  const geometry = buildFamilyGraphGeometry(layout);
  if (cancelled()) return null;

  await yieldFamilyGraphBuild();
  if (cancelled()) return null;

  const scene = buildFamilyGraphScene(snapshot, model, layout, geometry);
  return cancelled() ? null : rememberFamilyGraphRenderScene(snapshot, options, scene);
};
