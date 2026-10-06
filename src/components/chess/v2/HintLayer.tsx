import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { buildParallelHintDelays, HINT_POP_MS } from "../../games/hintTiming";
import { gameRuntimePerf } from "../../../services/games/gameRuntimePerf";
import { indexToSquare } from "./moveMask";
import { squareToPosition, type BoardOrientation } from "./coordinateMapper";

export type ChessHintTarget = {
  index: number;
  capture: boolean;
};

export type ChessHintController = {
  show: (targets: ChessHintTarget[], premove: boolean, fromSquare: string) => void;
  clear: () => void;
};

type HintSlotController = {
  show: (left: number, top: number, capture: boolean, premove: boolean, delayMs: number) => void;
  hide: () => void;
};

const MAX_HINT_SLOTS = 32;

function squareGrid(square: string) {
  return { col: square.charCodeAt(0) - 97, row: Number(square[1]) - 1 };
}

const HintSlot = React.memo(forwardRef<HintSlotController, {
  squareSize: number;
}>(function HintSlot({ squareSize }, ref) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.64);
  const captureMode = useSharedValue(0);
  const premoveMode = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    show(left, top, capture, premove, delayMs) {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      x.value = left;
      y.value = top;
      captureMode.value = capture ? 1 : 0;
      premoveMode.value = premove ? 1 : 0;
      opacity.value = 0;
      scale.value = 0.64;
      opacity.value = withDelay(delayMs, withTiming(1, {
        duration: Math.min(60, HINT_POP_MS),
        easing: Easing.out(Easing.quad),
      }));
      scale.value = withDelay(delayMs, withSequence(
        withTiming(1.10, { duration: 44, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: Math.max(1, HINT_POP_MS - 44), easing: Easing.out(Easing.quad) }),
      ));
    },
    hide() {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      opacity.value = 0;
      scale.value = 0.64;
    },
  }), [captureMode, opacity, premoveMode, scale, x, y]);

  const slotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
  const quietStyle = useAnimatedStyle(() => ({
    opacity: 1 - captureMode.value,
    backgroundColor: interpolateColor(
      premoveMode.value,
      [0, 1],
      ["rgba(123,66,90,.42)", "rgba(119,104,190,.54)"],
    ),
  }));
  const captureStyle = useAnimatedStyle(() => ({
    opacity: captureMode.value,
    borderColor: interpolateColor(
      premoveMode.value,
      [0, 1],
      ["rgba(128,68,93,.48)", "rgba(111,96,188,.74)"],
    ),
  }));

  const quietSize = Math.max(8, squareSize * 0.22);
  const quietInset = (squareSize - quietSize) / 2;
  const ringInset = squareSize * 0.08;
  const ringSize = squareSize - ringInset * 2;
  const ringWidth = Math.max(2, squareSize * 0.055);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.slot, { width: squareSize, height: squareSize }, slotStyle]}
    >
      <Animated.View
        style={[
          styles.quiet,
          {
            left: quietInset,
            top: quietInset,
            width: quietSize,
            height: quietSize,
            borderRadius: quietSize / 2,
          },
          quietStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.capture,
          {
            left: ringInset,
            top: ringInset,
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: ringWidth,
          },
          captureStyle,
        ]}
      />
    </Animated.View>
  );
}));

/**
 * Stable pooled renderer: the native hint nodes stay mounted for the lifetime of
 * the board. Selection only repositions/animates those nodes through SharedValue,
 * so a rook/queen no longer mounts a large batch of Views at tap time.
 */
export const HintLayer = React.memo(forwardRef<ChessHintController, {
  squareSize: number;
  orientation: BoardOrientation;
}>(function HintLayer({ squareSize, orientation }, ref) {
  const slotsRef = useRef<Array<HintSlotController | null>>(Array(MAX_HINT_SLOTS).fill(null));

  useImperativeHandle(ref, () => ({
    show(targets, premove, fromSquare) {
      const source = squareGrid(fromSquare);
      const scheduled = targets.flatMap((target) => {
        const square = indexToSquare(target.index);
        if (!square) return [];
        const grid = squareGrid(square);
        return [{ ...target, square, ...grid }];
      });
      const delays = buildParallelHintDelays(source, scheduled);
      gameRuntimePerf.markHintBatch("chess", scheduled.length, Math.max(0, ...Array.from(delays.values())));

      for (let index = 0; index < MAX_HINT_SLOTS; index += 1) {
        const controller = slotsRef.current[index];
        const target = scheduled[index];
        if (!controller) continue;
        if (!target) {
          controller.hide();
          continue;
        }
        const position = squareToPosition(target.square, squareSize, orientation);
        controller.show(
          position.x,
          position.y,
          target.capture,
          premove,
          delays.get(`${target.col}:${target.row}`) ?? 0,
        );
      }
    },
    clear() {
      slotsRef.current.forEach((slot) => slot?.hide());
    },
  }), [orientation, squareSize]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: MAX_HINT_SLOTS }, (_, index) => (
        <HintSlot
          key={`hint-slot-${index}`}
          ref={(controller) => { slotsRef.current[index] = controller; }}
          squareSize={squareSize}
        />
      ))}
    </View>
  );
}));

const styles = StyleSheet.create({
  slot: { position: "absolute", left: 0, top: 0 },
  quiet: { position: "absolute" },
  capture: { position: "absolute", backgroundColor: "transparent" },
});
