import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { FamilyGraphPortrait } from "./FamilyGraphPortrait";
import { FamilyGraphUnionLines, FamilyGraphPrivateChildLabel } from "./FamilyGraphUnionLines";
import type { FamilyGraphGeometry } from "./familyGraphGeometry";
import { formatFamilyGraphNodeName, getFamilyGraphPlateLabel } from "./familyGraphNodePresentation";
import type { FamilyGraphVietnameseRelationship } from "../../types/familyGraphQuery";
import { FAMILY_GRAPH_NODE_3D, familyGraphNodeGender, FAMILY_GRAPH_ORNAMENT_WIDTH, FAMILY_GRAPH_ORNAMENT_TOP_HEIGHT, FAMILY_GRAPH_ORNAMENT_BOTTOM_HEIGHT, FAMILY_GRAPH_ORNAMENT_OUTSIDE_RATIO } from "./familyGraphNode3dAssets";
import { memo, startTransition, useCallback, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
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
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


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
  geometry,
}: {
  people: FamilyGraphPrototypePerson[];
  connections: FamilyGraphPrototypeConnection[];
  mountedIds: Set<string>;
  geometry: FamilyGraphGeometry;
}) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const covered = useMemo(() => new Set([
    ...geometry.partnerUnits.flatMap((unit) => [
      ...unit.sharedChildIds.map((childId) => `${unit.partnerAId}->${childId}`),
      ...unit.sharedChildIds.map((childId) => `${unit.partnerBId}->${childId}`),
      ...unit.privateChildren.map((item) => `${item.parentId}->${item.childId}`),
    ]),
  ]), [geometry.partnerUnits]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {geometry.partnerUnits.map((unit) => {
        if (!mountedIds.has(unit.partnerAId) || !mountedIds.has(unit.partnerBId)) return null;
        const partnerA=byId.get(unit.partnerAId),partnerB=byId.get(unit.partnerBId);
        if (!partnerA || !partnerB) return null;
        const children=[...unit.sharedChildIds,...unit.privateChildren.map((item)=>item.childId)]
          .filter((id)=>mountedIds.has(id)).map((id)=>byId.get(id))
          .filter((child):child is FamilyGraphPrototypePerson=>!!child)
          .sort((a,b)=>a.x-b.x || a.id.localeCompare(b.id));
        return <FamilyGraphUnionLines key={unit.id} unit={unit}
          partnerA={partnerA} partnerB={partnerB} children={children}
          active={true} color={COLORS.selectedBackground}/>;
      })}
      {connections.filter((connection)=>connection.type==="parent_child"
        && !covered.has(`${connection.fromId}->${connection.toId}`)).map((connection) => {
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
              style={[__a3_styles.partnerLine, { left: x, top: y, width: Math.max(2, endX - x) }]}
            />
          );
        }
        const startX = centerX(from);
        const startY = bottomY(from);
        const endX = centerX(to);
        const endY = topY(to);
        const midY = startY + Math.max(8, (endY - startY) / 2);
        // Two quarter-circles replace sharp orthogonal corners in Focus View.
        // Direct biological parent-child edges remain solid even across remarriage.
        const deltaX = endX - startX;
        const radius = Math.min(8, Math.abs(deltaX) / 3,
          Math.max(0, midY - startY) / 2, Math.max(0, endY - midY) / 2);
        if (Math.abs(deltaX) < 2 || radius < 2) {
          return <View key={connection.id} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[__a3_styles.verticalLine, { left: startX, top: startY, height: Math.max(1, midY - startY) }]} />
            <View style={[__a3_styles.horizontalLine, { left: Math.min(startX, endX), top: midY, width: Math.max(1, Math.abs(deltaX)) }]} />
            <View style={[__a3_styles.verticalLine, { left: endX, top: midY, height: Math.max(1, endY - midY) }]} />
          </View>;
        }
        const right = deltaX > 0;
        const edge = { borderColor: COLORS.selectedBackground, borderStyle: 'solid' as const };
        return <View key={connection.id} pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[__a3_styles.verticalLine, { left: startX, top: startY, height: Math.max(1, midY - radius - startY) }]} />
          <View style={[{ position: 'absolute', left: right ? startX : startX - radius, top: midY - radius,
            width: radius, height: radius, ...edge },
            right ? { borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderBottomLeftRadius: radius }
              : { borderRightWidth: 1.5, borderBottomWidth: 1.5, borderBottomRightRadius: radius }]} />
          <View style={[__a3_styles.horizontalLine, { left: Math.min(startX, endX) + radius, top: midY,
            width: Math.max(1, Math.abs(deltaX) - 2 * radius) }]} />
          <View style={[{ position: 'absolute', left: right ? endX - radius : endX, top: midY,
            width: radius, height: radius, ...edge },
            right ? { borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: radius }
              : { borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: radius }]} />
          <View style={[__a3_styles.verticalLine, { left: endX, top: midY + radius,
            height: Math.max(1, endY - midY - radius) }]} />
        </View>;
      })}
    </View>
  );
});

