import { Ionicons } from "@expo/vector-icons";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { APP_CONFIG_DEFAULTS } from "../../constants/appConfiguration";
import { COLORS } from "../../constants/theme";
import type { FamilyGraphVietnameseRelationship } from "../../types/familyGraphQuery";
import { getColorByName } from "../../utils";
import { BloomChipButton } from "../ui/BloomButtonComponents";
import { BloomTextInput } from "../ui/BloomInputComponents";
import { FamilyGraphPersonSheet } from "./FamilyGraphPersonSheet";
import { applyMainFamilyGraphPanDelta, applyMainFamilyGraphPinchScale } from "./familyGraphMainCamera";
import type { FamilyGraphRenderScene } from "./familyGraphSceneBuilder";
import {
  FAMILY_GRAPH_NODE_CARD_HEIGHT,
  FAMILY_GRAPH_NODE_CARD_WIDTH,
  type FamilyGraphGeometry,
} from "./familyGraphGeometry";
import {
  hydrateFamilyGraphRuntimeState,
  retainFamilyGraphRuntimePersonIds,
  updateFamilyGraphRuntimeCamera,
} from "./familyGraphBshCache";
import {
  buildFamilyGraphConnectorRoutingPlan,
  getFamilyGraphConnectorPort,
  type FamilyGraphConnectorPort,
  type FamilyGraphConnectorRoute,
} from "./familyGraphConnectorRouting";
import {
  FAMILY_GRAPH_CANVAS,
  FAMILY_GRAPH_DEFAULT_FOCUS_ID,
  FAMILY_GRAPH_PROTOTYPE_CONNECTIONS,
  FAMILY_GRAPH_PROTOTYPE_PEOPLE,
  type FamilyGraphPrototypeConnection,
  type FamilyGraphPrototypePerson,
} from "./familyGraphPrototypeData";
import { FamilyGraphSpatialGrid, type FamilyGraphSpatialRect } from "./familyGraphSpatialGrid";
import {
  buildProgressiveFamilyGraphOrder,
  getFamilyGraphCameraSnapshotFromTransform,
  getFamilyGraphNodeRect,
  getFamilyGraphPanForAnchor,
  getFamilyGraphViewportRect,
  getPolylineBounds,
  mapFamilyGraphCanvasPointToViewport,
  mergeRetainedFamilyGraphPersonIds,
  rectsIntersect,
  type FamilyGraphCameraSnapshot,
} from "./familyGraphViewport";

export type FamilyGraphViewMode = "3" | "5" | "all";
type ViewMode = FamilyGraphViewMode;

type Point = { x: number; y: number };

const MIN_SAFE_SCALE = 0.02;
// P2.11: Focus View is a readable camera, never fit-all. The 0.95 entry
// scale intentionally feels slightly larger than P2.10 while preserving pan room.
const SCALE_STEP = 0.1;
const INITIAL_SCALE = 0.86;
const AVATAR_SIZE = 58;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const NODE_CARD_WIDTH = FAMILY_GRAPH_NODE_CARD_WIDTH;
const NODE_CARD_HEIGHT = FAMILY_GRAPH_NODE_CARD_HEIGHT;
const CONNECTOR_GAP = 8;
const SIDE_CONNECTOR_GAP = 3;
const CONNECTOR_RADIUS = 6;
const FAMILY_GRAPH_RENDER_CONFIG = APP_CONFIG_DEFAULTS.familyGraph.render;
const FAMILY_GRAPH_LAYOUT_CONFIG = APP_CONFIG_DEFAULTS.familyGraph.layout;
const VIEWPORT_CAMERA_CELL_SIZE = FAMILY_GRAPH_RENDER_CONFIG.viewportCameraCellSize;


// Refine v6: connector mảnh, mauve dịu và luôn chừa khoảng hở với toàn bộ node card.
const ACTIVE_PARENT_COLOR = "#DABDC8";
const FADED_PARENT_COLOR = "#F0EAEC";
const PARTNER_DASH_COLOR = "#E9E1E4";
const ACTIVE_LINE_THICKNESS = 1.7;
const FADED_LINE_THICKNESS = 1.05;
const ACTIVE_ENDPOINT_SIZE = 4.6;
const FADED_ENDPOINT_SIZE = 3.8;

const generationCaption: Record<number, string> = {
  1: "Đời ông bà",
  2: "Cha mẹ · cô chú",
  3: "Bạn · bạn đời",
  4: "Đời con",
  5: "Đời cháu",
};

// getColorByName() của codebase trả về một màu seed ổn định theo tên.
// Refine v6.3 dùng seed đó để chọn một bộ màu Bloom pastel hoàn chỉnh
// thay vì pha trực tiếp các seed tối (dễ tạo màu xám/nặng).
const NAME_COLOR_SEEDS = [
  "#090D16",
  "#131B2E",
  "#1E293B",
  "#2E3A4E",
  "#0F3D4C",
  "#4A1525",
  "#063223",
  "#5C3E0A",
  "#3E1F47",
  "#242B35",
] as const;

const BLOOM_NODE_PALETTES = [
  { background: "#FFF4F7", focused: "#FADDE7", shadow: "#EDB7C8", badge: "#FFF9FB" },
  { background: "#F5F1FC", focused: "#E9DDF7", shadow: "#CDB9E2", badge: "#FBF9FE" },
  { background: "#FFF6E9", focused: "#FBE7C9", shadow: "#E5C18B", badge: "#FFFBF4" },
  { background: "#F1F8F4", focused: "#DFF0E6", shadow: "#ACD0BA", badge: "#F9FCFA" },
  { background: "#EFF7FB", focused: "#DDEEF6", shadow: "#AFCFDD", badge: "#F8FCFE" },
  { background: "#FFF2EE", focused: "#F9DFD7", shadow: "#E3B2A5", badge: "#FFF9F6" },
] as const;

type FamilyGraphSubgraphPreview = {
  personIds: string[];
  truncated: boolean;
  requestedMaxPeople: number;
};

type FamilyGraphPrototypeProps = {
  familyName: string;
  familyId?: string | null;
  /** Production BSH input: fully prepared topology + layout + scene metadata. */
  scene?: FamilyGraphRenderScene;
  people?: FamilyGraphPrototypePerson[];
  connections?: FamilyGraphPrototypeConnection[];
  defaultFocusId?: string | null;
  canEdit?: boolean;
  onEditPerson?: (personId: string) => void;
  onAddPerson?: () => void;
  onDeletePerson?: (personId: string) => void | Promise<void>;
  onDeleteRelationship?: (relationshipId: string) => void | Promise<void>;
  canvasWidth?: number;
  canvasHeight?: number;
  resolveRelationship?: (sourcePersonId: string, targetPersonId: string) => FamilyGraphVietnameseRelationship | null;
  getFocusSubgraphPreview?: (viewAnchorPersonId: string, mode: "3" | "5") => FamilyGraphSubgraphPreview | null;
  /** Route-owned Focus intent. When provided, Main Tree never mounts its legacy Focus overlay. */
  onOpenFocus?: (personId: string) => void;
  initialDetailPersonId?: string | null;
  initialViewMode?: FamilyGraphViewMode;
  initialCameraSnapshot?: FamilyGraphCameraSnapshot | null;
  onViewStateChange?: (state: {
    viewMode: FamilyGraphViewMode;
    viewAnchorPersonId: string | null;
    camera: FamilyGraphCameraSnapshot;
  }) => void;
  onRenderedCountChange?: (rendered: number, total: number) => void;
  /** Bloom Supper: route-level hero can own title/copy while graph keeps only actions. */
  headerMode?: "full" | "controls" | "none";
  /** Fit the whole bounded branch into the viewport on first paint. */
  autoFitOnMount?: boolean;
  /** P2.7: fired only after layout, progressive mount, camera fit and two paint frames. */
  onVisualReady?: () => void;
};

