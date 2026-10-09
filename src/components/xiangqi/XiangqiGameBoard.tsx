import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { XiangqiPieceModel, XiangqiMove } from "../../games/xiangqi/xiangqiEngine";
import { XiangqiPiece } from "./XiangqiPiece";
import { buildParallelHintDelays, HINT_POP_MS } from "../games/hintTiming";
import { gameRuntimePerf } from "../../services/games/gameRuntimePerf";

function BoardLine({ left, top, width, height = 1.2, rotate = 0 }: { left: number; top: number; width: number; height?: number; rotate?: number }) {
  return <View pointerEvents="none" style={{ position: "absolute", left, top, width, height, backgroundColor: "#855A3A", transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined }} />;
}

function diagonal(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const width = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { left: (x1 + x2) / 2 - width / 2, top: (y1 + y2) / 2 - 0.7, width, rotate: angle };
}

type Props = {
  pieces: readonly XiangqiPieceModel[];
  selectedId: string | null;
  legalTargets: readonly { col: number; row: number }[];
  lastMove: XiangqiMove | null;
  checkedColor?: "red" | "black" | null;
  premove?: { from: { col: number; row: number }; to: { col: number; row: number } } | null;
  onTap: (col: number, row: number) => void;
  onMoveLanded?: (move: XiangqiMove) => void;
  runtimeActive?: boolean;
  onReady?: () => void;
  readyEpoch?: number;
};

type HintSlotController = {
  show: (centerX: number, centerY: number, capture: boolean, delayMs: number) => void;
  hide: () => void;
};

const MAX_XIANGQI_HINT_SLOTS = 20;

const XiangqiHintSlot = React.memo(forwardRef<HintSlotController, { size: number }>(function XiangqiHintSlot({ size }, ref) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.62);
  const captureMode = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    show(centerX, centerY, capture, delayMs) {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      x.value = centerX - size / 2;
      y.value = centerY - size / 2;
      captureMode.value = capture ? 1 : 0;
      opacity.value = 0;
      scale.value = 0.62;
      opacity.value = withDelay(delayMs, withTiming(1, { duration: Math.min(60, HINT_POP_MS), easing: Easing.out(Easing.quad) }));
      scale.value = withDelay(delayMs, withSequence(
        withTiming(1.10, { duration: 44, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: Math.max(1, HINT_POP_MS - 44), easing: Easing.out(Easing.quad) }),
      ));
    },
    hide() {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      opacity.value = 0;
      scale.value = 0.62;
    },
  }), [captureMode, opacity, scale, size, x, y]);

  const slotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
  const quietStyle = useAnimatedStyle(() => ({ opacity: 1 - captureMode.value }));
  const captureStyle = useAnimatedStyle(() => ({ opacity: captureMode.value }));

  return (
    <Animated.View pointerEvents="none" style={[styles.hintSlot, { width: size, height: size }, slotStyle]}>
      <Animated.View style={[styles.hint, { left: size / 2 - 5, top: size / 2 - 5 }, quietStyle]} />
      <Animated.View
        style={[
          styles.captureHint,
          { left: size * 0.07, top: size * 0.07, width: size * 0.86, height: size * 0.86, borderRadius: size * 0.43 },
          captureStyle,
        ]}
      >
        <View style={styles.captureHintInner} />
      </Animated.View>
    </Animated.View>
  );
}));