/** Focus cards are intentionally non-interactive: changing Person requires Back to Main Tree. */
const FocusPersonCard = memo(function FocusPersonCard({
  person,
  memberAvatarUrl,
  focused,
  relationLabel,
}: {
  person: FamilyGraphPrototypePerson;
  memberAvatarUrl?: string | null;
  focused: boolean;
  relationLabel: string | null;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const initials = person.displayName.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase() ?? "").join("") || "?";
  const nodeColors = FAMILY_GRAPH_NODE_3D[familyGraphNodeGender(person.gender)];
  const shownName = formatFamilyGraphNodeName(person.displayName);
  const nameLength = shownName.length;
  const nameSize = nameLength >= 34 ? 10 : nameLength >= 25 ? 10.5 : 11.2;
  return (
    <View style={[__a3_styles.nodeWrap, { left: person.x, top: person.y }]} pointerEvents="none">
      {focused && <Image source={nodeColors.mist} resizeMode="contain" fadeDuration={0} style={__a3_styles.focusMistOuter} />}
      <View style={[__a3_styles.nodeCard, { backgroundColor: nodeColors.bg, borderColor: nodeColors.edge }, focused && __a3_styles.nodeCardFocused]}>
        <View style={[__a3_styles.generationBadge, { backgroundColor: nodeColors.accent }]}>
          <Text allowFontScaling={false} style={__a3_styles.generationBadgeText}>{person.generation}</Text>
        </View>
        <View style={[__a3_styles.avatar, { borderColor: nodeColors.edge, backgroundColor: nodeColors.bg }]}>
          <FamilyGraphPortrait uri={person.avatarUrl || memberAvatarUrl} initials={initials} textStyle={[__a3_styles.avatarText, { color: nodeColors.text }]} />
          {person.linkedAccount && <View style={__a3_styles.linkBadge}><Ionicons name="link" size={11} color={__a3Colors.primary} /></View>}
        </View>
        <Text allowFontScaling={false} numberOfLines={5} style={[__a3_styles.nodeName, { color: nodeColors.text, fontSize: nameSize }]}>
          {shownName}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={[__a3_styles.nodeYears, { color: nodeColors.text }]}>
          {person.birthYear ?? "?"}{person.deathYear ? ` – ${person.deathYear}` : person.lifeStatus === "living" ? " – nay" : ""}
        </Text>
      </View>
      <View pointerEvents="none" collapsable={false} style={__a3_styles.bottomOrnamentWrap}>
        <Image source={nodeColors.bottom} resizeMode="contain" fadeDuration={0} style={__a3_styles.ornamentImage} />
      </View>
    </View>
  );
});