export function FamilyGraphPrototype({
  familyName,
  familyId,
  scene,
  people,
  connections,
  defaultFocusId,
  canEdit = false,
  onEditPerson,
  onAddPerson,
  onDeletePerson,
  onDeleteRelationship,
  canvasWidth,
  canvasHeight,
  resolveRelationship,
  getFocusSubgraphPreview,
  onOpenFocus,
  initialDetailPersonId,
  initialViewMode,
  initialCameraSnapshot,
  onViewStateChange,
  onRenderedCountChange,
  headerMode = "full",
  autoFitOnMount = false,
  onVisualReady,
}: FamilyGraphPrototypeProps) {
  // BSH render boundary: production receives one immutable renderer-ready scene.
  // The legacy people/connections path remains only for the standalone prototype.
  const sourcePeople = useMemo(() => {
    if (scene) return scene.people;
    if (people) return people;
    return FAMILY_GRAPH_PROTOTYPE_PEOPLE.map((person) => ({
      ...person,
      y: FAMILY_GRAPH_LAYOUT_CONFIG.generationTop
        + Math.max(0, person.generation - 1) * FAMILY_GRAPH_LAYOUT_CONFIG.generationStep,
    }));
  }, [people, scene]);
  const sourceConnections = scene?.connections ?? connections ?? FAMILY_GRAPH_PROTOTYPE_CONNECTIONS;
  const effectiveCanvasWidth = scene?.canvasWidth ?? canvasWidth ?? FAMILY_GRAPH_CANVAS.width;
  const effectiveCanvasHeight = scene?.canvasHeight ?? canvasHeight ?? FAMILY_GRAPH_CANVAS.height;
  const isLiveGraph = scene !== undefined || people !== undefined;
  const initialFocusId = scene?.focusPersonId ?? (defaultFocusId !== undefined
    ? defaultFocusId
    : isLiveGraph
      ? null
      : FAMILY_GRAPH_DEFAULT_FOCUS_ID);
  // P2.18 Focus uses the same retained viewport materialization as the main tree.
  // The immutable scene may know the whole branch, but React mounts only the
  // bootstrap people around the focus person. Panning discovers more nodes and
  // retainedPersonIds grows monotonically, so returning to an explored area is
  // transform-only and does not rebuild cards.
  const initialRetainedPersonIds = scene ? scene.bootstrapPersonIds : [];
  const runtimeHydrationRef = useRef(
    scene ? hydrateFamilyGraphRuntimeState(scene.sceneKey, initialRetainedPersonIds) : null,
  );
  const hydratedUserCamera = runtimeHydrationRef.current?.userCameraValid
    ? runtimeHydrationRef.current.camera
    : null;

  // Phase 14F: the normal graph always opens in 3-generation mode.
  // The linked account is only the initial camera/scope anchor; it is NOT an
  // in-canvas branch-focus state anymore.
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode ?? "3");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [viewAnchorPersonId, setViewAnchorPersonId] = useState<string | null>(initialFocusId);
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(initialFocusId);
  const [branchMode, setBranchMode] = useState(false);
  const [detailPersonId, setDetailPersonId] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [retainedPersonIds, setRetainedPersonIds] = useState<Set<string>>(() =>
    runtimeHydrationRef.current?.retainedPersonIds ?? new Set(),
  );
  const retainedPersonIdsRef = useRef(retainedPersonIds);
  // P2.12 spatial retention contract: a camera region is discovered at most once
  // for a given scene/mode/viewport bucket. Returning to a loaded region is a
  // pure UI-thread transform: no spatial query and no React state update.
  const loadedRegionKeysRef = useRef<Set<string>>(new Set());
  const [cameraSnapshot, setCameraSnapshot] = useState<FamilyGraphCameraSnapshot>(() => initialCameraSnapshot ?? hydratedUserCamera ?? ({
    centerX: effectiveCanvasWidth / 2,
    centerY: effectiveCanvasHeight / 2,
    scale: INITIAL_SCALE,
  }));

  // v6.4: mọi transform gesture chạy trực tiếp trên UI thread bằng Reanimated.
  // Không gửi từng frame pinch qua JS thread để tránh queue event / snap khi thả tay.
  const initialRuntimeScale = initialCameraSnapshot?.scale ?? hydratedUserCamera?.scale ?? scene?.initialCamera?.scale ?? INITIAL_SCALE;
  const canvasScale = useSharedValue(initialRuntimeScale);
  const canvasTranslateX = useSharedValue(0);
  const canvasTranslateY = useSharedValue(0);
  // Main Tree owns this camera exclusively. Focus View has a different component,
  // SharedValues and runtime cache.
  const activeCameraScale = canvasScale;
  const activeCameraTranslateX = canvasTranslateX;
  const activeCameraTranslateY = canvasTranslateY;
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchActive = useSharedValue(0);
  const panSessionValid = useSharedValue(0);
  const pinchStartScale = useSharedValue(initialRuntimeScale);
  const pinchAnchorCanvasX = useSharedValue(0);
  const pinchAnchorCanvasY = useSharedValue(0);
  const visualReadyFiredRef = useRef(false);
  const userCameraInteractedRef = useRef(runtimeHydrationRef.current?.userCameraValid ?? false);
  const rootRef = useRef<View>(null);
  const hasCenteredInitially = useRef(false);
  const peopleById = useMemo(
    () => new Map(sourcePeople.map((person) => [person.id, person])),
    [sourcePeople],
  );

  const detailPerson = detailPersonId ? peopleById.get(detailPersonId) ?? null : null;
  useEffect(() => {
    if (!initialDetailPersonId || !peopleById.has(initialDetailPersonId)) return;
    setDetailPersonId(initialDetailPersonId);
    setSelectedPersonId(initialDetailPersonId);
  }, [initialDetailPersonId, peopleById]);

  const detailDirectRelationships = useMemo(() => {
    if (!detailPersonId) return [];
    return sourceConnections
      .filter((connection) => connection.fromId === detailPersonId || connection.toId === detailPersonId)
      .map((connection) => {
        const otherId = connection.fromId === detailPersonId ? connection.toId : connection.fromId;
        const other = peopleById.get(otherId);
        const otherName = other?.displayName ?? "Thành viên";
        if (connection.type === "partner") {
          return { id: connection.id, type: connection.type, label: `Vợ/Chồng · ${otherName}` } as const;
        }
        if (connection.fromId === detailPersonId) {
          return { id: connection.id, type: connection.type, label: `Con · ${otherName}` } as const;
        }
        const parentLabel = other?.gender === "female" ? "Mẹ" : other?.gender === "male" ? "Cha" : "Cha/Mẹ";
        return { id: connection.id, type: connection.type, label: `${parentLabel} · ${otherName}` } as const;
      });
  }, [detailPersonId, peopleById, sourceConnections]);

  useEffect(() => {
    if (!isLiveGraph || defaultFocusId === undefined) return;
    setViewAnchorPersonId((current) => current && peopleById.has(current) ? current : defaultFocusId);
    setHighlightedPersonId((current) => current && peopleById.has(current) ? current : defaultFocusId);
  }, [defaultFocusId, isLiveGraph, peopleById]);

  const focusSubgraphPreview = useMemo(() => {
    if (viewMode === "all" || !getFocusSubgraphPreview) return null;
    const targetFocusId = viewAnchorPersonId ?? initialFocusId;
    return targetFocusId ? getFocusSubgraphPreview(targetFocusId, viewMode) : null;
  }, [viewAnchorPersonId, getFocusSubgraphPreview, initialFocusId, viewMode]);

  // Phase 14F invariant: the background canvas never opens/dims a branch.
  // Every already-rendered node and connector stays visually unchanged while the
  // Focus View exists above it.
  const activeBranchIds = useMemo(
    () => new Set(sourcePeople.map((person) => person.id)),
    [sourcePeople],
  );

  const visiblePeople = useMemo(() => {
    if (viewMode === "all") return sourcePeople;

    if (focusSubgraphPreview) {
      const ids = new Set(focusSubgraphPreview.personIds);
      return sourcePeople.filter((person) => ids.has(person.id));
    }

    // Fallback for prototype/static data when no real Query Engine is supplied.
    if (viewMode !== "3") return sourcePeople;
    const generations = sourcePeople.map(person => person.generation);
    const middleGeneration = generations.length ? Math.floor((Math.min(...generations) + Math.max(...generations)) / 2) : 1;
    const focusGeneration = peopleById.get(viewAnchorPersonId ?? initialFocusId ?? "")?.generation ?? middleGeneration;
    const minGeneration = Math.max(1, focusGeneration - 1);
    const maxGeneration = minGeneration + 2;
    return sourcePeople.filter(
      (person) => person.generation >= minGeneration && person.generation <= maxGeneration,
    );
  }, [viewAnchorPersonId, focusSubgraphPreview, initialFocusId, peopleById, sourcePeople, viewMode]);

  // Phase 8.2C: keep the safe O(E) partner adjacency index from 8.2B,
  // but restore the proven 8.2 progressive scheduling. The index removes
  // repeated full relationship scans without moving work across tab frames.
  const partnerIdsByPerson = useMemo(() => {
    const result = new Map<string, string[]>();
    const add = (personId: string, partnerId: string) => {
      const current = result.get(personId) ?? [];
      current.push(partnerId);
      result.set(personId, current);
    };
    for (const connection of sourceConnections) {
      if (connection.type !== "partner") continue;
      add(connection.fromId, connection.toId);
      add(connection.toId, connection.fromId);
    }
    return result;
  }, [sourceConnections]);

  // BSH: production bootstrap IDs are precomputed in GraphScene. The renderer
  // consumes them verbatim and never traverses genealogy relationships here.
  const focusBootstrapPersonIds = useMemo(() => {
    if (scene) return new Set(scene.bootstrapPersonIds);

    // Prototype-only fallback (no production scene supplied).
    const ids = new Set<string>();
    const anchorId = viewAnchorPersonId ?? initialFocusId;
    if (!anchorId || !peopleById.has(anchorId)) return ids;
    ids.add(anchorId);
    for (const connection of sourceConnections) {
      if (connection.type === "partner") {
        if (connection.fromId === anchorId && peopleById.has(connection.toId)) ids.add(connection.toId);
        if (connection.toId === anchorId && peopleById.has(connection.fromId)) ids.add(connection.fromId);
      } else if (connection.type === "parent_child" && connection.toId === anchorId && peopleById.has(connection.fromId)) {
        ids.add(connection.fromId);
      }
    }
    return ids;
  }, [initialFocusId, peopleById, scene, sourceConnections, viewAnchorPersonId]);

  const progressivePeople = useMemo(
    () => viewMode === "all"
      ? buildProgressiveFamilyGraphOrder(
          visiblePeople,
          sourceConnections,
          viewAnchorPersonId ?? initialFocusId,
        )
      : visiblePeople,
    [viewAnchorPersonId, initialFocusId, sourceConnections, viewMode, visiblePeople],
  );

  // P2.12 retained graph: Model/Layout/Geometry may describe the whole selected
  // scene, but React mounts only spatially discovered IDs. There is no background
  // 28→52→76... expansion anymore for Full Tree, 3-gen, 5-gen, or Focus.
  // The candidate list is immutable drawing data; the retained set below only grows.
  const renderedPeople = progressivePeople;
  const renderedIds = useMemo(() => new Set(renderedPeople.map((person) => person.id)), [renderedPeople]);
  const renderedConnections = useMemo(
    () => sourceConnections.filter(
      (connection) => renderedIds.has(connection.fromId) && renderedIds.has(connection.toId),
    ),
    [renderedIds, sourceConnections],
  );

  const viewportSpatialGrid = useMemo(() => {
    const grid = new FamilyGraphSpatialGrid(FAMILY_GRAPH_RENDER_CONFIG.viewportGridCellSize);
    for (const person of renderedPeople) {
      grid.insertNode(person.id, getFamilyGraphNodeRect({
        person,
        nodeSlotWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
        nodeCardWidth: NODE_CARD_WIDTH,
        nodeCardHeight: NODE_CARD_HEIGHT,
        padding: 20,
      }));
    }
    return grid;
  }, [renderedPeople]);

  const collectPersonIdsForCamera = useCallback((camera: FamilyGraphCameraSnapshot) => {
    const bounds = getFamilyGraphViewportRect({
      camera,
      viewport,
      canvasWidth: effectiveCanvasWidth,
      canvasHeight: effectiveCanvasHeight,
      overscanScreens: FAMILY_GRAPH_RENDER_CONFIG.viewportOverscanScreens,
    });
    const ids = new Set<string>();
    if (viewport.width <= 0 || viewport.height <= 0) {
      for (const person of renderedPeople.slice(0, FAMILY_GRAPH_RENDER_CONFIG.preLayoutMountBudget)) ids.add(person.id);
    } else {
      for (const entry of viewportSpatialGrid.queryRect(bounds)) {
        if (entry.kind === "node" && rectsIntersect(entry.rect, bounds)) ids.add(entry.id);
      }
    }

    for (const personId of focusBootstrapPersonIds) {
      if (renderedIds.has(personId)) ids.add(personId);
    }

    [viewAnchorPersonId, highlightedPersonId, selectedPersonId, detailPersonId].forEach((personId) => {
      if (personId && renderedIds.has(personId)) ids.add(personId);
    });

    const queue = [...ids];
    for (let index = 0; index < queue.length; index += 1) {
      const personId = queue[index];
      for (const partnerId of partnerIdsByPerson.get(personId) ?? []) {
        if (!renderedIds.has(partnerId) || ids.has(partnerId)) continue;
        ids.add(partnerId);
        queue.push(partnerId);
      }
    }
    return ids;
  }, [detailPersonId, effectiveCanvasHeight, effectiveCanvasWidth, focusBootstrapPersonIds, highlightedPersonId, partnerIdsByPerson, renderedIds, renderedPeople, selectedPersonId, viewAnchorPersonId, viewport, viewportSpatialGrid]);

  const visibleNowPersonIds = useMemo(
    () => collectPersonIdsForCamera(cameraSnapshot),
    [cameraSnapshot, collectPersonIdsForCamera],
  );

  const appendRetainedPersonIds = useCallback((
    personIds: Iterable<string>,
    urgent = false,
  ) => {
    const current = retainedPersonIdsRef.current;
    const next = mergeRetainedFamilyGraphPersonIds(current, new Set(personIds));
    if (next.size === current.size) return false;

    // Update the imperative mirror before scheduling React. A camera crossing a
    // previously loaded chunk can now return here without enqueueing any state
    // update at all, even if an earlier transition has not committed yet.
    retainedPersonIdsRef.current = next;
    if (scene) retainFamilyGraphRuntimePersonIds(scene.sceneKey, next);
    if (urgent) {
      setRetainedPersonIds(next);
    } else {
      startTransition(() => setRetainedPersonIds(next));
    }
    return true;
  }, [scene]);

  const discoverRetainedCamera = useCallback((camera: FamilyGraphCameraSnapshot) => {
    const cellX = Math.floor(camera.centerX / VIEWPORT_CAMERA_CELL_SIZE);
    const cellY = Math.floor(camera.centerY / VIEWPORT_CAMERA_CELL_SIZE);
    const scaleBucket = Math.round(camera.scale * 10);
    const viewportWidthBucket = Math.round(viewport.width / 64);
    const viewportHeightBucket = Math.round(viewport.height / 64);
    const regionKey = [
      scene?.sceneKey ?? "prototype",
      viewMode,
      viewAnchorPersonId ?? initialFocusId ?? "none",
      cellX,
      cellY,
      scaleBucket,
      viewportWidthBucket,
      viewportHeightBucket,
    ].join(":");
    if (loadedRegionKeysRef.current.has(regionKey)) return;
    loadedRegionKeysRef.current.add(regionKey);

    const discovered = collectPersonIdsForCamera(camera);
    if (discovered.size === 0) return;
    appendRetainedPersonIds(discovered);
  }, [appendRetainedPersonIds, collectPersonIdsForCamera, initialFocusId, scene?.sceneKey, viewAnchorPersonId, viewMode, viewport.height, viewport.width]);

  // Reset only the discovery-key index when the selected logical scene changes.
  // Retained IDs themselves remain monotonic for the mounted scene; this reset
  // merely allows the new mode/anchor to discover its own viewport once.
  useEffect(() => {
    loadedRegionKeysRef.current.clear();
  }, [scene?.sceneKey, viewAnchorPersonId, viewMode]);

  // Initial viewport discovery for every graph mode. Once an ID is mounted it
  // remains mounted for the lifetime of this scene; moving back over a loaded
  // region therefore performs only the UI-thread camera transform.
  useEffect(() => {
    if (visibleNowPersonIds.size === 0) return;
    appendRetainedPersonIds(visibleNowPersonIds);
  }, [appendRetainedPersonIds, visibleNowPersonIds]);

  const viewportPersonIds = retainedPersonIds;

  const viewportPeople = useMemo(
    () => renderedPeople.filter((person) => viewportPersonIds.has(person.id)),
    [renderedPeople, viewportPersonIds],
  );
  useEffect(() => {
    onRenderedCountChange?.(viewportPeople.length, progressivePeople.length);
  }, [onRenderedCountChange, progressivePeople.length, viewportPeople.length]);

  // P2.11.2 BSH first-paint contract. Readiness must not depend on progressive
  // culling/retained-set churn: those states may continue changing for a large
  // branch after the selected Person is already paintable. Once a prepared scene
  // exists, the viewport is measured, and the initial camera has been applied, two
  // native frames are enough to release (and then unmount) the compact loader.
  useEffect(() => {
    if (!onVisualReady || visualReadyFiredRef.current) return;
    if (viewport.width <= 0 || viewport.height <= 0) return;
    if (!hasCenteredInitially.current) return;

    let cancelled = false;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      secondFrame = requestAnimationFrame(() => {
        if (cancelled || visualReadyFiredRef.current) return;
        visualReadyFiredRef.current = true;
        onVisualReady();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [
    onVisualReady,
    scene?.sceneKey,
    viewport.height,
    viewport.width,
  ]);

  const filteredPeople = useMemo(() => {
    const normalized = searchText.trim().toLocaleLowerCase("vi");
    if (!normalized) return sourcePeople;

    return sourcePeople.filter((person) =>
      `${person.displayName} ${person.shortName}`.toLocaleLowerCase("vi").includes(normalized),
    );
  }, [searchText, sourcePeople]);

  const setPan = useCallback((next: Point) => {
    activeCameraTranslateX.value = next.x;
    activeCameraTranslateY.value = next.y;
  }, [activeCameraTranslateX, activeCameraTranslateY]);

  const setScaleValue = useCallback((nextScale: number) => {
    // Không giới hạn UX ở Phase 6.0. Chỉ giữ guard kỹ thuật tối thiểu
    // để scale không tiến về 0; chưa áp giới hạn zoom lớn/nhỏ cho UX.
    const safeScale = Math.max(MIN_SAFE_SCALE, nextScale);
    activeCameraScale.value = safeScale;
    return safeScale;
  }, [activeCameraScale]);

  const commitCameraSnapshot = useCallback((centerX: number, centerY: number, scale: number) => {
    const next = { centerX, centerY, scale };
    if (scene && userCameraInteractedRef.current) updateFamilyGraphRuntimeCamera(scene.sceneKey, next);
    setCameraSnapshot((current) => {
      if (
        Math.abs(current.centerX - centerX) < 0.5
        && Math.abs(current.centerY - centerY) < 0.5
        && Math.abs(current.scale - scale) < 0.005
      ) return current;
      return next;
    });
  }, [scene]);

  const markUserCameraInteraction = useCallback(() => {
    userCameraInteractedRef.current = true;
  }, []);

  const commitUserCameraTransform = useCallback((translateX: number, translateY: number, scale: number) => {
    if (viewport.width <= 0 || viewport.height <= 0) return;
    userCameraInteractedRef.current = true;
    const camera = getFamilyGraphCameraSnapshotFromTransform({
      transform: { translateX, translateY, scale: Math.max(MIN_SAFE_SCALE, scale) },
      viewport,
      canvasWidth: effectiveCanvasWidth,
      canvasHeight: effectiveCanvasHeight,
    });
    commitCameraSnapshot(camera.centerX, camera.centerY, camera.scale);
  }, [commitCameraSnapshot, effectiveCanvasHeight, effectiveCanvasWidth, viewport]);

  useEffect(() => {
    if (!onViewStateChange) return;
    onViewStateChange({
      viewMode,
      viewAnchorPersonId,
      camera: cameraSnapshot,
    });
  }, [cameraSnapshot, onViewStateChange, viewAnchorPersonId, viewMode]);

  // Viewport-aware rendering must not send every pan/pinch frame through React.
  // The UI thread tracks the camera continuously, but JS is notified only after
  // crossing one coarse spatial cell (or a meaningful zoom bucket). Overscan
  // keeps nearby nodes mounted between these updates, avoiding blank edges.
  useAnimatedReaction(
    () => {
      if (viewport.width <= 0 || viewport.height <= 0) return null;
      const camera = getFamilyGraphCameraSnapshotFromTransform({
        transform: {
          translateX: activeCameraTranslateX.value,
          translateY: activeCameraTranslateY.value,
          scale: activeCameraScale.value,
        },
        viewport,
        canvasWidth: effectiveCanvasWidth,
        canvasHeight: effectiveCanvasHeight,
      });
      return {
        ...camera,
        cellX: Math.floor(camera.centerX / VIEWPORT_CAMERA_CELL_SIZE),
        cellY: Math.floor(camera.centerY / VIEWPORT_CAMERA_CELL_SIZE),
        scaleBucket: Math.round(camera.scale * 10),
      };
    },
    (current, previous) => {
      if (!current) return;
      if (
        !previous
        || current.cellX !== previous.cellX
        || current.cellY !== previous.cellY
        || current.scaleBucket !== previous.scaleBucket
      ) {
        runOnJS(discoverRetainedCamera)({
          centerX: current.centerX,
          centerY: current.centerY,
          scale: current.scale,
        });
      }
    },
  );

  const overviewCenter = useMemo(() => {
    if (!visiblePeople.length) return {x: effectiveCanvasWidth / 2, y: effectiveCanvasHeight / 2};
    const xs = visiblePeople.map(person => person.x);
    const ys = visiblePeople.map(person => person.y);
    return {x: (Math.min(...xs) + Math.max(...xs) + FAMILY_GRAPH_CANVAS.nodeWidth) / 2,
      y: (Math.min(...ys) + Math.max(...ys) + NODE_CARD_HEIGHT) / 2};
  }, [visiblePeople, effectiveCanvasWidth, effectiveCanvasHeight]);
  const centerOverview = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    const scale = activeCameraScale.value;
    const pan = getFamilyGraphPanForAnchor({
      canvasPoint: overviewCenter,
      viewportPoint: { x: viewport.width / 2, y: viewport.height * 0.46 },
      scale,
      canvasWidth: effectiveCanvasWidth,
      canvasHeight: effectiveCanvasHeight,
    });
    setPan(pan);
    const camera = getFamilyGraphCameraSnapshotFromTransform({
      transform: { translateX: pan.x, translateY: pan.y, scale },
      viewport,
      canvasWidth: effectiveCanvasWidth,
      canvasHeight: effectiveCanvasHeight,
    });
    commitCameraSnapshot(camera.centerX, camera.centerY, camera.scale);
  }, [viewport, activeCameraScale, setPan, overviewCenter, effectiveCanvasWidth, effectiveCanvasHeight, commitCameraSnapshot]);

  const centerOnPerson = useCallback((personId: string, requestedScale?: number) => {
    const person = peopleById.get(personId);
    if (!person || viewport.width <= 0 || viewport.height <= 0) return;

    const targetScale = requestedScale ?? activeCameraScale.value;
    const pan = getFamilyGraphPanForAnchor({
      canvasPoint: {
        x: person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2,
        y: person.y + NODE_CARD_HEIGHT / 2,
      },
      viewportPoint: { x: viewport.width / 2, y: viewport.height * 0.46 },
      scale: targetScale,
      canvasWidth: effectiveCanvasWidth,
      canvasHeight: effectiveCanvasHeight,
    });
    setPan(pan);
    const camera = getFamilyGraphCameraSnapshotFromTransform({
      transform: { translateX: pan.x, translateY: pan.y, scale: targetScale },
      viewport,
      canvasWidth: effectiveCanvasWidth,
      canvasHeight: effectiveCanvasHeight,
    });
    commitCameraSnapshot(camera.centerX, camera.centerY, camera.scale);
  }, [activeCameraScale, commitCameraSnapshot, effectiveCanvasHeight, effectiveCanvasWidth, peopleById, setPan, viewport]);

  const panGesture = useMemo(() => Gesture.Pan()
    .minDistance(3)
    .maxPointers(1)
    .onStart(() => {
      "worklet";
      runOnJS(markUserCameraInteraction)();
      // Một phiên pan chỉ hợp lệ nếu nó thực sự bắt đầu khi không pinch.
      // Nếu user đang kéo 1 ngón rồi đặt ngón thứ hai để pinch, pinch sẽ
      // invalidate phiên pan này để ngón còn lại không "đẩy" canvas khi thả pinch.
      if (pinchActive.value === 0) {
        panSessionValid.value = 1;
        panStartX.value = activeCameraTranslateX.value;
        panStartY.value = activeCameraTranslateY.value;
      } else {
        panSessionValid.value = 0;
      }
    })
    .onUpdate((event) => {
      "worklet";
      if (pinchActive.value !== 0 || panSessionValid.value === 0) return;
      const next = applyMainFamilyGraphPanDelta(
        panStartX.value,
        panStartY.value,
        event.translationX,
        event.translationY,
      );
      activeCameraTranslateX.value = next.x;
      activeCameraTranslateY.value = next.y;
    })
    .onFinalize(() => {
      "worklet";
      if (panSessionValid.value !== 0) {
        runOnJS(commitUserCameraTransform)(activeCameraTranslateX.value, activeCameraTranslateY.value, activeCameraScale.value);
      }
      panSessionValid.value = 0;
    }), [
      activeCameraTranslateX,
      activeCameraTranslateY,
      panSessionValid,
      panStartX,
      panStartY,
      pinchActive,
      markUserCameraInteraction,
      commitUserCameraTransform,
      activeCameraScale,
    ]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onStart((event) => {
      "worklet";
      runOnJS(markUserCameraInteraction)();
      pinchActive.value = 1;
      panSessionValid.value = 0;

      const startScale = Math.max(MIN_SAFE_SCALE, activeCameraScale.value);
      pinchStartScale.value = startScale;

      const canvasCenterX = effectiveCanvasWidth / 2;
      const canvasCenterY = effectiveCanvasHeight / 2;

      // Chốt DUY NHẤT điểm canvas nằm dưới tâm hai ngón lúc bắt đầu pinch.
      // Mọi frame sau chỉ dùng event.scale + focal hiện tại để giữ nguyên điểm neo này.
      // Không tích lũy delta từng frame => không drift và không có cú "đẩy" cuối gesture.
      pinchAnchorCanvasX.value = canvasCenterX
        + (event.focalX - activeCameraTranslateX.value - canvasCenterX) / startScale;
      pinchAnchorCanvasY.value = canvasCenterY
        + (event.focalY - activeCameraTranslateY.value - canvasCenterY) / startScale;
    })
    .onUpdate((event) => {
      "worklet";
      // Một số thiết bị Android có thể phát thêm một update khi một trong hai
      // ngón vừa rời màn hình. focal của frame đó có thể nhảy về ngón còn lại
      // và làm canvas bị "đẩy" đúng lúc người dùng buông tay. Bỏ qua frame
      // không còn đủ 2 pointer để trạng thái cuối luôn là frame pinch hợp lệ cuối cùng.
      if (event.numberOfPointers < 2) return;

      // Zoom trực tiếp theo scale từ đầu gesture: tay đi bao nhiêu, canvas đi bấy nhiêu.
      // Phase 6.0 chưa áp giới hạn UX; chỉ có guard kỹ thuật rất rộng.
      const nextScale = applyMainFamilyGraphPinchScale(
        pinchStartScale.value,
        event.scale,
        MIN_SAFE_SCALE,
      );
      const canvasCenterX = effectiveCanvasWidth / 2;
      const canvasCenterY = effectiveCanvasHeight / 2;

      activeCameraScale.value = nextScale;
      activeCameraTranslateX.value = event.focalX
        - canvasCenterX
        - nextScale * (pinchAnchorCanvasX.value - canvasCenterX);
      activeCameraTranslateY.value = event.focalY
        - canvasCenterY
        - nextScale * (pinchAnchorCanvasY.value - canvasCenterY);
    })
    .onFinalize(() => {
      "worklet";
      // Do not mutate the transform on release. Persist the exact final user
      // camera separately so a tiny gesture that stayed inside one culling cell
      // can still hydrate correctly on the next open.
      runOnJS(commitUserCameraTransform)(activeCameraTranslateX.value, activeCameraTranslateY.value, activeCameraScale.value);
      pinchActive.value = 0;
      panSessionValid.value = 0;
    }), [
      activeCameraScale,
      activeCameraTranslateX,
      activeCameraTranslateY,
      panSessionValid,
      pinchActive,
      pinchAnchorCanvasX,
      pinchAnchorCanvasY,
      pinchStartScale,
      effectiveCanvasHeight,
      effectiveCanvasWidth,
      markUserCameraInteraction,
      commitUserCameraTransform,
    ]);

  const canvasGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture],
  );

  // Tách pan và scale thành hai layer để thứ tự transform luôn xác định:
  // scale quanh tâm canvas trước, sau đó parent translate toàn bộ surface.
  const canvasPanStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: activeCameraTranslateX.value },
      { translateY: activeCameraTranslateY.value },
    ],
  }));

  const canvasScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: activeCameraScale.value }],
  }));

  const handleRootLayout = useCallback((_event: LayoutChangeEvent) => {
    // Main Tree no longer measures window geometry for Focus. Focus is a route
    // sibling with its own native layout and camera.
  }, []);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = {
      x: event.nativeEvent.layout.x,
      y: event.nativeEvent.layout.y,
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
    setViewport(next);
    if (!hasCenteredInitially.current && next.width > 0 && next.height > 0) {
      hasCenteredInitially.current = true;
      const person = peopleById.get(initialFocusId ?? "");
      const applyAnchorCamera = (
        canvasPoint: Point,
        viewportPoint: Point,
        scale: number,
      ) => {
        const pan = getFamilyGraphPanForAnchor({
          canvasPoint,
          viewportPoint,
          scale,
          canvasWidth: effectiveCanvasWidth,
          canvasHeight: effectiveCanvasHeight,
        });
        setScaleValue(scale);
        setPan(pan);
        const camera = getFamilyGraphCameraSnapshotFromTransform({
          transform: { translateX: pan.x, translateY: pan.y, scale },
          viewport: next,
          canvasWidth: effectiveCanvasWidth,
          canvasHeight: effectiveCanvasHeight,
        });
        commitCameraSnapshot(camera.centerX, camera.centerY, camera.scale);
      };

      if (initialCameraSnapshot && !autoFitOnMount) {
        const restoredScale = Math.max(MIN_SAFE_SCALE, initialCameraSnapshot.scale);
        applyAnchorCamera(
          { x: initialCameraSnapshot.centerX, y: initialCameraSnapshot.centerY },
          { x: next.width / 2, y: next.height / 2 },
          restoredScale,
        );
        return;
      }

      // Production BSH scene owns the entry camera. Renderer only maps the
      // precomputed canvas point to the measured viewport; it never fit-alls a
      // Focus branch or re-derives coordinates while drawing.
      if (scene?.initialCamera) {
        applyAnchorCamera(
          scene.initialCamera.canvasPoint,
          {
            x: next.width * scene.initialCamera.viewportAnchor.x,
            y: next.height * scene.initialCamera.viewportAnchor.y,
          },
          Math.max(MIN_SAFE_SCALE, scene.initialCamera.scale),
        );
        return;
      }

      if (autoFitOnMount && visiblePeople.length) {
        const focusPerson = peopleById.get(viewAnchorPersonId ?? initialFocusId ?? "");

        const minX = Math.min(...visiblePeople.map((item) => item.x));
        const maxX = Math.max(...visiblePeople.map((item) => item.x + FAMILY_GRAPH_CANVAS.nodeWidth));
        const minY = Math.min(...visiblePeople.map((item) => item.y));
        const maxY = Math.max(...visiblePeople.map((item) => item.y + NODE_CARD_HEIGHT));
        const contentWidth = Math.max(1, maxX - minX);
        const contentHeight = Math.max(1, maxY - minY);
        const fitScale = Math.max(
          MIN_SAFE_SCALE,
          Math.min(
            1,
            Math.max(0.12, (next.width - 28) / contentWidth),
            Math.max(0.12, (next.height - 28) / contentHeight),
          ),
        );
        applyAnchorCamera(
          overviewCenter,
          { x: next.width / 2, y: next.height / 2 },
          fitScale,
        );
        return;
      }

      if (!person) {
        applyAnchorCamera(
          overviewCenter,
          { x: next.width / 2, y: next.height * 0.46 },
          INITIAL_SCALE,
        );
        return;
      }

      applyAnchorCamera(
        {
          x: person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2,
          y: person.y + NODE_CARD_HEIGHT / 2,
        },
        { x: next.width / 2, y: next.height * 0.46 },
        INITIAL_SCALE,
      );
    }
  }, [autoFitOnMount, commitCameraSnapshot, effectiveCanvasHeight, effectiveCanvasWidth, initialCameraSnapshot, initialFocusId, peopleById, scene, setPan, setScaleValue, overviewCenter, viewAnchorPersonId, visiblePeople]);

  const handlePersonSheetDismiss = useCallback(() => {
    setDetailPersonId(null);
    setDetailFocusHandoffPending(false);
  }, []);

  const handleOpenBranch = useCallback((personId: string) => {
    if (!onOpenFocus) return;
    // Main Tree owns only the intent. Yield the Detail sheet first, then let the
    // route-level Focus sibling mount on a later native frame. No Focus runtime
    // or native Modal is created inside Main Tree.
    setSearchVisible(false);
    setSelectedPersonId(null);
    setDetailFocusHandoffPending(true);
    setDetailPersonId(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDetailFocusHandoffPending(false);
        onOpenFocus(personId);
      });
    });
  }, [onOpenFocus]);

  const handleMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);

    const currentScale = activeCameraScale.value;
    const targetScale = mode === "all"
      ? Math.min(currentScale, 0.72)
      : mode === "3"
        ? Math.max(currentScale, 0.98)
        : Math.max(Math.min(currentScale, 0.9), 0.82);

    setScaleValue(targetScale);
    const targetId = viewAnchorPersonId ?? initialFocusId;
    if (targetId) requestAnimationFrame(() => centerOnPerson(targetId, targetScale));
  }, [centerOnPerson, viewAnchorPersonId, initialFocusId, setScaleValue]);

  const ensurePersonMounted = useCallback((personId: string) => {
    if (!progressivePeople.some((person) => person.id === personId)) return;
    appendRetainedPersonIds([personId], true);
  }, [appendRetainedPersonIds, progressivePeople]);

  const selectFromSearch = useCallback((person: FamilyGraphPrototypePerson) => {
    setSearchVisible(false);
    setSearchText("");
    const alreadyInScope = visiblePeople.some((item) => item.id === person.id);
    if (viewMode !== "all" && !alreadyInScope) {
      // Searching outside a bounded 3/5-generation scope promotes that Person
      // to a new view anchor instead of centering onto an invisible card.
      setViewAnchorPersonId(person.id);
      setHighlightedPersonId(person.id);
    }
    ensurePersonMounted(person.id);
    setSelectedPersonId(person.id);
    setDetailPersonId(person.id);
    requestAnimationFrame(() => centerOnPerson(person.id));
  }, [centerOnPerson, ensurePersonMounted, viewMode, visiblePeople]);

  const handlePersonPress = useCallback((personId: string) => {
    if (branchMode) {
      void handleOpenBranch(personId);
      return;
    }
    setSelectedPersonId(personId);
    setDetailPersonId(personId);
  }, [branchMode, handleOpenBranch]);

  return (
    <View ref={rootRef} onLayout={handleRootLayout} style={styles.root}>
      <View style={styles.baseGraphLayer}>
      {headerMode !== "none" && (
        <View style={[styles.titleRow, headerMode === "controls" && styles.titleRowControlsOnly]}>
          {headerMode === "full" ? (
            <View style={styles.titleCopy}>
              <Text style={styles.title}>Phả hệ gia đình</Text>
              <Text style={styles.subtitle}>
                {viewMode === "all"
                  ? `Toàn phả hệ · ${familyName}`
                  : `${visiblePeople.length} người · ${viewMode === "3" ? "3 thế hệ" : "5 thế hệ"} · ${familyName}`}
              </Text>
            </View>
          ) : (
            <View style={styles.controlsLabel}>
              <Ionicons name="leaf-outline" size={15} color={COLORS.primary} />
              <Text style={styles.controlsLabelText}>Chọn cách xem cây</Text>
            </View>
          )}
          <View style={styles.headerActions}>
            {canEdit && onAddPerson ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thêm người vào phả hệ"
                onPress={onAddPerson}
                style={({ pressed }) => [styles.addPersonButton, pressed && styles.pressed]}
              >
                <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
                <Text style={styles.addPersonText}>Thêm</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tìm trong phả hệ"
              onPress={() => setSearchVisible(true)}
              style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
            >
              <Ionicons name="search" size={21} color={COLORS.primaryText} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.modeRow}>
        <BloomChipButton label="3 thế hệ" selected={viewMode === "3"} onPress={() => handleMode("3")} />
        <BloomChipButton label="5 thế hệ" selected={viewMode === "5"} onPress={() => handleMode("5")} />
        <BloomChipButton label="Toàn phả hệ" selected={viewMode === "all"} onPress={() => handleMode("all")} />
      </View>

      {focusSubgraphPreview?.truncated && viewMode !== "all" && (
        <View style={styles.subgraphNotice}>
          <Ionicons name="leaf-outline" size={14} color={COLORS.primary} />
          <Text style={styles.subgraphNoticeText}>
            Đang giới hạn {focusSubgraphPreview.requestedMaxPeople} người để cây luôn mượt. Chọn “Toàn phả hệ” để xem tất cả.
          </Text>
        </View>
      )}

      <View style={styles.viewport} onLayout={handleViewportLayout}>
        <GestureHandlerRootView style={styles.gestureRoot}>
          <GestureDetector gesture={canvasGesture}>
            <View collapsable={false} style={StyleSheet.absoluteFill}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedPersonId(null)} />

              <Animated.View style={[styles.canvasPanLayer, { width: effectiveCanvasWidth, height: effectiveCanvasHeight }, canvasPanStyle]}>
                <Animated.View style={[styles.canvas, { width: effectiveCanvasWidth, height: effectiveCanvasHeight }, canvasScaleStyle]}>
                  <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedPersonId(null)} />

                  {Array.from(new Set(visiblePeople.map((person) => person.generation))).map((generation) => {
                    const y = visiblePeople.find((person) => person.generation === generation)?.y ?? 0;
                    return (
                      <View key={`generation-${generation}`} style={[styles.generationTag, { top: y + 18 }]}>
                        <Text style={styles.generationTitle} numberOfLines={2}>Thế hệ {generation}</Text>
                        <Text style={styles.generationCaption} numberOfLines={2}>{generationCaption[generation]}</Text>
                      </View>
                    );
                  })}

                  <GraphConnectors
                    people={renderedPeople}
                    connections={renderedConnections}
                    geometry={scene?.geometry ?? null}
                    activeBranchIds={activeBranchIds}
                    canvasWidth={effectiveCanvasWidth}
                    renderBounds={null}
                    mountedPersonIds={viewportPersonIds}
                  />

                  {viewportPeople.map((person) => (
                    <PersonNode
                      key={person.id}
                      person={person}
                      selected={selectedPersonId === person.id}
                      focused={highlightedPersonId === person.id}
                      inFocusedBranch={activeBranchIds.has(person.id)}
                      branchMode={branchMode}
                      onPressPerson={handlePersonPress}
                    />
                  ))}
                </Animated.View>
              </Animated.View>
            </View>
          </GestureDetector>

          <Pressable
            accessibilityLabel={branchMode ? "Tắt chế độ mở nhánh" : "Bật chế độ mở nhánh"}
            accessibilityState={{ selected: branchMode }}
            onPress={() => {
              setBranchMode((value) => !value);
              setSelectedPersonId(null);
            }}
            style={({ pressed }) => [
              styles.branchModeButton,
              branchMode && styles.branchModeButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="git-network-outline" size={24} color={branchMode ? COLORS.white : COLORS.primaryText} />
            <Text style={[styles.branchModeButtonText, branchMode && styles.branchModeButtonTextActive]}>Nhánh</Text>
          </Pressable>

          <View style={styles.zoomControls}>
            <Pressable
              accessibilityLabel="Quay về người đang xem"
              onPress={() => {
                const targetId = viewAnchorPersonId ?? initialFocusId;
                if (targetId) centerOnPerson(targetId); else centerOverview();
              }}
              style={({ pressed }) => [styles.zoomButton, pressed && styles.pressed]}
            >
              <Ionicons name="locate" size={23} color={COLORS.primary} />
            </Pressable>
          </View>

          <View pointerEvents="none" style={styles.legend}>
            <LegendDot color={COLORS.positive} label="Đang sống" />
            <LegendIcon icon="leaf-outline" label="Đã mất" />
            <LegendIcon icon="link-outline" label="Đã liên kết" />
          </View>
        </GestureHandlerRootView>
      </View>

      </View>

      <FamilyGraphPersonSheet
        person={detailPerson}
        visible={!!detailPerson && !detailFocusHandoffPending}
        onClose={() => {
          setDetailFocusHandoffPending(false);
          setDetailPersonId(null);
          setSelectedPersonId(null);
        }}
        onDismiss={handlePersonSheetDismiss}
        dismissImmediately={detailFocusHandoffPending}
        onOpenBranch={handleOpenBranch}
        canEdit={canEdit}
        onEditPerson={onEditPerson}
        onDeletePerson={onDeletePerson}
        onDeleteRelationship={onDeleteRelationship}
        directRelationships={detailDirectRelationships}
        familyId={familyId}
        showPrototypeNote={people === undefined}
        focusPersonName={null}
        relationshipToFocus={null}
      />

      <Modal visible={searchVisible} transparent animationType="fade" onRequestClose={() => setSearchVisible(false)}>
        <View style={styles.searchModalRoot}>
          <Pressable style={styles.searchBackdrop} onPress={() => setSearchVisible(false)} />
          <View style={styles.searchSheet}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Tìm trong phả hệ</Text>
              <Pressable onPress={() => setSearchVisible(false)} style={styles.searchClose}>
                <Ionicons name="close" size={20} color={COLORS.primaryText} />
              </Pressable>
            </View>
            <BloomTextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Nhập tên người thân"
              isSearch
              autoFocus
              containerStyle={styles.searchBloomField}
            />
            <View style={styles.searchResults}>
              {filteredPeople.slice(0, 7).map((person) => (
                <Pressable
                  key={person.id}
                  onPress={() => selectFromSearch(person)}
                  style={({ pressed }) => [styles.searchRow, pressed && styles.pressed]}
                >
                  <View style={[styles.searchAvatar, person.gender === "female" ? styles.searchAvatarFemale : styles.searchAvatarMale]}>
                    <Text style={styles.searchAvatarText}>{getAvatarLabel(person.displayName)}</Text>
                  </View>
                  <View style={styles.searchCopy}>
                    <Text style={styles.searchName}>{person.displayName}</Text>
                    <Text style={styles.searchMeta}>
                      Thế hệ {person.generation} · {person.birthYear ?? "Chưa rõ"}{person.deathYear ? `–${person.deathYear}` : person.lifeStatus === "living" ? "–nay" : ""}
                    </Text>
                  </View>
                  <Ionicons name="locate-outline" size={17} color={COLORS.primary} />
                </Pressable>
              ))}
              {!filteredPeople.length && (
                <Text style={styles.noResult}>Chưa thấy người thân nào khớp với tên bạn vừa tìm.</Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



const PersonNode = memo(function PersonNode({
  person,
  selected,
  focused,
  inFocusedBranch,
  branchMode,
  onPressPerson,
}: {
  person: FamilyGraphPrototypePerson;
  selected: boolean;
  focused: boolean;
  inFocusedBranch: boolean;
  branchMode: boolean;
  onPressPerson: (personId: string) => void;
}) {
  const dimmed = !inFocusedBranch && !selected;
  const palette = getPersonNodePalette(person.displayName, focused, dimmed);

  return (
    <View style={[styles.nodeWrap, { left: person.x, top: person.y }]}>
      <Pressable
        accessibilityLabel={branchMode ? `Mở nhánh ${person.displayName}` : `Xem thông tin ${person.displayName}`}
        onPress={() => onPressPerson(person.id)}
        style={({ pressed }) => [
          styles.nodeCard,
          {
            backgroundColor: palette.background,
            shadowColor: palette.shadow,
            shadowOpacity: palette.shadowOpacity,
            elevation: palette.elevation,
          },
          selected && styles.nodeCardSelected,
          pressed && styles.nodePressed,
        ]}
      >
        {branchMode && (
          <View style={[styles.branchPickBadge, dimmed && styles.branchPickBadgeDimmed]}>
            <Ionicons name="git-network-outline" size={14} color={dimmed ? "#AAA5A7" : COLORS.primary} />
          </View>
        )}

        <View
          style={[
            styles.avatarFrame,
            person.gender === "female" ? styles.avatarFrameFemale : styles.avatarFrameMale,
            dimmed && styles.avatarFrameDimmed,
            focused && styles.avatarFocused,
          ]}
        >
          <View
            style={[
              styles.avatarInner,
              person.gender === "female" ? styles.avatarFemale : styles.avatarMale,
              dimmed && styles.avatarInnerDimmed,
            ]}
          >
            <Text allowFontScaling={false} style={[styles.avatarText, dimmed && styles.avatarTextDimmed]}>
              {getAvatarLabel(person.displayName)}
            </Text>
          </View>

          {person.lifeStatus === "deceased" ? (
            <View style={[styles.lifeBadge, dimmed && styles.badgeDimmed]}>
              <Ionicons name="leaf-outline" size={16} color={dimmed ? "#B5B5B5" : COLORS.secondaryText} />
            </View>
          ) : (
            <View style={[styles.lifeBadge, styles.lifeBadgeLiving, dimmed && styles.badgeDimmed]}>
              <View style={[styles.lifeDot, dimmed && styles.lifeDotDimmed]} />
            </View>
          )}

          {person.linkedAccount && (
            <View style={[styles.linkBadge, dimmed && styles.badgeDimmed]}>
              <Ionicons name="link" size={14} color={dimmed ? "#B5B5B5" : COLORS.primary} />
            </View>
          )}

          {focused && (
            <View style={styles.focusBadge}>
              <Ionicons name="locate" size={14} color={COLORS.white} />
            </View>
          )}
        </View>

        <Text
          style={[
            styles.nodeName,
            dimmed && styles.nodeNameDimmed,
            focused && styles.nodeNameFocused,
          ]}
          allowFontScaling={false}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          ellipsizeMode="tail"
        >
          {person.displayName}
        </Text>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          ellipsizeMode="clip"
          style={[styles.nodeYears, dimmed && styles.nodeYearsDimmed, focused && styles.nodeYearsFocused]}
        >
          {person.birthYear ?? "?"} {person.deathYear ? `– ${person.deathYear}` : person.lifeStatus === "living" ? "– nay" : ""}
        </Text>
      </Pressable>
    </View>
  );
}, (previous, next) => (
  previous.person === next.person
  && previous.selected === next.selected
  && previous.focused === next.focused
  && previous.inFocusedBranch === next.inFocusedBranch
  && previous.branchMode === next.branchMode
  && previous.onPressPerson === next.onPressPerson
));

const GraphConnectors = memo(function GraphConnectors({
  people,
  connections,
  geometry,
  activeBranchIds,
  canvasWidth,
  renderBounds,
  mountedPersonIds,
}: {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  geometry?: FamilyGraphGeometry | null;
  activeBranchIds: Set<string>;
  canvasWidth: number;
  renderBounds?: FamilyGraphSpatialRect | null;
  mountedPersonIds?: Set<string>;
}) {
  // P2.12: every prepared BSH Scene uses precomputed Geometry. Camera movement
  // never reroutes/culls a connector; retained IDs only grow in all graph modes.
  if (geometry && !renderBounds && mountedPersonIds) {
    return (
      <PreparedRetainedGraphConnectors
        people={people}
        geometry={geometry}
        activeBranchIds={activeBranchIds}
        canvasWidth={canvasWidth}
        mountedPersonIds={mountedPersonIds}
      />
    );
  }
  return (
    <LegacyGraphConnectors
      people={people}
      connections={connections}
      activeBranchIds={activeBranchIds}
      canvasWidth={canvasWidth}
      renderBounds={renderBounds}
      mountedPersonIds={mountedPersonIds}
    />
  );
});

const PreparedRetainedGraphConnectors = memo(function PreparedRetainedGraphConnectors({
  people,
  geometry,
  activeBranchIds,
  canvasWidth,
  mountedPersonIds,
}: {
  people: FamilyGraphPrototypePerson[];
  geometry: FamilyGraphGeometry;
  activeBranchIds: Set<string>;
  canvasWidth: number;
  mountedPersonIds: Set<string>;
}) {
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {geometry.partnerUnits.map((unit) => {
        const partnerA = peopleById.get(unit.partnerAId);
        const partnerB = peopleById.get(unit.partnerBId);
        if (!partnerA || !partnerB) return null;
        const partnersMounted = mountedPersonIds.has(partnerA.id) && mountedPersonIds.has(partnerB.id);
        if (!partnersMounted) return null;
        const partnerActive = activeBranchIds.has(partnerA.id) && activeBranchIds.has(partnerB.id);
        const hasMountedChild = unit.sharedChildIds.some((childId) => mountedPersonIds.has(childId));
        return (
          <View key={`prepared-union:${unit.id}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <PreparedPartnerConnector
              partnerA={partnerA}
              partnerB={partnerB}
              active={partnerActive}
                  />
            {hasMountedChild ? (
              <PreparedUnionStemConnector
                partnerA={partnerA}
                partnerB={partnerB}
                active={partnerActive}
                      />
            ) : null}
            {unit.sharedChildIds.map((childId) => {
              if (!mountedPersonIds.has(childId)) return null;
              const child = peopleById.get(childId);
              if (!child) return null;
              return (
                <PreparedUnionChildConnector
                  key={`prepared-union-child:${unit.id}:${childId}`}
                  partnerA={partnerA}
                  partnerB={partnerB}
                  child={child}
                  active={partnerActive && activeBranchIds.has(childId)}
                            canvasWidth={canvasWidth}
                  laneOffset={geometry.routingPlan.laneOffsetByChildId.get(childId) ?? 0}
                />
              );
            })}
          </View>
        );
      })}
      {geometry.singleParentLinks.map((link) => {
        if (!mountedPersonIds.has(link.parentId) || !mountedPersonIds.has(link.childId)) return null;
        const parent = peopleById.get(link.parentId);
        const child = peopleById.get(link.childId);
        if (!parent || !child) return null;
        return (
          <PreparedSingleParentConnector
            key={`prepared-single:${link.id}`}
            parent={parent}
            child={child}
            active={activeBranchIds.has(parent.id) && activeBranchIds.has(child.id)}
                laneOffset={geometry.routingPlan.laneOffsetByConnectionId.get(link.id) ?? 0}
            route={geometry.routingPlan.routeByConnectionId.get(link.id)}
            preferDirectVertical={geometry.routingPlan.directVerticalConnectionIds.has(link.id)}
            preferSideAnchor={geometry.routingPlan.sideAnchorConnectionIds.has(link.id)}
          />
        );
      })}
    </View>
  );
});

const PreparedPartnerConnector = memo(function PreparedPartnerConnector({
  partnerA,
  partnerB,
  active,
}: {
  partnerA: FamilyGraphPrototypePerson;
  partnerB: FamilyGraphPrototypePerson;
  active: boolean;
}) {
  const aX = nodeCenterX(partnerA);
  const bX = nodeCenterX(partnerB);
  const leftPartner = aX <= bX ? partnerA : partnerB;
  const rightPartner = aX <= bX ? partnerB : partnerA;
  const leftPort = nodeConnectorPort(leftPartner, "right", 0);
  const rightPort = nodeConnectorPort(rightPartner, "left", 0);
  const y = (leftPort.y + rightPort.y) / 2;
  const unionX = (aX + bX) / 2;
  const color = active ? ACTIVE_PARENT_COLOR : FADED_PARENT_COLOR;
  const thickness = active ? 2.4 : 1.4;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {rightPort.x > leftPort.x ? (
        <DashedHorizontalLine x1={leftPort.x} x2={rightPort.x} y={y} color={color} thickness={thickness} />
      ) : null}
      {active ? <PartnerRelationIcon x={unionX} y={y} /> : null}
    </View>
  );
});

const PreparedUnionStemConnector = memo(function PreparedUnionStemConnector({
  partnerA,
  partnerB,
  active,
}: {
  partnerA: FamilyGraphPrototypePerson;
  partnerB: FamilyGraphPrototypePerson;
  active: boolean;
}) {
  const aX = nodeCenterX(partnerA);
  const bX = nodeCenterX(partnerB);
  const leftPartner = aX <= bX ? partnerA : partnerB;
  const rightPartner = aX <= bX ? partnerB : partnerA;
  const leftPort = nodeConnectorPort(leftPartner, "right", 0);
  const rightPort = nodeConnectorPort(rightPartner, "left", 0);
  const partnerY = (leftPort.y + rightPort.y) / 2;
  const unionX = (aX + bX) / 2;
  const branchStartY = Math.max(nodeConnectorPort(partnerA, "bottom", 0).y, nodeConnectorPort(partnerB, "bottom", 0).y);
  const color = active ? ACTIVE_PARENT_COLOR : FADED_PARENT_COLOR;
  const thickness = active ? ACTIVE_LINE_THICKNESS : FADED_LINE_THICKNESS;
  return <LineSegment x1={unionX} y1={partnerY + 12} x2={unionX} y2={branchStartY} color={color} thickness={thickness} />;
});

const PreparedUnionChildConnector = memo(function PreparedUnionChildConnector({
  partnerA,
  partnerB,
  child,
  active,
  canvasWidth,
  laneOffset,
}: {
  partnerA: FamilyGraphPrototypePerson;
  partnerB: FamilyGraphPrototypePerson;
  child: FamilyGraphPrototypePerson;
  active: boolean;
  canvasWidth: number;
  laneOffset: number;
}) {
  const aX = nodeCenterX(partnerA);
  const bX = nodeCenterX(partnerB);
  const leftPartner = aX <= bX ? partnerA : partnerB;
  const rightPartner = aX <= bX ? partnerB : partnerA;
  const leftPort = nodeConnectorPort(leftPartner, "right", 0);
  const rightPort = nodeConnectorPort(rightPartner, "left", 0);
  const partnerY = (leftPort.y + rightPort.y) / 2;
  const unionX = (aX + bX) / 2;
  const branchStartY = Math.max(nodeConnectorPort(partnerA, "bottom", 0).y, nodeConnectorPort(partnerB, "bottom", 0).y);
  const childTopPort = nodeConnectorPort(child, "top", 0);
  const verticalGap = Math.max(4, childTopPort.y - branchStartY);
  const legacyEdgeNudge = partnerY < 100 ? (unionX < canvasWidth / 2 ? -2 : 2) : 0;
  const turnY = Math.max(
    branchStartY + 2,
    Math.min(childTopPort.y - 2, branchStartY + verticalGap / 2 + laneOffset + legacyEdgeNudge),
  );
  const color = active ? ACTIVE_PARENT_COLOR : FADED_PARENT_COLOR;
  const thickness = active ? ACTIVE_LINE_THICKNESS : FADED_LINE_THICKNESS;
  return (
    <RoundedStepPath
      startX={unionX}
      startY={branchStartY}
      endX={childTopPort.x}
      endY={childTopPort.y}
      turnY={turnY}
      color={color}
      thickness={thickness}
    />
  );
});

const PreparedSingleParentConnector = memo(function PreparedSingleParentConnector(props: {
  parent: FamilyGraphPrototypePerson;
  child: FamilyGraphPrototypePerson;
  active: boolean;
  laneOffset: number;
  route?: FamilyGraphConnectorRoute;
  preferDirectVertical: boolean;
  preferSideAnchor: boolean;
}) {
  return <SingleParentConnector {...props} />;
});

const LegacyGraphConnectors = memo(function LegacyGraphConnectors({
  people,
  connections,
  activeBranchIds,
  canvasWidth,
  renderBounds,
  mountedPersonIds,
}: {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  activeBranchIds: Set<string>;
  canvasWidth: number;
  renderBounds?: FamilyGraphSpatialRect | null;
  mountedPersonIds?: Set<string>;
}) {
  // Phase 8: connector rendering is viewport bounded, so routing must be too.
  // Previously the component routed the whole progressive batch and only then
  // discarded off-screen links. At 300/500 Person that repeatedly rebuilt a
  // collision plan for edges React would not draw. The viewport already carries
  // overscan, so routing this local working set preserves visible collision
  // context while keeping first-frame work proportional to what the user sees.
  const routingPeople = useMemo(
    () => mountedPersonIds ? people.filter((person) => mountedPersonIds.has(person.id)) : people,
    [mountedPersonIds, people],
  );
  const routingPersonIds = useMemo(() => new Set(routingPeople.map((person) => person.id)), [routingPeople]);
  const routingConnections = useMemo(
    () => connections.filter(
      (connection) => routingPersonIds.has(connection.fromId) && routingPersonIds.has(connection.toId),
    ),
    [connections, routingPersonIds],
  );
  const peopleById = useMemo(() => new Map(routingPeople.map((person) => [person.id, person])), [routingPeople]);
  const routingPlan = useMemo(
    () => buildFamilyGraphConnectorRoutingPlan({
      people,
      connections,
      // person.x is the node-slot origin, so routing centers must use the
      // 128px slot width rather than the 112px visible card width.
      nodeWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
      nodeCardWidth: NODE_CARD_WIDTH,
      nodeCardHeight: NODE_CARD_HEIGHT,
      laneGap: 11,
      canvasWidth,
      gridCellSize: FAMILY_GRAPH_LAYOUT_CONFIG.connectorGridCellSize,
      routePersonIds: routingPersonIds,
      routeConnectionIds: new Set(routingConnections.map((connection) => connection.id)),
    }),
    [canvasWidth, connections, people, routingConnections, routingPersonIds],
  );

  const layout = useMemo(() => {
    const childrenByParent = new Map<string, Set<string>>();

    for (const connection of routingConnections) {
      if (connection.type !== "parent_child") continue;
      const set = childrenByParent.get(connection.fromId) ?? new Set<string>();
      set.add(connection.toId);
      childrenByParent.set(connection.fromId, set);
    }

    const covered = new Set<string>();
    const unions: Array<{
      id: string;
      partnerA: FamilyGraphPrototypePerson;
      partnerB: FamilyGraphPrototypePerson;
      children: FamilyGraphPrototypePerson[];
    }> = [];

    for (const connection of routingConnections) {
      if (connection.type !== "partner") continue;
      const partnerA = peopleById.get(connection.fromId);
      const partnerB = peopleById.get(connection.toId);
      if (!partnerA || !partnerB) continue;

      const childrenA = childrenByParent.get(partnerA.id) ?? new Set<string>();
      const childrenB = childrenByParent.get(partnerB.id) ?? new Set<string>();
      const sharedChildIds = [...childrenA].filter((childId) => childrenB.has(childId));
      const children = sharedChildIds
        .map((childId) => peopleById.get(childId))
        .filter((child): child is FamilyGraphPrototypePerson => !!child)
        .sort((a, b) => a.x - b.x);

      for (const child of children) {
        covered.add(`${partnerA.id}->${child.id}`);
        covered.add(`${partnerB.id}->${child.id}`);
      }

      unions.push({ id: connection.id, partnerA, partnerB, children });
    }

    const singleParentLinks = routingConnections
      .filter((connection) => connection.type === "parent_child")
      .filter((connection) => !covered.has(`${connection.fromId}->${connection.toId}`))
      .map((connection) => ({
        id: connection.id,
        parent: peopleById.get(connection.fromId),
        child: peopleById.get(connection.toId),
      }))
      .filter((item): item is { id: string; parent: FamilyGraphPrototypePerson; child: FamilyGraphPrototypePerson } =>
        !!item.parent && !!item.child,
      );

    return { unions, singleParentLinks };
  }, [peopleById, routingConnections]);

  const visibleUnions = useMemo(() => {
    const eligible = layout.unions.filter((union) =>
      !mountedPersonIds
      || (mountedPersonIds.has(union.partnerA.id) && mountedPersonIds.has(union.partnerB.id)),
    );
    if (!renderBounds) return eligible;
    return eligible.filter((union) => {
      const aPort = nodeConnectorPort(union.partnerA, "right", 0);
      const bPort = nodeConnectorPort(union.partnerB, "left", 0);
      const unionX = (nodeCenterX(union.partnerA) + nodeCenterX(union.partnerB)) / 2;
      const partnerBounds: FamilyGraphSpatialRect = {
        left: Math.min(aPort.x, bPort.x) - 28,
        top: Math.min(aPort.y, bPort.y) - 28,
        right: Math.max(aPort.x, bPort.x) + 28,
        bottom: Math.max(aPort.y, bPort.y) + 28,
      };
      if (rectsIntersect(partnerBounds, renderBounds)) return true;
      return union.children.some((child) => {
        const childTop = nodeConnectorPort(child, "top", 0);
        const branchStartY = Math.max(
          nodeConnectorPort(union.partnerA, "bottom", 0).y,
          nodeConnectorPort(union.partnerB, "bottom", 0).y,
        );
        const childBounds: FamilyGraphSpatialRect = {
          left: Math.min(unionX, childTop.x) - 28,
          top: Math.min(branchStartY, childTop.y) - 28,
          right: Math.max(unionX, childTop.x) + 28,
          bottom: Math.max(branchStartY, childTop.y) + 28,
        };
        return rectsIntersect(childBounds, renderBounds);
      });
    });
  }, [layout.unions, mountedPersonIds, renderBounds]);

  const visibleSingleParentLinks = useMemo(() => {
    const eligible = layout.singleParentLinks.filter((link) =>
      !mountedPersonIds
      || (mountedPersonIds.has(link.parent.id) && mountedPersonIds.has(link.child.id)),
    );
    if (!renderBounds) return eligible;
    return eligible.filter((link) => {
      const route = routingPlan.routeByConnectionId.get(link.id);
      if (route?.points.length) {
        return rectsIntersect(getPolylineBounds(route.points, 28), renderBounds);
      }
      const parentRect = getFamilyGraphNodeRect({
        person: link.parent,
        nodeSlotWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
        nodeCardWidth: NODE_CARD_WIDTH,
        nodeCardHeight: NODE_CARD_HEIGHT,
        padding: 28,
      });
      const childRect = getFamilyGraphNodeRect({
        person: link.child,
        nodeSlotWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
        nodeCardWidth: NODE_CARD_WIDTH,
        nodeCardHeight: NODE_CARD_HEIGHT,
        padding: 28,
      });
      const bounds: FamilyGraphSpatialRect = {
        left: Math.min(parentRect.left, childRect.left),
        top: Math.min(parentRect.top, childRect.top),
        right: Math.max(parentRect.right, childRect.right),
        bottom: Math.max(parentRect.bottom, childRect.bottom),
      };
      return rectsIntersect(bounds, renderBounds);
    });
  }, [layout.singleParentLinks, mountedPersonIds, renderBounds, routingPlan.routeByConnectionId]);

  const isSingleLinkActive = (link: (typeof visibleSingleParentLinks)[number]) =>
    activeBranchIds.has(link.parent.id) && activeBranchIds.has(link.child.id);

  const inactiveSingleLinks = visibleSingleParentLinks.filter((link) => !isSingleLinkActive(link));
  const activeSingleLinks = visibleSingleParentLinks.filter(isSingleLinkActive);

  const renderUnionPass = (renderPass: "inactive" | "active") => visibleUnions.map((union) => (
    <UnionConnector
      key={`${renderPass}-${union.id}`}
      partnerA={union.partnerA}
      partnerB={union.partnerB}
      children={union.children}
      activeBranchIds={activeBranchIds}
      renderPass={renderPass}
      canvasWidth={canvasWidth}
      laneOffsetByChildId={routingPlan.laneOffsetByChildId}
      renderBounds={renderBounds}
      mountedPersonIds={mountedPersonIds}
    />
  ));

  const renderSingleLinks = (links: typeof visibleSingleParentLinks) => links.map((link) => (
    <SingleParentConnector
      key={link.id}
      parent={link.parent}
      child={link.child}
      active={isSingleLinkActive(link)}
      laneOffset={routingPlan.laneOffsetByConnectionId.get(link.id) ?? 0}
      route={routingPlan.routeByConnectionId.get(link.id)}
      preferDirectVertical={routingPlan.directVerticalConnectionIds.has(link.id)}
      preferSideAnchor={routingPlan.sideAnchorConnectionIds.has(link.id)}
    />
  ));

  // Focus rendering is deliberately two-pass. Faded connectors are painted
  // first and focused connectors last, so a shared geometric segment can
  // never become alternately dark/light just because two semantic routes
  // overlap for part of their path.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {renderUnionPass("inactive")}
      {renderSingleLinks(inactiveSingleLinks)}
      {renderUnionPass("active")}
      {renderSingleLinks(activeSingleLinks)}
    </View>
  );
});

function UnionConnector({
  partnerA,
  partnerB,
  children,
  activeBranchIds,
  renderPass,
  canvasWidth,
  laneOffsetByChildId,
  renderBounds,
  mountedPersonIds,
}: {
  partnerA: FamilyGraphPrototypePerson;
  partnerB: FamilyGraphPrototypePerson;
  children: FamilyGraphPrototypePerson[];
  activeBranchIds: Set<string>;
  renderPass: "inactive" | "active";
  canvasWidth: number;
  laneOffsetByChildId: Map<string, number>;
  renderBounds?: FamilyGraphSpatialRect | null;
  mountedPersonIds?: Set<string>;
}) {
  const aX = nodeCenterX(partnerA);
  const bX = nodeCenterX(partnerB);
  const leftPartner = aX <= bX ? partnerA : partnerB;
  const rightPartner = aX <= bX ? partnerB : partnerA;
  const leftPartnerPort = nodeConnectorPort(leftPartner, "right", 0);
  const rightPartnerPort = nodeConnectorPort(rightPartner, "left", 0);
  const partnerY = (leftPartnerPort.y + rightPartnerPort.y) / 2;
  const partnerLineStartX = leftPartnerPort.x;
  const partnerLineEndX = rightPartnerPort.x;
  const unionX = (aX + bX) / 2;

  // Partner endpoints are always the horizontal center ports of both cards.
  // The union/heart becomes the semantic center for shared children.
  const branchStartY = Math.max(
    nodeConnectorPort(partnerA, "bottom", 0).y,
    nodeConnectorPort(partnerB, "bottom", 0).y,
  );

  const partnerBounds: FamilyGraphSpatialRect = {
    left: Math.min(partnerLineStartX, partnerLineEndX) - 24,
    top: partnerY - 24,
    right: Math.max(partnerLineStartX, partnerLineEndX) + 24,
    bottom: partnerY + 24,
  };
  const partnerVisible = !renderBounds || rectsIntersect(partnerBounds, renderBounds);
  const mountedChildren = !mountedPersonIds
    ? children
    : children.filter((child) => mountedPersonIds.has(child.id));
  const visibleChildren = !renderBounds
    ? mountedChildren
    : mountedChildren.filter((child) => {
        const childTopPort = nodeConnectorPort(child, "top", 0);
        return rectsIntersect({
          left: Math.min(unionX, childTopPort.x) - 28,
          top: Math.min(branchStartY, childTopPort.y) - 28,
          right: Math.max(unionX, childTopPort.x) + 28,
          bottom: Math.max(branchStartY, childTopPort.y) + 28,
        }, renderBounds);
      });

  if (!partnerVisible && visibleChildren.length === 0) return null;

  const partnerActive = activeBranchIds.has(partnerA.id) && activeBranchIds.has(partnerB.id);
  const isChildActive = (child: FamilyGraphPrototypePerson) => partnerActive && activeBranchIds.has(child.id);
  const passChildren = visibleChildren.filter((child) =>
    renderPass === "active" ? isChildActive(child) : !isChildActive(child),
  );
  const passHasChildren = passChildren.length > 0;
  const passRendersPartner = partnerVisible && (renderPass === "active" ? partnerActive : !partnerActive);
  const passLineThickness = renderPass === "active"
    ? ACTIVE_LINE_THICKNESS
    : FADED_LINE_THICKNESS;
  const passLineColor = renderPass === "active" ? ACTIVE_PARENT_COLOR : FADED_PARENT_COLOR;
  const partnerThickness = renderPass === "active"
    ? 2.4
    : 1.4;

  if (!passRendersPartner && !passHasChildren && renderPass === "inactive") return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {passRendersPartner && partnerLineEndX > partnerLineStartX && (
        <DashedHorizontalLine
          x1={partnerLineStartX}
          x2={partnerLineEndX}
          y={partnerY}
          color={passLineColor}
          thickness={partnerThickness}
        />
      )}
      {renderPass === "active" && partnerVisible && <PartnerRelationIcon x={unionX} y={partnerY} />}
      {passHasChildren && (
        <LineSegment
          x1={unionX}
          y1={partnerY + 12}
          x2={unionX}
          y2={branchStartY}
          color={passLineColor}
          thickness={passLineThickness}
        />
      )}

      {passChildren.map((child) => {
        const color = passLineColor;
        const thickness = passLineThickness;
        const childTopPort = nodeConnectorPort(child, "top", 0);
        const endY = childTopPort.y;
        const verticalGap = Math.max(4, endY - branchStartY);
        // Mỗi connector dùng đúng khoảng trống thật giữa hai node; không ép một lane ảo
        // khiến góc bo chạm hoặc chui vào node khi hai thế hệ ở gần nhau.
        // Visual-truth lane: only children with the exact same explicit parent
        // signature may intentionally share a routing lane. Unrelated families
        // get separate turnY values even when their coordinates happen to line up.
        const truthLaneOffset = laneOffsetByChildId.get(child.id) ?? 0;
        const legacyEdgeNudge = partnerY < 100
          ? unionX < canvasWidth / 2 ? -2 : 2
          : 0;
        const minTurn = branchStartY + 2;
        const maxTurn = endY - 2;
        const turnY = Math.max(
          minTurn,
          Math.min(maxTurn, branchStartY + verticalGap / 2 + truthLaneOffset + legacyEdgeNudge),
        );

        return (
          <RoundedStepPath
            key={`${partnerA.id}-${partnerB.id}-${child.id}`}
            startX={unionX}
            startY={branchStartY}
            endX={childTopPort.x}
            endY={endY}
            turnY={turnY}
            color={color}
            thickness={thickness}
          />
        );
      })}
    </View>
  );
}

function SingleParentConnector({
  parent,
  child,
  active,
  laneOffset,
  route,
  preferDirectVertical,
  preferSideAnchor,
}: {
  parent: FamilyGraphPrototypePerson;
  child: FamilyGraphPrototypePerson;
  active: boolean;
  laneOffset: number;
  route?: FamilyGraphConnectorRoute;
  preferDirectVertical: boolean;
  preferSideAnchor: boolean;
}) {
  const parentBottomPort = nodeConnectorPort(parent, "bottom");
  const childTopPort = nodeConnectorPort(child, "top");
  const endX = childTopPort.x;
  const endY = childTopPort.y;
  const parentCenterX = parentBottomPort.x;
  const deltaX = endX - parentCenterX;
  const availableVerticalGap = endY - parentBottomPort.y;
  const color = active ? ACTIVE_PARENT_COLOR : FADED_PARENT_COLOR;
  const thickness = active
    ? ACTIVE_LINE_THICKNESS
    : FADED_LINE_THICKNESS;
  const centerPortTolerance = 1.5;

  if (route && route.points.length >= 2) {
    return (
      <PlannedConnectorPath
        points={route.points}
        color={color}
        thickness={thickness}
      />
    );
  }

  // Invariant: a parent-child connector starts and ends only at fixed edge
  // midpoints. A near-aligned pair gets one single straight segment between
  // bottom-center(parent) and top-center(child); no endpoint is shifted to the
  // child's X just to make the line look vertical.
  const useDirectCenterLine = availableVerticalGap > 4
    && (preferDirectVertical || Math.abs(deltaX) <= centerPortTolerance);

  if (useDirectCenterLine) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LineSegment
          x1={parentBottomPort.x}
          y1={parentBottomPort.y}
          x2={childTopPort.x}
          y2={childTopPort.y}
          color={color}
          thickness={thickness}
        />
        <ConnectorEndpointDot x={parentBottomPort.x} y={parentBottomPort.y} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={childTopPort.x} y={childTopPort.y} color={color} thickness={thickness} />
      </View>
    );
  }

  // A lateral branch always leaves from the exact left/right midpoint of the
  // parent card. Lane offsets may affect the free corridor later, but never the
  // node anchor itself. The child still receives the edge at top-center.
  const useSideAnchor = availableVerticalGap > 8 && (
    preferSideAnchor
    || Math.abs(deltaX) > centerPortTolerance
  );

  if (useSideAnchor) {
    const parentSidePort = nodeConnectorPort(parent, deltaX > 0 ? "right" : "left", SIDE_CONNECTOR_GAP);

    return (
      <RoundedSideDropPath
        startX={parentSidePort.x}
        startY={parentSidePort.y}
        endX={childTopPort.x}
        endY={childTopPort.y}
        color={color}
        thickness={thickness}
      />
    );
  }

  const startX = parentBottomPort.x;
  const startY = parentBottomPort.y;
  const verticalGap = Math.max(4, endY - startY);
  const baseTurnY = startY + verticalGap / 2;
  const turnY = Math.max(startY + 2, Math.min(endY - 2, baseTurnY + laneOffset));

  return (
    <RoundedStepPath
      startX={startX}
      startY={startY}
      endX={endX}
      endY={endY}
      turnY={turnY}
      color={color}
      thickness={thickness}
    />
  );
}

function PlannedConnectorPath({
  points,
  color,
  thickness,
}: {
  points: Array<{ x: number; y: number }>;
  color: string;
  thickness: number;
}) {
  if (points.length < 2) return null;

  // Phase 6.4 visual-compat: the collision router owns geometry, but the
  // renderer owns presentation. Keep every routing waypoint while rounding
  // orthogonal elbows exactly like the Phase 6.3 Bloom connector language.
  const deduped = points.filter((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return Math.abs(point.x - previous.x) > 0.01 || Math.abs(point.y - previous.y) > 0.01;
  });
  if (deduped.length < 2) return null;

  const overlap = Math.max(1.25, thickness * 0.72);
  const corners: Array<{
    index: number;
    before: { x: number; y: number };
    after: { x: number; y: number };
    radius: number;
    kind: ConnectorCornerKind;
  }> = [];

  for (let index = 1; index < deduped.length - 1; index += 1) {
    const previous = deduped[index - 1];
    const point = deduped[index];
    const next = deduped[index + 1];
    const inDx = point.x - previous.x;
    const inDy = point.y - previous.y;
    const outDx = next.x - point.x;
    const outDy = next.y - point.y;
    const incomingHorizontal = Math.abs(inDy) < 0.75 && Math.abs(inDx) >= 2;
    const incomingDown = Math.abs(inDx) < 0.75 && inDy > 2;
    const outgoingHorizontal = Math.abs(outDy) < 0.75 && Math.abs(outDx) >= 2;
    const outgoingDown = Math.abs(outDx) < 0.75 && outDy > 2;

    let kind: ConnectorCornerKind | null = null;
    if (incomingDown && outgoingHorizontal) kind = outDx > 0 ? "down-right" : "down-left";
    if (incomingHorizontal && outgoingDown) kind = inDx > 0 ? "right-down" : "left-down";
    if (!kind) continue;

    const incomingLength = Math.hypot(inDx, inDy);
    const outgoingLength = Math.hypot(outDx, outDy);
    const radius = Math.min(CONNECTOR_RADIUS, incomingLength / 3, outgoingLength / 3);
    if (radius < 2) continue;
    const effective = Math.max(0.75, radius - overlap);

    const before = incomingHorizontal
      ? { x: point.x - Math.sign(inDx) * effective, y: point.y }
      : { x: point.x, y: point.y - effective };
    const after = outgoingHorizontal
      ? { x: point.x + Math.sign(outDx) * effective, y: point.y }
      : { x: point.x, y: point.y + effective };
    corners.push({ index, before, after, radius, kind });
  }

  const cornerByIndex = new Map(corners.map((corner) => [corner.index, corner]));
  const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number }; key: string }> = [];
  let cursor = deduped[0];
  for (let index = 1; index < deduped.length - 1; index += 1) {
    const point = deduped[index];
    const corner = cornerByIndex.get(index);
    const end = corner?.before ?? point;
    segments.push({ start: cursor, end, key: `segment-${index}-in` });
    cursor = corner?.after ?? point;
  }
  segments.push({ start: cursor, end: deduped[deduped.length - 1], key: "segment-final" });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {segments.map((segment) => (
        <LineSegment
          key={segment.key}
          x1={segment.start.x}
          y1={segment.start.y}
          x2={segment.end.x}
          y2={segment.end.y}
          color={color}
          thickness={thickness}
        />
      ))}
      {corners.map((corner) => {
        const point = deduped[corner.index];
        return (
          <TightConnectorCorner
            key={`corner-${corner.index}-${point.x}-${point.y}`}
            x={point.x}
            y={point.y}
            radius={corner.radius}
            color={color}
            thickness={thickness}
            corner={corner.kind}
          />
        );
      })}
      <ConnectorEndpointDot x={deduped[0].x} y={deduped[0].y} color={color} thickness={thickness} />
      <ConnectorEndpointDot
        x={deduped[deduped.length - 1].x}
        y={deduped[deduped.length - 1].y}
        color={color}
        thickness={thickness}
      />
    </View>
  );
}

function RoundedSideDropPath({
  startX,
  startY,
  endX,
  endY,
  color,
  thickness,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  thickness: number;
}) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  if (Math.abs(deltaX) < 2) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LineSegment x1={startX} y1={startY} x2={endX} y2={endY} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={startX} y={startY} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={endX} y={endY} color={color} thickness={thickness} />
      </View>
    );
  }

  const radius = Math.min(
    CONNECTOR_RADIUS,
    Math.abs(deltaX) / 3,
    Math.max(0, deltaY) / 3,
  );
  const goingRight = deltaX > 0;

  if (radius < 2 || deltaY <= 2) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LineSegment x1={startX} y1={startY} x2={endX} y2={startY} color={color} thickness={thickness} />
        <LineSegment x1={endX} y1={startY} x2={endX} y2={endY} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={startX} y={startY} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={endX} y={endY} color={color} thickness={thickness} />
      </View>
    );
  }

  const overlap = Math.max(1.25, thickness * 0.72);
  const horizontalEndX = goingRight
    ? endX - radius + overlap
    : endX + radius - overlap;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LineSegment
        x1={startX}
        y1={startY}
        x2={horizontalEndX}
        y2={startY}
        color={color}
        thickness={thickness}
      />
      <TightConnectorCorner
        x={endX}
        y={startY}
        radius={radius}
        color={color}
        thickness={thickness}
        corner={goingRight ? "right-down" : "left-down"}
      />
      <LineSegment
        x1={endX}
        y1={startY + radius - overlap}
        x2={endX}
        y2={endY}
        color={color}
        thickness={thickness}
      />
      <ConnectorEndpointDot x={startX} y={startY} color={color} thickness={thickness} />
      <ConnectorEndpointDot x={endX} y={endY} color={color} thickness={thickness} />
    </View>
  );
}

function RoundedStepPath({
  startX,
  startY,
  endX,
  endY,
  turnY,
  color,
  thickness,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  turnY: number;
  color: string;
  thickness: number;
}) {
  const deltaX = endX - startX;
  const verticalSpaceBefore = Math.max(0, turnY - startY);
  const verticalSpaceAfter = Math.max(0, endY - turnY);
  const radius = Math.min(
    CONNECTOR_RADIUS,
    Math.abs(deltaX) / 3,
    verticalSpaceBefore / 2,
    verticalSpaceAfter / 2,
  );

  if (Math.abs(deltaX) < 2) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LineSegment
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          color={color}
          thickness={thickness}
        />
        <ConnectorEndpointDot x={startX} y={startY} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={endX} y={endY} color={color} thickness={thickness} />
      </View>
    );
  }

  if (radius < 2) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LineSegment x1={startX} y1={startY} x2={startX} y2={turnY} color={color} thickness={thickness} />
        <LineSegment x1={startX} y1={turnY} x2={endX} y2={turnY} color={color} thickness={thickness} />
        <LineSegment x1={endX} y1={turnY} x2={endX} y2={endY} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={startX} y={startY} color={color} thickness={thickness} />
        <ConnectorEndpointDot x={endX} y={endY} color={color} thickness={thickness} />
      </View>
    );
  }

  const goingRight = deltaX > 0;
  // Overlap nhẹ để mọi cạnh và quarter-corner chạm khít, không xuất hiện khe 1px do rounding.
  const overlap = Math.max(1.25, thickness * 0.72);
  const horizontalStartX = goingRight
    ? startX + radius - overlap
    : endX + radius - overlap;
  const horizontalEndX = goingRight
    ? endX - radius + overlap
    : startX - radius + overlap;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LineSegment
        x1={startX}
        y1={startY}
        x2={startX}
        y2={turnY - radius + overlap}
        color={color}
        thickness={thickness}
      />

      <TightConnectorCorner
        x={startX}
        y={turnY}
        radius={radius}
        color={color}
        thickness={thickness}
        corner={goingRight ? "down-right" : "down-left"}
      />

      <LineSegment
        x1={horizontalStartX}
        y1={turnY}
        x2={horizontalEndX}
        y2={turnY}
        color={color}
        thickness={thickness}
      />

      <TightConnectorCorner
        x={endX}
        y={turnY}
        radius={radius}
        color={color}
        thickness={thickness}
        corner={goingRight ? "right-down" : "left-down"}
      />

      <LineSegment
        x1={endX}
        y1={turnY + radius - overlap}
        x2={endX}
        y2={endY}
        color={color}
        thickness={thickness}
      />

      <ConnectorEndpointDot x={startX} y={startY} color={color} thickness={thickness} />
      <ConnectorEndpointDot x={endX} y={endY} color={color} thickness={thickness} />
    </View>
  );
}

function ConnectorEndpointDot({
  x,
  y,
  color,
  thickness,
}: {
  x: number;
  y: number;
  color: string;
  thickness: number;
}) {
  const size = thickness >= ACTIVE_LINE_THICKNESS - 0.1 ? ACTIVE_ENDPOINT_SIZE : FADED_ENDPOINT_SIZE;
  return (
    <View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        zIndex: 8,
      }}
    />
  );
}

type ConnectorCornerKind = "down-right" | "down-left" | "right-down" | "left-down";

function TightConnectorCorner({
  x,
  y,
  radius,
  color,
  thickness,
  corner,
}: {
  x: number;
  y: number;
  radius: number;
  color: string;
  thickness: number;
  corner: ConnectorCornerKind;
}) {
  const half = thickness / 2;
  const extent = radius + half;
  const common = {
    position: "absolute" as const,
    width: extent,
    height: extent,
    borderColor: color,
    zIndex: 2,
  };

  if (corner === "down-right") {
    return (
      <View
        style={{
          ...common,
          left: x - half,
          top: y - radius,
          borderLeftWidth: thickness,
          borderBottomWidth: thickness,
          borderBottomLeftRadius: radius + half,
        }}
      />
    );
  }

  if (corner === "down-left") {
    return (
      <View
        style={{
          ...common,
          left: x - radius,
          top: y - radius,
          borderRightWidth: thickness,
          borderBottomWidth: thickness,
          borderBottomRightRadius: radius + half,
        }}
      />
    );
  }

  if (corner === "right-down") {
    return (
      <View
        style={{
          ...common,
          left: x - radius,
          top: y - half,
          borderTopWidth: thickness,
          borderRightWidth: thickness,
          borderTopRightRadius: radius + half,
        }}
      />
    );
  }

  return (
    <View
      style={{
        ...common,
        left: x - half,
        top: y - half,
        borderTopWidth: thickness,
        borderLeftWidth: thickness,
        borderTopLeftRadius: radius + half,
      }}
    />
  );
}

function DashedHorizontalLine({
  x1,
  x2,
  y,
  color = PARTNER_DASH_COLOR,
  thickness = 2.4,
}: {
  x1: number;
  x2: number;
  y: number;
  color?: string;
  thickness?: number;
}) {
  const left = Math.min(x1, x2);
  const width = Math.max(0, Math.abs(x2 - x1));
  const dashWidth = 7;
  const gap = 5;
  const count = Math.max(1, Math.floor((width + gap) / (dashWidth + gap)));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, index) => {
        const dashLeft = left + index * (dashWidth + gap);
        const remaining = left + width - dashLeft;
        if (remaining <= 0) return null;
        return (
          <View
            key={`${left}-${y}-${index}`}
            style={{
              position: "absolute",
              left: dashLeft,
              top: y - thickness / 2,
              width: Math.min(dashWidth, remaining),
              height: thickness,
              borderRadius: 99,
              backgroundColor: color,
            }}
          />
        );
      })}
      <ConnectorEndpointDot x={x1} y={y} color={color} thickness={thickness} />
      <ConnectorEndpointDot x={x2} y={y} color={color} thickness={thickness} />
    </View>
  );
}

function PartnerRelationIcon({ x, y }: { x: number; y: number }) {
  return (
    <View
      style={[
        styles.partnerRelationIcon,
        {
          left: x - 12,
          top: y - 12,
        },
      ]}
    >
      <Ionicons name="heart" size={13} color="#A86F83" />
    </View>
  );
}

function LineSegment({
  x1,
  y1,
  x2,
  y2,
  color,
  thickness,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness: number;
}) {
  const horizontal = Math.abs(y2 - y1) <= Math.abs(x2 - x1);

  if (horizontal) {
    return (
      <View
        style={{
          position: "absolute",
          left: Math.min(x1, x2),
          top: y1 - thickness / 2,
          width: Math.max(1, Math.abs(x2 - x1)),
          height: thickness,
          borderRadius: 999,
          backgroundColor: color,
          zIndex: 1,
        }}
      />
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        left: x1 - thickness / 2,
        top: Math.min(y1, y2),
        width: thickness,
        height: Math.max(1, Math.abs(y2 - y1)),
        borderRadius: 999,
        backgroundColor: color,
        zIndex: 1,
      }}
    />
  );
}

function nodeConnectorPort(
  person: FamilyGraphPrototypePerson,
  port: FamilyGraphConnectorPort,
  gap = CONNECTOR_GAP,
) {
  return getFamilyGraphConnectorPort({
    person,
    port,
    nodeSlotWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
    nodeCardWidth: NODE_CARD_WIDTH,
    nodeCardHeight: NODE_CARD_HEIGHT,
    gap,
  });
}

function nodeCenterX(person: FamilyGraphPrototypePerson) {
  return person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2;
}

function nodeCardLeftX(person: FamilyGraphPrototypePerson) {
  return person.x + (FAMILY_GRAPH_CANVAS.nodeWidth - NODE_CARD_WIDTH) / 2;
}

function nodeCardRightX(person: FamilyGraphPrototypePerson) {
  return nodeCardLeftX(person) + NODE_CARD_WIDTH;
}

function nodeCardTopY(person: FamilyGraphPrototypePerson) {
  return person.y;
}

function nodeCardBottomY(person: FamilyGraphPrototypePerson) {
  return person.y + NODE_CARD_HEIGHT;
}

function getPersonNodePalette(displayName: string, focused: boolean, dimmed: boolean) {
  if (dimmed) {
    return {
      background: "#F8F6F7",
      badgeBackground: "rgba(252,250,251,0.98)",
      shadow: "#E2DADD",
      shadowOpacity: 0.045,
      elevation: 1,
    };
  }

  // getColorByName() chỉ có contract trả về một màu seed. Ta dùng seed đó như
  // một khóa ổn định theo tên để chọn cả palette pastel (background/focus/shadow/badge).
  // Nhờ vậy màu vẫn deterministic theo tên nhưng không bị tối/xám như việc pha seed trực tiếp.
  const seed = getColorByName(displayName).toUpperCase();
  const seedIndex = NAME_COLOR_SEEDS.findIndex((value) => value === seed);
  const paletteIndex = (seedIndex >= 0 ? seedIndex : stableNameIndex(displayName)) % BLOOM_NODE_PALETTES.length;
  const palette = BLOOM_NODE_PALETTES[paletteIndex];

  return {
    background: focused ? palette.focused : palette.background,
    badgeBackground: palette.badge,
    shadow: palette.shadow,
    shadowOpacity: focused ? 0.24 : 0.13,
    elevation: focused ? 5 : 3,
  };
}

function stableNameIndex(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function getAvatarLabel(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  return (parts[parts.length - 1]?.slice(0, 1) || "?").toUpperCase();
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function LegendIcon({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.legendItem}>
      <Ionicons name={icon} size={15} color={COLORS.secondaryText} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baseGraphLayer: { flex: 1 },
  root: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingHorizontal: 18 },
  titleRowControlsOnly: { minHeight: 54, paddingTop: 8 },
  controlsLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  controlsLabelText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  titleCopy: { flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  addPersonButton: { minHeight: 43, borderRadius: 16, paddingHorizontal: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  addPersonText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  title: { color: COLORS.primaryText, fontSize: 24, fontWeight: "900", letterSpacing: -0.35 },
  subtitle: { marginTop: 3, color: COLORS.secondaryText, fontSize: 12.5 },
  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: { marginTop: 12, paddingHorizontal: 18, flexDirection: "row", gap: 12 },
  modeChipDisabled: { opacity: 0.52 },
  focusBanner: {
    marginTop: 10,
    marginHorizontal: 18,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.76)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  focusIcon: {
    width: 31,
    height: 31,
    borderRadius: 12,
    backgroundColor: COLORS.softSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  focusText: { flex: 1, color: COLORS.secondaryText, fontSize: 13.5, fontWeight: "700" },
  focusStrong: { color: COLORS.primaryText, fontSize: 15.5, fontWeight: "900" },
  resetFocusButton: {
    minHeight: 30,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resetFocusText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  viewport: {
    flex: 1,
    minHeight: 430,
    marginTop: 10,
    marginHorizontal: 8,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#FCFBF7",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gestureRoot: {
    flex: 1,
  },
  canvasPanLayer: {
    position: "absolute",
  },
  canvas: {},
  partnerRelationIcon: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1D4D9",
    backgroundColor: "rgba(255,252,253,0.97)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  generationTag: {
    position: "absolute",
    // Giữ nhãn thế hệ trong gutter riêng ở mép trái để node đầu hàng không che nhãn.
    left: 6,
    width: 56,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 11,
    backgroundColor: "rgba(237,243,228,0.88)",
    zIndex: 4,
  },
  generationTitle: { color: COLORS.primaryText, fontSize: 8.8, lineHeight: 10.5, fontWeight: "900" },
  generationCaption: { marginTop: 1, color: COLORS.secondaryText, fontSize: 7.6, lineHeight: 9.2 },
  nodeWrap: {
    position: "absolute",
    width: FAMILY_GRAPH_CANVAS.nodeWidth,
    height: FAMILY_GRAPH_CANVAS.nodeHeight,
    alignItems: "center",
    zIndex: 5,
  },
  nodeCard: {
    width: NODE_CARD_WIDTH,
    height: NODE_CARD_HEIGHT,
    borderRadius: 22,
    alignItems: "center",
    paddingTop: 5,
    paddingHorizontal: 6,
    paddingBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  nodeCardSelected: { transform: [{ scale: 1.018 }] },
  nodePressed: { opacity: 0.74 },
  avatarFrame: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    padding: 3,
    borderWidth: 1.4,
    backgroundColor: COLORS.white,
  },
  avatarFrameMale: { borderColor: "#B9D7E8" },
  avatarFrameFemale: { borderColor: "#E9BED0" },
  avatarFrameDimmed: { borderColor: "#D7D7D7" },
  avatarFocused: { borderColor: COLORS.primary, borderWidth: 2.1 },
  avatarInner: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMale: { backgroundColor: "#EAF5FD" },
  avatarFemale: { backgroundColor: "#FCECF3" },
  avatarInnerDimmed: { backgroundColor: "#F1F1F1" },
  avatarText: { color: COLORS.primaryText, fontSize: 22, fontWeight: "900" },
  avatarTextDimmed: { color: "#AEAEAE" },
  lifeBadge: {
    position: "absolute",
    right: -4,
    bottom: 1,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  lifeBadgeLiving: { backgroundColor: COLORS.white },
  lifeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.positive },
  lifeDotDimmed: { backgroundColor: "#B8B8B8" },
  badgeDimmed: { backgroundColor: "#F7F7F7", borderColor: "#E3E3E3" },
  linkBadge: {
    position: "absolute",
    left: -4,
    bottom: 1,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  focusBadge: {
    position: "absolute",
    left: -5,
    top: -5,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  branchPickBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8D4DC",
    backgroundColor: "#FFF2F7",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 8,
  },
  branchPickBadgeDimmed: { borderColor: "#E3E0E1", backgroundColor: "#F2F1F1" },
  nodeName: {
    marginTop: 2,
    width: NODE_CARD_WIDTH - 12,
    maxWidth: NODE_CARD_WIDTH - 12,
    height: 42,
    paddingHorizontal: 1,
    color: COLORS.primaryText,
    fontSize: 12.2,
    lineHeight: 13.4,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    flexShrink: 1,
    overflow: "hidden",
  },
  nodeNameDimmed: { color: "#AEB1AD" },
  nodeNameFocused: { color: "#7C4257", fontSize: 12.8, lineHeight: 13.6 },
  nodeYears: {
    marginTop: 0,
    width: NODE_CARD_WIDTH - 16,
    maxWidth: NODE_CARD_WIDTH - 16,
    height: 13,
    color: COLORS.secondaryText,
    fontSize: 10.8,
    lineHeight: 12,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    fontWeight: "600",
    overflow: "hidden",
  },
  nodeYearsDimmed: { color: "#C0C2BF" },
  nodeYearsFocused: { color: "#8B6673", fontSize: 11.4, fontWeight: "800" },
  relationBadge: {
    position: "absolute",
    left: 5,
    top: 5,
    minHeight: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: NODE_CARD_WIDTH - 38,
    zIndex: 8,
    shadowColor: "#D0B7C0",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  relationBadgeDimmed: { backgroundColor: "rgba(247,247,247,0.98)" },
  relationBadgeText: {
    maxWidth: NODE_CARD_WIDTH - 62,
    color: "#9A6377",
    fontSize: 9.2,
    fontWeight: "900",
    flexShrink: 1,
  },
  relationBadgeTextDimmed: { color: "#B8B2B5" },
  branchModeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    minWidth: 50,
    height: 50,
    paddingHorizontal: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    shadowColor: "#76545F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 20,
  },
  branchModeButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  branchModeButtonText: { color: COLORS.primaryText, fontSize: 8.5, fontWeight: "900" },
  branchModeButtonTextActive: { color: COLORS.white },
  zoomControls: {
    position: "absolute",
    right: 12,
    bottom: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    elevation: 3,
    zIndex: 20,
  },
  zoomButton: { width: 46, height: 45, alignItems: "center", justifyContent: "center" },
  zoomDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },
  legend: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    minHeight: 34,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 9,
    zIndex: 20,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 11, height: 11, borderRadius: 6 },
  legendText: { color: COLORS.secondaryText, fontSize: 12.3, fontWeight: "800" },
  subgraphNotice: {
    marginHorizontal: 12,
    marginBottom: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#FFF7FA",
    borderWidth: 1,
    borderColor: "#F2DDE5",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subgraphNoticeText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  subgraphNoticeAction: { minHeight: 28, paddingHorizontal: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FCE7EF", borderWidth: 1, borderColor: "#EFCFD9" },
  subgraphNoticeActionText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  pressed: { opacity: 0.62 },
  searchModalRoot: { flex: 1, justifyContent: "flex-start", paddingTop: 90, paddingHorizontal: 16 },
  searchBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(62,45,51,0.28)" },
  searchSheet: { borderRadius: 26, backgroundColor: COLORS.white, padding: 16, maxHeight: "72%" },
  searchHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  searchTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  searchClose: {
    width: 35,
    height: 35,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softSurface,
  },
  searchBloomField: { marginBottom: 12 },
  searchInputWrap: {
    marginTop: 13,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.softSurface,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, color: COLORS.primaryText, fontSize: 13, paddingVertical: 0 },
  searchResults: { marginTop: 10 },
  searchRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  searchAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchAvatarMale: { backgroundColor: "#EAF5FD" },
  searchAvatarFemale: { backgroundColor: "#FCECF3" },
  searchAvatarText: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  searchCopy: { flex: 1 },
  searchName: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  searchMeta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10 },
  noResult: { paddingVertical: 24, textAlign: "center", color: COLORS.secondaryText, fontSize: 12 },
});