function XiangqiHintPool({
  source, legalTargets, pieceBySquare, selectedColor, padding, step, runtimeActive,
}: {
  source: { col: number; row: number } | null;
  legalTargets: readonly { col: number; row: number }[];
  pieceBySquare: Map<string, XiangqiPieceModel>;
  selectedColor: "red" | "black" | null;
  padding: number;
  step: number;
  runtimeActive: boolean;
}) {
  const slotsRef = useRef<Array<HintSlotController | null>>(Array(MAX_XIANGQI_HINT_SLOTS).fill(null));

  useLayoutEffect(() => {
    if (!runtimeActive || !source || !selectedColor) {
      slotsRef.current.forEach((slot) => slot?.hide());
      return;
    }
    const scheduled = legalTargets.slice(0, MAX_XIANGQI_HINT_SLOTS).map((target) => {
      const targetPiece = pieceBySquare.get(`${target.col}:${target.row}`);
      return { ...target, capture: !!targetPiece && targetPiece.color !== selectedColor };
    });
    const delays = buildParallelHintDelays(source, scheduled);
    gameRuntimePerf.markHintBatch("xiangqi", scheduled.length, Math.max(0, ...Array.from(delays.values())));
    for (let index = 0; index < MAX_XIANGQI_HINT_SLOTS; index += 1) {
      const slot = slotsRef.current[index];
      const target = scheduled[index];
      if (!slot) continue;
      if (!target) { slot.hide(); continue; }
      slot.show(
        padding + target.col * step,
        padding + target.row * step,
        target.capture,
        delays.get(`${target.col}:${target.row}`) ?? 0,
      );
    }
  }, [legalTargets, padding, pieceBySquare, runtimeActive, selectedColor, source, step]);

  return (
    <View pointerEvents="none" style={styles.hintPlane}>
      {Array.from({ length: MAX_XIANGQI_HINT_SLOTS }, (_, index) => (
        <XiangqiHintSlot
          key={`xiangqi-hint-slot-${index}`}
          ref={(controller) => { slotsRef.current[index] = controller; }}
          size={step}
        />
      ))}
    </View>
  );
}

type PieceSpriteProps = {
  piece: XiangqiPieceModel;
  left: number;
  top: number;
  pieceSize: number;
  state: "normal" | "selected" | "hint";
  justMoved: boolean;
  runtimeActive: boolean;
  onAssetReady?: (id: string) => void;
  onLanded?: (id: string) => void;
};

const XiangqiPieceSprite = React.memo(function XiangqiPieceSprite({ piece, left, top, pieceSize, state, justMoved, runtimeActive, onAssetReady, onLanded }: PieceSpriteProps) {
  const x = useSharedValue(left);
  const y = useSharedValue(top);
  const lift = useSharedValue(state === "selected" ? 1.08 : 1);
  const previous = useRef({ left, top });

  useEffect(() => {
    if (!runtimeActive) {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(lift);
      x.value = left;
      y.value = top;
      lift.value = 1;
      previous.current = { left, top };
      return;
    }
    const moved = previous.current.left !== left || previous.current.top !== top;
    previous.current = { left, top };
    if (!moved) return;

    x.value = withTiming(left, { duration: 176, easing: Easing.bezier(0.16, 0.78, 0.22, 1) });
    y.value = withTiming(top, { duration: 176, easing: Easing.bezier(0.16, 0.78, 0.22, 1) }, (finished) => {
      if (finished && justMoved && onLanded) runOnJS(onLanded)(piece.id);
    });
    lift.value = withSequence(
      withTiming(1.30, { duration: 82, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 94, easing: Easing.inOut(Easing.quad) }),
    );
  }, [justMoved, left, lift, onLanded, piece.id, runtimeActive, top, x, y]);

  useEffect(() => {
    if (!runtimeActive) {
      cancelAnimation(lift);
      lift.value = 1;
      return;
    }
    if (state !== "selected") {
      if (!justMoved) lift.value = withTiming(1, { duration: 95 });
      return;
    }
    lift.value = withTiming(1.08, { duration: 105, easing: Easing.out(Easing.quad) });
  }, [justMoved, lift, runtimeActive, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: lift.value },
    ],
  }));

  const reportAssetReady = useCallback(() => onAssetReady?.(piece.id), [onAssetReady, piece.id]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pieceSlot,
        { width: pieceSize, height: pieceSize },
        justMoved && styles.pieceSlotMoving,
        animatedStyle,
      ]}
    >
      <XiangqiPiece color={piece.color} type={piece.type} size={pieceSize} state={state} onAssetReady={reportAssetReady} />
    </Animated.View>
  );
});

