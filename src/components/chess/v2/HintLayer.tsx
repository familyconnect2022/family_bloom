import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { hasBit, indexToSquare } from "./moveMask";
import { squareToPosition, type BoardOrientation } from "./coordinateMapper";

type MaskProps = {
  legalMoveLow: SharedValue<number>;
  legalMoveHigh: SharedValue<number>;
  captureLow: SharedValue<number>;
  captureHigh: SharedValue<number>;
  selectedSquareIndex: SharedValue<number>;
  hintRevealProgress: SharedValue<number>;
  hintMode: SharedValue<number>;
};

type SlotProps = MaskProps & {
  index: number;
  squareSize: number;
  orientation: BoardOrientation;
};

function revealFor(index: number, originIndex: number, progress: number) {
  "worklet";
  if (originIndex < 0 || originIndex > 63) return 1;
  const row = Math.floor(index / 8);
  const col = index % 8;
  const originRow = Math.floor(originIndex / 8);
  const originCol = originIndex % 8;
  // Sliding pieces now reveal nearest squares first on every ray. Different
  // rays share the same distance, so bishop/rook/queen hints fan out instead
  // of waiting for one long serial list.
  const distance = Math.max(Math.abs(row - originRow), Math.abs(col - originCol));
  const threshold = Math.min(0.84, Math.max(0, (distance - 1) * 0.14));
  const local = (progress - threshold) / 0.24;
  return Math.max(0, Math.min(1, local));
}

const HintSlot = React.memo(function HintSlot({
  index,
  squareSize,
  orientation,
  legalMoveLow,
  legalMoveHigh,
  captureLow,
  captureHigh,
  selectedSquareIndex,
  hintRevealProgress,
  hintMode,
}: SlotProps) {
  const square = indexToSquare(index)!;
  const position = squareToPosition(square, squareSize, orientation);
  const dotSize = squareSize * 0.22;
  const ringInset = squareSize * 0.075;
  const ringWidth = Math.max(2, squareSize * 0.065);

  const moveStyle = useAnimatedStyle(() => {
    const visible = hasBit(legalMoveLow.value, legalMoveHigh.value, index);
    const reveal = visible ? revealFor(index, selectedSquareIndex.value, hintRevealProgress.value) : 0;
    return {
      opacity: reveal,
      backgroundColor: hintMode.value === 1 ? "rgba(119, 104, 190, 0.52)" : "rgba(123, 66, 90, 0.40)",
      transform: [{ scale: 0.78 + reveal * 0.22 }],
    };
  });
  const captureStyle = useAnimatedStyle(() => {
    const visible = hasBit(captureLow.value, captureHigh.value, index);
    const reveal = visible ? revealFor(index, selectedSquareIndex.value, hintRevealProgress.value) : 0;
    return {
      opacity: reveal,
      borderColor: hintMode.value === 1 ? "rgba(111, 96, 188, 0.72)" : "rgba(128, 68, 93, 0.44)",
      transform: [{ scale: 0.88 + reveal * 0.12 }],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: squareSize,
        height: squareSize,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            left: (squareSize - dotSize) / 2,
            top: (squareSize - dotSize) / 2,
          },
          moveStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.capture,
          {
            left: ringInset,
            top: ringInset,
            right: ringInset,
            bottom: ringInset,
            borderRadius: squareSize / 2,
            borderWidth: ringWidth,
          },
          captureStyle,
        ]}
      />
    </View>
  );
});

export const HintLayer = React.memo(function HintLayer({
  squareSize,
  orientation,
  legalMoveLow,
  legalMoveHigh,
  captureLow,
  captureHigh,
  selectedSquareIndex,
  hintRevealProgress,
  hintMode,
}: MaskProps & { squareSize: number; orientation: BoardOrientation }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 64 }, (_, index) => (
        <HintSlot
          key={index}
          index={index}
          squareSize={squareSize}
          orientation={orientation}
          legalMoveLow={legalMoveLow}
          legalMoveHigh={legalMoveHigh}
          captureLow={captureLow}
          captureHigh={captureHigh}
          selectedSquareIndex={selectedSquareIndex}
          hintRevealProgress={hintRevealProgress}
          hintMode={hintMode}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  dot: { position: "absolute" },
  capture: { position: "absolute" },
});
