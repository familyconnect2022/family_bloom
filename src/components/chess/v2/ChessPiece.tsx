import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Image, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { PieceKey } from "./pieceIdentity";

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

export type ChessPieceMotionProfile = "lift" | "settle" | "flat";

export type ChessPieceController = {
  moveTo: (x: number, y: number, duration?: number, done?: () => void, profile?: ChessPieceMotionProfile) => void;
  setPosition: (x: number, y: number) => void;
  fadeTo: (opacity: number, duration?: number, delay?: number) => void;
  setPieceKey: (pieceKey: PieceKey) => void;
};

type Props = {
  id: string;
  initialPieceKey: PieceKey;
  initialX: number;
  initialY: number;
  squareSize: number;
  owned: boolean;
  boardLocked: SharedValue<number>;
  onTapPiece: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragCancel: (id: string) => void;
  onDrop: (id: string, centerX: number, centerY: number) => void;
};

export const ChessPiece = React.memo(forwardRef<ChessPieceController, Props>(function ChessPiece({
  id, initialPieceKey, initialX, initialY, squareSize, owned, boardLocked, onTapPiece, onDragStart, onDragCancel, onDrop,
}, ref) {
  const [pieceKey, setPieceKeyState] = useState<PieceKey>(initialPieceKey);
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const dragAllowed = useSharedValue(0);
  const moving = useSharedValue(0);
  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);

  useImperativeHandle(ref, () => ({
    moveTo(nextX, nextY, duration = 120, done, profile = "lift") {
      const half = Math.max(1, Math.round(duration / 2));
      moving.value = 1;
      if (profile === "lift") {
        // Bloom lift: the piece rises to 1.3x during the first half of travel,
        // then settles naturally back to 1.0 at the destination.
        scale.value = withSequence(
          withTiming(1.3, { duration: half }),
          withTiming(1, { duration: Math.max(1, duration - half) }),
        );
      } else if (profile === "settle") {
        // A dragged piece is already lifted at 1.3x. On release it only needs
        // to settle while snapping to the target/origin; never lift a second time.
        scale.value = withTiming(1, { duration });
      } else {
        scale.value = 1;
      }
      x.value = withTiming(nextX, { duration });
      y.value = withTiming(nextY, { duration }, (finished) => {
        moving.value = 0;
        if (finished && done) runOnJS(done)();
      });
    },
    setPosition(nextX, nextY) {
      x.value = nextX;
      y.value = nextY;
      scale.value = 1;
      moving.value = 0;
    },
    fadeTo(nextOpacity, duration = 70, delay = 0) {
      opacity.value = delay > 0 ? withDelay(delay, withTiming(nextOpacity, { duration })) : withTiming(nextOpacity, { duration });
    },
    setPieceKey(next) {
      opacity.value = withTiming(0, { duration: 45 }, (finished) => {
        if (!finished) return;
        runOnJS(setPieceKeyState)(next);
        opacity.value = withDelay(20, withTiming(1, { duration: 70 }));
      });
    },
  }), [moving, opacity, scale, x, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    zIndex: dragAllowed.value ? 100 : moving.value ? 80 : 10,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(5)
      .onStart(() => {
        if (!owned || boardLocked.value !== 0) { dragAllowed.value = 0; return; }
        dragAllowed.value = 1;
        startX.value = x.value;
        startY.value = y.value;
        // Finger down / real drag: lift the piece smoothly and keep it lifted
        // until the user releases it.
        scale.value = withTiming(1.3, { duration: 80 });
        runOnJS(onDragStart)(id);
      })
      .onUpdate((event) => {
        if (!dragAllowed.value) return;
        x.value = startX.value + event.translationX;
        y.value = startY.value + event.translationY;
      })
      .onEnd((event) => {
        if (!dragAllowed.value) return;
        // Do NOT scale down here. onDrop decides whether this is a legal move,
        // premove, or illegal return and settles 1.3 -> 1 together with the snap.
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
        scale.value = withTiming(1, { duration: 80 });
        x.value = withTiming(startX.value, { duration: 90 });
        y.value = withTiming(startY.value, { duration: 90 }, (finished) => {
          if (finished) runOnJS(onDragCancel)(id);
        });
      });
    const tap = Gesture.Tap().onEnd((_event, success) => {
      if (success && boardLocked.value === 0) runOnJS(onTapPiece)(id);
    });
    return Gesture.Race(pan, tap);
  }, [boardLocked, dragAllowed, id, onDragCancel, onDragStart, onDrop, onTapPiece, owned, scale, squareSize, startX, startY, x, y]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View collapsable={false} style={[styles.slot, { width: squareSize, height: squareSize }, style]}>
        <Image source={PIECE_IMAGES[pieceKey]} style={{ width: squareSize * 0.984, height: squareSize * 0.984 }} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
    </GestureDetector>
  );
}));

const styles = StyleSheet.create({
  slot: { position: "absolute", left: 0, top: 0, alignItems: "center", justifyContent: "center" },
});