export const XiangqiGameBoard = React.memo(function XiangqiGameBoard({ pieces, selectedId, legalTargets, lastMove, checkedColor = null, premove = null, onTap, onMoveLanded, runtimeActive = true, onReady, readyEpoch = 0 }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  useEffect(() => { gameRuntimePerf.markRender("xiangqi"); });
  useEffect(() => {
    gameRuntimePerf.markMount("xiangqi");
    return () => gameRuntimePerf.markUnmount("xiangqi");
  }, []);
  useEffect(() => { gameRuntimePerf.markRuntime("xiangqi", runtimeActive); }, [runtimeActive]);
  const frameWidth = Math.min(Math.max(314, screenWidth - 22), 430);
  const padding = 18;
  const gridWidth = frameWidth - padding * 2;
  const step = gridWidth / 8;
  const gridHeight = step * 9;
  const frameHeight = gridHeight + padding * 2;
  // Keep the user-approved 1.3x display box. Motion adds only a small transient
  // lift so the final resting footprint remains exactly the approved size.
  const pieceSize = Math.min(72, step * 1.3);
  // Spread the initial 32 image nodes across a few paint frames while the
  // preparation shield is still covering the board. This avoids one large
  // decode/native-node spike on Android without weakening the real readiness
  // gate: onReady still waits for every current piece asset plus two frames.
  const initialPieceCountRef = useRef(pieces.length);
  const initialPaintCompleteRef = useRef(false);
  const [pieceRenderCount, setPieceRenderCount] = useState(() => Math.min(8, pieces.length));

  // Stage ONLY the first native image paint. `pieces.length` changes whenever a
  // capture happens; the old dependency reset renderCount to 8 after every
  // capture, briefly removing most of the board and producing the severe
  // in-game flash reported on Android.
  useEffect(() => {
    const initialCount = initialPieceCountRef.current;
    let frame1: number | null = null;
    let frame2: number | null = null;
    let frame3: number | null = null;
    setPieceRenderCount(Math.min(8, initialCount));
    frame1 = requestAnimationFrame(() => {
      setPieceRenderCount(Math.min(18, initialCount));
      frame2 = requestAnimationFrame(() => {
        setPieceRenderCount(Math.min(26, initialCount));
        frame3 = requestAnimationFrame(() => {
          initialPaintCompleteRef.current = true;
          setPieceRenderCount(initialCount);
        });
      });
    });
    return () => {
      if (frame1 != null) cancelAnimationFrame(frame1);
      if (frame2 != null) cancelAnimationFrame(frame2);
      if (frame3 != null) cancelAnimationFrame(frame3);
    };
  }, []);

  // After the initial paint, captures/restores update the exact count directly.
  // Never replay the 8 -> 18 -> 26 staging sequence during a live round.
  useEffect(() => {
    if (initialPaintCompleteRef.current) setPieceRenderCount(pieces.length);
  }, [pieces.length]);

  const diagonals = useMemo(() => {
    const point = (col: number, row: number) => ({ x: padding + col * step, y: padding + row * step });
    return [
      [point(3, 0), point(5, 2)], [point(5, 0), point(3, 2)],
      [point(3, 7), point(5, 9)], [point(5, 7), point(3, 9)],
    ].map(([a, b]) => diagonal(a.x, a.y, b.x, b.y));
  }, [step]);

  const selected = selectedId ? pieces.find((piece) => piece.id === selectedId) : null;
  const hintSource = useMemo(() => selected ? { col: selected.col, row: selected.row } : null, [selected?.col, selected?.row]);
  const checkedGeneral = checkedColor ? pieces.find((piece) => piece.color === checkedColor && piece.type === "general") : null;
  const pieceBySquare = useMemo(() => new Map(pieces.map((piece) => [`${piece.col}:${piece.row}`, piece])), [pieces]);
  const layoutReadyRef = useRef(false);
  const readyAssetIdsRef = useRef(new Set<string>());
  const reportedEpochRef = useRef<number | null>(null);
  const readyScheduledRef = useRef(false);

  const maybeReportReady = useCallback(() => {
    if (!runtimeActive || !onReady || reportedEpochRef.current === readyEpoch || readyScheduledRef.current) return;
    if (!layoutReadyRef.current || readyAssetIdsRef.current.size < pieces.length) return;
    readyScheduledRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      readyScheduledRef.current = false;
      if (!runtimeActive || reportedEpochRef.current === readyEpoch) return;
      if (!layoutReadyRef.current || readyAssetIdsRef.current.size < pieces.length) return;
      reportedEpochRef.current = readyEpoch;
      onReady();
    }));
  }, [onReady, pieces.length, readyEpoch, runtimeActive]);

  const markAssetReady = useCallback((id: string) => {
    readyAssetIdsRef.current.add(id);
    maybeReportReady();
  }, [maybeReportReady]);

  const handlePieceLanded = useCallback((pieceId: string) => {
    if (!lastMove || lastMove.pieceId !== pieceId) return;
    onMoveLanded?.(lastMove);
  }, [lastMove, onMoveLanded]);

  useEffect(() => {
    maybeReportReady();
  }, [maybeReportReady, readyEpoch, runtimeActive]);

  const handleBoardTap = useCallback((x: number, y: number) => {
    const col = Math.round((x - padding) / step);
    const row = Math.round((y - padding) / step);
    if (col < 0 || col > 8 || row < 0 || row > 9) return;
    const centerX = padding + col * step;
    const centerY = padding + row * step;
    if (Math.abs(x - centerX) > step * 0.48 || Math.abs(y - centerY) > step * 0.48) return;
    onTap(col, row);
  }, [onTap, step]);

  const tapGesture = useMemo(() => Gesture.Tap()
    // Xiangqi tap handling mutates React game state, so make the execution
    // domain explicit instead of relying on RNGH/Reanimated auto-workletization.
    .runOnJS(true)
    .enabled(runtimeActive)
    .maxDuration(420)
    .maxDistance(16)
    .onEnd((event, success) => {
      if (success) handleBoardTap(event.x, event.y);
    }), [handleBoardTap, runtimeActive]);

  return (
    <GestureHandlerRootView style={[styles.root, { width: frameWidth, height: frameHeight }]}> 
      <GestureDetector gesture={tapGesture}>
        <View collapsable={false} style={[styles.frame, { width: frameWidth, height: frameHeight }]} onLayout={() => { layoutReadyRef.current = true; maybeReportReady(); }}> 
          <View style={styles.woodGlow} pointerEvents="none" />

          <View pointerEvents="none" style={styles.linesPlane}>
            {Array.from({ length: 10 }, (_, row) => <BoardLine key={`h-${row}`} left={padding} top={padding + row * step} width={gridWidth} />)}
            {Array.from({ length: 9 }, (_, col) => {
              const x = padding + col * step;
              if (col === 0 || col === 8) return <BoardLine key={`v-${col}`} left={x - 0.6} top={padding} width={1.2} height={gridHeight} />;
              return <React.Fragment key={`v-${col}`}><BoardLine left={x - 0.6} top={padding} width={1.2} height={step * 4} /><BoardLine left={x - 0.6} top={padding + step * 5} width={1.2} height={step * 4} /></React.Fragment>;
            })}
            {diagonals.map((line, index) => <BoardLine key={`d-${index}`} {...line} />)}
            <View style={[styles.riverBand, { left: padding + 2, right: padding + 2, top: padding + step * 4 + 2, height: step - 4 }]}> 
              <Text style={styles.riverText}>楚 河</Text><Text style={styles.riverText}>漢 界</Text>
            </View>
          </View>

          <View pointerEvents="none" style={styles.markerPlane}>
            {lastMove ? [lastMove.from, lastMove.to].map((square, index) => (
              <View key={`last-${index}`} style={[styles.lastMarker, { left: padding + square.col * step - step * 0.33, top: padding + square.row * step - step * 0.33, width: step * 0.66, height: step * 0.66, borderRadius: step * 0.33 }]} />
            )) : null}
            {selected ? <View style={[styles.selectedMarker, { left: padding + selected.col * step - step * 0.38, top: padding + selected.row * step - step * 0.38, width: step * 0.76, height: step * 0.76, borderRadius: step * 0.38 }]} /> : null}
            {premove ? [premove.from, premove.to].map((square, index) => (
              <View key={`premove-${index}`} style={[styles.premoveMarker, { left: padding + square.col * step - step * 0.36, top: padding + square.row * step - step * 0.36, width: step * 0.72, height: step * 0.72, borderRadius: step * 0.36 }]} />
            )) : null}
            {checkedGeneral ? <View style={[styles.checkMarker, { left: padding + checkedGeneral.col * step - step * 0.4, top: padding + checkedGeneral.row * step - step * 0.4, width: step * 0.8, height: step * 0.8, borderRadius: step * 0.4 }]} /> : null}
          </View>

          <View pointerEvents="none" style={styles.piecePlane}>
            {pieces.slice(0, pieceRenderCount).map((piece) => {
              const left = padding + piece.col * step - pieceSize / 2;
              const top = padding + piece.row * step - pieceSize / 2;
              const state = piece.id === selectedId ? "selected" : checkedGeneral?.id === piece.id ? "hint" : "normal";
              const justMoved = lastMove?.pieceId === piece.id;
              return (
                <XiangqiPieceSprite
                  key={piece.id}
                  piece={piece}
                  left={left}
                  top={top}
                  pieceSize={pieceSize}
                  state={state}
                  justMoved={justMoved}
                  runtimeActive={runtimeActive}
                  onAssetReady={markAssetReady}
                  onLanded={handlePieceLanded}
                />
              );
            })}
          </View>

          <XiangqiHintPool
            source={hintSource}
            legalTargets={legalTargets}
            pieceBySquare={pieceBySquare}
            selectedColor={selected?.color ?? null}
            padding={padding}
            step={step}
            runtimeActive={runtimeActive}
          />
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  root: { alignSelf: "center", overflow: "visible" },
  frame: { position: "relative", alignSelf: "center", overflow: "visible", borderRadius: 24, backgroundColor: "#F0C990", borderWidth: 2, borderColor: "#B77C4E", shadowColor: "#6F422C", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  woodGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 22, backgroundColor: "rgba(255,243,217,0.24)" },
  linesPlane: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  markerPlane: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  piecePlane: { ...StyleSheet.absoluteFillObject, zIndex: 20, overflow: "visible" },
  hintPlane: { ...StyleSheet.absoluteFillObject, zIndex: 30, overflow: "visible" },
  hintSlot: { position: "absolute", left: 0, top: 0, alignItems: "center", justifyContent: "center" },
  riverBand: { position: "absolute", flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "rgba(255,237,202,0.68)" },
  riverText: { color: "#8B5B3F", fontSize: 15, fontWeight: "800", letterSpacing: 5 },
  pieceSlot: { position: "absolute", left: 0, top: 0, alignItems: "center", justifyContent: "center", overflow: "visible" },
  pieceSlotMoving: { zIndex: 24, elevation: 10 },
  hint: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(207,74,126,0.80)", borderWidth: 2, borderColor: "rgba(255,255,255,0.90)", shadowColor: "#C73D74", shadowOpacity: 0.26, shadowRadius: 5, elevation: 4 },
  captureHint: { position: "absolute", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(208,62,83,0.92)", backgroundColor: "rgba(255,231,236,0.12)", shadowColor: "#C53551", shadowOpacity: 0.38, shadowRadius: 8, elevation: 12 },
  captureHintInner: { width: "72%", height: "72%", borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,244,220,0.92)" },
  lastMarker: { position: "absolute", backgroundColor: "rgba(255,212,104,0.34)", borderWidth: 1, borderColor: "rgba(190,132,38,0.38)" },
  selectedMarker: { position: "absolute", backgroundColor: "rgba(232,79,143,0.12)", borderWidth: 2, borderColor: "rgba(232,79,143,0.58)" },
  premoveMarker: { position: "absolute", backgroundColor: "rgba(132,146,215,0.20)", borderWidth: 2, borderColor: "rgba(111,123,198,0.70)" },
  checkMarker: { position: "absolute", backgroundColor: "rgba(214,57,72,0.18)", borderWidth: 2, borderColor: "rgba(214,57,72,0.72)" },
});
