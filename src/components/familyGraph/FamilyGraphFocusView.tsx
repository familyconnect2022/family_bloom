import { Ionicons } from "@expo/vector-icons";
import { memo, startTransition, useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { APP_CONFIG_DEFAULTS } from "../../constants/appConfiguration";
import { COLORS } from "../../constants/theme";
import { applyFocusPanDelta, applyFocusPinchScale } from "./familyGraphFocusCamera";
import {
  hydrateFamilyGraphFocusRuntimeState,
  retainFamilyGraphFocusPersonIds,
  updateFamilyGraphFocusCamera,
} from "./familyGraphFocusRuntimeCache";
import type { FamilyGraphRenderScene } from "./familyGraphSceneBuilder";
import { FAMILY_GRAPH_NODE_CARD_HEIGHT, FAMILY_GRAPH_NODE_CARD_WIDTH } from "./familyGraphGeometry";
import { FAMILY_GRAPH_CANVAS, type FamilyGraphPrototypeConnection, type FamilyGraphPrototypePerson } from "./familyGraphPrototypeData";
import { FamilyGraphSpatialGrid } from "./familyGraphSpatialGrid";
import {
  getFamilyGraphCameraSnapshotFromTransform,
  getFamilyGraphNodeRect,
  getFamilyGraphPanForAnchor,
  getFamilyGraphViewportRect,
  mergeRetainedFamilyGraphPersonIds,
  rectsIntersect,
} from "./familyGraphViewport";

const MIN_SCALE = 0.02;
const ENTRY_SCALE = 0.95;
const ENTRY_Y = 0.42;
const NODE_WIDTH = FAMILY_GRAPH_NODE_CARD_WIDTH;
const NODE_HEIGHT = FAMILY_GRAPH_NODE_CARD_HEIGHT;
const CAMERA_CELL = APP_CONFIG_DEFAULTS.familyGraph.render.viewportCameraCellSize;
const RENDER_CONFIG = APP_CONFIG_DEFAULTS.familyGraph.render;

const generationCaption: Record<number, string> = {
  1: "Đời ông bà",
  2: "Cha mẹ · cô chú",
  3: "Bạn · bạn đời",
  4: "Đời con",
  5: "Đời cháu",
};

const centerX = (person: FamilyGraphPrototypePerson) => person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2;
const topY = (person: FamilyGraphPrototypePerson) => person.y;
const bottomY = (person: FamilyGraphPrototypePerson) => person.y + NODE_HEIGHT;

/** Focus-only connector renderer. It deliberately does not import the Main Tree renderer. */
const FocusConnectors = memo(function FocusConnectors({
  people,
  connections,
  mountedIds,
}: {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  mountedIds: Set<string>;
}) {
  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {connections.map((connection) => {
        if (!mountedIds.has(connection.fromId) || !mountedIds.has(connection.toId)) return null;
        const from = byId.get(connection.fromId);
        const to = byId.get(connection.toId);
        if (!from || !to) return null;
        if (connection.type === "partner") {
          const left = centerX(from) <= centerX(to) ? from : to;
          const right = left === from ? to : from;
          const x = centerX(left) + NODE_WIDTH / 2 - 4;
          const endX = centerX(right) - NODE_WIDTH / 2 + 4;
          const y = from.y + NODE_HEIGHT * 0.48;
          return (
            <View
              key={connection.id}
              style={[styles.partnerLine, { left: x, top: y, width: Math.max(2, endX - x) }]}
            />
          );
        }
        const startX = centerX(from);
        const startY = bottomY(from);
        const endX = centerX(to);
        const endY = topY(to);
        const midY = startY + Math.max(8, (endY - startY) / 2);
        return (
          <View key={connection.id} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.verticalLine, { left: startX, top: startY, height: Math.max(1, midY - startY) }]} />
            <View style={[styles.horizontalLine, { left: Math.min(startX, endX), top: midY, width: Math.max(1, Math.abs(endX - startX)) }]} />
            <View style={[styles.verticalLine, { left: endX, top: midY, height: Math.max(1, endY - midY) }]} />
          </View>
        );
      })}
    </View>
  );
});

