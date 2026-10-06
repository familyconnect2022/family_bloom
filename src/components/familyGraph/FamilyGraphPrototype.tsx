import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { APP_CONFIG_DEFAULTS } from "../../constants/appConfiguration";
import { PERFORMANCE_TEST_BUILD } from "../../constants/performanceTest";
import { COLORS } from "../../constants/theme";
import type { FamilyGraphVietnameseRelationship } from "../../types/familyGraphQuery";
import { performanceTestService } from "../../services/performance/performanceTestService";
import { getColorByName } from "../../utils";
import { BloomChipButton } from "../ui/BloomButtonComponents";
import { BloomTextInput } from "../ui/BloomInputComponents";
import { FamilyGraphPersonSheet } from "./FamilyGraphPersonSheet";
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
  getFamilyGraphNodeRect,
  getFamilyGraphViewportRect,
  getPolylineBounds,
  rectsIntersect,
  type FamilyGraphCameraSnapshot,
} from "./familyGraphViewport";

export type FamilyGraphViewMode = "3" | "5" | "all";
type ViewMode = FamilyGraphViewMode;

type CancelIdleTask = () => void;

const scheduleIdleTask = (task: () => void): CancelIdleTask => {
  const host = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  let cancelled = false;
  let idleId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Always give React Native one painted frame between progressive graph batches.
  // Previously requestIdleCallback could consume several 48-person batches before
  // Android presented the first frame, which inflated first-paint time and created
  // multi-second JS stalls on 300/500 Person trees.
  const frameId = requestAnimationFrame(() => {
    if (cancelled) return;
    if (typeof host.requestIdleCallback === "function") {
      idleId = host.requestIdleCallback(() => {
        if (!cancelled) task();
      }, { timeout: 80 });
      return;
    }
    timeoutId = setTimeout(() => {
      if (!cancelled) task();
    }, 0);
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    if (idleId !== null) host.cancelIdleCallback?.(idleId);
    if (timeoutId !== null) clearTimeout(timeoutId);
  };
};
type Point = { x: number; y: number };

type FocusRelationKind =
  | "partner"
  | "father"
  | "mother"
  | "son"
  | "daughter"
  | "sibling"
  | "grandfather"
  | "grandmother"
  | "grandchild"
  | "bac"
  | "co"
  | "chu"
  | "di"
  | "cau"
  | "relative";

type FocusRelationMeta = {
  kind: FocusRelationKind;
  label: string;
};

const MIN_SAFE_SCALE = 0.02;
const SCALE_STEP = 0.1;
const INITIAL_SCALE = 0.86;
const AVATAR_SIZE = 58;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const NODE_CARD_WIDTH = 112;
const NODE_CARD_HEIGHT = 124;
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
const FOCUS_LINE_THICKNESS = ACTIVE_LINE_THICKNESS + 1;
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

type FamilyGraphFocusBranchVisual = FamilyGraphSubgraphPreview & {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  canvasWidth: number;
  canvasHeight: number;
};

type FamilyGraphSurfaceMode = "standard" | "focusOverlay";

type FamilyGraphPrototypeProps = {
  familyName: string;
  familyId?: string | null;
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
  getFocusBranchVisual?: (viewAnchorPersonId: string) => FamilyGraphFocusBranchVisual | null;
  initialDetailPersonId?: string | null;
  initialViewMode?: FamilyGraphViewMode;
  onRenderedCountChange?: (rendered: number, total: number) => void;
  /** Bloom Supper: route-level hero can own title/copy while graph keeps only actions. */
  headerMode?: "full" | "controls" | "none";
  /** Internal graph surface used by the single focus overlay. It never opens another overlay. */
  surfaceMode?: FamilyGraphSurfaceMode;
  /** Focus-overlay graph uses this to move to another Person without stacking overlays. */
  onFocusPersonRequest?: (personId: string) => void;
  /** Fit the whole bounded branch into the viewport on first paint. */
  autoFitOnMount?: boolean;
};

export function FamilyGraphPrototype({
  familyName,
  familyId,
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
  getFocusBranchVisual,
  initialDetailPersonId,
  initialViewMode,
  onRenderedCountChange,
  headerMode = "full",
  surfaceMode = "standard",
  onFocusPersonRequest,
  autoFitOnMount = false,
}: FamilyGraphPrototypeProps) {
  const sourcePeople = useMemo(() => {
    if (people) return people;
    // Keep prototype/mock mode on the same Phase 6.4 vertical metrics as live data.
    return FAMILY_GRAPH_PROTOTYPE_PEOPLE.map((person) => ({
      ...person,
      y: FAMILY_GRAPH_LAYOUT_CONFIG.generationTop
        + Math.max(0, person.generation - 1) * FAMILY_GRAPH_LAYOUT_CONFIG.generationStep,
    }));
  }, [people]);
  const sourceConnections = connections ?? FAMILY_GRAPH_PROTOTYPE_CONNECTIONS;
  const effectiveCanvasWidth = canvasWidth ?? FAMILY_GRAPH_CANVAS.width;
  const effectiveCanvasHeight = canvasHeight ?? FAMILY_GRAPH_CANVAS.height;
  const isLiveGraph = people !== undefined;
  const initialFocusId = defaultFocusId !== undefined
    ? defaultFocusId
    : isLiveGraph
      ? null
      : FAMILY_GRAPH_DEFAULT_FOCUS_ID;

  // Phase 14F: the normal graph always opens in 3-generation mode.
  // The linked account is only the initial camera/scope anchor; it is NOT an
  // in-canvas branch-focus state anymore.
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode ?? "3");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [viewAnchorPersonId, setViewAnchorPersonId] = useState<string | null>(initialFocusId);
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(initialFocusId);
  const [branchMode, setBranchMode] = useState(false);
  const [focusOverlay, setFocusOverlay] = useState<{
    personId: string;
    personName: string;
    visual: FamilyGraphFocusBranchVisual | null;
    loadFailed: boolean;
    targetFrame: { x: number; y: number; width: number; height: number };
    hostFrame: { x: number; y: number; width: number; height: number };
    durationMs: number;
    requestId: number;
  } | null>(null);
  const [detailPersonId, setDetailPersonId] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cameraSnapshot, setCameraSnapshot] = useState<FamilyGraphCameraSnapshot>({
    centerX: effectiveCanvasWidth / 2,
    centerY: effectiveCanvasHeight / 2,
    scale: INITIAL_SCALE,
  });
  const [fullTreeRenderLimit, setFullTreeRenderLimit] = useState(
    APP_CONFIG_DEFAULTS.familyGraph.render.fullTreeInitialBatch,
  );

  // v6.4: mọi transform gesture chạy trực tiếp trên UI thread bằng Reanimated.
  // Không gửi từng frame pinch qua JS thread để tránh queue event / snap khi thả tay.
  const canvasScale = useSharedValue(INITIAL_SCALE);
  const canvasTranslateX = useSharedValue(0);
  const canvasTranslateY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchActive = useSharedValue(0);
  const panSessionValid = useSharedValue(0);
  const pinchStartScale = useSharedValue(INITIAL_SCALE);
  const pinchAnchorCanvasX = useSharedValue(0);
  const pinchAnchorCanvasY = useSharedValue(0);
  const focusOverlayProgress = useSharedValue(0);
  const focusOverlayContentProgress = useSharedValue(1);
  const focusOverlayStartTranslateX = useSharedValue(0);
  const focusOverlayStartTranslateY = useSharedValue(0);
  const focusVisualRequestRef = useRef(0);
  const focusOverlayHydrationStartedRef = useRef<number | null>(null);
  const focusOverlayClosingRef = useRef(false);
  const lastPressedPersonFrameRef = useRef<{ personId: string; centerX: number; centerY: number; nodeWidth: number; nodeHeight: number } | null>(null);
  const rootRef = useRef<View>(null);
  const rootWindowFrameRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const hasCenteredInitially = useRef(false);
  // Focus overlay is intentionally isolated from the background camera/layout.
  // Opening/closing it must not mutate pan, zoom, branch dimming or selection.

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

  const relationshipScopePreview = useMemo(() => {
    if (surfaceMode !== "focusOverlay") return null;
    if (focusSubgraphPreview) return focusSubgraphPreview;
    if (!viewAnchorPersonId || !getFocusSubgraphPreview) return null;
    return getFocusSubgraphPreview(viewAnchorPersonId, "5");
  }, [surfaceMode, viewAnchorPersonId, focusSubgraphPreview, getFocusSubgraphPreview]);

  const focusRelations = useMemo(() => {
    if (surfaceMode !== "focusOverlay" || !viewAnchorPersonId) return new Map<string, FocusRelationMeta>();

    if (resolveRelationship) {
      const relations = new Map<string, FocusRelationMeta>();
      const candidateIds = relationshipScopePreview ? new Set(relationshipScopePreview.personIds) : null;
      for (const person of sourcePeople) {
        if (candidateIds && !candidateIds.has(person.id)) continue;
        if (person.id === viewAnchorPersonId) continue;
        const resolved = resolveRelationship(person.id, viewAnchorPersonId);
        if (!resolved || resolved.kind === "unrelated" || resolved.kind === "self") continue;
        relations.set(person.id, toFocusRelationMeta(resolved, person));
      }
      return relations;
    }

    return getRelationshipMetaAroundFocus(
      viewAnchorPersonId,
      sourcePeople,
      sourceConnections,
    );
  }, [surfaceMode, viewAnchorPersonId, relationshipScopePreview, resolveRelationship, sourceConnections, sourcePeople]);

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

  useEffect(() => {
    if (viewMode !== "all") {
      setFullTreeRenderLimit(progressivePeople.length);
      return;
    }
    setFullTreeRenderLimit((current) => {
      const initial = Math.min(
        FAMILY_GRAPH_RENDER_CONFIG.fullTreeInitialBatch,
        progressivePeople.length,
      );
      // Entering Full Tree starts bounded; changing focus keeps an already wider
      // progressive window so the canvas does not visibly collapse.
      return current > 0 && current <= progressivePeople.length
        ? Math.max(initial, Math.min(current, progressivePeople.length))
        : initial;
    });
  }, [progressivePeople.length, viewMode]);

  const loadNextFullTreeBatch = useCallback(() => {
    setFullTreeRenderLimit((current) => Math.min(
      progressivePeople.length,
      current + FAMILY_GRAPH_RENDER_CONFIG.fullTreeBatchSize,
    ));
  }, [progressivePeople.length]);

  useEffect(() => {
    if (viewMode !== "all" || fullTreeRenderLimit >= progressivePeople.length) return;
    return scheduleIdleTask(loadNextFullTreeBatch);
  }, [fullTreeRenderLimit, loadNextFullTreeBatch, progressivePeople.length, viewMode]);

  // Progressive branch expansion: Full Tree mounts the closest graph-distance
  // branches first. Viewport culling below decides which of these mounted nodes
  // actually become React elements at the current camera position.
  const renderedPeople = useMemo(() => {
    if (surfaceMode === "focusOverlay" || viewMode !== "all") return progressivePeople;
    const base = progressivePeople.slice(0, fullTreeRenderLimit);
    const mounted = new Set(base.map((person) => person.id));
    const progressiveIds = new Set(progressivePeople.map((person) => person.id));

    // Progressive loading must not split a partner component at a batch edge.
    // Use the snapshot adjacency index rather than rescanning every relationship
    // for every progressive batch.
    const queue = [...mounted];
    for (let index = 0; index < queue.length; index += 1) {
      const personId = queue[index];
      for (const partnerId of partnerIdsByPerson.get(personId) ?? []) {
        if (!progressiveIds.has(partnerId) || mounted.has(partnerId)) continue;
        mounted.add(partnerId);
        queue.push(partnerId);
      }
    }
    return progressivePeople.filter((person) => mounted.has(person.id));
  }, [fullTreeRenderLimit, partnerIdsByPerson, progressivePeople, surfaceMode, viewMode]);
  const renderedIds = useMemo(() => new Set(renderedPeople.map((person) => person.id)), [renderedPeople]);
  useEffect(() => {
    onRenderedCountChange?.(renderedPeople.length, progressivePeople.length);
  }, [onRenderedCountChange, progressivePeople.length, renderedPeople.length]);
  const renderedConnections = useMemo(
    () => sourceConnections.filter(
      (connection) => renderedIds.has(connection.fromId) && renderedIds.has(connection.toId),
    ),
    [renderedIds, sourceConnections],
  );

  const viewportBounds = useMemo(() => getFamilyGraphViewportRect({
    camera: cameraSnapshot,
    viewport,
    canvasWidth: effectiveCanvasWidth,
    canvasHeight: effectiveCanvasHeight,
    overscanScreens: FAMILY_GRAPH_RENDER_CONFIG.viewportOverscanScreens,
  }), [cameraSnapshot, effectiveCanvasHeight, effectiveCanvasWidth, viewport]);

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

  const viewportPersonIds = useMemo(() => {
    // Phase 8: on the very first render React Native has not reported viewport
    // dimensions yet. Mounting the entire progressive batch here made a 300/500
    // Person tree pay for dozens of off-screen cards before the first useful
    // frame. Bootstrap a small deterministic set, then switch to spatial culling
    // immediately after onLayout. No data is hidden; this only changes mount time.
    const ids = new Set<string>();
    if (viewport.width <= 0 || viewport.height <= 0) {
      for (const person of renderedPeople.slice(0, FAMILY_GRAPH_RENDER_CONFIG.preLayoutMountBudget)) {
        ids.add(person.id);
      }
    } else {
      for (const entry of viewportSpatialGrid.queryRect(viewportBounds)) {
        if (entry.kind === "node" && rectsIntersect(entry.rect, viewportBounds)) ids.add(entry.id);
      }
    }

    // Interaction targets are pinned even when an animation momentarily places
    // them just outside overscan; this prevents disappearing selected/focus cards.
    [viewAnchorPersonId, highlightedPersonId, selectedPersonId, detailPersonId].forEach((personId) => {
      if (personId && renderedIds.has(personId)) ids.add(personId);
    });

    // Phase 6.4 visual-compat invariant: a partner pair is one atomic visual unit.
    // Viewport culling may never leave a heart/partner line on screen while the
    // other spouse card is unmounted, because that makes the genealogy unreadable.
    // Expand only through partner edges; parent/child branches stay viewport-bounded.
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
  }, [detailPersonId, highlightedPersonId, viewAnchorPersonId, partnerIdsByPerson, renderedIds, renderedPeople, selectedPersonId, viewport.height, viewport.width, viewportBounds, viewportSpatialGrid]);

  const viewportPeople = useMemo(
    () => renderedPeople.filter((person) => viewportPersonIds.has(person.id)),
    [renderedPeople, viewportPersonIds],
  );

  const filteredPeople = useMemo(() => {
    const normalized = searchText.trim().toLocaleLowerCase("vi");
    if (!normalized) return sourcePeople;

    return sourcePeople.filter((person) =>
      `${person.displayName} ${person.shortName}`.toLocaleLowerCase("vi").includes(normalized),
    );
  }, [searchText, sourcePeople]);

  const setPan = useCallback((next: Point) => {
    canvasTranslateX.value = next.x;
    canvasTranslateY.value = next.y;
  }, [canvasTranslateX, canvasTranslateY]);

  const setScaleValue = useCallback((nextScale: number) => {
    // Không giới hạn UX ở Phase 6.0. Chỉ giữ guard kỹ thuật tối thiểu
    // để scale không tiến về 0; chưa áp giới hạn zoom lớn/nhỏ cho UX.
    const safeScale = Math.max(MIN_SAFE_SCALE, nextScale);
    canvasScale.value = safeScale;
    return safeScale;
  }, [canvasScale]);

  const commitCameraSnapshot = useCallback((centerX: number, centerY: number, scale: number) => {
    setCameraSnapshot((current) => {
      if (
        Math.abs(current.centerX - centerX) < 0.5
        && Math.abs(current.centerY - centerY) < 0.5
        && Math.abs(current.scale - scale) < 0.005
      ) return current;
      return { centerX, centerY, scale };
    });
  }, []);

  // Viewport-aware rendering must not send every pan/pinch frame through React.
  // The UI thread tracks the camera continuously, but JS is notified only after
  // crossing one coarse spatial cell (or a meaningful zoom bucket). Overscan
  // keeps nearby nodes mounted between these updates, avoiding blank edges.
  useAnimatedReaction(
    () => {
      if (viewport.width <= 0 || viewport.height <= 0) return null;
      const scale = Math.max(MIN_SAFE_SCALE, canvasScale.value);
      const canvasCenterX = effectiveCanvasWidth / 2;
      const canvasCenterY = effectiveCanvasHeight / 2;
      const screenCenterX = viewport.width / 2;
      const screenCenterY = viewport.height / 2;
      const centerX = canvasCenterX
        + (screenCenterX - canvasTranslateX.value - canvasCenterX) / scale;
      const centerY = canvasCenterY
        + (screenCenterY - canvasTranslateY.value - canvasCenterY) / scale;
      return {
        centerX,
        centerY,
        scale,
        cellX: Math.floor(centerX / VIEWPORT_CAMERA_CELL_SIZE),
        cellY: Math.floor(centerY / VIEWPORT_CAMERA_CELL_SIZE),
        scaleBucket: Math.round(scale * 10),
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
        runOnJS(commitCameraSnapshot)(current.centerX, current.centerY, current.scale);
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
    const scale = canvasScale.value;
    setPan({x: viewport.width / 2 - effectiveCanvasWidth / 2 - scale * (overviewCenter.x - effectiveCanvasWidth / 2),
      y: viewport.height * 0.46 - effectiveCanvasHeight / 2 - scale * (overviewCenter.y - effectiveCanvasHeight / 2)});
  }, [viewport, canvasScale, setPan, overviewCenter, effectiveCanvasWidth, effectiveCanvasHeight]);

  const centerOnPerson = useCallback((personId: string, requestedScale?: number) => {
    const person = peopleById.get(personId);
    if (!person || viewport.width <= 0 || viewport.height <= 0) return;

    const targetScale = requestedScale ?? canvasScale.value;
    const personCenterX = person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2;
    const personCenterY = person.y + NODE_CARD_HEIGHT / 2;
    const canvasCenterX = effectiveCanvasWidth / 2;
    const canvasCenterY = effectiveCanvasHeight / 2;
    const targetX = viewport.width / 2;
    const targetY = viewport.height * 0.46;

    setPan({
      x: targetX - canvasCenterX - targetScale * (personCenterX - canvasCenterX),
      y: targetY - canvasCenterY - targetScale * (personCenterY - canvasCenterY),
    });
  }, [canvasScale, effectiveCanvasHeight, effectiveCanvasWidth, peopleById, setPan, viewport.height, viewport.width]);

  const panGesture = useMemo(() => Gesture.Pan()
    .minDistance(3)
    .maxPointers(1)
    .onStart(() => {
      // Một phiên pan chỉ hợp lệ nếu nó thực sự bắt đầu khi không pinch.
      // Nếu user đang kéo 1 ngón rồi đặt ngón thứ hai để pinch, pinch sẽ
      // invalidate phiên pan này để ngón còn lại không "đẩy" canvas khi thả pinch.
      if (pinchActive.value === 0) {
        panSessionValid.value = 1;
        panStartX.value = canvasTranslateX.value;
        panStartY.value = canvasTranslateY.value;
      } else {
        panSessionValid.value = 0;
      }
    })
    .onUpdate((event) => {
      if (pinchActive.value !== 0 || panSessionValid.value === 0) return;
      canvasTranslateX.value = panStartX.value + event.translationX;
      canvasTranslateY.value = panStartY.value + event.translationY;
    })
    .onFinalize(() => {
      panSessionValid.value = 0;
    }), [
      canvasTranslateX,
      canvasTranslateY,
      panSessionValid,
      panStartX,
      panStartY,
      pinchActive,
    ]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onStart((event) => {
      pinchActive.value = 1;
      panSessionValid.value = 0;

      const startScale = Math.max(MIN_SAFE_SCALE, canvasScale.value);
      pinchStartScale.value = startScale;

      const canvasCenterX = effectiveCanvasWidth / 2;
      const canvasCenterY = effectiveCanvasHeight / 2;

      // Chốt DUY NHẤT điểm canvas nằm dưới tâm hai ngón lúc bắt đầu pinch.
      // Mọi frame sau chỉ dùng event.scale + focal hiện tại để giữ nguyên điểm neo này.
      // Không tích lũy delta từng frame => không drift và không có cú "đẩy" cuối gesture.
      pinchAnchorCanvasX.value = canvasCenterX
        + (event.focalX - canvasTranslateX.value - canvasCenterX) / startScale;
      pinchAnchorCanvasY.value = canvasCenterY
        + (event.focalY - canvasTranslateY.value - canvasCenterY) / startScale;
    })
    .onUpdate((event) => {
      // Một số thiết bị Android có thể phát thêm một update khi một trong hai
      // ngón vừa rời màn hình. focal của frame đó có thể nhảy về ngón còn lại
      // và làm canvas bị "đẩy" đúng lúc người dùng buông tay. Bỏ qua frame
      // không còn đủ 2 pointer để trạng thái cuối luôn là frame pinch hợp lệ cuối cùng.
      if (event.numberOfPointers < 2) return;

      // Zoom trực tiếp theo scale từ đầu gesture: tay đi bao nhiêu, canvas đi bấy nhiêu.
      // Phase 6.0 chưa áp giới hạn UX; chỉ có guard kỹ thuật rất rộng.
      const nextScale = Math.max(
        MIN_SAFE_SCALE,
        pinchStartScale.value * event.scale,
      );
      const canvasCenterX = effectiveCanvasWidth / 2;
      const canvasCenterY = effectiveCanvasHeight / 2;

      canvasScale.value = nextScale;
      canvasTranslateX.value = event.focalX
        - canvasCenterX
        - nextScale * (pinchAnchorCanvasX.value - canvasCenterX);
      canvasTranslateY.value = event.focalY
        - canvasCenterY
        - nextScale * (pinchAnchorCanvasY.value - canvasCenterY);
    })
    .onFinalize(() => {
      // QUAN TRỌNG: tuyệt đối không ghi lại scale/translate tại đây.
      // Giá trị frame cuối đã là trạng thái cuối; thả tay chỉ kết thúc gesture.
      pinchActive.value = 0;
      panSessionValid.value = 0;
    }), [
      canvasScale,
      canvasTranslateX,
      canvasTranslateY,
      panSessionValid,
      pinchActive,
      pinchAnchorCanvasX,
      pinchAnchorCanvasY,
      pinchStartScale,
      effectiveCanvasHeight,
      effectiveCanvasWidth,
    ]);

  const canvasGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture],
  );

  // Tách pan và scale thành hai layer để thứ tự transform luôn xác định:
  // scale quanh tâm canvas trước, sau đó parent translate toàn bộ surface.
  const canvasPanStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: canvasTranslateX.value },
      { translateY: canvasTranslateY.value },
    ],
  }));

  const canvasScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: canvasScale.value }],
  }));

  const focusOverlayAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.max(0, Math.min(1, focusOverlayProgress.value));
    // Open from a true point at the tapped Person and close all the way back to
    // scale 0. Opacity stays fully visible through most of the close motion and
    // only fades during the final ~22%, so the Focus card never disappears
    // halfway home. The Modal is unmounted only after withTiming reaches 0.
    const fadeWindow = 0.22;
    const rawOpacity = progress >= fadeWindow ? 1 : progress / fadeWindow;
    const opacity = rawOpacity * rawOpacity * (3 - 2 * rawOpacity);
    return {
      opacity,
      transform: [
        { translateX: focusOverlayStartTranslateX.value * (1 - progress) },
        { translateY: focusOverlayStartTranslateY.value * (1 - progress) },
        { scale: progress },
      ],
    };
  });

  const focusOverlayContentStyle = useAnimatedStyle(() => ({
    opacity: focusOverlayContentProgress.value,
    transform: [{ scale: 0.965 + 0.035 * focusOverlayContentProgress.value }],
  }));

  const measureRootInWindow = useCallback(() => {
    requestAnimationFrame(() => {
      rootRef.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) return;
        rootWindowFrameRef.current = { x, y, width, height };
      });
    });
  }, []);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = {
      x: event.nativeEvent.layout.x,
      y: event.nativeEvent.layout.y,
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
    setViewport(next);
    measureRootInWindow();

    if (!hasCenteredInitially.current && next.width > 0 && next.height > 0) {
      hasCenteredInitially.current = true;
      const person = peopleById.get(initialFocusId ?? "");
      const canvasCenterX = effectiveCanvasWidth / 2;
      const canvasCenterY = effectiveCanvasHeight / 2;

      if (autoFitOnMount && visiblePeople.length) {
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
        setScaleValue(fitScale);
        setPan({
          x: next.width / 2 - canvasCenterX - fitScale * (overviewCenter.x - canvasCenterX),
          y: next.height / 2 - canvasCenterY - fitScale * (overviewCenter.y - canvasCenterY),
        });
        return;
      }

      setScaleValue(INITIAL_SCALE);
      if (!person) {
        setPan({
          x: next.width / 2 - canvasCenterX - INITIAL_SCALE * (overviewCenter.x - canvasCenterX),
          y: next.height * 0.46 - canvasCenterY - INITIAL_SCALE * (overviewCenter.y - canvasCenterY),
        });
        return;
      }

      const personCenterX = person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2;
      const personCenterY = person.y + NODE_CARD_HEIGHT / 2;
      setPan({
        x: next.width / 2 - canvasCenterX - INITIAL_SCALE * (personCenterX - canvasCenterX),
        y: next.height * 0.46 - canvasCenterY - INITIAL_SCALE * (personCenterY - canvasCenterY),
      });
    }
  }, [autoFitOnMount, effectiveCanvasHeight, effectiveCanvasWidth, initialFocusId, measureRootInWindow, peopleById, setPan, setScaleValue, overviewCenter, visiblePeople]);

  const clearFocusOverlay = useCallback(() => {
    focusVisualRequestRef.current += 1;
    focusOverlayHydrationStartedRef.current = null;
    focusOverlayClosingRef.current = false;
    focusOverlayProgress.value = 0;
    focusOverlayContentProgress.value = 1;
    setFocusOverlay(null);
  }, [focusOverlayContentProgress, focusOverlayProgress]);

  const finishBranchOpenPerf = useCallback(() => {
    if (PERFORMANCE_TEST_BUILD) performanceTestService.finish("branch_open");
  }, []);

  const getPersonScreenFrame = useCallback((personId: string) => {
    const cached = lastPressedPersonFrameRef.current;
    if (cached?.personId === personId) return cached;
    const person = peopleById.get(personId);
    if (!person || viewport.width <= 0 || viewport.height <= 0) return null;

    const scale = Math.max(MIN_SAFE_SCALE, canvasScale.value);
    const canvasCenterX = effectiveCanvasWidth / 2;
    const canvasCenterY = effectiveCanvasHeight / 2;
    const personCenterX = person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2;
    const personCenterY = person.y + NODE_CARD_HEIGHT / 2;
    const centerX = viewport.x + canvasCenterX + canvasTranslateX.value + scale * (personCenterX - canvasCenterX);
    const centerY = viewport.y + canvasCenterY + canvasTranslateY.value + scale * (personCenterY - canvasCenterY);
    return {
      personId,
      centerX,
      centerY,
      nodeWidth: FAMILY_GRAPH_CANVAS.nodeWidth * scale,
      nodeHeight: NODE_CARD_HEIGHT * scale,
    };
  }, [canvasScale, canvasTranslateX, canvasTranslateY, effectiveCanvasHeight, effectiveCanvasWidth, peopleById, viewport.height, viewport.width, viewport.x, viewport.y]);

  const buildFocusOverlayGeometry = useCallback((
    personId: string,
    hostFrame: { x: number; y: number; width: number; height: number },
  ) => {
    if (viewport.width <= 0 || viewport.height <= 0) return null;
    const source = getPersonScreenFrame(personId);
    const screen = Dimensions.get("window");
    // Phase 14J: the native Modal is a true full-screen portal, so Focus View no
    // longer inherits the smaller graph/canvas viewport. Keep a 10% safe margin
    // on every side, resulting in an 80% x 80% Focus surface of the full screen.
    const targetFrame = {
      x: screen.width * 0.1,
      y: screen.height * 0.1,
      width: screen.width * 0.8,
      height: screen.height * 0.8,
    };
    const targetCenterX = targetFrame.x + targetFrame.width / 2;
    const targetCenterY = targetFrame.y + targetFrame.height / 2;
    // getPersonScreenFrame is local to FamilyGraphPrototype. Convert its tapped
    // node origin into window coordinates so the portal can animate from the
    // exact node even though its destination is now relative to the full screen.
    const sourceCenterX = source ? hostFrame.x + source.centerX : targetCenterX;
    const sourceCenterY = source ? hostFrame.y + source.centerY : targetCenterY;
    const dx = sourceCenterX - targetCenterX;
    const dy = sourceCenterY - targetCenterY;
    const targetDiagonal = Math.max(1, Math.hypot(targetFrame.width, targetFrame.height));
    const travelRatio = Math.min(1, Math.hypot(dx, dy) / (targetDiagonal * 0.72));
    // Keep apparent travel speed consistent: farther edge/corner nodes receive a
    // slightly longer transition instead of shooting into the center too quickly.
    // A slightly longer 520–630ms window also gives Android enough time to
    // present each transform frame without the old "khựng" feeling.
    const durationMs = Math.round(520 + travelRatio * 110);
    return { targetFrame, dx, dy, durationMs };
  }, [getPersonScreenFrame, viewport.height, viewport.width]);

  const closeFocusOverlay = useCallback(() => {
    if (!focusOverlay || focusOverlayClosingRef.current) return;
    focusOverlayClosingRef.current = true;
    focusVisualRequestRef.current += 1;
    focusOverlayProgress.value = withTiming(
      0,
      {
        duration: Math.max(500, Math.round(focusOverlay.durationMs * 0.94)),
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      },
      (finished) => {
        // Keep the whole Focus View mounted until scale reaches zero. Only then
        // remove the native Modal, preventing the card from vanishing mid-zoom.
        if (finished) runOnJS(clearFocusOverlay)();
      },
    );
  }, [clearFocusOverlay, focusOverlay, focusOverlayProgress]);

  useEffect(() => {
    if (surfaceMode !== "standard" || !focusOverlay) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeFocusOverlay();
      return true;
    });
    return () => subscription.remove();
  }, [closeFocusOverlay, focusOverlay, surfaceMode]);

  const hydrateFocusOverlayVisual = useCallback((personId: string, requestId: number) => {
    if (focusVisualRequestRef.current !== requestId) return;
    const branchVisual = getFocusBranchVisual?.(personId) ?? null;
    if (focusVisualRequestRef.current !== requestId) return;
    setFocusOverlay((current) => {
      if (!current || current.personId !== personId || current.requestId !== requestId) return current;
      return { ...current, visual: branchVisual, loadFailed: !branchVisual };
    });
    if (branchVisual) {
      focusOverlayContentProgress.value = 0;
      requestAnimationFrame(() => {
        focusOverlayContentProgress.value = withTiming(1, { duration: 210, easing: Easing.out(Easing.cubic) });
      });
    }
  }, [focusOverlayContentProgress, getFocusBranchVisual]);

  const mountFocusOverlay = useCallback((
    personId: string,
    hostFrame: { x: number; y: number; width: number; height: number },
  ) => {
    const geometry = buildFocusOverlayGeometry(personId, hostFrame);
    if (!geometry) return;
    const personName = peopleById.get(personId)?.displayName ?? "Nhánh gia đình";
    const requestId = focusVisualRequestRef.current + 1;
    focusVisualRequestRef.current = requestId;

    // Freeze the already-rendered Canvas View exactly as-is. We only close
    // transient sheets; view mode, visible nodes/lines, pan and zoom are untouched.
    setDetailPersonId(null);
    setSearchVisible(false);
    if (PERFORMANCE_TEST_BUILD) {
      performanceTestService.start("branch_open", personName);
      performanceTestService.mark("branch_open", "overlay_requested");
    }

    focusOverlayStartTranslateX.value = geometry.dx;
    focusOverlayStartTranslateY.value = geometry.dy;
    focusOverlayClosingRef.current = false;
    focusOverlayContentProgress.value = 1;
    focusOverlayProgress.value = 0;
    focusOverlayHydrationStartedRef.current = null;
    setFocusOverlay({
      personId,
      personName,
      visual: null,
      loadFailed: false,
      targetFrame: geometry.targetFrame,
      hostFrame,
      durationMs: geometry.durationMs,
      requestId,
    });
  }, [buildFocusOverlayGeometry, focusOverlayContentProgress, focusOverlayProgress, focusOverlayStartTranslateX, focusOverlayStartTranslateY, peopleById]);

  const handleFocusOverlayShown = useCallback(() => {
    if (!focusOverlay || focusOverlayClosingRef.current) return;
    const { requestId, personId, durationMs } = focusOverlay;
    if (focusVisualRequestRef.current !== requestId) return;

    // Phase 14N: native Modal visibility is the hard boundary between shell and
    // branch data. The Focus shell must become visible first, even if extracting
    // or laying out a large branch blocks the JS thread afterwards.
    if (PERFORMANCE_TEST_BUILD) performanceTestService.mark("branch_open", "portal_shown");
    requestAnimationFrame(() => {
      if (focusVisualRequestRef.current !== requestId || focusOverlayClosingRef.current) return;
      focusOverlayProgress.value = withTiming(
        1,
        { duration: durationMs, easing: Easing.bezier(0.16, 1, 0.3, 1) },
        (finished) => {
          if (finished && PERFORMANCE_TEST_BUILD) runOnJS(finishBranchOpenPerf)();
        },
      );
    });

    if (focusOverlayHydrationStartedRef.current === requestId) return;
    focusOverlayHydrationStartedRef.current = requestId;
    // Give Android one visible loading frame before any synchronous graph work.
    // Reanimated keeps the shell animation on the UI thread while JS prepares data.
    setTimeout(() => {
      if (focusVisualRequestRef.current !== requestId || focusOverlayClosingRef.current) return;
      hydrateFocusOverlayVisual(personId, requestId);
    }, 140);
  }, [finishBranchOpenPerf, focusOverlay, focusOverlayProgress, hydrateFocusOverlayVisual]);

  const handleOpenBranch = useCallback((personId: string) => {
    if (surfaceMode === "focusOverlay") {
      onFocusPersonRequest?.(personId);
      return;
    }

    const cachedHost = rootWindowFrameRef.current;
    if (cachedHost.width > 0 && cachedHost.height > 0) {
      mountFocusOverlay(personId, cachedHost);
      return;
    }

    // First-use fallback: measure the graph host in window coordinates before
    // opening the native portal. This is still a one-shot read and never mutates
    // the background Canvas camera/layout.
    rootRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      const measured = { x, y, width, height };
      rootWindowFrameRef.current = measured;
      mountFocusOverlay(personId, measured);
    });
  }, [mountFocusOverlay, onFocusPersonRequest, surfaceMode]);

  const handleFocusOverlayPersonRequest = useCallback((personId: string) => {
    if (focusOverlayClosingRef.current || !focusOverlay || !getFocusBranchVisual || personId === focusOverlay.personId) return;
    const personName = peopleById.get(personId)?.displayName ?? "Nhánh gia đình";
    const requestId = focusVisualRequestRef.current + 1;
    focusVisualRequestRef.current = requestId;

    // One overlay only: transition its content to B and prepare B from the full
    // family snapshot. The background Canvas View remains completely frozen.
    focusOverlayContentProgress.value = withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) });
    setTimeout(() => {
      if (focusVisualRequestRef.current !== requestId) return;
      setFocusOverlay((current) => current ? {
        ...current,
        personId,
        personName,
        visual: null,
        loadFailed: false,
        requestId,
      } : current);
      focusOverlayContentProgress.value = 1;
      focusOverlayHydrationStartedRef.current = requestId;
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (focusVisualRequestRef.current !== requestId || focusOverlayClosingRef.current) return;
          hydrateFocusOverlayVisual(personId, requestId);
        }, 90);
      });
    }, 112);
  }, [focusOverlay, focusOverlayContentProgress, getFocusBranchVisual, hydrateFocusOverlayVisual, peopleById]);

  const handleScale = useCallback((direction: "in" | "out") => {
    const currentScale = canvasScale.value;
    const next = Math.max(
      MIN_SAFE_SCALE,
      Number((currentScale + (direction === "in" ? SCALE_STEP : -SCALE_STEP)).toFixed(2)),
    );
    if (next === currentScale) return;

    setScaleValue(next);
    const targetId = viewAnchorPersonId ?? initialFocusId;
    if (targetId) requestAnimationFrame(() => centerOnPerson(targetId, next));
  }, [centerOnPerson, viewAnchorPersonId, initialFocusId, setScaleValue]);

  const handleMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);

    const currentScale = canvasScale.value;
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
    if (viewMode !== "all") return;
    const index = progressivePeople.findIndex((person) => person.id === personId);
    if (index < 0) return;
    setFullTreeRenderLimit((current) => Math.max(current, index + 1));
  }, [progressivePeople, viewMode]);

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
    if (surfaceMode === "focusOverlay") {
      onFocusPersonRequest?.(personId);
      return;
    }
    const screenFrame = getPersonScreenFrame(personId);
    if (screenFrame) lastPressedPersonFrameRef.current = screenFrame;
    if (branchMode) {
      void handleOpenBranch(personId);
      return;
    }
    setSelectedPersonId(personId);
    setDetailPersonId(personId);
  }, [branchMode, getPersonScreenFrame, handleOpenBranch, onFocusPersonRequest, surfaceMode]);

  return (
    <View ref={rootRef} onLayout={measureRootInWindow} style={styles.root}>
      <View
        pointerEvents={focusOverlay ? "none" : "auto"}
        style={styles.baseGraphLayer}
      >
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

      {surfaceMode === "standard" && (
        <View style={styles.modeRow}>
          <BloomChipButton label="3 thế hệ" selected={viewMode === "3"} disabled={!!focusOverlay} onPress={() => handleMode("3")} customStyle={focusOverlay ? styles.modeChipDisabled : undefined} />
          <BloomChipButton label="5 thế hệ" selected={viewMode === "5"} disabled={!!focusOverlay} onPress={() => handleMode("5")} customStyle={focusOverlay ? styles.modeChipDisabled : undefined} />
          <BloomChipButton label="Toàn phả hệ" selected={viewMode === "all"} disabled={!!focusOverlay} onPress={() => handleMode("all")} customStyle={focusOverlay ? styles.modeChipDisabled : undefined} />
        </View>
      )}

      {surfaceMode === "standard" && focusSubgraphPreview?.truncated && viewMode !== "all" && (
        <View style={styles.subgraphNotice}>
          <Ionicons name="leaf-outline" size={14} color={COLORS.primary} />
          <Text style={styles.subgraphNoticeText}>
            Đang giới hạn {focusSubgraphPreview.requestedMaxPeople} người để cây luôn mượt. Chọn “Toàn phả hệ” để xem tất cả.
          </Text>
        </View>
      )}
      {surfaceMode === "standard" && viewMode === "all" && renderedPeople.length < progressivePeople.length && (
        <View style={styles.subgraphNotice}>
          <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
          <Text style={styles.subgraphNoticeText}>
            Bloom đang mở dần {renderedPeople.length}/{progressivePeople.length} người theo các nhánh gần nhất.
          </Text>
          <Pressable
            onPress={loadNextFullTreeBatch}
            style={({ pressed }) => [styles.subgraphNoticeAction, pressed && styles.pressed]}
          >
            <Text style={styles.subgraphNoticeActionText}>Mở thêm</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.viewport, surfaceMode === "focusOverlay" && styles.viewportFocusOverlay]} onLayout={handleViewportLayout}>
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
                  activeBranchIds={activeBranchIds}
                  focusMode={false}
                  canvasWidth={effectiveCanvasWidth}
                  renderBounds={viewportBounds}
                  mountedPersonIds={viewportPersonIds}
                />

                {viewportPeople.map((person) => (
                  <PersonNode
                    key={person.id}
                    person={person}
                    selected={selectedPersonId === person.id}
                    focused={highlightedPersonId === person.id}
                    inFocusedBranch={activeBranchIds.has(person.id)}
                    relationMeta={surfaceMode === "focusOverlay" ? focusRelations.get(person.id) ?? null : null}
                    branchMode={branchMode}
                    onPressPerson={handlePersonPress}
                  />
                ))}
                </Animated.View>
              </Animated.View>
            </View>
          </GestureDetector>

        {surfaceMode === "standard" && (
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
            <Ionicons
              name="git-network-outline"
              size={24}
              color={branchMode ? COLORS.white : COLORS.primaryText}
            />
            <Text style={[styles.branchModeButtonText, branchMode && styles.branchModeButtonTextActive]}>
              Nhánh
            </Text>
          </Pressable>
        )}

        {surfaceMode === "focusOverlay" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Định vị người đang xem"
            onPress={() => {
              const targetId = viewAnchorPersonId ?? initialFocusId;
              if (!targetId) { centerOverview(); return; }
              const targetScale = Math.max(0.9, Math.min(1, canvasScale.value));
              setScaleValue(targetScale);
              requestAnimationFrame(() => centerOnPerson(targetId, targetScale));
            }}
            style={({ pressed }) => [styles.focusLocateButton, pressed && styles.pressed]}
          >
            <Ionicons name="locate" size={23} color={COLORS.primary} />
          </Pressable>
        ) : (
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
        )}

        {surfaceMode === "standard" && (
          <View pointerEvents="none" style={styles.legend}>
            <LegendDot color={COLORS.positive} label="Đang sống" />
            <LegendIcon icon="leaf-outline" label="Đã mất" />
            <LegendIcon icon="link-outline" label="Đã liên kết" />
          </View>
        )}
        </GestureHandlerRootView>
      </View>

      </View>

      {surfaceMode === "standard" && focusOverlay ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          hardwareAccelerated
          onShow={handleFocusOverlayShown}
          onRequestClose={closeFocusOverlay}
        >
          <View style={styles.focusOverlayModalRoot}>
            <Pressable
              accessibilityLabel="Đóng chế độ xem nhánh"
              onPress={closeFocusOverlay}
              style={styles.focusOverlayShield}
            />

            <Animated.View
              style={[
                styles.focusOverlayCard,
                {
                  left: focusOverlay.targetFrame.x,
                  top: focusOverlay.targetFrame.y,
                  width: focusOverlay.targetFrame.width,
                  height: focusOverlay.targetFrame.height,
                },
                focusOverlayAnimatedStyle,
              ]}
            >
              <View style={styles.focusOverlayHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Trở về cây phả hệ"
                  onPress={closeFocusOverlay}
                  style={({ pressed }) => [styles.focusOverlayBack, pressed && styles.focusOverlayBackPressed]}
                >
                  <Ionicons name="arrow-back" size={18} color={COLORS.primaryText} />
                  <Text style={styles.focusOverlayBackText}>Trở về</Text>
                </Pressable>
                <View style={styles.focusOverlayHeaderCopy}>
                  <Text style={styles.focusOverlayEyebrow}>XEM NHÁNH · TOÀN NHÁNH</Text>
                  <Text numberOfLines={1} style={styles.focusOverlayTitle}>Nhánh của {focusOverlay.personName}</Text>
                  <Text numberOfLines={1} style={styles.focusOverlayHint}>Chạm một người để xem nhánh của họ · kéo hoặc chụm để di chuyển</Text>
                </View>
              </View>

                <Animated.View style={[styles.focusOverlayGraph, focusOverlayContentStyle]}>
                  {focusOverlay.visual ? (
                    <FamilyGraphPrototype
                      key={`full-branch:${focusOverlay.personId}`}
                      familyName={familyName}
                      familyId={familyId}
                      people={focusOverlay.visual.people}
                      connections={focusOverlay.visual.connections}
                      defaultFocusId={focusOverlay.personId}
                      canvasWidth={focusOverlay.visual.canvasWidth}
                      canvasHeight={focusOverlay.visual.canvasHeight}
                      resolveRelationship={resolveRelationship}
                      initialViewMode="all"
                      headerMode="none"
                      surfaceMode="focusOverlay"
                      autoFitOnMount
                      onFocusPersonRequest={handleFocusOverlayPersonRequest}
                    />
                  ) : (
                    <View style={styles.focusOverlayPreparing}>
                      {focusOverlay.loadFailed ? (
                        <>
                          <Ionicons name="leaf-outline" size={28} color={COLORS.primary} />
                          <Text style={styles.focusOverlayPreparingTitle}>Chưa dựng được nhánh này</Text>
                          <Text style={styles.focusOverlayPreparingText}>Cây gốc vẫn được giữ nguyên. Đóng Focus View và thử lại nhé.</Text>
                        </>
                      ) : (
                        <>
                          <ActivityIndicator color={COLORS.primary} />
                          <Text style={styles.focusOverlayPreparingTitle}>Đang chuẩn bị nhánh của {focusOverlay.personName}…</Text>
                          <Text style={styles.focusOverlayPreparingText}>Bloom đang lấy toàn bộ nhánh từ phả hệ và sắp xếp lại để dễ nhìn hơn.</Text>
                        </>
                      )}
                    </View>
                  )}
                </Animated.View>

                {focusOverlay.visual?.truncated ? (
                  <View style={styles.focusOverlayFooter}>
                    <Ionicons name="leaf-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.focusOverlayFooterText}>Nhánh rất lớn nên Bloom đang giữ giới hạn an toàn để thao tác luôn mượt.</Text>
                  </View>
                ) : null}
            </Animated.View>
          </View>
        </Modal>
      ) : null}

      {surfaceMode === "standard" ? (
      <FamilyGraphPersonSheet
        person={detailPerson}
        visible={!!detailPerson}
        onClose={() => {
          setDetailPersonId(null);
          setSelectedPersonId(null);
        }}
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
      ) : null}

      {surfaceMode === "standard" ? (
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
      ) : null}
    </View>
  );
}

