import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Image, StyleSheet } from "react-native";
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
import type { PieceKey } from "./pieceIdentity";

const PIECE_IMAGES: Record<PieceKey, number> = {
  wp: require("../../../../assets/images/chess/pieces-png-default/wp.png"),
  wn: require("../../../../assets/images/chess/pieces-png-default/wn.png"),
  wb: require("../../../../assets/images/chess/pieces-png-default/wb.png"),
  wr: require("../../../../assets/images/chess/pieces-png-default/wr.png"),
  wq: require("../../../../assets/images/chess/pieces-png-default/wq.png"),
  wk: require("../../../../assets/images/chess/pieces-png-default/wk.png"),
  bp: require("../../../../assets/images/chess/pieces-png-default/bp.png"),
  bn: require("../../../../assets/images/chess/pieces-png-default/bn.png"),
  bb: require("../../../../assets/images/chess/pieces-png-default/bb.png"),
  br: require("../../../../assets/images/chess/pieces-png-default/br.png"),
  bq: require("../../../../assets/images/chess/pieces-png-default/bq.png"),
  bk: require("../../../../assets/images/chess/pieces-png-default/bk.png"),
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
  motionFxEnabled: boolean;
  onAssetReady?: (id: string) => void;
};

const MOVE_EASING = Easing.bezier(0.18, 0.72, 0.2, 1);
const SETTLE_EASING = Easing.out(Easing.cubic);

export const ChessPiece = React.memo(forwardRef<ChessPieceController, Props>(function ChessPiece({
  id, initialPieceKey, initialX, initialY, squareSize, motionFxEnabled, onAssetReady,
}, ref) {
  // Tap-only interaction policy: piece nodes never own touch gestures. The
  // board's single InteractionLayer handles selection/moves/premoves while
  // these persistent native nodes remain visual-only and cheap to reconcile.
  const [pieceKey, setPieceKeyState] = useState<PieceKey>(initialPieceKey);
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const moving = useSharedValue(0);
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
      opacity.value = delay > 0
        ? withDelay(delay, withTiming(nextOpacity, { duration, easing: Easing.out(Easing.quad) }))
        : withTiming(nextOpacity, { duration, easing: Easing.out(Easing.quad) });
    },
    sync(nextPieceKey, nextX, nextY, visible) {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(moving);
      x.value = nextX;
      y.value = nextY;
      opacity.value = visible ? 1 : 0;
      scale.value = 1;
      moving.value = 0;
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
  }), [motionFxEnabled, moving, opacity, pieceKey, scale, x, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    zIndex: moving.value ? 80 : 10,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View pointerEvents="none" collapsable={false} style={[styles.slot, { width: squareSize, height: squareSize }, style]}>
      <Image source={PIECE_IMAGES[pieceKey]} style={{ width: squareSize * 0.88, height: squareSize * 0.88 }} resizeMode="contain" fadeDuration={0} onLoadEnd={handleAssetReady} />
    </Animated.View>
  );
}));

const styles = StyleSheet.create({
  slot: { position: "absolute", left: 0, top: 0, alignItems: "center", justifyContent: "center" },
});
