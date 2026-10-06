import React, { forwardRef, useCallback, useContext, useImperativeHandle, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { PieceKey } from "./pieceIdentity";
import { ChessBoardTapGestureContext } from "./InteractionLayer";

const PIECE_IMAGES: Record<PieceKey, number> = {
  wp: require("../../../../assets/images/chess/pieces-webp-default/wp.webp"),
  wn: require("../../../../assets/images/chess/pieces-webp-default/wn.webp"),
  wb: require("../../../../assets/images/chess/pieces-webp-default/wb.webp"),
  wr: require("../../../../assets/images/chess/pieces-webp-default/wr.webp"),
  wq: require("../../../../assets/images/chess/pieces-webp-default/wq.webp"),
  wk: require("../../../../assets/images/chess/pieces-webp-default/wk.webp"),
  bp: require("../../../../assets/images/chess/pieces-webp-default/bp.webp"),
  bn: require("../../../../assets/images/chess/pieces-webp-default/bn.webp"),
  bb: require("../../../../assets/images/chess/pieces-webp-default/bb.webp"),
  br: require("../../../../assets/images/chess/pieces-webp-default/br.webp"),
  bq: require("../../../../assets/images/chess/pieces-webp-default/bq.webp"),
  bk: require("../../../../assets/images/chess/pieces-webp-default/bk.webp"),
};

export type ChessPieceMotionProfile = "settle" | "flat" | "travel" | "reconcile";

export type ChessPieceController = {
  moveTo: (x: number, y: number, duration?: number, done?: () => void, profile?: ChessPieceMotionProfile) => void;
  setPosition: (x: number, y: number) => void;
  fadeTo: (opacity: number, duration?: number, delay?: number) => void;
  setPieceKey: (pieceKey: PieceKey) => void;
  sync: (pieceKey: PieceKey, x: number, y: number, visible: boolean) => void;
};

type Props = {
  id: string;
  initialPieceKey: PieceKey;
  initialX: number;
  initialY: number;
  squareSize: number;
  owned: boolean;
  boardLocked: SharedValue<number>;
  motionFxEnabled: boolean;
  onDragStart: (id: string) => void;
  onDragCancel: (id: string) => void;
  onDrop: (id: string, centerX: number, centerY: number) => void;
  onAssetReady?: (id: string) => void;
};

const MOVE_EASING = Easing.bezier(0.18, 0.72, 0.2, 1);
const SETTLE_EASING = Easing.out(Easing.cubic);

export const ChessPiece = React.memo(forwardRef<ChessPieceController, Props>(function ChessPiece({
  id, initialPieceKey, initialX, initialY, squareSize, owned, boardLocked, motionFxEnabled, onDragStart, onDragCancel, onDrop, onAssetReady,
}, ref) {
  // Piece artwork changes only on promotion/reconciliation. Position, lift and
  // visibility never use React state; they stay on the Reanimated UI thread.
  const [pieceKey, setPieceKeyState] = useState<PieceKey>(initialPieceKey);
  // Persistent piece nodes survive captures/reconnects. Keep their native hit
  // target disabled whenever the piece is visually absent so an invisible
  // captured piece can never steal a later tap/drag from the board.
  const [interactive, setInteractive] = useState(true);
  const boardTapGesture = useContext(ChessBoardTapGestureContext);
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const dragAllowed = useSharedValue(0);
  const moving = useSharedValue(0);
  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  const pendingDoneRef = useRef<(() => void) | null>(null);
  const assetReadyRef = useRef(false);

  const handleAssetReady = useCallback(() => {
    if (assetReadyRef.current) return;
    assetReadyRef.current = true;
    onAssetReady?.(id);
  }, [id, onAssetReady]);

  const finishPending = () => {
    const pending = pendingDoneRef.current;
    pendingDoneRef.current = null;
    pending?.();
  };

  useImperativeHandle(ref, () => ({
    moveTo(nextX, nextY, duration = 190, done, profile = "travel") {
      pendingDoneRef.current = done ?? null;
      moving.value = 1;
      if (!motionFxEnabled || duration <= 0) {
        x.value = nextX;
        y.value = nextY;
        scale.value = 1;
        moving.value = 0;
        finishPending();
        return;
      }

      if (profile === "travel") {
        const liftMs = Math.max(55, Math.round(duration * 0.48));
        const settleMs = Math.max(65, duration - liftMs);
        // Bloom chess motion: the piece lifts while leaving its source square,
        // reaches 1.30 around the midpoint, then settles to 1.0 at destination.
        scale.value = withSequence(
          withTiming(1.30, { duration: liftMs, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: settleMs, easing: Easing.inOut(Easing.quad) }),
        );
      } else if (profile === "reconcile") {
        scale.value = withSequence(
          withTiming(1.08, { duration: Math.min(70, Math.round(duration * 0.36)), easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: Math.max(80, Math.round(duration * 0.64)), easing: Easing.out(Easing.cubic) }),
        );
      } else if (profile === "settle") {
        scale.value = withTiming(1, { duration, easing: SETTLE_EASING });
      } else {
        scale.value = 1;
      }

      const easing = profile === "settle" ? SETTLE_EASING : MOVE_EASING;
      x.value = withTiming(nextX, { duration, easing });
      y.value = withTiming(nextY, { duration, easing }, (finished) => {
        moving.value = 0;
        if (finished && done) runOnJS(finishPending)();
      });
    },
    setPosition(nextX, nextY) {
      x.value = nextX;
      y.value = nextY;
      scale.value = 1;
      moving.value = 0;
    },
    fadeTo(nextOpacity, duration = 90, delay = 0) {
      setInteractive(nextOpacity > 0.01);
      opacity.value = delay > 0
        ? withDelay(delay, withTiming(nextOpacity, { duration, easing: Easing.out(Easing.quad) }))
        : withTiming(nextOpacity, { duration, easing: Easing.out(Easing.quad) });
    },
    sync(nextPieceKey, nextX, nextY, visible) {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(dragAllowed);
      cancelAnimation(moving);
      x.value = nextX;
      y.value = nextY;
      opacity.value = visible ? 1 : 0;
      setInteractive(visible);
      scale.value = 1;
      dragAllowed.value = 0;
      moving.value = 0;
      startX.value = nextX;
      startY.value = nextY;
      if (nextPieceKey !== pieceKey) setPieceKeyState(nextPieceKey);
      finishPending();
    },
    setPieceKey(next) {
      if (next === pieceKey) return;
      opacity.value = withTiming(0, { duration: 45 }, (finished) => {
        if (!finished) return;
        runOnJS(setPieceKeyState)(next);
        opacity.value = withDelay(18, withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }));
      });
    },
  }), [dragAllowed, motionFxEnabled, moving, opacity, pieceKey, scale, startX, startY, x, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    zIndex: dragAllowed.value ? 100 : moving.value ? 80 : 10,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  const gesture = useMemo(() => {
    let pan: any = Gesture.Pan()
      .enabled(owned && interactive)
      .maxPointers(1)
      .minDistance(3)
      .shouldCancelWhenOutside(false);

    // Explicit cross-detector simultaneity: a stationary finger may still be a
    // board tap, but once movement activates Pan the outer Tap simply fails on
    // maxDistance instead of cancelling this drag recognizer.
    if (boardTapGesture && typeof pan.simultaneousWithExternalGesture === "function") {
      pan = pan.simultaneousWithExternalGesture(boardTapGesture);
    }

    return pan
      .onStart(() => {
        if (boardLocked.value !== 0) { dragAllowed.value = 0; return; }
        dragAllowed.value = 1;
        startX.value = x.value;
        startY.value = y.value;
        // Drag is also UI-thread only. The larger lift makes it obvious which
        // piece is held without sending frame-by-frame coordinates through JS.
        if (motionFxEnabled) scale.value = withTiming(1.30, { duration: 92, easing: Easing.out(Easing.cubic) });
        else scale.value = 1;
        runOnJS(onDragStart)(id);
      })
      .onUpdate((event) => {
        if (!dragAllowed.value) return;
        x.value = startX.value + event.translationX;
        y.value = startY.value + event.translationY;
      })
      .onEnd((event) => {
        if (!dragAllowed.value) return;
        const finalX = startX.value + event.translationX;
        const finalY = startY.value + event.translationY;
        x.value = finalX;
        y.value = finalY;
        const centerX = finalX + squareSize / 2;
        const centerY = finalY + squareSize / 2;
        dragAllowed.value = 0;
        runOnJS(onDrop)(id, centerX, centerY);
      })
      .onFinalize(() => {
        if (!dragAllowed.value) return;
        dragAllowed.value = 0;
        if (!motionFxEnabled) {
          scale.value = 1;
          x.value = startX.value;
          y.value = startY.value;
          runOnJS(onDragCancel)(id);
          return;
        }
        scale.value = withTiming(1, { duration: 115, easing: SETTLE_EASING });
        x.value = withTiming(startX.value, { duration: 130, easing: SETTLE_EASING });
        y.value = withTiming(startY.value, { duration: 130, easing: SETTLE_EASING }, (finished) => {
          if (finished) runOnJS(onDragCancel)(id);
        });
      });
  }, [boardLocked, boardTapGesture, dragAllowed, id, interactive, motionFxEnabled, onDragCancel, onDragStart, onDrop, owned, scale, squareSize, startX, startY, x, y]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View pointerEvents={interactive ? "auto" : "none"} collapsable={false} style={[styles.slot, { width: squareSize, height: squareSize }, style]}>
        <Image source={PIECE_IMAGES[pieceKey]} style={{ width: squareSize * 0.984, height: squareSize * 0.984 }} contentFit="contain" transition={0} cachePolicy="memory" onLoadEnd={handleAssetReady} />
      </Animated.View>
    </GestureDetector>
  );
}));

const styles = StyleSheet.create({
  slot: { position: "absolute", left: 0, top: 0, alignItems: "center", justifyContent: "center" },
});