/** Focus cards are intentionally non-interactive: changing Person requires Back to Main Tree. */
const FocusPersonCard = memo(function FocusPersonCard({
  person,
  focused,
}: {
  person: FamilyGraphPrototypePerson;
  focused: boolean;
}) {
  const initials = person.displayName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <View style={[styles.nodeWrap, { left: person.x, top: person.y }]} pointerEvents="none">
      <View style={[styles.nodeCard, focused && styles.nodeCardFocused]}>
        <View style={[styles.avatar, person.gender === "female" ? styles.avatarFemale : styles.avatarMale, focused && styles.avatarFocused]}>
          <Text allowFontScaling={false} style={styles.avatarText}>{initials}</Text>
          {person.linkedAccount ? (
            <View style={styles.linkBadge}><Ionicons name="link" size={11} color={COLORS.primary} /></View>
          ) : null}
        </View>
        <Text allowFontScaling={false} numberOfLines={2} style={[styles.nodeName, focused && styles.nodeNameFocused]}>
          {person.displayName}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.nodeYears}>
          {person.birthYear ?? "?"}{person.deathYear ? ` – ${person.deathYear}` : person.lifeStatus === "living" ? " – nay" : ""}
        </Text>
      </View>
    </View>
  );
});

export const FamilyGraphFocusView = memo(function FamilyGraphFocusView({
  visual,
  personId,
  onVisualReady,
}: {
  visual: FamilyGraphRenderScene;
  personId: string;
  onVisualReady?: () => void;
}) {
  const hydratedRef = useRef(hydrateFamilyGraphFocusRuntimeState(visual.sceneKey, visual.bootstrapPersonIds));
  const restoredCamera = hydratedRef.current.userCameraValid ? hydratedRef.current.camera : null;
  const initialScale = Math.max(MIN_SCALE, restoredCamera?.scale ?? visual.initialCamera?.scale ?? ENTRY_SCALE);
  const scale = useSharedValue(initialScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const panValid = useSharedValue(0);
  const pinchActive = useSharedValue(0);
  const pinchStartScale = useSharedValue(initialScale);
  const pinchAnchorX = useSharedValue(0);
  const pinchAnchorY = useSharedValue(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [retainedIds, setRetainedIds] = useState<Set<string>>(() => new Set(hydratedRef.current.retainedPersonIds));
  const retainedRef = useRef(retainedIds);
  const initializedRef = useRef(false);
  const readyRef = useRef(false);

  const peopleById = useMemo(() => new Map(visual.people.map((person) => [person.id, person])), [visual.people]);
  const spatialGrid = useMemo(() => {
    const grid = new FamilyGraphSpatialGrid(RENDER_CONFIG.viewportGridCellSize);
    for (const person of visual.people) {
      grid.insertNode(person.id, getFamilyGraphNodeRect({
        person,
        nodeSlotWidth: FAMILY_GRAPH_CANVAS.nodeWidth,
        nodeCardWidth: NODE_WIDTH,
        nodeCardHeight: NODE_HEIGHT,
        padding: 20,
      }));
    }
    return grid;
  }, [visual.people]);

  const commitRetained = useCallback((ids: Iterable<string>) => {
    const next = mergeRetainedFamilyGraphPersonIds(retainedRef.current, new Set(ids));
    if (next.size === retainedRef.current.size) return;
    retainedRef.current = next;
    retainFamilyGraphFocusPersonIds(visual.sceneKey, next);
    startTransition(() => setRetainedIds(next));
  }, [visual.sceneKey]);

  const discoverCamera = useCallback((camera: { centerX: number; centerY: number; scale: number }) => {
    if (viewport.width <= 0 || viewport.height <= 0) return;
    const bounds = getFamilyGraphViewportRect({
      camera,
      viewport,
      canvasWidth: visual.canvasWidth,
      canvasHeight: visual.canvasHeight,
      overscanScreens: RENDER_CONFIG.focusViewportOverscanScreens,
    });
    const discovered = new Set<string>(visual.bootstrapPersonIds);
    discovered.add(personId);
    for (const entry of spatialGrid.queryRect(bounds)) {
      if (entry.kind === "node" && rectsIntersect(entry.rect, bounds)) discovered.add(entry.id);
    }
    commitRetained(discovered);
  }, [commitRetained, personId, spatialGrid, viewport, visual.bootstrapPersonIds, visual.canvasHeight, visual.canvasWidth]);

  const persistTransform = useCallback((x: number, y: number, currentScale: number) => {
    if (viewport.width <= 0 || viewport.height <= 0) return;
    const camera = getFamilyGraphCameraSnapshotFromTransform({
      transform: { translateX: x, translateY: y, scale: Math.max(MIN_SCALE, currentScale) },
      viewport,
      canvasWidth: visual.canvasWidth,
      canvasHeight: visual.canvasHeight,
    });
    updateFamilyGraphFocusCamera(visual.sceneKey, camera);
    discoverCamera(camera);
  }, [discoverCamera, viewport, visual.canvasHeight, visual.canvasWidth, visual.sceneKey]);

  const initialize = useCallback((width: number, height: number) => {
    if (initializedRef.current || width <= 0 || height <= 0) return;
    initializedRef.current = true;
    const restored = hydratedRef.current.userCameraValid ? hydratedRef.current.camera : null;
    const focusPerson = peopleById.get(personId);
    const nextScale = Math.max(MIN_SCALE, restored?.scale ?? visual.initialCamera?.scale ?? ENTRY_SCALE);
    const canvasPoint = restored
      ? { x: restored.centerX, y: restored.centerY }
      : visual.initialCamera?.canvasPoint
        ?? (focusPerson
          ? { x: focusPerson.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2, y: focusPerson.y + NODE_HEIGHT / 2 }
          : { x: visual.canvasWidth / 2, y: visual.canvasHeight / 2 });
    const viewportPoint = restored
      ? { x: width / 2, y: height / 2 }
      : visual.initialCamera
        ? { x: width * visual.initialCamera.viewportAnchor.x, y: height * visual.initialCamera.viewportAnchor.y }
        : { x: width / 2, y: height * ENTRY_Y };
    const pan = getFamilyGraphPanForAnchor({
      canvasPoint,
      viewportPoint,
      scale: nextScale,
      canvasWidth: visual.canvasWidth,
      canvasHeight: visual.canvasHeight,
    });
    scale.value = nextScale;
    translateX.value = pan.x;
    translateY.value = pan.y;
    requestAnimationFrame(() => {
      persistTransform(pan.x, pan.y, nextScale);
      requestAnimationFrame(() => {
        if (readyRef.current) return;
        readyRef.current = true;
        onVisualReady?.();
      });
    });
  }, [onVisualReady, peopleById, persistTransform, personId, scale, translateX, translateY, visual.canvasHeight, visual.canvasWidth, visual.initialCamera]);

  // Same camera interaction principle as Main Tree, but a completely separate
  // gesture instance + SharedValues + runtime cache.
  const panGesture = useMemo(() => Gesture.Pan()
    .minDistance(3)
    .maxPointers(1)
    .onStart(() => {
      "worklet";
      if (pinchActive.value !== 0) {
        panValid.value = 0;
        return;
      }
      panValid.value = 1;
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      "worklet";
      if (pinchActive.value !== 0 || panValid.value === 0) return;
      const next = applyFocusPanDelta(panStartX.value, panStartY.value, event.translationX, event.translationY);
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onFinalize(() => {
      "worklet";
      if (panValid.value !== 0) runOnJS(persistTransform)(translateX.value, translateY.value, scale.value);
      panValid.value = 0;
    }), [panStartX, panStartY, panValid, persistTransform, pinchActive, scale, translateX, translateY]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onStart((event) => {
      "worklet";
      pinchActive.value = 1;
      panValid.value = 0;
      const start = Math.max(MIN_SCALE, scale.value);
      pinchStartScale.value = start;
      const cx = visual.canvasWidth / 2;
      const cy = visual.canvasHeight / 2;
      pinchAnchorX.value = cx + (event.focalX - translateX.value - cx) / start;
      pinchAnchorY.value = cy + (event.focalY - translateY.value - cy) / start;
    })
    .onUpdate((event) => {
      "worklet";
      if (event.numberOfPointers < 2) return;
      const nextScale = applyFocusPinchScale(pinchStartScale.value, event.scale, MIN_SCALE);
      const cx = visual.canvasWidth / 2;
      const cy = visual.canvasHeight / 2;
      scale.value = nextScale;
      translateX.value = event.focalX - cx - nextScale * (pinchAnchorX.value - cx);
      translateY.value = event.focalY - cy - nextScale * (pinchAnchorY.value - cy);
    })
    .onFinalize(() => {
      "worklet";
      runOnJS(persistTransform)(translateX.value, translateY.value, scale.value);
      pinchActive.value = 0;
      panValid.value = 0;
    }), [panValid, persistTransform, pinchActive, pinchAnchorX, pinchAnchorY, pinchStartScale, scale, translateX, translateY, visual.canvasHeight, visual.canvasWidth]);

  const gesture = useMemo(() => Gesture.Simultaneous(panGesture, pinchGesture), [panGesture, pinchGesture]);

  // Render-on-pan: like Main Tree, JS only receives coarse camera-cell changes.
  // This discovers new nodes while the finger is moving without causing every
  // touch frame to render React.
  useAnimatedReaction(
    () => {
      if (viewport.width <= 0 || viewport.height <= 0) return null;
      const camera = getFamilyGraphCameraSnapshotFromTransform({
        transform: { translateX: translateX.value, translateY: translateY.value, scale: scale.value },
        viewport,
        canvasWidth: visual.canvasWidth,
        canvasHeight: visual.canvasHeight,
      });
      return {
        centerX: camera.centerX,
        centerY: camera.centerY,
        scale: camera.scale,
        cellX: Math.floor(camera.centerX / CAMERA_CELL),
        cellY: Math.floor(camera.centerY / CAMERA_CELL),
        scaleBucket: Math.round(camera.scale * 10),
      };
    },
    (current, previous) => {
      if (!current) return;
      if (!previous || current.cellX !== previous.cellX || current.cellY !== previous.cellY || current.scaleBucket !== previous.scaleBucket) {
        runOnJS(discoverCamera)({ centerX: current.centerX, centerY: current.centerY, scale: current.scale });
      }
    },
  );

  const panStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }, { translateY: translateY.value }] }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const mountedPeople = useMemo(() => visual.people.filter((person) => retainedIds.has(person.id)), [retainedIds, visual.people]);
  const mountedGenerations = useMemo(() => Array.from(new Set(mountedPeople.map((person) => person.generation))), [mountedPeople]);

  return (
    <View
      collapsable={false}
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport({ width, height });
        initialize(width, height);
      }}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View collapsable={false} style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.panLayer, { width: visual.canvasWidth, height: visual.canvasHeight }, panStyle]}>
            <Animated.View style={[styles.canvas, { width: visual.canvasWidth, height: visual.canvasHeight }, scaleStyle]}>
              {mountedGenerations.map((generation) => {
                const y = mountedPeople.find((person) => person.generation === generation)?.y ?? 0;
                return (
                  <View key={`focus-generation-${generation}`} pointerEvents="none" style={[styles.generationTag, { top: y + 18 }]}>
                    <Text style={styles.generationTitle}>Thế hệ {generation}</Text>
                    <Text style={styles.generationCaption}>{generationCaption[generation] ?? "Gia đình"}</Text>
                  </View>
                );
              })}
              <FocusConnectors people={visual.people} connections={visual.connections} mountedIds={retainedIds} />
              {mountedPeople.map((person) => (
                <FocusPersonCard key={person.id} person={person} focused={person.id === personId} />
              ))}
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  panLayer: { position: "absolute", left: 0, top: 0 },
  canvas: { position: "absolute", left: 0, top: 0 },
  nodeWrap: { position: "absolute", width: FAMILY_GRAPH_CANVAS.nodeWidth, height: NODE_HEIGHT, alignItems: "center" },
  nodeCard: {
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8DDE2",
    backgroundColor: "#FFF8FA",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 10,
    shadowColor: "#B98A9C",
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  nodeCardFocused: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: "#FFF1F6" },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", position: "relative" },
  avatarFemale: { backgroundColor: "#F9DCE8" },
  avatarMale: { backgroundColor: "#DDEAF6" },
  avatarFocused: { borderWidth: 2, borderColor: COLORS.primary },
  avatarText: { fontSize: 15, fontWeight: "900", color: COLORS.primaryText },
  linkBadge: { position: "absolute", right: -4, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#F0D3DE" },
  nodeName: { marginTop: 7, fontSize: 12.5, lineHeight: 15, fontWeight: "800", textAlign: "center", color: COLORS.primaryText },
  nodeNameFocused: { color: COLORS.primary },
  nodeYears: { marginTop: 3, fontSize: 9.5, color: COLORS.secondaryText, fontWeight: "600" },
  generationTag: { position: "absolute", left: 12, width: 104, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.88)" },
  generationTitle: { fontSize: 9, fontWeight: "900", color: COLORS.primaryText },
  generationCaption: { marginTop: 1, fontSize: 8, color: COLORS.secondaryText },
  partnerLine: { position: "absolute", borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "#DABDC8" },
  verticalLine: { position: "absolute", width: 1.5, backgroundColor: "#DABDC8" },
  horizontalLine: { position: "absolute", height: 1.5, backgroundColor: "#DABDC8" },
});