const PersonNode = memo(function PersonNode({
  person,
  selected,
  focused,
  inFocusedBranch,
  relationMeta,
  branchMode,
  onPressPerson,
}: {
  person: FamilyGraphPrototypePerson;
  selected: boolean;
  focused: boolean;
  inFocusedBranch: boolean;
  relationMeta: FocusRelationMeta | null;
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
        {relationMeta && (
          <View
            style={[
              styles.relationBadge,
              { backgroundColor: palette.badgeBackground },
              dimmed && styles.relationBadgeDimmed,
            ]}
          >
            <Ionicons
              name={getFocusRelationIcon(relationMeta.kind)}
              size={12}
              color={dimmed ? "#B8B2B5" : "#946276"}
            />
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.relationBadgeText, dimmed && styles.relationBadgeTextDimmed]}
            >
              {relationMeta.label}
            </Text>
          </View>
        )}

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
});

const GraphConnectors = memo(function GraphConnectors({
  people,
  connections,
  activeBranchIds,
  focusMode,
  canvasWidth,
  renderBounds,
  mountedPersonIds,
}: {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  activeBranchIds: Set<string>;
  focusMode: boolean;
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
      focusMode={focusMode}
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
      focusMode={focusMode}
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
  focusMode,
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
  focusMode: boolean;
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
    ? (focusMode ? FOCUS_LINE_THICKNESS : ACTIVE_LINE_THICKNESS)
    : FADED_LINE_THICKNESS;
  const passLineColor = renderPass === "active" ? ACTIVE_PARENT_COLOR : FADED_PARENT_COLOR;
  const partnerThickness = renderPass === "active"
    ? (focusMode ? 3.4 : 2.4)
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
  focusMode,
  laneOffset,
  route,
  preferDirectVertical,
  preferSideAnchor,
}: {
  parent: FamilyGraphPrototypePerson;
  child: FamilyGraphPrototypePerson;
  active: boolean;
  focusMode: boolean;
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
    ? (focusMode ? FOCUS_LINE_THICKNESS : ACTIVE_LINE_THICKNESS)
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

function getFocusRelationIcon(kind: FocusRelationKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "partner":
      return "heart";
    case "father":
    case "son":
    case "chu":
    case "cau":
      return "man-outline";
    case "mother":
    case "daughter":
    case "co":
    case "di":
      return "woman-outline";
    case "grandfather":
    case "grandmother":
      return "ribbon-outline";
    case "grandchild":
      return "happy-outline";
    case "bac":
      return "medal-outline";
    case "relative":
    case "sibling":
    default:
      return "people-outline";
  }
}

function toFocusRelationMeta(
  relationship: FamilyGraphVietnameseRelationship,
  person: FamilyGraphPrototypePerson,
): FocusRelationMeta {
  switch (relationship.kind) {
    case "partner":
      return { kind: "partner", label: relationship.label };
    case "parent":
      return {
        kind: person.gender === "female" ? "mother" : person.gender === "male" ? "father" : "relative",
        label: relationship.label,
      };
    case "child":
      return {
        kind: person.gender === "female" ? "daughter" : person.gender === "male" ? "son" : "relative",
        label: relationship.label,
      };
    case "sibling":
    case "cousin":
      return { kind: "sibling", label: relationship.label };
    case "grandparent":
    case "ancestor":
      return {
        kind: person.gender === "female" ? "grandmother" : person.gender === "male" ? "grandfather" : "relative",
        label: relationship.label,
      };
    case "grandchild":
    case "descendant":
    case "niece_nephew":
      return { kind: "grandchild", label: relationship.label };
    case "aunt_uncle": {
      const lower = relationship.label.toLocaleLowerCase("vi");
      if (lower.startsWith("bác")) return { kind: "bac", label: relationship.label };
      if (lower.startsWith("chú")) return { kind: "chu", label: relationship.label };
      if (lower.startsWith("cô")) return { kind: "co", label: relationship.label };
      if (lower.startsWith("dì")) return { kind: "di", label: relationship.label };
      if (lower.startsWith("cậu")) return { kind: "cau", label: relationship.label };
      return { kind: "relative", label: relationship.label };
    }
    default:
      return { kind: "relative", label: relationship.label };
  }
}

function getRelationshipMetaAroundFocus(
  viewAnchorPersonId: string,
  people: FamilyGraphPrototypePerson[],
  connections: FamilyGraphPrototypeConnection[],
) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const parentsByChild = new Map<string, Set<string>>();
  const childrenByParent = new Map<string, Set<string>>();
  const partnersByPerson = new Map<string, Set<string>>();

  for (const connection of connections) {
    if (connection.type === "parent_child") {
      addToAdjacency(parentsByChild, connection.toId, connection.fromId);
      addToAdjacency(childrenByParent, connection.fromId, connection.toId);
      continue;
    }
    addToAdjacency(partnersByPerson, connection.fromId, connection.toId);
    addToAdjacency(partnersByPerson, connection.toId, connection.fromId);
  }

  const relations = new Map<string, FocusRelationMeta>();
  const focus = peopleById.get(viewAnchorPersonId);
  if (!focus) return relations;

  const setRelation = (personId: string, meta: FocusRelationMeta) => {
    if (personId === viewAnchorPersonId || relations.has(personId)) return;
    relations.set(personId, meta);
  };

  partnersByPerson.get(viewAnchorPersonId)?.forEach((personId) => {
    const person = peopleById.get(personId);
    setRelation(personId, {
      kind: "partner",
      label: person?.gender === "female" ? "Vợ" : person?.gender === "male" ? "Chồng" : "Bạn đời",
    });
  });

  const parentIds = [...(parentsByChild.get(viewAnchorPersonId) ?? [])];
  parentIds.forEach((parentId) => {
    const parent = peopleById.get(parentId);
    setRelation(parentId, {
      kind: parent?.gender === "female" ? "mother" : "father",
      label: parent?.gender === "female" ? "Mẹ" : "Cha",
    });
  });

  const childIds = [...(childrenByParent.get(viewAnchorPersonId) ?? [])];
  childIds.forEach((childId) => {
    const child = peopleById.get(childId);
    const female = child?.gender === "female";
    setRelation(childId, { kind: female ? "daughter" : "son", label: female ? "Con gái" : "Con trai" });
  });

  const siblingIds = new Set<string>();
  parentIds.forEach((parentId) => {
    childrenByParent.get(parentId)?.forEach((childId) => {
      if (childId !== viewAnchorPersonId) siblingIds.add(childId);
    });
  });
  siblingIds.forEach((siblingId) => {
    const sibling = peopleById.get(siblingId);
    if (!sibling) return;
    const older = sibling.birthYear != null && focus.birthYear != null && sibling.birthYear < focus.birthYear;
    const younger = sibling.birthYear != null && focus.birthYear != null && sibling.birthYear > focus.birthYear;
    const label = older
      ? sibling.gender === "female" ? "Chị" : "Anh"
      : younger
        ? "Em"
        : "Anh/Chị/Em";
    setRelation(siblingId, { kind: "sibling", label });
  });

  const grandparentIds = new Set<string>();
  parentIds.forEach((parentId) => {
    parentsByChild.get(parentId)?.forEach((grandparentId) => grandparentIds.add(grandparentId));
  });
  grandparentIds.forEach((personId) => {
    const person = peopleById.get(personId);
    setRelation(personId, {
      kind: person?.gender === "female" ? "grandmother" : "grandfather",
      label: person?.gender === "female" ? "Bà" : "Ông",
    });
  });

  childIds.forEach((childId) => {
    childrenByParent.get(childId)?.forEach((grandchildId) => {
      setRelation(grandchildId, { kind: "grandchild", label: "Cháu" });
    });
  });

  // Cô / dì / chú / bác / cậu: sibling của cha hoặc mẹ.
  // Prototype dùng tuổi + giới tính + lineage để tạo nhãn trực quan; production sẽ do Kinship Resolver quyết định.
  parentIds.forEach((parentId) => {
    const parent = peopleById.get(parentId);
    if (!parent) return;
    const grandparentOfFocusIds = [...(parentsByChild.get(parentId) ?? [])];
    const parentSiblingIds = new Set<string>();
    grandparentOfFocusIds.forEach((grandparentId) => {
      childrenByParent.get(grandparentId)?.forEach((childId) => {
        if (childId !== parentId) parentSiblingIds.add(childId);
      });
    });

    parentSiblingIds.forEach((relativeId) => {
      const relative = peopleById.get(relativeId);
      if (!relative || relations.has(relativeId)) return;
      setRelation(relativeId, getCollateralRelationMeta(parent, relative));
    });
  });

  return relations;
}

function getCollateralRelationMeta(
  parent: FamilyGraphPrototypePerson,
  relative: FamilyGraphPrototypePerson,
): FocusRelationMeta {
  const olderThanParent = relative.birthYear != null && parent.birthYear != null && relative.birthYear < parent.birthYear;
  if (olderThanParent) return { kind: "bac", label: "Bác" };

  if (parent.gender === "female") {
    return relative.gender === "female"
      ? { kind: "di", label: "Dì" }
      : { kind: "cau", label: "Cậu" };
  }

  return relative.gender === "female"
    ? { kind: "co", label: "Cô" }
    : { kind: "chu", label: "Chú" };
}

function addToAdjacency(map: Map<string, Set<string>>, fromId: string, toId: string) {
  const values = map.get(fromId) ?? new Set<string>();
  values.add(toId);
  map.set(fromId, values);
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
  // Phase 14J: Focus is a full-screen native portal with point-to-card animation. The original Canvas View
  // stays mounted and untouched underneath a simple dim interaction shield.
  // No blur/filter is used, so this layer is cheap and deterministic on Android.
  focusOverlayModalRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  focusOverlayShield: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    // Ordinary dim overlay only: no BlurView, filter or hardware texture.
    backgroundColor: "rgba(55,36,45,0.11)",
  },
  focusOverlayCard: {
    position: "absolute",
    zIndex: 3,
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#FFF9FB",
    borderWidth: 1.5,
    borderColor: "rgba(234,184,207,0.96)",
    shadowColor: "#4E3641",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 8,
  },
  focusOverlayHeader: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#F4EAF8",
    borderBottomWidth: 1,
    borderBottomColor: "#E3D6E8",
  },
  focusOverlayHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  focusOverlayBack: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(218,180,201,0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  focusOverlayBackPressed: { transform: [{ scale: 0.97 }], opacity: 0.82 },
  focusOverlayBackText: { color: COLORS.primaryText, fontSize: 10.4, fontWeight: "900" },
  focusOverlayHeaderCopy: { flex: 1, minWidth: 0 },
  focusOverlayEyebrow: { color: "#826A98", fontSize: 8.2, fontWeight: "900", letterSpacing: 0.55 },
  focusOverlayTitle: { marginTop: 2, color: COLORS.primaryText, fontSize: 13.8, fontWeight: "900" },
  focusOverlayHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 8.6, lineHeight: 12 },
  focusOverlayGraph: { flex: 1, minHeight: 0, backgroundColor: "#FCFBF7" },
  focusOverlayPreparing: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#FCFBF7" },
  focusOverlayPreparingTitle: { marginTop: 12, color: COLORS.primaryText, fontSize: 15, lineHeight: 21, fontWeight: "900", textAlign: "center" },
  focusOverlayPreparingText: { marginTop: 7, maxWidth: 310, color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, textAlign: "center" },
  focusOverlayFooter: { minHeight: 32, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF5F8", borderTopWidth: 1, borderTopColor: "#E9DDE2" },
  focusOverlayFooterText: { flex: 1, color: COLORS.secondaryText, fontSize: 8.7, lineHeight: 12 },
  branchPreparingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    elevation: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  branchPreparingFlower: {
    width: 72,
    height: 72,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.focusBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  branchPreparingTitle: { color: COLORS.primaryText, fontSize: 19, fontWeight: "900", textAlign: "center" },
  branchPreparingPerson: { marginTop: 5, color: COLORS.primary, fontSize: 13, fontWeight: "900", maxWidth: 250 },
  branchPreparingStageRow: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 8 },
  branchPreparingPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  branchPreparingStage: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  branchPreparingHint: { marginTop: 9, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center", maxWidth: 290 },
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
  viewportFocusOverlay: {
    minHeight: 0,
    marginTop: 0,
    marginHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
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
  focusLocateButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    zIndex: 20,
  },
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