export const FamilyGraphFocusView = memo(function FamilyGraphFocusView({
  visual,
  memberAvatarByUid,
  personId,
  resolveRelationship,
  onVisualReady,
}: {
  visual: FamilyGraphRenderScene;
  memberAvatarByUid?: ReadonlyMap<string, string | null>;
  personId: string;
  resolveRelationship?: (sourcePersonId: string, targetPersonId: string) => FamilyGraphVietnameseRelationship | null;
  onVisualReady?: () => void;
}) {
  const __a3_styles = useA3LegacyStyles(styles);

  
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
          <Animated.View style={[__a3_styles.panLayer, { width: visual.canvasWidth, height: visual.canvasHeight }, panStyle]}>
            <Animated.View style={[__a3_styles.canvas, { width: visual.canvasWidth, height: visual.canvasHeight }, scaleStyle]}>
              {mountedGenerations.map((generation) => {
                const y = mountedPeople.find((person) => person.generation === generation)?.y ?? 0;
                return (
                  <View key={`focus-generation-${generation}`} pointerEvents="none" style={[__a3_styles.generationTag, { top: y + 18 }]}>
                    <Text style={__a3_styles.generationTitle}>Thế hệ {generation}</Text>
                    <Text style={__a3_styles.generationCaption}>{generationCaption[generation] ?? "Gia đình"}</Text>
                  </View>
                );
              })}
              <FocusConnectors people={visual.people} connections={visual.connections} mountedIds={retainedIds} geometry={visual.geometry} />
              {visual.geometry.partnerUnits.flatMap((unit)=>unit.privateChildren)
                .filter((item)=>retainedIds.has(item.childId))
                .map((item)=>{
                  const child=peopleById.get(item.childId),parent=peopleById.get(item.parentId);
                  return child&&parent?<FamilyGraphPrivateChildLabel key={`private:${item.childId}`}
                    child={child} parent={parent}/>:null;
                })}
              {mountedPeople.map((person) => (
                <FocusPersonCard key={person.id} person={person} memberAvatarUrl={person.linkedUid ? memberAvatarByUid?.get(person.linkedUid) : null} focused={person.id === personId}
                  relationLabel={getFamilyGraphPlateLabel(resolveRelationship?.(person.id, personId)?.label, person.id === personId)} />
              ))}
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = createBloomStyles(() => StyleSheet.create({
  panLayer: { position: "absolute", left: 0, top: 0 },
  canvas: { position: "absolute", left: 0, top: 0 },
  nodeWrap: { position: "absolute", width: FAMILY_GRAPH_CANVAS.nodeWidth, height: NODE_HEIGHT, alignItems: "center", overflow: "visible" },
  nodeCard: {
    width: NODE_WIDTH, height: NODE_HEIGHT, zIndex: 1, borderRadius: 19, borderWidth: 1.6,
    alignItems: "center", paddingTop: 23, paddingHorizontal: 6, paddingBottom: 23, overflow: "visible",
    shadowColor: COLORS.shadow, shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  nodeCardFocused: { transform: [{ translateY: -3 }, { scale: 1.025 }] },
  focusMistOuter: {
    position: 'absolute', zIndex: 0, top: -35, left: -30,
    width: FAMILY_GRAPH_CANVAS.nodeWidth + 60,
    height: NODE_HEIGHT + 78, opacity: 0.92,
  },
  avatar: { width: 44, height: 44, borderRadius: 21, padding: 2, borderWidth: 1.4, alignItems: "center", justifyContent: "center", position: "relative", marginTop: 0 },
  avatarText: { fontSize: 15, fontWeight: "900", color: COLORS.primaryText },
  linkBadge: { position: "absolute", right: -4, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  nodeName: { marginTop: 5, width: NODE_WIDTH - 13, maxWidth: NODE_WIDTH - 13, height: 57, paddingHorizontal: 2, lineHeight: 11.5, fontWeight: "900", textAlign: "center", textAlignVertical: "center", includeFontPadding: false, flexShrink: 1, overflow: "hidden" },
  nodeYears: { marginTop: 2, width: NODE_WIDTH - 42, height: 14, fontSize: 9.3, lineHeight: 12, textAlign: "center", textAlignVertical: "center", includeFontPadding: false, fontWeight: "700", overflow: "hidden" },
  generationBadge: { position: "absolute", top: 21, right: 5, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, alignItems: "center", justifyContent: "center", zIndex: 8 },
  generationBadgeText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF", lineHeight: 12 },
  topOrnamentWrap: { position: "absolute", width: FAMILY_GRAPH_ORNAMENT_WIDTH, height: FAMILY_GRAPH_ORNAMENT_TOP_HEIGHT, left: (FAMILY_GRAPH_CANVAS.nodeWidth - FAMILY_GRAPH_ORNAMENT_WIDTH) / 2, top: -FAMILY_GRAPH_ORNAMENT_TOP_HEIGHT * FAMILY_GRAPH_ORNAMENT_OUTSIDE_RATIO, overflow: "visible", zIndex: 7 },
  bottomOrnamentWrap: { position: "absolute", width: FAMILY_GRAPH_ORNAMENT_WIDTH, height: FAMILY_GRAPH_ORNAMENT_BOTTOM_HEIGHT, left: (FAMILY_GRAPH_CANVAS.nodeWidth - FAMILY_GRAPH_ORNAMENT_WIDTH) / 2, bottom: -FAMILY_GRAPH_ORNAMENT_BOTTOM_HEIGHT * FAMILY_GRAPH_ORNAMENT_OUTSIDE_RATIO, overflow: "visible", zIndex: 7 },
  ornamentImage: { width: "100%", height: "100%" },
  generationTag: { position: "absolute", left: 12, width: 104, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.88)" },
  generationTitle: { fontSize: 9, fontWeight: "900", color: COLORS.primaryText },
  generationCaption: { marginTop: 1, fontSize: 8, color: COLORS.secondaryText },
  partnerLine: { position: "absolute", borderTopWidth: 1.5, borderStyle: "dashed", borderColor: COLORS.border },
  verticalLine: { position: "absolute", width: 1.5, backgroundColor: COLORS.selectedBackground },
  horizontalLine: { position: "absolute", height: 1.5, backgroundColor: COLORS.selectedBackground },
}));
