import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { indexToSquare } from "./moveMask";
import { squareToPosition, type BoardOrientation } from "./coordinateMapper";

type VisualIndices = {
  selectedSquareIndex: SharedValue<number>;
  lastMoveFromIndex: SharedValue<number>;
  lastMoveToIndex: SharedValue<number>;
  checkedKingIndex: SharedValue<number>;
  premoveFromIndex: SharedValue<number>;
  premoveToIndex: SharedValue<number>;
};

type SlotProps = VisualIndices & {
  index: number;
  squareSize: number;
  orientation: BoardOrientation;
};

const HighlightSlot = React.memo(function HighlightSlot({
  index,
  squareSize,
  orientation,
  selectedSquareIndex,
  lastMoveFromIndex,
  lastMoveToIndex,
  checkedKingIndex,
  premoveFromIndex,
  premoveToIndex,
}: SlotProps) {
  const square = indexToSquare(index)!;
  const position = squareToPosition(square, squareSize, orientation);

  const lastMoveStyle = useAnimatedStyle(() => ({
    opacity: index === lastMoveFromIndex.value || index === lastMoveToIndex.value ? 1 : 0,
  }));
  const selectedStyle = useAnimatedStyle(() => ({
    opacity: selectedSquareIndex.value === index ? 1 : 0,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkedKingIndex.value === index ? 1 : 0,
  }));
  const premoveStyle = useAnimatedStyle(() => ({
    opacity: index === premoveFromIndex.value || index === premoveToIndex.value ? 1 : 0,
  }));

  const box = {
    position: "absolute" as const,
    left: position.x,
    top: position.y,
    width: squareSize,
    height: squareSize,
  };

  return (
    <View pointerEvents="none" style={box}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lastMove, lastMoveStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.premove, premoveStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.selected, selectedStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.check, checkStyle]} />
    </View>
  );
});

export const HighlightLayer = React.memo(function HighlightLayer({
  squareSize,
  orientation,
  selectedSquareIndex,
  lastMoveFromIndex,
  lastMoveToIndex,
  checkedKingIndex,
  premoveFromIndex,
  premoveToIndex,
}: VisualIndices & { squareSize: number; orientation: BoardOrientation }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 64 }, (_, index) => (
        <HighlightSlot
          key={index}
          index={index}
          squareSize={squareSize}
          orientation={orientation}
          selectedSquareIndex={selectedSquareIndex}
          lastMoveFromIndex={lastMoveFromIndex}
          lastMoveToIndex={lastMoveToIndex}
          checkedKingIndex={checkedKingIndex}
          premoveFromIndex={premoveFromIndex}
          premoveToIndex={premoveToIndex}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  lastMove: { backgroundColor: "rgba(255, 214, 112, 0.34)" },
  selected: { backgroundColor: "rgba(255,255,255,0.34)", borderWidth: 2, borderColor: "rgba(255,255,255,.88)" },
  check: { backgroundColor: "rgba(208,66,91,.36)" },
  premove: { backgroundColor: "rgba(132,146,215,.28)", borderWidth: 1.5, borderColor: "rgba(111,123,198,.72)" },
});
